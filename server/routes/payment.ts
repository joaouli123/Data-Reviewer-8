import { Express, Request, Response } from "express";
import { db } from "../db";
import { eq, sql, and, desc } from "drizzle-orm";
import { companies, subscriptions, users, User } from "../../shared/schema";
import crypto from "crypto";

const MERCADOPAGO_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;
const MERCADOPAGO_WEBHOOK_SECRET = process.env.MERCADOPAGO_WEBHOOK_SECRET;

interface PaymentRequest {
  companyId: string;
  plan: string;
  email: string;
  total_amount: string;
  payment_method_id: string;
  token?: string;
  payer?: {
    email: string;
    first_name: string;
    last_name: string;
    identification?: {
      type: string;
      number: string;
    };
    address?: {
      zip_code: string;
      street_name: string;
      street_number: string;
      neighborhood: string;
      city: string;
      federal_unit: string;
    };
  };
}

export function registerPaymentRoutes(app: Express) {
  app.get("/api/payment/test-token", async (_req: Request, res: Response) => {
    try {
      if (!MERCADOPAGO_ACCESS_TOKEN) {
        return res.status(500).json({ error: "MERCADOPAGO_ACCESS_TOKEN not configured" });
      }

      const mpResponse = await fetch('https://api.mercadopago.com/users/me', {
        headers: {
          'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
        },
      });

      const data = await mpResponse.json();

      if (!mpResponse.ok) {
        return res.status(400).json({ error: "Invalid access token", details: data });
      }

      return res.json({ success: true, user_id: data?.id, email: data?.email });
    } catch (error) {
      console.error("[Payment] Error testing access token:", error);
      return res.status(500).json({ error: "Failed to test access token" });
    }
  });
  
  // Process payment
  app.post("/api/payment/process", async (req: Request, res: Response) => {
    try {
      const body = req.body as PaymentRequest;
      const { companyId, plan, email, total_amount, payment_method_id, token, payer } = body;

      if (!companyId) {
        return res.status(400).json({ error: "Company ID is required" });
      }

      if (!MERCADOPAGO_ACCESS_TOKEN) {
        console.error("[Payment] MERCADOPAGO_ACCESS_TOKEN not configured");
        return res.status(500).json({ error: "Payment gateway not configured" });
      }

      console.log("[Payment] Processing payment:", { companyId, plan, payment_method_id, amount: total_amount, payer });

      // Calculate expiration date based on plan
      const isLifetime = plan === 'pro';
      const expiresAt = isLifetime ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days for monthly

      let paymentResponse;
      let paymentStatus = 'pending';
      let mpPaymentId = null;
      let boletoDueDate: Date | null = null;

      const resolvePayer = async () => {
        const baseEmail = email || payer?.email || '';
        const hasIdentification = !!payer?.identification?.number;
        const hasAddress = !!payer?.address?.zip_code && !!payer?.address?.street_name && !!payer?.address?.street_number && !!payer?.address?.city && !!payer?.address?.federal_unit;

        if (hasIdentification && hasAddress) {
          return {
            email: baseEmail,
            first_name: payer?.first_name || '',
            last_name: payer?.last_name || '',
            identification: payer?.identification,
            address: payer?.address,
          };
        }

        const [companyRecord] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
        const [adminUser] = await db
          .select()
          .from(users)
          .where(and(eq(users.companyId, companyId), eq(users.role, "admin")))
          .limit(1);

        const docNumber = (companyRecord?.document || '').replace(/\D/g, '');
        const idType = docNumber.length > 11 ? 'CNPJ' : 'CPF';
        const fullName = adminUser?.name || '';
        const firstName = payer?.first_name || adminUser?.firstName || fullName.split(' ')[0] || '';
        const lastName = payer?.last_name || adminUser?.lastName || fullName.split(' ').slice(1).join(' ');
        
        // Format phone to ensure only digits and proper structure
        const phoneNumber = (adminUser?.phone || '').replace(/\D/g, '');

        return {
          email: baseEmail || adminUser?.email || '',
          first_name: firstName || 'Admin',
          last_name: (lastName || '').trim() || 'User',
          phone: phoneNumber.length >= 10 ? {
            area_code: phoneNumber.slice(0, 2),
            number: phoneNumber.slice(2)
          } : undefined,
          identification: {
            type: payer?.identification?.type || idType,
            number: payer?.identification?.number || docNumber,
          },
          address: {
            zip_code: payer?.address?.zip_code || adminUser?.cep || '',
            street_name: payer?.address?.street_name || adminUser?.rua || '',
            street_number: payer?.address?.street_number || adminUser?.numero || '',
            neighborhood: payer?.address?.neighborhood || adminUser?.complemento || 'S/N',
            city: payer?.address?.city || adminUser?.cidade || '',
            federal_unit: payer?.address?.federal_unit || adminUser?.estado || '',
          },
        };
      };

      const resolvedPayer = await resolvePayer();
      if (resolvedPayer?.address) {
        if (!resolvedPayer.address.street_number) resolvedPayer.address.street_number = 'S/N';
        if (!resolvedPayer.address.neighborhood) resolvedPayer.address.neighborhood = 'S/N';
      }
      if (resolvedPayer?.address) {
        if (!resolvedPayer.address.street_number) resolvedPayer.address.street_number = 'S/N';
        if (!resolvedPayer.address.neighborhood) resolvedPayer.address.neighborhood = 'S/N';
      }

      // For test mode, simulate approved payment
      const isTestMode = MERCADOPAGO_ACCESS_TOKEN?.startsWith('TEST-');
      
      if (payment_method_id === 'pix') {
        // PIX payment
        if (isTestMode) {
          // Simulate approved PIX for test mode
          paymentResponse = {
            id: `PIX_TEST_${Date.now()}`,
            status: 'approved',
            status_detail: 'accredited',
          };
          paymentStatus = 'approved';
          mpPaymentId = paymentResponse.id;
        } else {
          // Real PIX payment via Mercado Pago
          const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
              'Content-Type': 'application/json',
              'X-Idempotency-Key': `${companyId}-${Date.now()}`,
            },
            body: JSON.stringify({
              transaction_amount: parseFloat(total_amount),
              payment_method_id: 'pix',
              payer: {
                email: email,
                first_name: payer?.first_name || '',
                last_name: payer?.last_name || '',
              },
              description: `Assinatura ${plan.toUpperCase()} - HUACONTROL`,
              external_reference: companyId,
              metadata: {
                company_id: companyId,
                plan: plan
              }
            }),
          });
          paymentResponse = await mpResponse.json();
          paymentStatus = paymentResponse.status;
          mpPaymentId = paymentResponse.id;
        }
      } else if (payment_method_id === 'boleto' || payment_method_id === 'bolbradesco') {
        // Boleto payment
        if (isTestMode) {
          // Simulate pending boleto for test mode
          paymentResponse = {
            id: `BOLETO_TEST_${Date.now()}`,
            status: 'pending',
            status_detail: 'pending_waiting_payment',
            transaction_details: {
              external_resource_url: 'https://www.mercadopago.com.br/payments/ticket/helper?payment_id=123456'
            }
          };
          paymentStatus = 'pending';
          mpPaymentId = paymentResponse.id;
        } else {
          const expirationDate = new Date();
          expirationDate.setDate(expirationDate.getDate() + 1);
          expirationDate.setHours(23, 59, 59, 999);
          boletoDueDate = expirationDate;

          // Log resolved payer for debugging
          console.log('[Payment] Resolved payer for boleto:', JSON.stringify(resolvedPayer, null, 2));

          const missingFields = [] as string[];
          if (!resolvedPayer?.email) missingFields.push('email');
          if (!resolvedPayer?.first_name) missingFields.push('first_name');
          if (!resolvedPayer?.last_name) missingFields.push('last_name');
          if (!resolvedPayer?.identification?.number) missingFields.push('identification.number');
          if (!resolvedPayer?.identification?.type) missingFields.push('identification.type');
          if (!resolvedPayer?.address?.zip_code) missingFields.push('address.zip_code');
          if (!resolvedPayer?.address?.street_name) missingFields.push('address.street_name');
          if (!resolvedPayer?.address?.street_number) missingFields.push('address.street_number');
          if (!resolvedPayer?.address?.city) missingFields.push('address.city');
          if (!resolvedPayer?.address?.federal_unit) missingFields.push('address.federal_unit');

          const docDigits = String(resolvedPayer?.identification?.number || '').replace(/\D/g, '');
          if (docDigits.length !== 11 && docDigits.length !== 14) {
            console.error('[Payment] Invalid CPF/CNPJ:', docDigits);
            return res.status(400).json({
              message: 'CPF/CNPJ inválido para emissão de boleto',
              details: `O documento deve ter 11 (CPF) ou 14 (CNPJ) dígitos. Recebido: ${docDigits.length} dígitos.`,
            });
          }

          if (missingFields.length > 0) {
            console.error('[Payment] Missing fields for boleto:', missingFields);
            return res.status(400).json({
              message: 'Dados do pagador incompletos para emissão de boleto',
              missingFields,
            });
          }

          // Real Boleto payment via Mercado Pago
          const boletoMethods = ['bolbradesco', 'boleto'];
          let lastErrorData: any = null;
          const isCNPJ = docDigits.length === 14;

          for (const methodId of boletoMethods) {
            // Build payer object
            const payerData = {
              email: resolvedPayer?.email || email,
              identification: {
                type: docDigits.length === 14 ? 'CNPJ' : 'CPF',
                number: docDigits
              },
              address: {
                zip_code: String(resolvedPayer?.address?.zip_code || '').replace(/\D/g, ''),
                street_name: String(resolvedPayer?.address?.street_name || ''),
                street_number: String(resolvedPayer?.address?.street_number || 'S/N'),
                neighborhood: String(resolvedPayer?.address?.neighborhood || 'Centro'),
                city: String(resolvedPayer?.address?.city || ''),
                federal_unit: String(resolvedPayer?.address?.federal_unit || '')
              },
              // Sempre envie first_name e last_name, mesmo para CNPJ
              first_name: resolvedPayer?.first_name || (isCNPJ ? 'Empresa' : 'Admin'),
              last_name: resolvedPayer?.last_name || (isCNPJ ? 'PJ' : 'User'),
              entity_type: isCNPJ ? 'company' : 'individual'
            };

            const boletoPayload = {
              transaction_amount: Number(parseFloat(total_amount).toFixed(2)),
              payment_method_id: methodId,
              payer: payerData,
              description: `Assinatura Mensal - HUACONTROL`,
              external_reference: companyId,
              date_of_expiration: expirationDate.toISOString(),
              metadata: {
                company_id: companyId,
                plan: 'monthly'
              }
            };

            console.log(`[Payment] Attempting boleto with ${methodId}:`, JSON.stringify(boletoPayload, null, 2));

            // Log payload antes do envio
            console.log("[Payment][DEBUG] Enviando payload para Mercado Pago:", JSON.stringify(boletoPayload, null, 2));
            const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
                'X-Idempotency-Key': `${companyId}-${methodId}-${Date.now()}`,
              },
              body: JSON.stringify(boletoPayload),
            });

            // Log status da resposta
            console.log("[Payment][DEBUG] Status da resposta Mercado Pago:", mpResponse.status, mpResponse.statusText);

            const responseText = await mpResponse.text();
            let parsedResponse;
            try {
              parsedResponse = JSON.parse(responseText);
            } catch (e) {
              parsedResponse = responseText;
            }

            // Log resposta bruta
            console.log("[Payment][DEBUG] Resposta bruta Mercado Pago:", responseText);

            if (mpResponse.ok) {
              paymentResponse = parsedResponse;
              break;
            }

            lastErrorData = parsedResponse;
            console.error("[Payment] Mercado Pago API error:", lastErrorData);
          }

          if (!paymentResponse) {
            return res.status(400).json({
              error: "Payment processing failed",
              details: lastErrorData?.message || lastErrorData?.cause || 'Unknown error',
              mp_error: lastErrorData
            });
          }
          paymentStatus = paymentResponse.status;
          mpPaymentId = paymentResponse.id;
          
          console.log("[Payment] Boleto created:", { id: mpPaymentId, status: paymentStatus, ticket_url: paymentResponse?.transaction_details?.external_resource_url });
        }
      } else if (payment_method_id === 'credit_card' || token) {
        // Credit card payment
        if (isTestMode) {
          // Simulate approved credit card for test mode
          paymentResponse = {
            id: `CC_TEST_${Date.now()}`,
            status: 'approved',
            status_detail: 'accredited',
          };
          paymentStatus = 'approved';
          mpPaymentId = paymentResponse.id;
        } else if (token) {
          const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
              'Content-Type': 'application/json',
              'X-Idempotency-Key': `${companyId}-${Date.now()}`,
            },
            body: JSON.stringify({
              transaction_amount: parseFloat(total_amount),
              token: token,
              installments: 1,
              payment_method_id: payment_method_id === 'credit_card' ? 'master' : payment_method_id,
              date_of_expiration: expirationDate.toISOString(),
              payer: {
                email: email,
              },
              description: `Assinatura ${plan.toUpperCase()} - HUACONTROL`,
              external_reference: companyId,
              metadata: {
                company_id: companyId,
                plan: plan
              }
            }),
          });
          paymentResponse = await mpResponse.json();
          paymentStatus = paymentResponse.status;
          mpPaymentId = paymentResponse.id;
        }
      } else {
        // Default: simulate approved for test
        if (isTestMode) {
          paymentResponse = {
            id: `TEST_${Date.now()}`,
            status: 'approved',
            status_detail: 'accredited',
          };
          paymentStatus = 'approved';
          mpPaymentId = paymentResponse.id;
        }
      }

      console.log("[Payment] Payment response:", { status: paymentStatus, id: mpPaymentId });

      // If payment is approved, update company and create subscription
      if (paymentStatus === 'approved' || paymentStatus === 'pending' || paymentStatus === 'in_process') {
        // For pending/in_process, we still want a record in the subscription table
        // to track the ticket_url and status
        
        // Update company status
        if (paymentStatus === 'approved') {
          await db.update(companies)
            .set({
              subscriptionStatus: 'active',
              paymentStatus: 'approved',
              subscriptionPlan: plan,
              updatedAt: new Date(),
            })
            .where(eq(companies.id, companyId));
        } else {
          await db.update(companies)
            .set({
              paymentStatus: 'pending',
              subscriptionPlan: plan,
              updatedAt: new Date(),
            })
            .where(eq(companies.id, companyId));
        }

        const [existingSub] = await db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.companyId, companyId))
          .orderBy(desc(subscriptions.createdAt))
          .limit(1);

        const subPayload = {
          plan,
          status: paymentStatus === 'approved' ? 'active' : 'pending',
          subscriberName: `${resolvedPayer?.first_name || ''} ${resolvedPayer?.last_name || ''}`.trim() || email,
          paymentMethod: payment_method_id,
          amount: total_amount,
          isLifetime,
          expiresAt,
          ticket_url: paymentResponse?.transaction_details?.external_resource_url,
          updatedAt: new Date(),
        };

        if (existingSub) {
          await db.update(subscriptions)
            .set(subPayload)
            .where(eq(subscriptions.id, existingSub.id));
        } else {
          await db.insert(subscriptions).values({
            companyId,
            ...subPayload,
          });
        }

        console.log("[Payment] Subscription record created");
      }

      if (paymentStatus === 'approved') {
        // Enviar e-mail de confirmação imediata se aprovado (ex: Cartão de Crédito)
        const companyAdmins = await db
          .select()
          .from(users)
          .where(and(eq(users.companyId, companyId), eq(users.role, "admin")))
          .limit(1);
        
        const companyAdmin = companyAdmins[0] as User | undefined;

        if (companyAdmin?.email) {
          try {
            const { Resend: ResendClient } = await import('resend');
            const resend = new ResendClient(process.env.RESEND_API_KEY);
            await resend.emails.send({
              from: 'Financeiro <contato@huacontrol.com.br>',
              to: companyAdmin.email,
              subject: 'Pagamento Confirmado - HuaControl',
              html: `
                <p>Olá, ${companyAdmin.name || 'Administrador'}</p>
                <p>Seu pagamento foi confirmado e seu acesso ao sistema está liberado.</p>
                <p>Obrigado por escolher a HuaControl.</p>
              `
            });
          } catch (emailErr) {
            console.error("[Payment] Error sending payment confirmation email:", emailErr);
          }
        }

        return res.json({
          success: true,
          status: paymentStatus,
          message: 'Pagamento em processamento',
          paymentId: mpPaymentId,
          qr_code: paymentResponse?.point_of_interaction?.transaction_data?.qr_code,
          qr_code_base64: paymentResponse?.point_of_interaction?.transaction_data?.qr_code_base64,
          ticket_url: paymentResponse?.transaction_details?.external_resource_url,
          dueDate: boletoDueDate ? boletoDueDate.toISOString() : null,
        });
      } else if (paymentStatus === 'pending' || paymentStatus === 'in_process') {
        // Boleto e outros métodos que ficam pending devem ser aceitos
        return res.json({
          success: true,
          status: paymentStatus,
          message: 'Aguardando pagamento',
          paymentId: mpPaymentId,
          ticket_url: paymentResponse?.transaction_details?.external_resource_url,
          dueDate: boletoDueDate ? boletoDueDate.toISOString() : null,
        });
      } else {
        // rejected, cancelled, etc
        return res.status(400).json({
          success: false,
          status: paymentStatus,
          message: 'Pagamento recusado',
          error: paymentResponse?.status_detail || 'Payment failed',
          mp_response: paymentResponse
        });
      }

    } catch (error) {
      console.error("[Payment] Error processing payment:", error);
      res.status(500).json({ error: "Failed to process payment" });
    }
  });

  // Webhook for Mercado Pago notifications
  app.post("/api/payment/webhook", async (req: Request, res: Response) => {
    try {
      const { type, data, action } = req.body;
      const xSignature = req.headers['x-signature'] as string;
      const xRequestId = req.headers['x-request-id'] as string;
      
      console.log("[Webhook] Received notification:", { type, action, data, xRequestId });

      // Security Validation (HMAC SHA256)
      if (MERCADOPAGO_WEBHOOK_SECRET && xSignature) {
        const parts = xSignature.split(',');
        let ts: string | undefined;
        let v1: string | undefined;

        parts.forEach(part => {
          const [key, value] = part.split('=');
          if (key === 'ts') ts = value;
          if (key === 'v1') v1 = value;
        });

        if (ts && v1) {
          const manifest = `id:${data.id};request-id:${xRequestId};ts:${ts};`;
          const hmac = crypto.createHmac('sha256', MERCADOPAGO_WEBHOOK_SECRET);
          hmac.update(manifest);
          const sha = hmac.digest('hex');

          if (sha !== v1) {
            console.error("[Webhook] Invalid signature verification");
            return res.status(401).send("Invalid signature");
          }
          console.log("[Webhook] Signature verified successfully");
        }
      }

      // We only care about payment updates
      if (type === 'payment' || action === 'payment.updated' || action === 'payment.created') {
        const paymentId = data?.id;
        
        if (paymentId && MERCADOPAGO_ACCESS_TOKEN) {
          // Fetch payment details from Mercado Pago to get the current status
          const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
            headers: {
              'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
            },
          });
          
          if (!response.ok) {
            console.error("[Webhook] Failed to fetch payment details:", await response.text());
            return res.status(200).send("Processed with errors"); // Still return 200 to MP
          }

          const payment = await response.json();
          
          if (!response.ok) {
            console.error("[Webhook] Mercado Pago API Error Detail:", payment);
            return res.status(200).send("Processed with errors");
          }

          const status = payment.status;
          const externalReference = payment.external_reference; // Usually companyId if passed during creation
          
          console.log("[Webhook] Payment processing:", { id: payment.id, status, externalReference });
          
          if (status === 'approved') {
            // Find company by ID (stored in external_reference or metadata)
            const companyId = externalReference || payment.metadata?.company_id;
            
            if (companyId) {
              console.log("[Webhook] Approving subscription for company:", companyId);
              
              // 1. Update company status
              await db.update(companies)
                .set({
                  subscriptionStatus: 'active',
                  paymentStatus: 'approved',
                  updatedAt: new Date(),
                })
                .where(eq(companies.id, companyId));

              // 2. Update existing subscription or create if missing
              const [existingSub] = await db.select()
                .from(subscriptions)
                .where(eq(subscriptions.companyId, companyId))
                .limit(1);

              if (existingSub) {
                await db.update(subscriptions)
                  .set({
                    status: 'active',
                    updatedAt: new Date(),
                  })
                  .where(eq(subscriptions.id, existingSub.id));
              }

              // 3. Enviar e-mail de confirmação de pagamento
              const companyAdmins = await db
                .select()
                .from(users)
                .where(and(eq(users.companyId, companyId), eq(users.role, "admin")))
                .limit(1);
              
              const companyAdmin = companyAdmins[0] as User | undefined;

              if (companyAdmin?.email) {
                try {
                  const { Resend: ResendClient } = await import('resend');
                  const resend = new ResendClient(process.env.RESEND_API_KEY);
                  await resend.emails.send({
                    from: 'Financeiro <contato@huacontrol.com.br>',
                    to: companyAdmin.email,
                    subject: 'Pagamento Confirmado - HuaControl',
                    html: `
                      <p>Olá, ${companyAdmin.name || 'Administrador'}</p>
                      <p>Recebemos a confirmação do seu pagamento e seu acesso ao sistema está liberado.</p>
                      <p>Obrigado por escolher a HuaControl.</p>
                    `
                  });
                } catch (emailErr) {
                  console.error("[Webhook] Error sending payment confirmation email:", emailErr);
                }
              }
            } else {
              console.warn("[Webhook] Payment approved but no companyId found in reference/metadata");
            }
          }
        }
      }

      res.status(200).send("OK");
    } catch (error) {
      console.error("[Webhook] Error:", error);
      res.status(500).send("Internal Server Error");
    }
  });

  // Simulate approval (for test mode confirmation)
  app.post("/api/payment/simulate-approval", async (req: Request, res: Response) => {
    try {
      const { companyId } = req.body;

      if (!companyId) {
        return res.status(400).json({ error: "Company ID is required" });
      }

      console.log("[Payment] Simulate approval for company:", companyId);

      // Get updated company data
      const [updatedCompany] = await db.select()
        .from(companies)
        .where(eq(companies.id, companyId));

      if (!updatedCompany) {
        return res.status(404).json({ error: "Company not found" });
      }

      // Get the admin user for this company to generate token
      const [adminUser] = await db.select()
        .from(users)
        .where(eq(users.companyId, companyId))
        .limit(1);

      if (!adminUser) {
        return res.status(404).json({ error: "User not found" });
      }

      // Generate a new token for the user
      const { generateToken, createSession } = await import("../auth");
      const token = generateToken({ 
        userId: adminUser.id, 
        companyId: companyId, 
        role: adminUser.role, 
        isSuperAdmin: adminUser.isSuperAdmin || false 
      });
      
      await createSession(adminUser.id, companyId, token);

      console.log("[Payment] Token generated for user:", adminUser.id);

      res.json({
        success: true,
        token,
        user: {
          id: adminUser.id,
          username: adminUser.username,
          email: adminUser.email,
          name: adminUser.name,
          phone: adminUser.phone,
          role: adminUser.role,
          isSuperAdmin: adminUser.isSuperAdmin,
          companyId: adminUser.companyId,
        },
        company: {
          id: updatedCompany.id,
          name: updatedCompany.name,
          paymentStatus: updatedCompany.paymentStatus,
          subscriptionPlan: updatedCompany.subscriptionPlan,
        },
        message: 'Subscription confirmed',
      });

    } catch (error) {
      console.error("[Payment] Error in simulate-approval:", error);
      res.status(500).json({ error: "Failed to confirm subscription" });
    }
  });

  // Get payment status
  app.get("/api/payment/status/:paymentId", async (req: Request, res: Response) => {
    try {
      const { paymentId } = req.params;
      
      if (!MERCADOPAGO_ACCESS_TOKEN) {
        return res.status(500).json({ error: "Payment configuration missing" });
      }

      const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
        },
      });

      const payment = await response.json();
      
      res.json({
        status: payment.status,
        status_detail: payment.status_detail,
        amount: payment.transaction_amount,
      });
    } catch (error) {
      console.error("[Payment] Error fetching status:", error);
      res.status(500).json({ error: "Failed to fetch payment status" });
    }
  });

  // Regenerate boleto with next day expiration
  app.post("/api/payment/regenerate-boleto", async (req: Request, res: Response) => {
    try {
      const { companyId: rawCompanyId, email: rawEmail, amount: rawAmount, plan: rawPlan, payer } = req.body;

      let companyId = rawCompanyId as string | undefined;
      let companyRecord: typeof companies.$inferSelect | undefined;
      let adminUser: typeof users.$inferSelect | undefined;

      if (!companyId && (rawEmail || payer?.email || payer?.identification?.number)) {
        if (payer?.identification?.number) {
          const docDigits = String(payer.identification.number).replace(/\D/g, '');
          if (docDigits) {
            const [companyByDoc] = await db
              .select()
              .from(companies)
              .where(eq(companies.document, docDigits))
              .limit(1);
            if (companyByDoc) companyId = companyByDoc.id;
          }
        }

        if (!companyId && (rawEmail || payer?.email)) {
          const emailLookup = rawEmail || payer?.email;
          const [userByEmail] = await db
            .select()
            .from(users)
            .where(eq(users.email, emailLookup))
            .limit(1);
          if (userByEmail) companyId = userByEmail.companyId;
        }
      }

      if (!companyId) {
        return res.status(400).json({ error: "Missing required fields", missingFields: ["companyId"] });
      }

      [companyRecord] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
      [adminUser] = await db
        .select()
        .from(users)
        .where(and(eq(users.companyId, companyId), eq(users.role, "admin")))
        .limit(1);

      const [latestSub] = await db
        .select({ amount: subscriptions.amount, plan: subscriptions.plan })
        .from(subscriptions)
        .where(eq(subscriptions.companyId, companyId))
        .orderBy(desc(subscriptions.createdAt))
        .limit(1);

      const planAmounts: Record<string, string> = {
        monthly: "215.00",
        basic: "0.00",
        pro: "997.00",
        enterprise: "0.00",
      };

      const resolvedPlan = rawPlan || companyRecord?.subscriptionPlan || latestSub?.plan || "monthly";
      const email = rawEmail || payer?.email || adminUser?.email || "";
      const amount = rawAmount || latestSub?.amount || planAmounts[resolvedPlan] || "";

      const missingRequired: string[] = [];
      if (!email) missingRequired.push("email");
      if (!amount) missingRequired.push("amount");
      if (missingRequired.length > 0) {
        return res.status(400).json({ error: "Missing required fields", missingFields: missingRequired });
      }

      if (!MERCADOPAGO_ACCESS_TOKEN) {
        console.error("[Payment] MERCADOPAGO_ACCESS_TOKEN not configured");
        return res.status(500).json({ error: "Payment gateway not configured" });
      }

      console.log("[Payment] Regenerating boleto for company:", companyId);

      const isTestMode = MERCADOPAGO_ACCESS_TOKEN?.startsWith('TEST-');
      let paymentResponse;

      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 1);
      expirationDate.setHours(23, 59, 59, 999);

      const resolvePayer = async () => {
        const baseEmail = email || payer?.email || '';
        const hasIdentification = !!payer?.identification?.number;
        const hasAddress = !!payer?.address?.zip_code && !!payer?.address?.street_name && !!payer?.address?.street_number && !!payer?.address?.city && !!payer?.address?.federal_unit;

        if (hasIdentification && hasAddress) {
          return {
            email: baseEmail,
            first_name: payer?.first_name || '',
            last_name: payer?.last_name || '',
            identification: payer?.identification,
            address: payer?.address,
          };
        }

        const docNumber = (companyRecord?.document || '').replace(/\D/g, '');
        const idType = docNumber.length > 11 ? 'CNPJ' : 'CPF';
        const fullName = adminUser?.name || '';
        const firstName = payer?.first_name || adminUser?.firstName || fullName.split(' ')[0] || '';
        const lastName = payer?.last_name || adminUser?.lastName || fullName.split(' ').slice(1).join(' ');

        return {
          email: baseEmail || adminUser?.email || '',
          first_name: firstName || 'Admin',
          last_name: (lastName || '').trim() || 'User',
          identification: {
            type: payer?.identification?.type || idType,
            number: payer?.identification?.number || docNumber,
          },
          address: {
            zip_code: payer?.address?.zip_code || adminUser?.cep || '',
            street_name: payer?.address?.street_name || adminUser?.rua || '',
            street_number: payer?.address?.street_number || adminUser?.numero || '',
            neighborhood: payer?.address?.neighborhood || adminUser?.complemento || 'S/N',
            city: payer?.address?.city || adminUser?.cidade || '',
            federal_unit: payer?.address?.federal_unit || adminUser?.estado || '',
          },
        };
      };

      const resolvedPayer = await resolvePayer();

      if (isTestMode) {
        paymentResponse = {
          id: `BOLETO_REGEN_TEST_${Date.now()}`,
          status: 'pending',
          transaction_details: {
            external_resource_url: 'https://www.mercadopago.com.br/payments/ticket/helper?payment_id=REGEN123'
          }
        };
      } else {
        const missingFields = [] as string[];
        if (!resolvedPayer?.email) missingFields.push('email');
        if (!resolvedPayer?.identification?.number) missingFields.push('identification.number');
        if (!resolvedPayer?.address?.zip_code) missingFields.push('address.zip_code');
        if (!resolvedPayer?.address?.street_name) missingFields.push('address.street_name');
        if (!resolvedPayer?.address?.street_number) missingFields.push('address.street_number');
        if (!resolvedPayer?.address?.city) missingFields.push('address.city');
        if (!resolvedPayer?.address?.federal_unit) missingFields.push('address.federal_unit');

        const docDigits = String(resolvedPayer?.identification?.number || '').replace(/\D/g, '');
        if (docDigits.length !== 11 && docDigits.length !== 14) {
          return res.status(400).json({
            error: "Failed to generate new boleto",
            message: 'CPF/CNPJ inválido para emissão de boleto',
            details: 'O documento deve ter 11 (CPF) ou 14 (CNPJ) dígitos.'
          });
        }

        if (missingFields.length > 0) {
          return res.status(400).json({
            error: "Failed to generate new boleto",
            message: 'Dados do pagador incompletos para emissão de boleto',
            missingFields,
          });
        }

        const boletoMethods = ['bolbradesco', 'boleto'];
        let lastErrorData: any = null;

        for (const methodId of boletoMethods) {
          const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
              'Content-Type': 'application/json',
              'X-Idempotency-Key': `regen-${companyId}-${methodId}-${Date.now()}`,
            },
            body: JSON.stringify({
              transaction_amount: Number(parseFloat(amount).toFixed(2)),
              payment_method_id: methodId,
              date_of_expiration: expirationDate.toISOString(),
              payer: {
                email: resolvedPayer?.email || email,
                first_name: resolvedPayer?.first_name || 'Admin',
                last_name: resolvedPayer?.last_name || 'User',
                identification: {
                  type: resolvedPayer?.identification?.type || 'CPF',
                  number: String(resolvedPayer?.identification?.number || '').replace(/\D/g, '')
                },
                address: {
                  zip_code: String(resolvedPayer?.address?.zip_code || '').replace(/\D/g, ''),
                  street_name: String(resolvedPayer?.address?.street_name || ''),
                  street_number: String(resolvedPayer?.address?.street_number || 'S/N'),
                  neighborhood: String(resolvedPayer?.address?.neighborhood || ''),
                  city: String(resolvedPayer?.address?.city || ''),
                  federal_unit: String(resolvedPayer?.address?.federal_unit || '')
                }
              },
              description: `Renovação Assinatura - HUACONTROL`,
              external_reference: companyId,
              metadata: {
                company_id: companyId,
                plan: resolvedPlan || 'monthly'
              }
            }),
          });

          if (mpResponse.ok) {
            paymentResponse = await mpResponse.json();
            break;
          }

          lastErrorData = await mpResponse.json();
          console.error("[Payment] Mercado Pago API error on regenerate:", lastErrorData);
        }

        if (!paymentResponse) {
          return res.status(400).json({ 
            error: "Failed to generate new boleto", 
            details: lastErrorData?.message || lastErrorData?.cause || 'Unknown error',
            mp_error: lastErrorData
          });
        }

        console.log("[Payment] Boleto regenerated:", { id: paymentResponse.id, ticket_url: paymentResponse?.transaction_details?.external_resource_url });
      }

      if (paymentResponse.id) {
        // Update subscription with new ticket url
        await db.update(subscriptions)
          .set({
            ticket_url: paymentResponse.transaction_details?.external_resource_url,
            status: 'pending',
            expiresAt: expirationDate,
            updatedAt: new Date()
          })
          .where(eq(subscriptions.companyId, companyId));

        await db.update(companies)
          .set({ paymentStatus: 'pending', updatedAt: new Date() })
          .where(eq(companies.id, companyId));

        res.json({
          success: true,
          ticket_url: paymentResponse.transaction_details?.external_resource_url,
          dueDate: expirationDate.toISOString()
        });
      } else {
        res.status(400).json({ error: "Failed to generate new boleto", details: paymentResponse });
      }
    } catch (error) {
      console.error("[Payment] Error regenerating boleto:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
}
