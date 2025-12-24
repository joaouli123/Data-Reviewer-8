import { insertSupplierSchema } from "./shared/schema";
import { z } from "zod";

console.log("=== Testando Supplier Schema ===\n");

const testData = {
  name: "Test Supplier",
  email: "test@test.com", 
  phone: "(11) 99999-9999",
  cnpj: "12.345.678/0001-99"
};

try {
  const result = insertSupplierSchema.parse(testData);
  console.log("✅ Validation passed:", result);
} catch (error: any) {
  console.log("❌ Validation failed");
  if (error instanceof z.ZodError) {
    error.errors.forEach((err: any) => {
      console.log(`  - ${err.path.join('.')}: ${err.message}`);
    });
  } else {
    console.log(`  Error:`, error);
  }
}

// Also test with minimal data
console.log("\n=== Testing with minimal data ===");
const minimalData = { name: "Test" };
try {
  const result = insertSupplierSchema.parse(minimalData);
  console.log("✅ Minimal validation passed:", result);
} catch (error: any) {
  console.log("❌ Minimal validation failed");
  if (error instanceof z.ZodError) {
    error.errors.forEach((err: any) => {
      console.log(`  - ${err.path.join('.')}: ${err.message}`);
    });
  }
}
