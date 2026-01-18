import { Express } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db } from "../db";
import { users, companies, subscriptions, categories, invitations, passwordResets } from "../../shared/schema";
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
  hashPassword,
  checkSubscriptionStatus
} from "../auth";
import { authMiddleware, checkRateLimit, recordLoginAttempt, AuthenticatedRequest, requirePermission, createSimpleRateLimiter } from "../middleware";
import { generateBoletoForCompany } from "../utils/boleto";

export function registerAuthRoutes(app: Express) {
  const signupRateLimiter = createSimpleRateLimiter({ windowMs: 10 * 60 * 1000, max: 5, keyPrefix: "signup" });
  const resetRateLimiter = createSimpleRateLimiter({ windowMs: 10 * 60 * 1000, max: 5, keyPrefix: "password-reset" });

  // Sign up
  app.post("/api/auth/signup", signupRateLimiter, async (req, res) => {
    try {
      const { 
        companyName, 
        companyDocument, 
        username, 
        email, 
        password, 
        name, 
        firstName,
        lastName,
        plan,
        phone,
        cep,
        rua,
        numero,
        bairro,
        cidade,
        estado
      } = req.body;

      const resolvedFullName = (name || [firstName, lastName].filter(Boolean).join(" ")).trim();
      const resolvedFirstName = firstName || resolvedFullName.split(" ")[0] || username;
      const resolvedLastName = lastName || resolvedFullName.split(" ").slice(1).join(" ").trim();
      const normalizedFullName = resolvedFullName || `${resolvedFirstName}`.trim();
      
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
          const existingPlan = existingCompany.subscriptionPlan || plan || "monthly";
          let existingAdmins = await db
            .select()
            .from(users)
            .where(and(eq(users.companyId, existingCompany.id), eq(users.role, "admin")))
            .limit(1);

          let existingAdmin = existingAdmins[0];

          if (!existingAdmin && username && email && password) {
            const createdAdmin = await createUser(
              existingCompany.id,
              username,
              email,
              password,
              normalizedFullName,
              "admin",
              false,
              resolvedFirstName,
              resolvedLastName
            );
            await db.update(users)
              .set({ 
                phone, 
                cep, 
                rua, 
                numero, 
                complemento: bairro, 
                cidade, 
                estado,
                firstName: resolvedFirstName,
                lastName: resolvedLastName,
                name: normalizedFullName,
              } as any)
              .where(eq(users.id, createdAdmin.id));

            existingAdmins = await db
              .select()
              .from(users)
              .where(and(eq(users.companyId, existingCompany.id), eq(users.role, "admin")))
              .limit(1);

            existingAdmin = existingAdmins[0];
          }

          return res.status(200).json({
            existingPending: true,
            message: "Cadastro encontrado com pagamento pendente",
            company: {
              id: existingCompany.id,
              name: existingCompany.name,
              document: existingCompany.document,
              subscriptionPlan: existingPlan,
              paymentStatus: existingCompany.paymentStatus,
            },
            user: existingAdmin
              ? {
                  id: existingAdmin.id,
                  username: existingAdmin.username,
                  email: existingAdmin.email,
                  name: existingAdmin.name,
                  firstName: existingAdmin.firstName,
                  lastName: existingAdmin.lastName,
                  cep: existingAdmin.cep,
                  rua: existingAdmin.rua,
                  numero: existingAdmin.numero,
                  complemento: existingAdmin.complemento,
                  cidade: existingAdmin.cidade,
                  estado: existingAdmin.estado,
                }
              : {
                  id: null,
                  username,
                  email,
                  name: normalizedFullName,
                  firstName: resolvedFirstName,
                  lastName: resolvedLastName,
                },
            plan: existingPlan,
          });
        }
      }
      const company = await createCompany(companyName, companyDocument);
      const user = await createUser(
        company.id,
        username,
        email,
        password,
        normalizedFullName,
        "admin",
        false,
        resolvedFirstName,
        resolvedLastName
      );
      
      // Update user with address fields
      await db.update(users)
        .set({ 
          phone, 
          cep, 
          rua, 
          numero, 
          complemento: bairro, 
          cidade, 
          estado,
          firstName: resolvedFirstName,
          lastName: resolvedLastName,
          name: normalizedFullName,
        } as any)
        .where(eq(users.id, user.id));
      
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

      const newSubscriptionPlan = plan || "monthly";
      const amount = planAmounts[newSubscriptionPlan] || "0.00";
      const planLabel = planLabels[newSubscriptionPlan] || newSubscriptionPlan.toUpperCase();

      const origin = (req.headers.origin || '').toString();
      const referer = (req.headers.referer || '').toString();
      let appUrl = origin;
      if (!appUrl && referer) {
        try {
          appUrl = new URL(referer).origin;
        } catch {
          appUrl = '';
        }
      }
      if (!appUrl) {
        appUrl = process.env.APP_URL || 'https://huacontrol.com.br';
      }

      const checkoutUrl = `${appUrl}/checkout?plan=${encodeURIComponent(newSubscriptionPlan)}`;
      let boletoUrl: string | null = null;

      // Enviar e-mail de boas-vindas com o boleto
      try {
        try {
          boletoUrl = await generateBoletoForCompany({
            companyId: company.id,
            amount,
            plan: newSubscriptionPlan,
            payer: {
              email,
              name: normalizedFullName || username,
              firstName: resolvedFirstName,
              lastName: resolvedLastName,
              document: companyDocument,
              cep,
              rua,
              numero,
              bairro,
              cidade,
              estado,
            },
          });

          if (boletoUrl) {
            await db.update(subscriptions)
              .set({ ticket_url: boletoUrl, updatedAt: new Date() } as any)
              .where(eq(subscriptions.companyId, company.id));
          }
        } catch (boletoErr) {
          console.error("Error generating boleto on signup:", boletoErr);
        }

        const { Resend: ResendClient } = await import('resend');
        const resend = new ResendClient(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: 'Financeiro <contato@huacontrol.com.br>',
          to: email,
          subject: 'Conta criada com sucesso - Pagamento pendente',
          html: `
            <div style="font-family: sans-serif; color: #333;">
              <h2 style="margin-bottom: 12px;">Conta criada com sucesso</h2>
              <p>Olá, ${name || username}</p>
              <p>Sua conta na HuaControl foi criada com sucesso.</p>
              <p>Para começar a usar o sistema, é necessário realizar o pagamento da sua assinatura.</p>
              <p><strong>Plano:</strong> ${planLabel}</p>
              <p><strong>Valor:</strong> R$ ${parseFloat(amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              ${boletoUrl
                ? `<p>Seu boleto já está disponível:</p><p><a href="${boletoUrl}">${boletoUrl}</a></p>`
                : `<p>Para emitir o boleto, acesse o checkout:</p><p><a href="${checkoutUrl}">${checkoutUrl}</a></p>`
              }
              <p>Após a confirmação do pagamento, seu acesso será liberado automaticamente.</p>
              <p>Compensação bancária do boleto: até 1 dia útil.</p>
              <br/>
              <p>Atenciosamente,<br/>Equipe HuaControl</p>
            </div>
          `
        });
      } catch (emailErr) {
        console.error("Error sending welcome email:", emailErr);
      }
      
      // Create default categories for the new company
      const defaultCategories = [
        { name: 'Vendas', type: 'entrada', color: '#10b981' },
        { name: 'Serviços', type: 'entrada', color: '#3b82f6' },
        { name: 'Outras Receitas', type: 'entrada', color: '#6366f1' },
        { name: 'Aluguel', type: 'saida', color: '#ef4444' },
        { name: 'Salários', type: 'saida', color: '#f59e0b' },
        { name: 'Fornecedores', type: 'saida', color: '#ec4899' },
        { name: 'Impostos', type: 'saida', color: '#8b5cf6' },
        { name: 'Marketing', type: 'saida', color: '#06b6d4' },
        { name: 'Outras Despesas', type: 'saida', color: '#64748b' }
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
            status: "pending",
            amount: amount,
            subscriberName: name || username,
            createdAt: new Date()
          } as any);
          await db.update(companies).set({ subscriptionPlan: newSubscriptionPlan, paymentStatus: "pending" } as any).where(eq(companies.id, company.id));
        }
      } catch (err) {
        console.error("Error setting up company subscription:", err);
      }
      const token = generateToken({ userId: user.id, companyId: company.id, role: user.role });
      await createSession(user.id, company.id, token);
      
      res.status(201).json({
        user: { 
          id: user.id, 
          username: user.username, 
          email: user.email, 
          name: user.name, 
          firstName: user.firstName || resolvedFirstName, 
          lastName: user.lastName || resolvedLastName, 
          phone: user.phone,
          cep: user.cep,
          rua: user.rua,
          numero: user.numero,
          complemento: user.complemento,
          estado: user.estado,
          cidade: user.cidade,
          role: user.role, 
          isSuperAdmin: user.isSuperAdmin, 
          companyId: company.id, 
          permissions: {} 
        },
        company: { 
          id: company.id, 
          name: company.name, 
          document: company.document,
          paymentStatus: company.paymentStatus, 
          subscriptionPlan: newSubscriptionPlan
        },
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
      console.log("Login attempt for:", username);
      let user = await findUserByUsername(username);
      if (!user) user = await findUserByEmail(username);
      if (!user) {
        console.log("User not found:", username);
        await recordLoginAttempt(ip, username, false);
        return res.status(401).json({ error: "Credenciais inválidas" });
      }
      console.log("User found:", user.username, "Role:", user.role, "isSuperAdmin:", user.isSuperAdmin);
      const isValid = await verifyPassword(password, user.password);
      if (!isValid) {
        console.log("Invalid password for:", username);
        await recordLoginAttempt(ip, username, false);
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      let company = null;
      if (user.companyId) {
        company = await findCompanyById(user.companyId as string);
        console.log("Company found:", company?.name || "None", "PaymentStatus:", company?.paymentStatus || "N/A");
      }
      
      // Super admin can always bypass company check
      if (!company && !user.isSuperAdmin) return res.status(404).json({ error: "Company not found" });
      
      await recordLoginAttempt(ip, username, true);
      
      const hasAccess = company ? await checkSubscriptionStatus(company.id) : false;
      if (company && !hasAccess && !user.isSuperAdmin) {
        return res.status(403).json({
          error: "PAGAMENTO_PENDENTE",
          message: "Seu acesso está bloqueado pois o pagamento da assinatura está pendente. Por favor, realize o pagamento do boleto ou entre em contato com o suporte.",
          supportNumber: "5554996231432",
          paymentPending: true,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            name: user.name,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            cep: user.cep,
            rua: user.rua,
            numero: user.numero,
            complemento: user.complemento,
            estado: user.estado,
            cidade: user.cidade,
            role: user.role,
            isSuperAdmin: user.isSuperAdmin,
            companyId: user.companyId
          },
          company: company ? {
            id: company.id,
            name: company.name,
            document: company.document,
            paymentStatus: company.paymentStatus,
            subscriptionPlan: company.subscriptionPlan
          } : null
        });
      }
      const companyId = user.companyId || null;
      const token = generateToken({ userId: user.id, companyId: companyId as string, role: user.role, isSuperAdmin: user.isSuperAdmin });
      await createSession(user.id, companyId, token);
      await createAuditLog(user.id, companyId, "LOGIN", "user", user.id, undefined, ip, req.headers['user-agent'] || 'unknown');
      
      // Sanitize avatar to prevent HTTP2 protocol errors
      let sanitizedAvatar = user.avatar;
      if (sanitizedAvatar && typeof sanitizedAvatar === 'string' && sanitizedAvatar.startsWith('data:image')) {
        if (sanitizedAvatar.length > 2000) {
          sanitizedAvatar = null; // Remove large avatars from login response
        }
      }
      
      res.json({
        user: { 
          id: user.id, 
          username: user.username, 
          email: user.email, 
          name: user.name, 
          firstName: user.firstName, 
          lastName: user.lastName, 
          phone: user.phone,
          cep: user.cep,
          rua: user.rua,
          numero: user.numero,
          complemento: user.complemento,
          estado: user.estado,
          cidade: user.cidade,
          role: user.role, 
          isSuperAdmin: user.isSuperAdmin, 
          companyId: user.companyId, 
          permissions: user.permissions ? (typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions) : {} 
        },
        company: company ? { 
          id: company.id, 
          name: company.name, 
          document: company.document,
          paymentStatus: company.paymentStatus, 
          subscriptionPlan: company.subscriptionPlan
        } : null,
        token, 
        paymentPending: false
      });
    } catch (error) {
      console.error("Login Error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.get("/api/auth/me", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const user = await findUserById(req.user.id);
      const company = await findCompanyById(req.user.companyId);
      if (!user || !company) return res.status(404).json({ error: "User or company not found" });
      
      // Sanitize avatar to prevent HTTP2 protocol errors
      let sanitizedAvatar = user.avatar;
      if (sanitizedAvatar && typeof sanitizedAvatar === 'string' && sanitizedAvatar.startsWith('data:image')) {
        if (sanitizedAvatar.length > 2000) {
          sanitizedAvatar = null;
        }
      }
      
      res.json({
        user: { 
          id: user.id, 
          username: user.username, 
          email: user.email, 
          name: user.name, 
          firstName: user.firstName, 
          lastName: user.lastName, 
          phone: user.phone, 
          avatar: sanitizedAvatar, 
          role: user.role, 
          isSuperAdmin: user.isSuperAdmin, 
          companyId: user.companyId, 
          cep: user.cep, 
          rua: user.rua, 
          numero: user.numero, 
          complemento: user.complemento, 
          estado: user.estado, 
          cidade: user.cidade, 
          permissions: user.permissions ? JSON.parse(user.permissions) : {} 
        },
        company: { 
          id: company.id, 
          name: company.name, 
          document: company.document,
          paymentStatus: company.paymentStatus, 
          subscriptionPlan: company.subscriptionPlan
        }
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // Update Profile
  app.patch("/api/auth/profile", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const { name, firstName, lastName, phone, email, cep, rua, numero, complemento, estado, cidade, avatar } = req.body;

      const resolvedFullName = (name || [firstName, lastName].filter(Boolean).join(" ")).trim();
      const resolvedFirst = firstName || resolvedFullName.split(" ")[0];
      const resolvedLast = lastName || (resolvedFullName ? resolvedFullName.split(" ").slice(1).join(" ").trim() || undefined : undefined);

      const updateData: any = { 
        phone,
        cep, 
        rua, 
        numero, 
        complemento, 
        estado, 
        cidade, 
        updatedAt: new Date() 
      };

      if (resolvedFullName) updateData.name = resolvedFullName;
      if (resolvedFirst) updateData.firstName = resolvedFirst;
      if (typeof resolvedLast !== "undefined") updateData.lastName = resolvedLast;
      
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
          firstName: updatedUser.firstName, 
          lastName: updatedUser.lastName, 
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
  app.get("/api/users", authMiddleware, requirePermission("manage_users"), async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      
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

  app.post("/api/invitations", authMiddleware, requirePermission("invite_users"), async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      
      const [dbUser] = await db.select().from(users).where(eq(users.id, req.user.id)).limit(1);
      const perms = dbUser?.permissions ? (typeof dbUser.permissions === 'string' ? JSON.parse(dbUser.permissions) : dbUser.permissions) : {};
      
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

  app.delete("/api/users/:id", authMiddleware, requirePermission("manage_users"), async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      if (req.user.id === req.params.id) return res.status(400).json({ error: "Cannot delete yourself" });

      await db.delete(users).where(and(eq(users.id, req.params.id), eq(users.companyId, req.user.companyId)));
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  app.patch("/api/users/:id/permissions", authMiddleware, requirePermission("manage_users"), async (req: AuthenticatedRequest, res) => {
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

  // Create invitation and send email
  app.post("/api/invitations/send-email", authMiddleware, requirePermission("invite_users"), async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      
      const { email, name, role, companyId } = req.body;
      if (!email || !name || !role) {
        return res.status(400).json({ error: "Email, nome e cargo são obrigatórios" });
      }

      // Generate unique token
      const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
      
      // Set expiration to 10 minutes
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10);

      // Create invitation
      await db.insert(invitations).values({
        companyId: req.user.companyId,
        token,
        email,
        role,
        permissions: JSON.stringify({}),
        expiresAt,
        createdBy: req.user.id
      } as any);

      // Get company info
      const company = await findCompanyById(req.user.companyId);

      // Send email with invite link
      const origin = (req.headers.origin || '').toString();
      const referer = (req.headers.referer || '').toString();
      let appUrl = origin;
      if (!appUrl && referer) {
        try {
          appUrl = new URL(referer).origin;
        } catch {
          appUrl = '';
        }
      }
      if (!appUrl) {
        appUrl = process.env.APP_URL || 'https://huacontrol.com.br';
      }

      const inviteLink = `${appUrl}/accept-invite?token=${token}`;

      try {
        const { Resend: ResendClient } = await import('resend');
        const resend = new ResendClient(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: 'Equipe <contato@huacontrol.com.br>',
          to: email,
          subject: `Convite para ${company?.name || 'HuaControl'}`,
          html: `
            <div style="font-family: sans-serif; color: #333;">
              <h2>Olá, ${name}</h2>
              <p>Você foi convidado para fazer parte da equipe <strong>${company?.name || 'HuaControl'}</strong>.</p>
              <p>Cargo: <strong>${role === 'admin' ? 'Admin' : 'Operacional'}</strong></p>
              <p>Clique no link abaixo para aceitar o convite e criar sua conta:</p>
              <p><a href="${inviteLink}" style="display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px;">Aceitar Convite</a></p>
              <p style="color: #666; font-size: 14px;">Este link expira em 10 minutos.</p>
              <p style="color: #666; font-size: 12px;">Se você não solicitou este convite, ignore este email.</p>
            </div>
          `
        });
      } catch (emailErr) {
        console.error("Error sending invite email:", emailErr);
        return res.status(500).json({ error: "Falha ao enviar email" });
      }

      res.json({ success: true, token });
    } catch (error) {
      console.error("Error creating invitation:", error);
      res.status(500).json({ error: "Failed to create invitation" });
    }
  });

  // Accept invitation
  app.post("/api/invitations/accept", async (req, res) => {
    try {
      const { token, username, password } = req.body;
      
      if (!token || !username || !password) {
        return res.status(400).json({ error: "Token, username e senha são obrigatórios" });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: "A senha deve ter no mínimo 6 caracteres" });
      }

      // Find invitation
      const [invitation] = await db.select()
        .from(invitations)
        .where(eq(invitations.token, token))
        .limit(1);

      if (!invitation) {
        return res.status(404).json({ error: "Convite não encontrado" });
      }

      // Check if already accepted
      if (invitation.acceptedAt) {
        return res.status(400).json({ error: "Este convite já foi aceito" });
      }

      // Check expiration
      if (new Date() > new Date(invitation.expiresAt)) {
        return res.status(400).json({ error: "Este convite expirou" });
      }

      // Create user
      const hashedPassword = await hashPassword(password);
      const [newUser] = await db.insert(users).values({
        companyId: invitation.companyId,
        username,
        email: invitation.email,
        password: hashedPassword,
        role: invitation.role,
        permissions: invitation.permissions || "{}",
        status: "active"
      }).returning();

      // Mark invitation as accepted
      await db.update(invitations)
        .set({ acceptedAt: new Date(), acceptedBy: newUser.id } as any)
        .where(eq(invitations.token, token));

      res.json({ success: true, user: newUser });
    } catch (error) {
      console.error("Error accepting invitation:", error);
      res.status(500).json({ error: "Failed to accept invitation" });
    }
  });

  // Generate invite link (for copy link functionality)
  app.post("/api/invitations/generate-link", authMiddleware, requirePermission("invite_users"), async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      
      const { email, name, role } = req.body;
      if (!email || !name || !role) {
        return res.status(400).json({ error: "Email, nome e cargo são obrigatórios" });
      }

      // Generate unique token
      const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
      
      // Set expiration to 10 minutes
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10);

      // Create invitation
      await db.insert(invitations).values({
        companyId: req.user.companyId,
        token,
        email,
        role,
        permissions: JSON.stringify({}),
        expiresAt,
        createdBy: req.user.id
      } as any);

      res.json({ token });
    } catch (error) {
      console.error("Error generating invite link:", error);
      res.status(500).json({ error: "Failed to generate invite link" });
    }
  });

  // Request password reset
  app.post("/api/auth/request-reset", resetRateLimiter, async (req, res) => {
    try {
      const ip = req.headers['x-forwarded-for']?.toString().split(',')[0] || req.socket.remoteAddress || 'unknown';
      
      // Rate limiting for password reset requests
      const { checkRateLimit: rateLimitModule } = await import("../middleware");
      const rateLimitCheck = await rateLimitModule(ip);
      if (!rateLimitCheck.allowed) {
        return res.status(429).json({ error: "Muitas tentativas. Tente novamente em 15 minutos." });
      }
      
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: "Email é obrigatório" });
      }

      // Find user by email
      const user = await findUserByEmail(email);

      // Don't reveal if email exists or not for security
      if (!user) {
        return res.json({ success: true, message: "Se o email existir, você receberá um link de redefinição" });
      }

      // Generate unique token
      const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
      
      // Set expiration to 15 minutes
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 15);

      // Create password reset token
      await db.insert(passwordResets).values({
        userId: user.id,
        token,
        expiresAt
      } as any);

      // Send email with reset link
      const Resend = (await import("resend")).Resend;
      const resend = new Resend(process.env.RESEND_API_KEY);
      
      const resetUrl = `${process.env.APP_URL || 'http://localhost:5000'}/reset-password?token=${token}`;

      await resend.emails.send({
        from: "HUA Control <noreply@huacontrol.com>",
        to: email,
        subject: "Redefinição de Senha - HUA Control",
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .button { 
                  display: inline-block; 
                  padding: 12px 30px; 
                  background-color: #2563eb; 
                  color: white !important; 
                  text-decoration: none; 
                  border-radius: 5px; 
                  margin: 20px 0; 
                }
                .footer { margin-top: 30px; font-size: 12px; color: #666; }
              </style>
            </head>
            <body>
              <div class="container">
                <h2>Redefinição de Senha</h2>
                <p>Olá,</p>
                <p>Você solicitou a redefinição de senha da sua conta no HUA Control.</p>
                <p>Clique no botão abaixo para criar uma nova senha:</p>
                <a href="${resetUrl}" class="button">Redefinir Senha</a>
                <p>Ou copie e cole este link no seu navegador:</p>
                <p style="word-break: break-all; color: #2563eb;">${resetUrl}</p>
                <p><strong>Este link expira em 15 minutos.</strong></p>
                <p>Se você não solicitou esta redefinição, pode ignorar este email.</p>
                <div class="footer">
                  <p>HUA Control - Sistema de Gestão Financeira</p>
                </div>
              </div>
            </body>
          </html>
        `
      });

      res.json({ success: true, message: "Email de redefinição enviado com sucesso" });
    } catch (error) {
      console.error("Error requesting password reset:", error);
      res.status(500).json({ error: "Erro ao solicitar redefinição de senha" });
    }
  });

  // Reset password with token
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        return res.status(400).json({ error: "Token e senha são obrigatórios" });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: "Senha deve ter no mínimo 6 caracteres" });
      }

      // Find valid token
      const [resetToken] = await db
        .select()
        .from(passwordResets)
        .where(
          and(
            eq(passwordResets.token, token),
            eq(passwordResets.usedAt, null as any)
          )
        )
        .limit(1);

      if (!resetToken) {
        return res.status(400).json({ error: "Token inválido ou já utilizado" });
      }

      // Check if token expired
      if (new Date() > resetToken.expiresAt) {
        return res.status(400).json({ error: "Token expirado. Solicite um novo link de redefinição" });
      }

      // Hash new password
      const hashedPassword = await hashPassword(password);

      // Update user password
      await db
        .update(users)
        .set({ 
          password: hashedPassword,
          updatedAt: new Date()
        })
        .where(eq(users.id, resetToken.userId));

      // Mark token as used
      await db
        .update(passwordResets)
        .set({ usedAt: new Date() })
        .where(eq(passwordResets.id, resetToken.id));

      // Get user data for auto-login
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, resetToken.userId))
        .limit(1);

      if (!user) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      // Generate token and create session for auto-login
      const authToken = generateToken(user.id, user.companyId || '');
      await createSession(user.id, user.companyId || '', authToken);

      // Create audit log
      await createAuditLog(
        user.id,
        user.companyId || '',
        "PASSWORD_RESET",
        "user",
        user.id,
        "Password reset successfully",
        req.ip || '',
        req.headers['user-agent'] || ''
      );

      // Return user data and token for auto-login
      res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
          companyId: user.companyId,
          role: user.role,
          isSuperAdmin: user.isSuperAdmin
        },
        token: authToken
      });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ error: "Erro ao redefinir senha" });
    }
  });
}
