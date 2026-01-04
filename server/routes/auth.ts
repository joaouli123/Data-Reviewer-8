import { Express } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users, companies, subscriptions } from "../../shared/schema";
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
  findUserById
} from "../auth";
import { authMiddleware, checkRateLimit, recordLoginAttempt, AuthenticatedRequest } from "../middleware";

export function registerAuthRoutes(app: Express) {
  // Sign up
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { companyName, companyDocument, username, email, password, name, plan } = req.body;
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
        const storage = (req as any).storage;
        for (const cat of defaultCategories) {
          await db.insert(categories).values({ ...cat, companyId: company.id } as any);
        }
      } catch (catError) {
        console.error('Error creating default categories:', catError);
      }

      const subscriptionPlan = plan || "pro";
      try {
        await db.insert(subscriptions).values({ companyId: company.id, plan: subscriptionPlan, status: "active" } as any);
        await db.update(companies).set({ subscriptionPlan: subscriptionPlan, paymentStatus: "approved" } as any).where(eq(companies.id, company.id));
      } catch (err) {
        console.error("Error setting up company subscription:", err);
      }
      const token = generateToken({ userId: user.id, companyId: company.id, role: user.role });
      await createSession(user.id, company.id, token);
      res.status(201).json({
        user: { id: user.id, username: user.username, email: user.email, name: user.name, phone: user.phone, avatar: user.avatar, role: user.role, isSuperAdmin: user.isSuperAdmin, companyId: company.id, permissions: {} },
        company: { id: company.id, name: company.name, paymentStatus: company.paymentStatus, subscriptionPlan, document: company.document },
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
      const company = await findCompanyById(user.companyId);
      if (!company) return res.status(404).json({ error: "Company not found" });
      await recordLoginAttempt(ip, username, true);
      if (company.paymentStatus !== "approved") {
        return res.json({
          user: { id: user.id, username: user.username, email: user.email, name: user.name, phone: user.phone, avatar: user.avatar, role: user.role, isSuperAdmin: user.isSuperAdmin, companyId: user.companyId, permissions: user.permissions ? JSON.parse(user.permissions) : {} },
          company: { id: company.id, name: company.name, paymentStatus: company.paymentStatus },
          token: null, paymentPending: true, message: "Pagamento pendente."
        });
      }
      const token = generateToken({ userId: user.id, companyId: user.companyId, role: user.role, isSuperAdmin: user.isSuperAdmin });
      await createSession(user.id, user.companyId, token);
      await createAuditLog(user.id, user.companyId, "LOGIN", "user", user.id, undefined, ip, req.headers['user-agent'] || 'unknown');
      res.json({
        user: { id: user.id, username: user.username, email: user.email, name: user.name, phone: user.phone, avatar: user.avatar, role: user.role, isSuperAdmin: user.isSuperAdmin, companyId: user.companyId, permissions: user.permissions ? JSON.parse(user.permissions) : {} },
        company: { id: company.id, name: company.name, paymentStatus: company.paymentStatus, subscriptionPlan: company.subscriptionPlan, document: company.document },
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
        user: { id: user.id, username: user.username, email: user.email, name: user.name, phone: user.phone, avatar: user.avatar, role: user.role, isSuperAdmin: user.isSuperAdmin, companyId: user.companyId, permissions: user.permissions ? JSON.parse(user.permissions) : {} },
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
      const { name, phone, cep, rua, numero, complemento, estado, cidade } = req.body;
      
      const [updatedUser] = await db.update(users)
        .set({ name, phone, cep, rua, numero, complemento, estado, cidade })
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
      console.error("Error updating profile:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  app.post("/api/auth/logout", authMiddleware, async (req: AuthenticatedRequest, res) => {
    res.json({ message: "Logged out" });
  });
}
