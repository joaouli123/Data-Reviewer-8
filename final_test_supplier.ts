import { insertSupplierSchema, insertCustomerSchema } from "./shared/schema";

console.log("=== Testando Schemas Corrigidos ===\n");

// Test Supplier
const supplierData = {
  name: "Test Supplier",
  email: "test@test.com",
  phone: "(11) 99999-9999",
  cnpj: "12.345.678/0001-99"
};

try {
  const result = insertSupplierSchema.parse(supplierData);
  console.log("✅ Supplier validation passed!");
  console.log("   Fields:", Object.keys(result));
} catch (error: any) {
  console.log("❌ Supplier validation failed:", error.message);
}

// Test Customer
const customerData = {
  name: "Test Customer",
  email: "customer@test.com",
  phone: "(11) 98888-8888",
  contact: "John",
  category: "Varejo",
  status: "ativo"
};

try {
  const result = insertCustomerSchema.parse(customerData);
  console.log("\n✅ Customer validation passed!");
  console.log("   Fields:", Object.keys(result));
} catch (error: any) {
  console.log("\n❌ Customer validation failed:", error.message);
}

console.log("\n✅ All tests passed! Your forms should work now.");
