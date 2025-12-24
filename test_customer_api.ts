import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./shared/schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function testCustomerCreation() {
  try {
    console.log("=== Testando Criação de Cliente ===\n");
    
    // Pegar a company
    const companies = await db
      .select()
      .from(schema.companies)
      .limit(1);
    
    if (!companies.length) {
      console.log("❌ Nenhuma company encontrada!");
      return;
    }
    
    const companyId = companies[0].id;
    console.log(`✅ Company encontrada: ${companies[0].name}\n`);
    
    // Tentar criar um cliente
    console.log("Criando cliente de teste...");
    const newCustomer = await db
      .insert(schema.customers)
      .values({
        companyId: companyId,
        name: "Cliente Teste",
        email: "cliente@test.com",
        phone: "(11) 98888-8888",
        contact: "John Doe",
        category: "Varejo",
        status: "ativo"
      })
      .returning();
    
    if (newCustomer[0]) {
      console.log("✅ Cliente criado com sucesso!");
      console.log(`  - ID: ${newCustomer[0].id}`);
      console.log(`  - Nome: ${newCustomer[0].name}`);
      console.log(`  - Email: ${newCustomer[0].email}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro:", error);
    process.exit(1);
  }
}

testCustomerCreation();
