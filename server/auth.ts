import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "./db";
import { users, companies, sessions } from "../shared/schema";
import { eq } from "drizzle-orm";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-key-change-in-production";
const JWT_EXPIRY = "7d";

export interface AuthPayload {
  userId: string;
  companyId: string;
  role: string;
}

export interface TokenData extends AuthPayload {
  iat: number;
  exp: number;
}

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
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
  role: string = "user"
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
    })
    .returning();
  return result[0];
}

export async function findUserByUsername(username: string, companyId: string) {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.username, username));
  
  // Find user from the specified company or allow cross-company auth
  return result.find(u => u.companyId === companyId) || result[0];
}

export async function findUserById(userId: string) {
  const result = await db.select().from(users).where(eq(users.id, userId));
  return result[0];
}

export async function findCompanyById(companyId: string) {
  const result = await db.select().from(companies).where(eq(companies.id, companyId));
  return result[0];
}

export async function createCompany(name: string, document: string) {
  const result = await db
    .insert(companies)
    .values({ name, document })
    .returning();
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
