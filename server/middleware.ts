import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "./auth";
import { findUserById, findCompanyById, checkSubscriptionStatus, createAuditLog } from "./auth";
import { db } from "./db";
import { loginAttempts } from "../shared/schema";
import { eq, and, gte, desc } from "drizzle-orm";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    companyId: string;
    role: string;
    isSuperAdmin: boolean;
  };
  token?: string;
  clientIp?: string;
}

// ========== RATE LIMITING MIDDLEWARE ==========
const RATE_LIMIT_MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export async function checkRateLimit(ip: string): Promise<{ allowed: boolean; remaining: number }> {
  const oneMinuteAgo = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
  
  const attempts = await db
    .select()
    .from(loginAttempts)
    .where(and(
      eq(loginAttempts.ipAddress, ip),
      gte(loginAttempts.createdAt, oneMinuteAgo)
    ));
  
  const failedAttempts = attempts.filter(a => !a.success).length;
  
  if (failedAttempts >= RATE_LIMIT_MAX_ATTEMPTS) {
    return { allowed: false, remaining: 0 };
  }
  
  return { allowed: true, remaining: RATE_LIMIT_MAX_ATTEMPTS - failedAttempts };
}

export async function recordLoginAttempt(ip: string, username: string | undefined, success: boolean) {
  await db.insert(loginAttempts).values({
    ipAddress: ip,
    username,
    success,
  });
}

// ========== LAYER 1: AUTHENTICATION MIDDLEWARE ==========
export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = extractToken(req);
  req.clientIp = (req.headers['x-forwarded-for']?.toString().split(',')[0] || req.socket.remoteAddress || 'unknown') as string;
  
  if (!token) {
    // In development, allow requests without token (demo mode)
    if (process.env.NODE_ENV === "development") {
      req.user = {
        id: "dev-user-1",
        companyId: "dev-company-1",
        role: "admin",
        isSuperAdmin: false,
      };
      req.token = "dev-token";
      return next();
    }
    return res.status(401).json({ error: "Unauthorized - No token provided" });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: "Unauthorized - Invalid token" });
  }

  req.user = {
    id: payload.userId,
    companyId: payload.companyId,
    role: payload.role,
    isSuperAdmin: payload.isSuperAdmin || false,
  };
  req.token = token;
  next();
}

// ========== LAYER 2: SUBSCRIPTION CHECK MIDDLEWARE ==========
export async function subscriptionCheckMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Super Admin bypasses subscription check
  if (req.user.isSuperAdmin) {
    return next();
  }

  const isSubscriptionActive = await checkSubscriptionStatus(req.user.companyId);
  if (!isSubscriptionActive) {
    return res.status(403).json({ 
      error: "Subscription inactive", 
      message: "Your subscription has expired or been suspended. Please contact support." 
    });
  }

  next();
}

// ========== LAYER 3: AUTHORIZATION MIDDLEWARE ==========
export function requireRole(...allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized - No user in request" });
    }

    // Super Admin bypasses role checks
    if (req.user.isSuperAdmin) {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden - Insufficient permissions" });
    }

    next();
  };
}

export function requireSuperAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!req.user.isSuperAdmin) {
    return res.status(403).json({ error: "Forbidden - Super Admin access required" });
  }

  next();
}

// ========== AUDIT LOGGING MIDDLEWARE ==========
export async function auditMiddleware(action: string, resourceType: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);
    
    res.json = function(data) {
      if (req.user && res.statusCode < 400) {
        createAuditLog(
          req.user.id,
          req.user.companyId,
          action,
          resourceType,
          req.params.id || undefined,
          JSON.stringify(req.body),
          req.ip || 'unknown',
          req.headers['user-agent'] || 'unknown',
          'success'
        ).catch(err => console.error('Audit log error:', err));
      }
      return originalJson(data);
    };
    
    next();
  };
}

export function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }
  
  const cookies = req.headers.cookie;
  if (cookies) {
    const tokenCookie = cookies
      .split(";")
      .find(c => c.trim().startsWith("token="));
    if (tokenCookie) {
      return tokenCookie.split("=")[1];
    }
  }
  
  return null;
}

export function ensureCompanyAccess(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  
  // Super Admin can access any company
  if (req.user.isSuperAdmin) {
    return next();
  }
  
  const companyId = req.params.companyId || req.query.companyId;
  if (companyId && companyId !== req.user.companyId) {
    return res.status(403).json({ error: "Forbidden - Access denied to this company" });
  }
  
  next();
}
