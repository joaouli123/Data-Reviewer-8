import { Express } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db } from "../db";
import { users, companies, subscriptions, categories } from "../../shared/schema";
import { 
  findUserByUsername, 
  findUserByEmail, 
  verifyPassword, 
  generateToken, 
  createSession, 
  findCompanyById, 
  findCompanyByDocument, 
  createAuditLog,
  createCompany,
  createUser,
  findUserById,
  hashPassword
} from "../auth";
import { authMiddleware, checkRateLimit, recordLoginAttempt, AuthenticatedRequest } from "../middleware";

export function registerAuthRoutes(app: Express) {
  // Sign up
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { 
        companyName, 
        companyDocument, 
        username, 
        email, 
        password, 
        name, 
        plan,
        cep,
        rua,
        numero,
        cidade,
        estado
      } = req.body;
      
      if (!companyName || !companyDocument || !username || !password || !email) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Invalid email format" });
      }
      const existingCompany = await findCompanyByDocument(companyDocument);
      if (existingCompany) {
        if (existingCompany.paymentStatus === "approved") {
          return res.status(409).json({ error: "Essa empresa já possui um cadastro ativo", type: "DUPLICATE_PAID" });
        } else {
          return res.status(409).json({ error: "Cadastro encontrado com pagamento pendente", type: "DUPLICATE_PENDING", companyId: existingCompany.id, plan: "pro" });
        }
      }
      const company = await createCompany(companyName, companyDocument);
      const user = await createUser(company.id, username, email, password, name, "admin");
      
      // Update user with address fields
      await db.update(users)
        .set({ cep, rua, numero, cidade, estado } as any)
        .where(eq(users.id, user.id));
      
      const newSubscriptionPlan = plan || "pro";
      const amount = newSubscriptionPlan === "pro" ? "997.00" : (newSubscriptionPlan === "monthly" ? "97.00" : "0.00");
      const ticketUrl = `https://boletos.huacontrol.com.br/gerar?id=${company.id}`; // Exemplo de URL de boleto

      // Enviar e-mail de boas-vindas com o boleto
      try {
        const { Resend: ResendClient } = await import('resend');
        const resend = new ResendClient(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: 'Financeiro <contato@huacontrol.com.br>',
          to: email,
          subject: 'Conta Criada com Sucesso - Pagamento Pendente',
          html: `
            <p>Olá, ${name || username}</p>
            <p>Sua conta na HuaControl foi criada com sucesso.</p>
            <p>Para começar a usar o sistema, é necessário realizar o pagamento da sua assinatura.</p>
            <p>Plano: ${newSubscriptionPlan.toUpperCase()}</p>
            <p>Valor: R$ ${parseFloat(amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            <p>Você pode acessar seu boleto no link abaixo:</p>
            <p><a href="${ticketUrl}">${ticketUrl}</a></p>
            <p>Após a confirmação do pagamento, seu acesso será liberado automaticamente.</p>
          `
        });
      } catch (emailErr) {
        console.error("Error sending welcome email:", emailErr);
      }
      
      // Create default categories for the new company
      const defaultCategories = [
        { name: 'Vendas', type: 'income', color: '#10b981' },
        { name: 'Serviços', type: 'income', color: '#3b82f6' },
        { name: 'Outras Receitas', type: 'income', color: '#6366f1' },
        { name: 'Aluguel', type: 'expense', color: '#ef4444' },
        { name: 'Salários', type: 'expense', color: '#f59e0b' },
        { name: 'Fornecedores', type: 'expense', color: '#ec4899' },
        { name: 'Impostos', type: 'expense', color: '#8b5cf6' },
        { name: 'Marketing', type: 'expense', color: '#06b6d4' },
        { name: 'Outras Despesas', type: 'expense', color: '#64748b' }
      ];

      try {
        for (const cat of defaultCategories) {
          await db.insert(categories).values({ ...cat, companyId: company.id } as any);
        }
      } catch (catError) {
        console.error('Error creating default categories:', catError);
      }

      try {
        // Check if subscription already exists to prevent duplication on retries/errors
        const existingSubs = await db.select().from(subscriptions).where(eq(subscriptions.companyId, company.id)).limit(1);
        if (existingSubs.length === 0) {
          await db.insert(subscriptions).values({ 
            companyId: company.id, 
            plan: newSubscriptionPlan, 
            status: "active",
            amount: amount,
            subscriberName: name || username,
            createdAt: new Date()
          } as any);
          await db.update(companies).set({ subscriptionPlan: newSubscriptionPlan, paymentStatus: "approved" } as any).where(eq(companies.id, company.id));
        }
      } catch (err) {
        console.error("Error setting up company subscription:", err);
      }
      const token = generateToken({ userId: user.id, companyId: company.id, role: user.role });
      await createSession(user.id, company.id, token);
      res.status(201).json({
        user: { id: user.id, username: user.username, email: user.email, name: user.name, phone: user.phone, avatar: user.avatar, role: user.role, isSuperAdmin: user.isSuperAdmin, companyId: company.id, permissions: {} },
        company: { id: company.id, name: company.name, paymentStatus: company.paymentStatus, subscriptionPlan: newSubscriptionPlan, document: company.document },
        token
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to create account" });
    }
  });

  // Login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const ip = req.headers['x-forwarded-for']?.toString().split(',')[0] || req.socket.remoteAddress || 'unknown';
      const { username, password } = req.body;
      if (!username || !password) return res.status(400).json({ error: "Missing username or password" });
      const rateLimitCheck = await checkRateLimit(ip);
      if (!rateLimitCheck.allowed) return res.status(429).json({ error: "Too many login attempts. Please try again later." });
      let user = await findUserByUsername(username);
      if (!user) user = await findUserByEmail(username);
      if (!user) {
        await recordLoginAttempt(ip, username, false);
        return res.status(401).json({ error: "Credenciais inválidas" });
      }
      const isValid = await verifyPassword(password, user.password);
      if (!isValid) {
        await recordLoginAttempt(ip, username, false);
        return res.status(401).json({ error: "Invalid credentials" });
      }
      const company = await findCompanyById(user.companyId as string);
      
      // Super admin can always bypass company check
      if (!company && !user.isSuperAdmin) return res.status(404).json({ error: "Company not found" });
      
      await recordLoginAttempt(ip, username, true);
      
      if (company && company.paymentStatus !== "approved" && !user.isSuperAdmin) {
        return res.status(403).json({
          error: "PAGAMENTO_PENDENTE",
          message: "Seu acesso está bloqueado pois o pagamento da assinatura está pendente. Por favor, realize o pagamento do boleto ou entre em contato com o suporte.",
          supportNumber: "5554996231432"
        });
      }
      const token = generateToken({ userId: user.id, companyId: user.companyId as string, role: user.role, isSuperAdmin: user.isSuperAdmin });
      await createSession(user.id, user.companyId as string, token);
      await createAuditLog(user.id, user.companyId as string, "LOGIN", "user", user.id, undefined, ip, req.headers['user-agent'] || 'unknown');
      res.json({
        user: { id: user.id, username: user.username, email: user.email, name: user.name, phone: user.phone, avatar: user.avatar, role: user.role, isSuperAdmin: user.isSuperAdmin, companyId: user.companyId, cep: user.cep, rua: user.rua, numero: user.numero, complemento: user.complemento, estado: user.estado, cidade: user.cidade, permissions: user.permissions ? (typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions) : {} },
        company: company ? { id: company.id, name: company.name, paymentStatus: company.paymentStatus, subscriptionPlan: company.subscriptionPlan, document: company.document } : null,
        token, paymentPending: false
      });
    } catch (error) {
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.get("/api/auth/me", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const user = await findUserById(req.user.id);
      const company = await findCompanyById(req.user.companyId);
      if (!user || !company) return res.status(404).json({ error: "User or company not found" });
      res.json({
        user: { id: user.id, username: user.username, email: user.email, name: user.name, phone: user.phone, avatar: user.avatar, role: user.role, isSuperAdmin: user.isSuperAdmin, companyId: user.companyId, cep: user.cep, rua: user.rua, numero: user.numero, complemento: user.complemento, estado: user.estado, cidade: user.cidade, permissions: user.permissions ? JSON.parse(user.permissions) : {} },
        company: { id: company.id, name: company.name, paymentStatus: company.paymentStatus, subscriptionPlan: company.subscriptionPlan, document: company.document }
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // Update Profile
  app.patch("/api/auth/profile", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const { name, phone, email, cep, rua, numero, complemento, estado, cidade, avatar } = req.body;

      const updateData: any = { 
        name, 
        phone,
        cep, 
        rua, 
        numero, 
        complemento, 
        estado, 
        cidade, 
        updatedAt: new Date() 
      };
      
      if (email) updateData.email = email;
      if (avatar) updateData.avatar = avatar;

      const [updatedUser] = await db.update(users)
        .set(updateData)
        .where(eq(users.id, req.user.id))
        .returning();

      if (!updatedUser) return res.status(404).json({ error: "User not found" });

      res.json({
        user: { 
          id: updatedUser.id, 
          username: updatedUser.username, 
          email: updatedUser.email, 
          name: updatedUser.name, 
          phone: updatedUser.phone, 
          avatar: updatedUser.avatar, 
          cep: updatedUser.cep,
          rua: updatedUser.rua,
          numero: updatedUser.numero,
          complemento: updatedUser.complemento,
          estado: updatedUser.estado,
          cidade: updatedUser.cidade,
          role: updatedUser.role, 
          isSuperAdmin: updatedUser.isSuperAdmin, 
          companyId: updatedUser.companyId, 
          permissions: updatedUser.permissions ? JSON.parse(updatedUser.permissions) : {} 
        }
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  // Reset Password
  app.post("/api/auth/reset-password", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const { newPassword } = req.body;
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }

      const { hashPassword } = await import("../auth");
      const hashedPassword = await hashPassword(newPassword);

      await db.update(users)
        .set({ password: hashedPassword, updatedAt: new Date() })
        .where(eq(users.id, req.user.id));

      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  // Avatar Upload
  app.post("/api/auth/avatar", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const { avatarDataUrl } = req.body;
      
      const [updatedUser] = await db.update(users)
        .set({ avatar: avatarDataUrl })
        .where(eq(users.id, req.user.id))
        .returning();

      if (!updatedUser) return res.status(404).json({ error: "User not found" });

      res.json({
        user: { 
          id: updatedUser.id, 
          username: updatedUser.username, 
          email: updatedUser.email, 
          name: updatedUser.name, 
          phone: updatedUser.phone, 
          avatar: updatedUser.avatar, 
          role: updatedUser.role, 
          isSuperAdmin: updatedUser.isSuperAdmin, 
          companyId: updatedUser.companyId, 
          permissions: updatedUser.permissions ? JSON.parse(updatedUser.permissions) : {} 
        }
      });
    } catch (error) {
      console.error("Error uploading avatar:", error);
      res.status(500).json({ error: "Failed to upload avatar" });
    }
  });

  // Get Invoices
  app.get("/api/auth/invoices", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const companyInvoices = await db.select()
        .from(subscriptions)
        .where(eq(subscriptions.companyId, req.user.companyId))
        .orderBy(desc(subscriptions.createdAt));
      
      res.json(companyInvoices.map(inv => ({
        date: inv.createdAt,
        plan: inv.plan,
        amount: inv.amount,
        status: "paid"
      })));
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ error: "Failed to fetch invoices" });
    }
  });

  app.post("/api/auth/logout", authMiddleware, async (req: AuthenticatedRequest, res) => {
    res.json({ message: "Logged out" });
  });

  // User Management Routes
  app.get("/api/users", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      
      // Permitir apenas admin ou super_admin de ver usuários
      if (req.user.role !== 'admin' && !req.user.isSuperAdmin) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const companyUsers = await db.select()
        .from(users)
        .where(eq(users.companyId, req.user.companyId))
        .orderBy(desc(users.createdAt));
      
      res.json(companyUsers.map(u => ({
        id: u.id,
        username: u.username,
        email: u.email,
        name: u.name,
        role: u.role,
        status: u.status,
        permissions: u.permissions ? JSON.parse(u.permissions) : {}
      })));
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.post("/api/invitations", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      
      const [dbUser] = await db.select().from(users).where(eq(users.id, req.user.id)).limit(1);
      const perms = dbUser?.permissions ? (typeof dbUser.permissions === 'string' ? JSON.parse(dbUser.permissions) : dbUser.permissions) : {};
      
      if (req.user.role !== 'admin' && !req.user.isSuperAdmin && !perms.invite_users) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const { email, role, permissions, name, username, password } = req.body;

      // Define default permissions for operational users if none provided
      let finalPermissions = permissions;
      if (!finalPermissions && role === 'operational') {
        const { PERMISSIONS } = await import("../../shared/schema");
        finalPermissions = {
          [PERMISSIONS.VIEW_TRANSACTIONS]: true,
          [PERMISSIONS.CREATE_TRANSACTIONS]: true,
          [PERMISSIONS.EDIT_TRANSACTIONS]: true,
          [PERMISSIONS.DELETE_TRANSACTIONS]: true,
          [PERMISSIONS.IMPORT_BANK]: true,
          [PERMISSIONS.VIEW_CUSTOMERS]: true,
          [PERMISSIONS.MANAGE_CUSTOMERS]: true,
          [PERMISSIONS.VIEW_SUPPLIERS]: true,
          [PERMISSIONS.MANAGE_SUPPLIERS]: true,
          [PERMISSIONS.PRICE_CALC]: true
        };
      }

      if (!password || password.length < 6) {
        return res.status(400).json({ error: "Password is required and must be at least 6 characters" });
      }

      const hashedPassword = await hashPassword(password);
      const [newUser] = await db.insert(users).values({
        companyId: req.user.companyId,
        username: username || email,
        email,
        name,
        password: hashedPassword,
        role: role || "operational", // Default to operational as requested
        permissions: finalPermissions ? JSON.stringify(finalPermissions) : "{}",
        status: "active"
      }).returning();

      res.status(201).json(newUser);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  app.delete("/api/users/:id", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      if (req.user.id === req.params.id) return res.status(400).json({ error: "Cannot delete yourself" });

      await db.delete(users).where(and(eq(users.id, req.params.id), eq(users.companyId, req.user.companyId)));
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  app.patch("/api/users/:id/permissions", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const { permissions } = req.body;

      await db.update(users)
        .set({ permissions: JSON.stringify(permissions), updatedAt: new Date() })
        .where(and(eq(users.id, req.params.id), eq(users.companyId, req.user.companyId)));

      res.json({ message: "Permissions updated successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to update permissions" });
    }
  });
}
