import { Express, Request, Response } from "express";
import { db } from "../db";
import { eq, sql } from "drizzle-orm";
import { companies, subscriptions, users } from "../../shared/schema";

const MERCADOPAGO_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;

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
            }),
          });
          paymentResponse = await mpResponse.json();
          paymentStatus = paymentResponse.status;
          mpPaymentId = paymentResponse.id;
        }
      } else if (payment_method_id === 'boleto' || payment_method_id === 'bolbradesco') {
        // Boleto payment
        if (isTestMode) {
          // Simulate approved boleto for test mode
          paymentResponse = {
            id: `BOLETO_TEST_${Date.now()}`,
            status: 'approved',
            status_detail: 'accredited',
          };
          paymentStatus = 'approved';
          mpPaymentId = paymentResponse.id;
        } else {
          const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
              'Content-Type': 'application/json',
              'X-Idempotency-Key': `${companyId}-${Date.now()}`,
            },
            body: JSON.stringify({
              transaction_amount: parseFloat(total_amount),
              payment_method_id: 'bolbradesco',
              payer: {
                email: email,
                first_name: payer?.first_name || '',
                last_name: payer?.last_name || '',
              },
              description: `Assinatura ${plan.toUpperCase()} - HUACONTROL`,
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
      if (paymentStatus === 'approved') {
        // Update company status
        await db.update(companies)
          .set({
            subscriptionStatus: 'active',
            paymentStatus: 'approved',
            subscriptionPlan: plan,
            updatedAt: new Date(),
          })
          .where(eq(companies.id, companyId));

        // Create subscription record
        await db.insert(subscriptions).values({
          companyId,
          plan,
          status: 'active',
          subscriberName: `${payer?.first_name || ''} ${payer?.last_name || ''}`.trim() || email,
          paymentMethod: payment_method_id,
          amount: total_amount,
          isLifetime,
          expiresAt,
        });

        console.log("[Payment] Subscription created successfully");

        return res.json({
          success: true,
          status: 'approved',
          message: 'Pagamento aprovado com sucesso!',
          paymentId: mpPaymentId,
        });
      } else if (paymentStatus === 'pending' || paymentStatus === 'in_process') {
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
      const { type, data } = req.body;
      
      console.log("[Webhook] Received notification:", { type, data });

      if (type === 'payment') {
        const paymentId = data?.id;
        
        if (paymentId && MERCADOPAGO_ACCESS_TOKEN) {
          // Fetch payment details from Mercado Pago
          const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
            headers: {
              'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
            },
          });
          
          const payment = await response.json();
          console.log("[Webhook] Payment details:", { status: payment.status, id: payment.id });
          
          // Update subscription status based on payment status
          if (payment.status === 'approved') {
            // Find and update subscription
            // Note: In production, store payment ID in subscription for lookup
          }
        }
      }

      res.sendStatus(200);
    } catch (error) {
      console.error("[Webhook] Error:", error);
      res.sendStatus(500);
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

      // Return success with updated company info (no new token needed in this flow)
      res.json({
        success: true,
        company: updatedCompany,
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
