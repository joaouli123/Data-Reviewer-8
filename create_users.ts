import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import bcryptjs from "bcryptjs";
import * as schema from "./shared/schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function createUsers() {
  try {
    // Hash das senhas
    const hashedPassword = await bcryptjs.hash("admin", 10);

    // Super Admin (sem company, é global)
    const superAdmin = await db
      .insert(schema.users)
      .values({
        username: "superadmin",
        email: "superadmin@admin.com",
        password: hashedPassword,
        name: "Super Administrator",
        isSuperAdmin: true,
        role: "super_admin",
        status: "active",
      })
      .returning();

    console.log("✅ Super Admin criado:", superAdmin[0]);

    // Criar uma company para os outros usuários
    const company = await db
      .insert(schema.companies)
      .values({
        name: "Company Admin Test",
        document: "12345678000100",
        subscriptionStatus: "active",
      })
      .returning();

    const companyId = company[0].id;
    console.log("✅ Company criada:", company[0]);

    // Admin
    const admin = await db
      .insert(schema.users)
      .values({
        companyId: companyId,
        username: "admin",
        email: "admin@company.com",
        password: hashedPassword,
        name: "Administrator",
        role: "admin",
        status: "active",
        isSuperAdmin: false,
      })
      .returning();

    console.log("✅ Admin criado:", admin[0]);

    // Operacional
    const operacional = await db
      .insert(schema.users)
      .values({
        companyId: companyId,
        username: "operacional",
        email: "operacional@company.com",
        password: hashedPassword,
        name: "Operacional",
        role: "operational",
        status: "active",
        isSuperAdmin: false,
      })
      .returning();

    console.log("✅ Operacional criado:", operacional[0]);

    console.log("\n✅ Todos os usuários foram criados com sucesso!");
    console.log("\nCredenciais:");
    console.log("Super Admin - username: superadmin, senha: admin");
    console.log("Admin - username: admin, senha: admin");
    console.log("Operacional - username: operacional, senha: admin");

    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao criar usuários:", error);
    process.exit(1);
  }
}

createUsers();
