import { Router } from "express";
import { storage } from "../storage";
import { authMiddleware, requireSuperAdmin, AuthenticatedRequest } from "../middleware";
import { db } from "../db";
import { companies, customers, users, subscriptions } from "../../shared/schema";
import { eq, desc } from "drizzle-orm";
import { createCompany, createUser, generateToken, createSession, createAuditLog } from "../auth";

const router = Router();

router.get("/stats", authMiddleware, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const companies_list = await storage.getCompanies();
    const subscriptions_list = await Promise.all(
      companies_list.map(c => storage.getCompanySubscription(c.id))
    );

    const activeCompanies = companies_list.filter(c => c.subscriptionStatus === 'active').length;
    const activeSubscriptions = subscriptions_list.filter(s => s?.status === 'active').length;
    
    const monthlyRevenue = subscriptions_list
      .filter(s => s?.status === 'active')
      .reduce((sum, s) => {
        const planPrice = { basic: 0, pro: 99, enterprise: 299 }[s?.plan || 'basic'];
        return sum + planPrice;
      }, 0);

    const alerts = companies_list.filter(c => c.subscriptionStatus === 'suspended').length;

    res.json({
      totalCompanies: companies_list.length,
      activeCompanies,
      activeSubscriptions,
      monthlyRevenue,
      alerts,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

router.get("/companies", authMiddleware, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const companies_list = await storage.getCompanies();
    const enriched = await Promise.all(
      companies_list.map(async (company) => {
        const subscription = await storage.getCompanySubscription(company.id);
        const users_list = await storage.getUsers(company.id);
        const admin = users_list.find(u => u.role === 'admin');
        
        return {
          ...company,
          subscription,
          ownerEmail: admin?.email || 'N/A',
          ownerName: admin?.name || admin?.username || 'Unknown',
          userCount: users_list.length,
        };
      })
    );
    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch companies" });
  }
});

router.post("/companies", authMiddleware, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { companyName, companyDocument, adminName, adminEmail, adminPassword, plan } = req.body;
    if (!companyName || !companyDocument || !adminName || !adminEmail || !adminPassword || !plan) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const company = await createCompany(companyName, companyDocument);
    const adminUser = await createUser(company.id, adminEmail.split('@')[0], adminEmail, adminPassword, adminName, 'admin', false);
    await storage.updateCompanySubscription(company.id, { plan, status: 'active' });
    const token = generateToken({ userId: adminUser.id, companyId: company.id, role: 'admin', isSuperAdmin: false });
    await createSession(adminUser.id, company.id, token);
    res.status(201).json({ company, admin: adminUser, subscription: { plan, status: 'active' } });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to create company" });
  }
});

export default router;
