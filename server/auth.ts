import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
<<<<<<< HEAD
import { db } from "./db";
import { users, companies, sessions, subscriptions, auditLogs } from "../shared/schema";
=======
import { db } from "./db.js";
import { users, companies, sessions, subscriptions, auditLogs } from "../shared/schema.js";
>>>>>>> 421df1f960deb88f8be303df4d1aba395442d6c0
import { eq, and } from "drizzle-orm";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-key-change-in-production";
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
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

export function verifyToken(token: string): TokenData | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenData;
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
  isSuperAdmin: boolean = false
) {
  const hashedPassword = await hashPassword(password);
  const result = await db
    .insert(users)
    .values({
      companyId,
      username,
      email,
      password: hashedPassword,
      name,
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
    .values({ name, document })
    .returning();
  
  if (result[0]) {
    // Create default subscription
    await db.insert(subscriptions).values({
      companyId: result[0].id,
      plan: "basic",
      status: "active",
    });
  }
  
  return result[0];
}

export async function createSession(userId: string, companyId: string, token: string) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  
  const result = await db
    .insert(sessions)
    .values({ userId, companyId, token, expiresAt })
    .returning();
  return result[0];
}

export async function invalidateSession(token: string) {
  await db.delete(sessions).where(eq(sessions.token, token));
}

export async function checkSubscriptionStatus(companyId: string): Promise<boolean> {
  const sub = await db
    .select()
    .from(subscriptions)
    .where(and(
      eq(subscriptions.companyId, companyId),
      eq(subscriptions.status, "active")
    ));
  
  return sub.length > 0;
}

export async function createAuditLog(
  userId: string,
  companyId: string,
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
    });
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
