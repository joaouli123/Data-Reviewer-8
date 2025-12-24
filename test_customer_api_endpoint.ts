import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./shared/schema";
import { insertCustomerSchema } from "./shared/schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function testCustomerEndpoint() {
  try {
    console.log("=== Testando Endpoint de Cliente ===\n");
    
    // Obter company
    const companies = await db
      .select()
      .from(schema.companies)
      .limit(1);
    
    const companyId = companies[0].id;
    
    // Dados que o formulário envia
    const formData = {
      name: "Cliente do Form",
      email: "form@test.com",
      phone: "(11) 91111-1111"
    };
    
    console.log("1. Validando dados com schema...");
    const validated = insertCustomerSchema.parse(formData);
    console.log("✅ Schema validou:", validated);
    
    console.log("\n2. Criando cliente via DB...");
    const result = await db
      .insert(schema.customers)
      .values({
        ...validated,
        companyId: companyId
      })
      .returning();
    
    console.log("✅ Cliente criado:", result[0].id);
    
    console.log("\n3. Listando clientes da company...");
    const customers = await db
      .select()
      .from(schema.customers)
      .where(schema.customers.companyId === companyId);
    
    console.log(`✅ Total de clientes: ${customers.length}`);
    customers.forEach((c, i) => {
      console.log(`   ${i+1}. ${c.name} (${c.email})`);
    });
    
    console.log("\n✅ Tudo funcionando!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro:", error);
    process.exit(1);
  }
}

testCustomerEndpoint();
