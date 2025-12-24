import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./shared/schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function testCategories() {
  try {
    console.log("=== Testando Criação de Categorias ===\n");
    
    // Pegar a company que criamos anteriormente
    const companies = await db
      .select()
      .from(schema.companies)
      .limit(1);
    
    if (!companies.length) {
      console.log("❌ Nenhuma company encontrada!");
      return;
    }
    
    const companyId = companies[0].id;
    console.log(`✅ Company encontrada: ${companies[0].name} (${companyId})\n`);
    
    // Tentar criar uma categoria
    console.log("Criando categoria de teste...");
    const newCategory = await db
      .insert(schema.categories)
      .values({
        companyId: companyId,
        name: "Categoria Teste",
        type: "entrada"
      })
      .returning();
    
    if (newCategory[0]) {
      console.log("✅ Categoria criada com sucesso!");
      console.log(`  - ID: ${newCategory[0].id}`);
      console.log(`  - Nome: ${newCategory[0].name}`);
      console.log(`  - Tipo: ${newCategory[0].type}\n`);
    }
    
    // Listar todas as categorias
    console.log("Listando todas as categorias:");
    const allCategories = await db
      .select()
      .from(schema.categories)
      .where(schema.categories.companyId === companyId);
    
    console.log(`Total de categorias: ${allCategories.length}`);
    allCategories.forEach((cat) => {
      console.log(`  - ${cat.name} (${cat.type})`);
    });
    
    console.log("\n✅ Teste concluído com sucesso!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro:", error);
    process.exit(1);
  }
}

testCategories();
