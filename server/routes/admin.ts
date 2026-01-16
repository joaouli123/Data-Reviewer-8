import { Express } from "express";
import { db } from "../db";
import { eq, desc, sql, and } from "drizzle-orm";
import { authMiddleware, requireSuperAdmin, AuthenticatedRequest } from "../middleware";
import { companies, users, subscriptions, auditLogs } from "../../shared/schema";

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
      const updates = req.body;
      
      await db.update(companies).set({
        ...updates,
        updatedAt: new Date()
      }).where(eq(companies.id, id));
      
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
      
      const [subscription] = await db
        .select({
          id: subscriptions.id,
          companyId: subscriptions.companyId,
          subscriberName: subscriptions.subscriberName,
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
      
      try {
        await resend.emails.send({
          from: 'Financeiro <contato@huacontrol.com.br>',
          to: emailTo,
          subject: `Novo Boleto Gerado - ${subscription.companyName}`,
          html: `
            <p>Olá, ${companyAdmin?.name || 'Administrador'}</p>
            <p>Um novo boleto foi gerado para sua assinatura com vencimento em ${new Date(dueDate).toLocaleDateString('pt-BR')}.</p>
            <p>Valor: R$ ${parseFloat(subscription.amount || "0").toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            ${subscription.ticketUrl ? `<p>Acesse seu boleto aqui: <a href="${subscription.ticketUrl}">${subscription.ticketUrl}</a></p>` : ''}
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
    } catch (error) {
      console.error("Error sending test email:", error);
      res.status(500).json({ error: "Failed to send test email", message: error.message });
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

  // Get dashboard metrics
  app.get("/api/admin/metrics", authMiddleware, requireSuperAdmin, async (req, res) => {
    try {
      const allCompanies = await db.select().from(companies);
      const allUsers = await db.select().from(users);
      const allSubscriptions = await db.select().from(subscriptions);

      // Calculate metrics
      const now = new Date();
      
      // Company metrics
      const activeCompanies = allCompanies.filter(c => c.subscriptionStatus === 'active').length;
      const suspendedCompanies = allCompanies.filter(c => c.subscriptionStatus === 'suspended').length;
      const cancelledCompanies = allCompanies.filter(c => c.subscriptionStatus === 'cancelled').length;

      // Subscription metrics
      const activeSubscriptions = allSubscriptions.filter(s => {
        if (s.status === 'blocked' || s.status === 'cancelled') return false;
        if (s.isLifetime) return true;
        if (s.expiresAt) return new Date(s.expiresAt) > now;
        return s.status === 'active';
      });

      const expiredSubscriptions = allSubscriptions.filter(s => {
        if (s.isLifetime) return false;
        if (s.expiresAt) return new Date(s.expiresAt) <= now;
        return false;
      });

      const blockedSubscriptions = allSubscriptions.filter(s => s.status === 'blocked').length;
      const lifetimeSubscriptions = allSubscriptions.filter(s => s.isLifetime).length;

      // Revenue metrics (MRR - Monthly Recurring Revenue)
      const mrr = activeSubscriptions.reduce((sum, s) => {
        const amount = parseFloat(String(s.amount || 0));
        return sum + amount;
      }, 0);

      // Plan distribution
      const planDistribution = {
        basic: allSubscriptions.filter(s => s.plan === 'basic').length,
        pro: allSubscriptions.filter(s => s.plan === 'pro').length,
        enterprise: allSubscriptions.filter(s => s.plan === 'enterprise').length,
      };

      // Payment method distribution
      const paymentMethods: Record<string, number> = {};
      allSubscriptions.forEach(s => {
        const method = s.paymentMethod || 'Outros';
        paymentMethods[method] = (paymentMethods[method] || 0) + 1;
      });

      // User metrics
      const activeUsers = allUsers.filter(u => u.status === 'active').length;
      const suspendedUsers = allUsers.filter(u => u.status === 'suspended').length;
      const inactiveUsers = allUsers.filter(u => u.status === 'inactive').length;
      const admins = allUsers.filter(u => u.role === 'admin').length;

      // Churn rate (cancelled / total)
      const churnRate = allCompanies.length > 0 
        ? ((cancelledCompanies + suspendedCompanies) / allCompanies.length * 100).toFixed(1) 
        : '0.0';

      // Average users per company
      const avgUsersPerCompany = activeCompanies > 0 
        ? (allUsers.filter(u => u.companyId).length / activeCompanies).toFixed(1) 
        : '0';

      res.json({
        companies: {
          total: allCompanies.length,
          active: activeCompanies,
          suspended: suspendedCompanies,
          cancelled: cancelledCompanies,
        },
        subscriptions: {
          total: allSubscriptions.length,
          active: activeSubscriptions.length,
          expired: expiredSubscriptions.length,
          blocked: blockedSubscriptions,
          lifetime: lifetimeSubscriptions,
        },
        revenue: {
          mrr,
          arr: mrr * 12,
        },
        plans: planDistribution,
        paymentMethods,
        users: {
          total: allUsers.length,
          active: activeUsers,
          suspended: suspendedUsers,
          inactive: inactiveUsers,
          admins,
        },
        kpis: {
          churnRate: parseFloat(churnRate),
          avgUsersPerCompany: parseFloat(avgUsersPerCompany),
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
      const updates = req.body;
      
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
      
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }

      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
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
      const updates = req.body;
      
      await db.update(subscriptions).set({
        ...updates,
        updatedAt: new Date()
      }).where(eq(subscriptions.id, id));
      
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
