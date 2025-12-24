import { insertSupplierSchema } from "./shared/schema";

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
  console.log("❌ Validation failed:", error.errors);
}
