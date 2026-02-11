import { Express } from "express";
import { db } from "../db";
import { eq, desc, sql, and } from "drizzle-orm";
import { authMiddleware, requireSuperAdmin, AuthenticatedRequest } from "../middleware";
import { companies, users, subscriptions, auditLogs } from "../../shared/schema";
import { generateBoletoForCompany } from "../utils/boleto";

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export function registerAdminRoutes(app: Express) {
  
  // Get all companies with subscription info
  app.get("/api/admin/companies", authMiddleware, requireSuperAdmin, async (req, res) => {
    try {
      const allCompanies = await db.select().from(companies);
      res.json(allCompanies);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch companies" });
    }
  });

  // Get all users with company names
  app.get("/api/admin/users", authMiddleware, requireSuperAdmin, async (req, res) => {
    try {
      const allUsers = await db
        .select({
          id: users.id,
          companyId: users.companyId,
          username: users.username,
          email: users.email,
          name: users.name,
          phone: users.phone,
          role: users.role,
          isSuperAdmin: users.isSuperAdmin,
          status: users.status,
          createdAt: users.createdAt,
          companyName: companies.name,
        })
        .from(users)
        .leftJoin(companies, eq(users.companyId, companies.id))
        .orderBy(desc(users.createdAt));
      
      res.json(allUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Update company status/payment
  app.patch("/api/admin/companies/:id", authMiddleware, requireSuperAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const body = req.body;
      
      // Whitelist allowed fields to prevent mass assignment
      const allowedFields = ['name', 'subscriptionStatus', 'paymentStatus', 'subscriptionPlan'] as const;
      const updates: Record<string, any> = {};
      for (const field of allowedFields) {
        if (body[field] !== undefined) {
          updates[field] = body[field];
        }
      }
      
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: "No valid fields to update" });
      }
      
      await db.update(companies).set({
        ...updates,
        updatedAt: new Date()
      }).where(eq(companies.id, id));

      if (updates.subscriptionStatus || updates.paymentStatus) {
        const [latestSub] = await db
          .select({ id: subscriptions.id, status: subscriptions.status })
          .from(subscriptions)
          .where(eq(subscriptions.companyId, id))
          .orderBy(desc(subscriptions.createdAt))
          .limit(1);

        if (latestSub) {
          const shouldActivate = updates.subscriptionStatus === 'active' || updates.paymentStatus === 'approved';
          const nextStatus = shouldActivate ? 'active' : 'pending';

          await db.update(subscriptions)
            .set({ status: nextStatus, updatedAt: new Date() })
            .where(eq(subscriptions.id, latestSub.id));
        }
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update company" });
    }
  });

  // Resend boleto with custom due date
  app.post("/api/admin/subscriptions/:id/resend-boleto", authMiddleware, requireSuperAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { dueDate } = req.body;

      if (!dueDate) {
        return res.status(400).json({ error: "Due date is required" });
      }

      const parsedDueDate = new Date(dueDate);
      if (Number.isNaN(parsedDueDate.getTime())) {
        return res.status(400).json({ error: "Invalid due date" });
      }

      parsedDueDate.setHours(23, 59, 59, 999);
      
      const [subscription] = await db
        .select({
          id: subscriptions.id,
          companyId: subscriptions.companyId,
          subscriberName: subscriptions.subscriberName,
          plan: subscriptions.plan,
          amount: subscriptions.amount,
          companyName: companies.name,
          ticketUrl: subscriptions.ticket_url,
        })
        .from(subscriptions)
        .leftJoin(companies, eq(subscriptions.companyId, companies.id))
        .where(eq(subscriptions.id, id))
        .limit(1);

      if (!subscription) {
        return res.status(404).json({ error: "Subscription not found" });
      }

      // Find the admin user of the company to send the email to
      const [companyAdmin] = await db
        .select()
        .from(users)
        .where(and(eq(users.companyId, subscription.companyId), eq(users.role, "admin")))
        .limit(1);

      const emailTo = companyAdmin?.email;

      if (!emailTo) {
        return res.status(400).json({ error: "No admin email found for this company" });
      }

      console.log(`[Admin] Resending boleto for subscription ${id} to ${emailTo} with due date ${dueDate}`);

      const newTicketUrl = await generateBoletoForCompany({
        companyId: subscription.companyId,
        amount: subscription.amount,
        plan: subscription.plan,
        expirationDate: parsedDueDate,
      });

      if (!newTicketUrl) {
        return res.status(500).json({ error: "Failed to generate boleto" });
      }

      await db.update(subscriptions)
        .set({
          ticket_url: newTicketUrl,
          expiresAt: parsedDueDate,
          status: 'pending',
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, id));
      
      try {
        await resend.emails.send({
          from: 'Financeiro <contato@huacontrol.com.br>',
          to: emailTo,
          subject: `Novo Boleto Gerado - ${subscription.companyName}`,
          html: `
            <p>Olá, ${companyAdmin?.name || 'Administrador'}</p>
            <p>Um novo boleto foi gerado para sua assinatura com vencimento em ${parsedDueDate.toLocaleDateString('pt-BR')}.</p>
            <p>Valor: R$ ${parseFloat(subscription.amount || "0").toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <p>Acesse seu boleto aqui: <a href="${newTicketUrl}">${newTicketUrl}</a></p>
          `
        });
      } catch (emailError) {
        console.error(`[Admin] Failed to send email to ${emailTo}:`, emailError);
        return res.status(500).json({ error: "Failed to send email via Resend" });
      }
      
      res.json({ 
        success: true, 
        message: `Boleto enviado para ${emailTo} com sucesso! Vencimento: ${dueDate}` 
      });
    } catch (error) {
      console.error("Error resending boleto:", error);
      res.status(500).json({ error: "Failed to resend boleto" });
    }
  });

  // Resend welcome email
  app.post("/api/admin/subscriptions/:id/resend-welcome", authMiddleware, requireSuperAdmin, async (req, res) => {
    try {
      const { id } = req.params;

      const planLabels: Record<string, string> = {
        monthly: "Mensal",
        basic: "Básico",
        pro: "Pro",
        enterprise: "Enterprise",
      };
      const planAmounts: Record<string, string> = {
        monthly: "215.00",
        basic: "0.00",
        pro: "997.00",
        enterprise: "0.00",
      };

      const [subscription] = await db
        .select({
          id: subscriptions.id,
          companyId: subscriptions.companyId,
          plan: subscriptions.plan,
          amount: subscriptions.amount,
          companyName: companies.name,
        })
        .from(subscriptions)
        .leftJoin(companies, eq(subscriptions.companyId, companies.id))
        .where(eq(subscriptions.id, id))
        .limit(1);

      if (!subscription) {
        return res.status(404).json({ error: "Subscription not found" });
      }

      const [companyAdmin] = await db
        .select({ email: users.email, name: users.name })
        .from(users)
        .where(and(eq(users.companyId, subscription.companyId), eq(users.role, "admin")))
        .limit(1);

      const emailTo = companyAdmin?.email;
      if (!emailTo) {
        return res.status(400).json({ error: "No admin email found for this company" });
      }

      const appUrl = process.env.APP_URL || 'https://huacontrol.com.br';
      const planLabel = planLabels[subscription.plan || ''] || (subscription.plan ? subscription.plan.toUpperCase() : 'N/A');
      const amount = planAmounts[subscription.plan || ''] || (subscription.amount ? String(subscription.amount) : '0.00');
      const checkoutUrl = `${appUrl}/checkout?plan=${encodeURIComponent(subscription.plan || 'monthly')}`;

      await resend.emails.send({
        from: 'Boas-vindas <contato@huacontrol.com.br>',
        to: emailTo,
        subject: `Conta criada com sucesso - Pagamento pendente`,
        html: `
          <div style="font-family: sans-serif; color: #333;">
            <h2 style="margin-bottom: 12px;">Conta criada com sucesso</h2>
            <p>Olá, ${companyAdmin?.name || 'Administrador'}</p>
            <p>Sua conta na HuaControl foi criada com sucesso.</p>
            <p>Para começar a usar o sistema, é necessário realizar o pagamento da sua assinatura.</p>
            <p><strong>Plano:</strong> ${planLabel}</p>
            <p><strong>Valor:</strong> R$ ${parseFloat(amount || "0").toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <p>Para emitir o boleto, acesse o checkout:</p>
            <p><a href="${checkoutUrl}">${checkoutUrl}</a></p>
            <p>Após a confirmação do pagamento, seu acesso será liberado automaticamente.</p>
            <p>Compensação bancária do boleto: até 1 dia útil.</p>
            <br/>
            <p>Atenciosamente,<br/>Equipe HuaControl</p>
          </div>
        `
      });

      res.json({ success: true, message: `E-mail reenviado para ${emailTo}` });
    } catch (error) {
      console.error("Error resending welcome email:", error);
      res.status(500).json({ error: "Failed to resend welcome email" });
    }
  });

  // Test email endpoint
  app.post("/api/admin/test-email", authMiddleware, requireSuperAdmin, async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: "Email is required" });

      console.log(`[Admin] Sending test email to ${email}`);

      // Enviar e-mail de teste de criação de conta (boas-vindas)
      const emailResult = await resend.emails.send({
        from: 'Financeiro <contato@huacontrol.com.br>',
        to: email,
        subject: 'Conta Criada com Sucesso - Pagamento Pendente',
        html: `
          <p>Olá,</p>
          <p>Sua conta foi criada com sucesso. Para começar a usar o sistema, é necessário realizar o pagamento da sua assinatura.</p>
          <p>Plano: PRO</p>
          <p>Valor: R$ 997,00</p>
          <p>Acesse seu boleto no link abaixo:</p>
          <p><a href="https://boletos.huacontrol.com.br/exemplo">https://boletos.huacontrol.com.br/exemplo</a></p>
          <p>Após a confirmação do pagamento, seu acesso será liberado automaticamente.</p>
        `
      });

      console.log(`[Admin] Email send result:`, emailResult);

      if (emailResult.error) {
        console.error(`[Admin] Resend error:`, emailResult.error);
        return res.status(500).json({ error: "Resend API error", details: emailResult.error });
      }

      res.json({ success: true, message: `E-mail de teste enviado para ${email}`, id: emailResult.data?.id });
    } catch (error: any) {
      console.error("Error sending test email:", error);
      res.status(500).json({ error: "Failed to send test email" });
    }
  });

  // Get all subscriptions with company info
  app.get("/api/admin/subscriptions", authMiddleware, requireSuperAdmin, async (req, res) => {
    try {
      const allSubscriptions = await db
        .select({
          id: subscriptions.id,
          companyId: subscriptions.companyId,
          plan: subscriptions.plan,
          status: subscriptions.status,
          subscriberName: subscriptions.subscriberName,
          paymentMethod: subscriptions.paymentMethod,
          amount: subscriptions.amount,
          isLifetime: subscriptions.isLifetime,
          expiresAt: subscriptions.expiresAt,
          createdAt: subscriptions.createdAt,
          ticket_url: subscriptions.ticket_url,
          companyName: companies.name,
          companyDocument: companies.document,
          companySubscriptionStatus: companies.subscriptionStatus,
          companyPaymentStatus: companies.paymentStatus,
        })
        .from(subscriptions)
        .leftJoin(companies, eq(subscriptions.companyId, companies.id))
        .orderBy(desc(subscriptions.createdAt));
      
      res.json(allSubscriptions);
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
      res.status(500).json({ error: "Failed to fetch subscriptions" });
    }
  });

  // Get dashboard metrics (uses SQL aggregations for performance)
  app.get("/api/admin/metrics", authMiddleware, requireSuperAdmin, async (req, res) => {
    try {
      // Company metrics via SQL aggregation
      const companyMetrics = await db.execute(sql`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE subscription_status = 'active')::int AS active,
          COUNT(*) FILTER (WHERE subscription_status = 'suspended')::int AS suspended,
          COUNT(*) FILTER (WHERE subscription_status = 'cancelled')::int AS cancelled
        FROM companies
      `);
      const cm = (companyMetrics as any)?.rows?.[0] || { total: 0, active: 0, suspended: 0, cancelled: 0 };

      // Subscription metrics via SQL aggregation
      const subMetrics = await db.execute(sql`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (
            WHERE status NOT IN ('blocked', 'cancelled')
              AND (is_lifetime = true OR expires_at > NOW() OR status = 'active')
          )::int AS active,
          COUNT(*) FILTER (
            WHERE is_lifetime IS NOT TRUE AND expires_at <= NOW()
          )::int AS expired,
          COUNT(*) FILTER (WHERE status = 'blocked')::int AS blocked,
          COUNT(*) FILTER (WHERE is_lifetime = true)::int AS lifetime,
          COALESCE(SUM(CASE
            WHEN status NOT IN ('blocked', 'cancelled')
              AND (is_lifetime = true OR expires_at > NOW() OR status = 'active')
            THEN COALESCE(amount, 0)
            ELSE 0
          END), 0)::numeric AS mrr
        FROM subscriptions
      `);
      const sm = (subMetrics as any)?.rows?.[0] || { total: 0, active: 0, expired: 0, blocked: 0, lifetime: 0, mrr: 0 };

      // Plan distribution via SQL
      const planMetrics = await db.execute(sql`
        SELECT
          COUNT(*) FILTER (WHERE plan = 'basic')::int AS basic,
          COUNT(*) FILTER (WHERE plan = 'monthly')::int AS monthly,
          COUNT(*) FILTER (WHERE plan = 'pro')::int AS pro,
          COUNT(*) FILTER (WHERE plan = 'enterprise')::int AS enterprise
        FROM subscriptions
      `);
      const pm = (planMetrics as any)?.rows?.[0] || { basic: 0, monthly: 0, pro: 0, enterprise: 0 };

      // Payment method distribution via SQL
      const payMethodMetrics = await db.execute(sql`
        SELECT COALESCE(payment_method, 'Outros') AS method, COUNT(*)::int AS count
        FROM subscriptions
        GROUP BY COALESCE(payment_method, 'Outros')
      `);
      const paymentMethods: Record<string, number> = {};
      for (const row of ((payMethodMetrics as any)?.rows ?? [])) {
        paymentMethods[row.method] = row.count;
      }

      // User metrics via SQL aggregation
      const userMetrics = await db.execute(sql`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE status = 'active')::int AS active,
          COUNT(*) FILTER (WHERE status = 'suspended')::int AS suspended,
          COUNT(*) FILTER (WHERE status = 'inactive')::int AS inactive,
          COUNT(*) FILTER (WHERE role = 'admin')::int AS admins,
          COUNT(*) FILTER (WHERE company_id IS NOT NULL)::int AS with_company
        FROM users
      `);
      const um = (userMetrics as any)?.rows?.[0] || { total: 0, active: 0, suspended: 0, inactive: 0, admins: 0, with_company: 0 };

      const mrrValue = parseFloat(String(sm.mrr || 0));
      const activeCompanies = Number(cm.active || 0);
      const churnRate = Number(cm.total) > 0
        ? (((Number(cm.cancelled) + Number(cm.suspended)) / Number(cm.total)) * 100)
        : 0;
      const avgUsersPerCompany = activeCompanies > 0
        ? (Number(um.with_company) / activeCompanies)
        : 0;

      res.json({
        companies: {
          total: Number(cm.total),
          active: activeCompanies,
          suspended: Number(cm.suspended),
          cancelled: Number(cm.cancelled),
        },
        subscriptions: {
          total: Number(sm.total),
          active: Number(sm.active),
          expired: Number(sm.expired),
          blocked: Number(sm.blocked),
          lifetime: Number(sm.lifetime),
        },
        revenue: {
          mrr: mrrValue,
          arr: mrrValue * 12,
        },
        plans: {
          basic: Number(pm.basic),
          monthly: Number(pm.monthly),
          pro: Number(pm.pro),
          enterprise: Number(pm.enterprise),
        },
        paymentMethods,
        users: {
          total: Number(um.total),
          active: Number(um.active),
          suspended: Number(um.suspended),
          inactive: Number(um.inactive),
          admins: Number(um.admins),
        },
        kpis: {
          churnRate: parseFloat(churnRate.toFixed(1)),
          avgUsersPerCompany: parseFloat(avgUsersPerCompany.toFixed(1)),
        }
      });
    } catch (error) {
      console.error("Error fetching metrics:", error);
      res.status(500).json({ error: "Failed to fetch metrics" });
    }
  });

  // Update user
  app.patch("/api/admin/users/:id", authMiddleware, requireSuperAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const body = req.body;
      
      // Whitelist allowed fields to prevent mass assignment
      // Notably: password, isSuperAdmin, id, companyId are NOT allowed
      const allowedFields = ['name', 'firstName', 'lastName', 'email', 'phone', 'role', 'status', 'permissions'] as const;
      const updates: Record<string, any> = {};
      for (const field of allowedFields) {
        if (body[field] !== undefined) {
          updates[field] = body[field];
        }
      }
      
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: "No valid fields to update" });
      }
      
      await db.update(users).set({
        ...updates,
        updatedAt: new Date()
      }).where(eq(users.id, id));
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  // Delete user
  app.delete("/api/admin/users/:id", authMiddleware, requireSuperAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await db.delete(users).where(eq(users.id, id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // Reset user password
  app.post("/api/admin/users/:id/reset-password", authMiddleware, requireSuperAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;
      
      if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }

      const { hashPassword } = await import("../auth");
      const hashedPassword = await hashPassword(newPassword);
      
      await db.update(users).set({
        password: hashedPassword,
        updatedAt: new Date()
      }).where(eq(users.id, id));
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  // Update subscription
  app.patch("/api/admin/subscriptions/:id", authMiddleware, requireSuperAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const body = req.body;

      // Whitelist allowed fields to prevent mass assignment
      const allowedFields = ['plan', 'status', 'subscriberName', 'paymentMethod', 'amount', 'isLifetime', 'expiresAt', 'ticket_url'] as const;
      const updates: Record<string, any> = {};
      for (const field of allowedFields) {
        if (body[field] !== undefined) {
          updates[field] = body[field];
        }
      }

      const [currentSub] = await db
        .select({ id: subscriptions.id, companyId: subscriptions.companyId })
        .from(subscriptions)
        .where(eq(subscriptions.id, id))
        .limit(1);

      if (!currentSub) {
        return res.status(404).json({ error: "Subscription not found" });
      }
      
      await db.update(subscriptions).set({
        ...updates,
        updatedAt: new Date()
      }).where(eq(subscriptions.id, id));

      if (updates.status) {
        const isActive = updates.status === 'active';
        await db.update(companies)
          .set({
            paymentStatus: isActive ? 'approved' : 'pending',
            subscriptionStatus: isActive ? 'active' : 'suspended',
            updatedAt: new Date(),
          })
          .where(eq(companies.id, currentSub.companyId));
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update subscription" });
    }
  });

  // Delete subscription
  app.delete("/api/admin/subscriptions/:id", authMiddleware, requireSuperAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await db.delete(subscriptions).where(eq(subscriptions.id, id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete subscription" });
    }
  });

  // Audit logs
  app.get("/api/admin/audit-logs", authMiddleware, requireSuperAdmin, async (req, res) => {
    try {
      const logs = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(100);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch audit logs" });
    }
  });
}
