import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "./db";
import { users, companies, sessions, subscriptions, auditLogs } from "../shared/schema";
import { eq, and } from "drizzle-orm";

const isProd = process.env.NODE_ENV === "production";
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET && isProd) {
  throw new Error("JWT_SECRET environment variable is required in production");
}

const JWT_SECRET_VALUE = JWT_SECRET || "fallback-secret-for-dev-only";

const JWT_EXPIRY = "7d";
const BCRYPT_ROUNDS = 12;

export interface AuthPayload {
  userId: string;
  companyId: string;
  role: string;
  isSuperAdmin?: boolean;
}

export interface TokenData extends AuthPayload {
  iat: number;
  exp: number;
}

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

export function generateToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET_VALUE, { expiresIn: JWT_EXPIRY });
}

export function verifyToken(token: string): TokenData | null {
  try {
    return jwt.verify(token, JWT_SECRET_VALUE) as TokenData;
  } catch (error) {
    return null;
  }
}

export async function createUser(
  companyId: string,
  username: string,
  email: string | undefined,
  password: string,
  name: string | undefined,
  role: string = "user",
  isSuperAdmin: boolean = false,
  firstName?: string,
  lastName?: string
) {
  const hashedPassword = await hashPassword(password);
  const fullName = (name || [firstName, lastName].filter(Boolean).join(" ")).trim() || undefined;
  const resolvedFirst = firstName || fullName?.split(" ")[0];
  const resolvedLast = lastName || (fullName ? fullName.split(" ").slice(1).join(" ").trim() || undefined : undefined);
  const result = await db
    .insert(users)
    .values({
      companyId,
      username,
      email,
      password: hashedPassword,
      name: fullName,
      firstName: resolvedFirst,
      lastName: resolvedLast,
      role,
      isSuperAdmin,
    })
    .returning();
  return result[0];
}

export async function findUserByUsername(username: string, companyId?: string) {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.username, username));
  
  if (!result.length) return undefined;
  
  // If companyId is provided, find user from that company
  if (companyId) {
    return result.find(u => u.companyId === companyId) || result[0];
  }
  
  return result[0];
}

export async function findUserByEmail(email: string, companyId?: string) {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email));
  
  if (!result.length) return undefined;
  
  // If companyId is provided, find user from that company
  if (companyId) {
    return result.find(u => u.companyId === companyId) || result[0];
  }
  
  return result[0];
}

export async function findUserById(userId: string) {
  const result = await db.select().from(users).where(eq(users.id, userId));
  return result[0];
}

export async function findCompanyById(companyId: string) {
  const result = await db.select().from(companies).where(eq(companies.id, companyId));
  return result[0];
}

export async function findCompanyByDocument(document: string) {
  const result = await db.select().from(companies).where(eq(companies.document, document));
  return result[0];
}

export async function createCompany(name: string, document: string) {
  const result = await db
    .insert(companies)
    .values({ 
      name, 
      document,
      paymentStatus: "pending",
      subscriptionStatus: "pending"
    })
    .returning();
  
  // Subscription will be created when payment is confirmed
  // Do NOT create active subscription here
  
  return result[0];
}

export async function createSession(userId: string, companyId: string | null, token: string) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  
  const result = await db
    .insert(sessions)
    .values({ 
      userId, 
      companyId, 
      token, 
      expiresAt 
    } as any)
    .returning();
  return result[0];
}

export async function checkSubscriptionStatus(companyId: string): Promise<boolean> {
  const company = await db
    .select()
    .from(companies)
    .where(eq(companies.id, companyId));
  
  if (!company.length) return false;
  const companyRow = company[0];

  const sub = await db
    .select()
    .from(subscriptions)
    .where(and(
      eq(subscriptions.companyId, companyId),
      eq(subscriptions.status, "active")
    ));

  const hasActiveSub = sub.length > 0;
  if (!hasActiveSub) return false;

  if (companyRow.subscriptionStatus === "active") return true;
  if (companyRow.paymentStatus === "approved") return true;

  return false;
}

export async function createAuditLog(
  userId: string,
  companyId: string | null,
  action: string,
  resourceType: string,
  resourceId: string | undefined,
  details: string | undefined,
  ipAddress: string,
  userAgent: string,
  status: string = "success"
) {
  try {
    await db.insert(auditLogs).values({
      userId,
      companyId,
      action,
      resourceType,
      resourceId,
      details,
      ipAddress,
      userAgent,
      status,
    } as any);
  } catch (error) {
    console.error("Failed to create audit log:", error);
  }
}

export async function getAuditLogs(companyId: string, limit: number = 100) {
  return await db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.companyId, companyId))
    .orderBy(auditLogs.createdAt)
    .limit(limit);
}
