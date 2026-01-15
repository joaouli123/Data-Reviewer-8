import { Express, Request, Response } from "express";
import { db } from "../db";
import { eq, sql, and } from "drizzle-orm";
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
  
  // Process payment
  app.post("/api/payment/process", async (req: Request, res: Response) => {
    try {
      const body = req.body as PaymentRequest;
      const { companyId, plan, email, total_amount, payment_method_id, token, payer } = body;

      if (!companyId) {
        return res.status(400).json({ error: "Company ID is required" });
      }

      console.log("[Payment] Processing payment:", { companyId, plan, payment_method_id, amount: total_amount });

      // Calculate expiration date based on plan
      const isLifetime = plan === 'pro';
      const expiresAt = isLifetime ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days for monthly

      let paymentResponse;
      let paymentStatus = 'pending';
      let mpPaymentId = null;

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
          // Real Boleto payment via Mercado Pago
          const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
              'Content-Type': 'application/json',
              'X-Idempotency-Key': `${companyId}-${Date.now()}`,
            },
            body: JSON.stringify({
              transaction_amount: Number(parseFloat(total_amount).toFixed(2)),
              payment_method_id: 'bolbradesco',
              payer: {
                email: email,
                first_name: payer?.first_name || 'Admin',
                last_name: payer?.last_name || 'User',
                identification: {
                  type: payer?.identification?.type || 'CPF',
                  number: String(payer?.identification?.number || '').replace(/\D/g, '')
                },
                address: {
                  zip_code: String(payer?.address?.zip_code || '').replace(/\D/g, ''),
                  street_name: String(payer?.address?.street_name || ''),
                  street_number: String(payer?.address?.street_number || ''),
                  neighborhood: String(payer?.address?.neighborhood || ''),
                  city: String(payer?.address?.city || ''),
                  federal_unit: String(payer?.address?.federal_unit || '')
                }
              },
              description: `Assinatura Mensal - HUACONTROL`,
              external_reference: companyId,
              metadata: {
                company_id: companyId,
                plan: 'monthly'
              }
            }),
          });
          paymentResponse = await mpResponse.json();
          paymentStatus = paymentResponse.status;
          mpPaymentId = paymentResponse.id;
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
        }

        // Create subscription record
        await db.insert(subscriptions).values({
          companyId,
          plan,
          status: paymentStatus === 'approved' ? 'active' : 'pending',
          subscriberName: `${payer?.first_name || ''} ${payer?.last_name || ''}`.trim() || email,
          paymentMethod: payment_method_id,
          amount: total_amount,
          isLifetime,
          expiresAt,
          ticket_url: paymentResponse?.transaction_details?.external_resource_url,
        });

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
                <h1>Pagamento Confirmado!</h1>
                <p>Olá, ${companyAdmin.name || 'Administrador'}.</p>
                <p>Seu pagamento foi aprovado e sua conta já está totalmente liberada para uso.</p>
                <p>Obrigado por escolher a HuaControl!</p>
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
        });
      } else {
        return res.status(400).json({
          success: false,
          status: paymentStatus,
          message: 'Pagamento recusado',
          error: paymentResponse?.status_detail || 'Payment failed',
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
                      <h1>Pagamento Confirmado!</h1>
                      <p>Olá, ${companyAdmin.name || 'Administrador'}.</p>
                      <p>Recebemos a confirmação do seu pagamento e sua conta já está totalmente liberada para uso.</p>
                      <p>Obrigado por escolher a HuaControl!</p>
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
}
