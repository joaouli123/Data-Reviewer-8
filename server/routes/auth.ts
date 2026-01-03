import { Express } from "express";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { 
  createCompany, 
  createUser, 
  findUserByUsername, 
  findUserByEmail, 
  verifyPassword, 
  generateToken, 
  createSession, 
  findUserById, 
  findCompanyById, 
  findCompanyByDocument, 
  createAuditLog 
} from "../auth";
import { companies, users, subscriptions } from "../../shared/schema";
import { checkRateLimit, recordLoginAttempt, authMiddleware, AuthenticatedRequest } from "../middleware";

export function registerAuthRoutes(app: Express) {
  // Health check (public)
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Sign up - create company and first user
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
          return res.status(409).json({ 
            error: "Essa empresa já possui um cadastro ativo",
            type: "DUPLICATE_PAID"
          });
        } else {
          return res.status(409).json({
            error: "Cadastro encontrado com pagamento pendente",
            type: "DUPLICATE_PENDING",
            companyId: existingCompany.id,
            plan: "pro" 
          });
        }
      }

      const company = await createCompany(companyName, companyDocument);
      const user = await createUser(company.id, username, email, password, name, "admin");

      const subscriptionPlan = plan || "pro";
      try {
        await db.insert(subscriptions).values({
          companyId: company.id,
          plan: subscriptionPlan,
          status: "active",
        } as any);

        await db.update(companies).set({ 
          subscriptionPlan: subscriptionPlan,
          paymentStatus: "approved"
        } as any).where(eq(companies.id, company.id));
      } catch (err) {
        console.error("Error setting up company subscription:", err);
      }

      const token = generateToken({
        userId: user.id,
        companyId: company.id,
        role: user.role,
      });

      await createSession(user.id, company.id, token);

      res.status(201).json({
        user: { 
          id: user.id, 
          username: user.username, 
          email: user.email,
          name: user.name,
          phone: user.phone,
          avatar: user.avatar,
          role: user.role,
          isSuperAdmin: user.isSuperAdmin,
          companyId: company.id,
          permissions: {}
        },
        company: { 
          id: company.id, 
          name: company.name, 
          paymentStatus: company.paymentStatus,
          subscriptionPlan: subscriptionPlan,
          document: company.document
        },
        token,
      });
    } catch (error: any) {
      console.error("Signup error:", error);
      res.status(500).json({ error: "Failed to create account" });
    }
  });

  // Login with rate limiting
  app.post("/api/auth/login", async (req, res) => {
    try {
      const ip = req.headers['x-forwarded-for']?.toString().split(',')[0] || req.socket.remoteAddress || 'unknown';
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: "Missing username or password" });
      }

      const rateLimitCheck = await checkRateLimit(ip);
      if (!rateLimitCheck.allowed) {
        return res.status(429).json({ error: "Too many login attempts. Please try again later." });
      }

      let user = await findUserByUsername(username);
      if (!user) {
        user = await findUserByEmail(username);
      }
      
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
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }

      await recordLoginAttempt(ip, username, true);

      if (company.paymentStatus !== "approved") {
        return res.json({
          user: { 
            id: user.id, 
            username: user.username, 
            email: user.email,
            name: user.name,
            phone: user.phone,
            avatar: user.avatar,
            role: user.role, 
            isSuperAdmin: user.isSuperAdmin,
            companyId: user.companyId,
            permissions: user.permissions ? JSON.parse(user.permissions) : {}
          },
          company: { id: company.id, name: company.name, paymentStatus: company.paymentStatus },
          token: null,
          paymentPending: true,
          message: "Pagamento pendente. Por favor complete o pagamento para acessar o sistema."
        });
      }

      const token = generateToken({
        userId: user.id,
        companyId: user.companyId,
        role: user.role,
        isSuperAdmin: user.isSuperAdmin,
      });

      await createSession(user.id, user.companyId, token);
      await createAuditLog(user.id, user.companyId, "LOGIN", "user", user.id, undefined, ip, req.headers['user-agent'] || 'unknown');

      res.json({
        user: { 
          id: user.id, 
          username: user.username, 
          email: user.email,
          name: user.name,
          phone: user.phone,
          avatar: user.avatar,
          role: user.role, 
          isSuperAdmin: user.isSuperAdmin,
          companyId: user.companyId,
          permissions: user.permissions ? JSON.parse(user.permissions) : {}
        },
        company: { 
          id: company.id, 
          name: company.name, 
          paymentStatus: company.paymentStatus,
          subscriptionPlan: company.subscriptionPlan,
          document: company.document
        },
        token,
        paymentPending: false,
      });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/payment-status", async (req, res) => {
    try {
      const { username } = req.body;
      if (!username) return res.status(400).json({ error: "Username is required" });
      const user = await findUserByUsername(username);
      if (!user) return res.status(404).json({ error: "User not found" });
      const company = await findCompanyById(user.companyId);
      if (!company) return res.status(404).json({ error: "Company not found" });
      res.json({
        paymentStatus: company.paymentStatus,
        companyId: company.id,
        companyName: company.name,
        isPaid: company.paymentStatus === "approved"
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to check payment status" });
    }
  });

  app.get("/api/auth/me", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const user = await findUserById(req.user.id);
      const company = await findCompanyById(req.user.companyId);
      if (!user || !company) return res.status(404).json({ error: "User or company not found" });
      res.json({
        user: { 
          id: user.id, 
          username: user.username, 
          email: user.email,
          name: user.name,
          phone: user.phone,
          avatar: user.avatar,
          role: user.role,
          isSuperAdmin: user.isSuperAdmin,
          companyId: user.companyId,
          permissions: user.permissions ? JSON.parse(user.permissions) : {}
        },
        company: { 
          id: company.id, 
          name: company.name, 
          paymentStatus: company.paymentStatus,
          subscriptionPlan: company.subscriptionPlan,
          document: company.document
        },
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  app.post("/api/auth/logout", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      res.json({ message: "Logged out" });
    } catch (error) {
      res.status(500).json({ error: "Logout failed" });
    }
  });
}
