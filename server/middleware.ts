import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "./auth";
import { findUserById, findCompanyById } from "./auth";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    companyId: string;
    role: string;
  };
  token?: string;
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = extractToken(req);
  
  if (!token) {
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
  };
  req.token = token;
  next();
}

export function requireRole(...allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized - No user in request" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden - Insufficient permissions" });
    }

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
  
  const companyId = req.params.companyId || req.query.companyId;
  if (companyId && companyId !== req.user.companyId) {
    return res.status(403).json({ error: "Forbidden - Access denied to this company" });
  }
  
  next();
}
