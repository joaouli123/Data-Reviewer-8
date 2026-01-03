import { Router } from "express";
import { findUserByUsername, findUserByEmail, verifyPassword, findCompanyById, generateToken, createSession, createAuditLog, findUserById } from "../auth";
import { authMiddleware, checkRateLimit, recordLoginAttempt, AuthenticatedRequest } from "../middleware";

const router = Router();

router.post("/login", async (req, res) => {
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
    if (!user) user = await findUserByEmail(username);
    
    if (!user || !(await verifyPassword(password, user.password))) {
      await recordLoginAttempt(ip, username, false);
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    const company = await findCompanyById(user.companyId);
    if (!company) return res.status(404).json({ error: "Company not found" });

    await recordLoginAttempt(ip, username, true);

    if (company.paymentStatus !== "approved") {
      return res.json({
        user: { id: user.id, username: user.username, role: user.role, companyId: user.companyId },
        company: { id: company.id, name: company.name, paymentStatus: company.paymentStatus },
        token: null,
        paymentPending: true
      });
    }

    const token = generateToken({ userId: user.id, companyId: user.companyId, role: user.role, isSuperAdmin: user.isSuperAdmin });
    await createSession(user.id, user.companyId, token);
    await createAuditLog(user.id, user.companyId, "LOGIN", "user", user.id, undefined, ip, req.headers['user-agent'] || 'unknown');

    res.json({
      user: { id: user.id, username: user.username, role: user.role, companyId: user.companyId },
      company: { id: company.id, name: company.name, paymentStatus: company.paymentStatus },
      token,
      paymentPending: false
    });
  } catch (error) {
    res.status(500).json({ error: "Login failed" });
  }
});

router.get("/me", authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const user = await findUserById(req.user.id);
    const company = await findCompanyById(req.user.companyId);
    if (!user || !company) return res.status(404).json({ error: "Not found" });
    res.json({ user, company });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

export default router;
