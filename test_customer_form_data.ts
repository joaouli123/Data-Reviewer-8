import { insertCustomerSchema } from "./shared/schema";

// Testar o que o formulário está enviando
const formData = {
  name: "Test Customer",
  email: "test@test.com",
  phone: "(11) 98888-8888"
};

console.log("Testando dados do formulário (mínimos):");
try {
  const result = insertCustomerSchema.parse(formData);
  console.log("✅ Validação passou:", result);
} catch (error: any) {
  console.log("❌ Validação falhou:", error.message);
}

// Testar o que o backend está enviando quando cria novo cliente
const backendData = {
  name: "Test Customer",
  email: "test@test.com",
  phone: "(11) 98888-8888",
  join_date: "2025-12-24",
  ltv: 0
};

console.log("\nTestando dados do backend (com join_date e ltv):");
try {
  const result = insertCustomerSchema.parse(backendData);
  console.log("✅ Validação passou:", result);
} catch (error: any) {
  console.log("❌ Validação falhou:", error.message);
}
