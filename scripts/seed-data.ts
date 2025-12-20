import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import { customers, suppliers, transactions, cashFlow } from "../shared/schema";

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });

async function seed() {
  console.log("Iniciando povoamento do banco de dados...");

  // Clientes
  const clientesData = [
    { name: "Auto Posto Central", contact: "João Silva", email: "joao@postocentral.com", phone: "(11) 99999-1111", status: "ativo" },
    { name: "Transportadora Rápida", contact: "Maria Santos", email: "maria@transportadora.com", phone: "(11) 99999-2222", status: "ativo" },
    { name: "Frota ABC Ltda", contact: "Carlos Oliveira", email: "carlos@frotaabc.com", phone: "(11) 99999-3333", status: "ativo" },
    { name: "Táxi Cidade", contact: "Ana Costa", email: "ana@taxicidade.com", phone: "(11) 99999-4444", status: "ativo" },
    { name: "Logística Express", contact: "Pedro Souza", email: "pedro@logisticaexpress.com", phone: "(11) 99999-5555", status: "ativo" },
    { name: "Cooperativa de Transporte", contact: "Lucia Mendes", email: "lucia@cooptransporte.com", phone: "(11) 99999-6666", status: "ativo" },
    { name: "Empresa de Ônibus Municipal", contact: "Roberto Lima", email: "roberto@onibus.com", phone: "(11) 99999-7777", status: "ativo" },
    { name: "Distribuidora Norte", contact: "Fernanda Alves", email: "fernanda@distnorte.com", phone: "(11) 99999-8888", status: "ativo" },
  ];

  console.log("Inserindo clientes...");
  const insertedCustomers = await db.insert(customers).values(clientesData).returning();
  console.log(`${insertedCustomers.length} clientes inseridos.`);

  // Fornecedores
  const fornecedoresData = [
    { name: "Petrobras Distribuidora", contact: "Marcos Ferreira", email: "marcos@petrobras.com", phone: "(11) 98888-1111", paymentTerms: "30 dias", status: "ativo" },
    { name: "Shell Brasil", contact: "Patricia Gomes", email: "patricia@shell.com", phone: "(11) 98888-2222", paymentTerms: "15 dias", status: "ativo" },
    { name: "Ipiranga", contact: "Ricardo Santos", email: "ricardo@ipiranga.com", phone: "(11) 98888-3333", paymentTerms: "21 dias", status: "ativo" },
    { name: "Raízen (Cosan)", contact: "Juliana Costa", email: "juliana@raizen.com", phone: "(11) 98888-4444", paymentTerms: "30 dias", status: "ativo" },
    { name: "Vibra Energia", contact: "Eduardo Lima", email: "eduardo@vibra.com", phone: "(11) 98888-5555", paymentTerms: "15 dias", status: "ativo" },
  ];

  console.log("Inserindo fornecedores...");
  const insertedSuppliers = await db.insert(suppliers).values(fornecedoresData).returning();
  console.log(`${insertedSuppliers.length} fornecedores inseridos.`);

  // Gerar transações para os últimos 3 meses
  const transactionsData: any[] = [];
  const cashFlowData: any[] = [];
  
  const hoje = new Date();
  const shifts = ["Manhã", "Tarde", "Noite"];
  const transactionTypes = ["venda", "compra", "despesa", "receita"];

  // Função para gerar data aleatória em um período
  function randomDate(start: Date, end: Date): Date {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  }

  // Mês retrasado (2 meses atrás)
  const mesRetrasadoInicio = new Date(hoje.getFullYear(), hoje.getMonth() - 2, 1);
  const mesRetrasadoFim = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 0);
  
  // Mês passado
  const mesPassadoInicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
  const mesPassadoFim = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
  
  // Esta semana
  const inicioSemana = new Date(hoje);
  inicioSemana.setDate(hoje.getDate() - hoje.getDay());
  const fimSemana = hoje;

  console.log("Gerando transações do mês retrasado...");
  // Transações do mês retrasado (20-25 transações)
  for (let i = 0; i < 22; i++) {
    const date = randomDate(mesRetrasadoInicio, mesRetrasadoFim);
    const type = transactionTypes[Math.floor(Math.random() * transactionTypes.length)];
    const shift = shifts[Math.floor(Math.random() * shifts.length)];
    const isIncome = type === "venda" || type === "receita";
    const amount = (Math.random() * 15000 + 500).toFixed(2);
    
    transactionsData.push({
      customerId: isIncome ? insertedCustomers[Math.floor(Math.random() * insertedCustomers.length)].id : null,
      supplierId: !isIncome ? insertedSuppliers[Math.floor(Math.random() * insertedSuppliers.length)].id : null,
      type,
      amount,
      description: isIncome 
        ? `Venda de combustível - ${["Gasolina", "Diesel", "Etanol"][Math.floor(Math.random() * 3)]}`
        : `Compra de ${["Gasolina", "Diesel", "Etanol", "Lubrificantes"][Math.floor(Math.random() * 4)]}`,
      date,
      shift,
      status: "concluído",
    });
  }

  console.log("Gerando transações do mês passado...");
  // Transações do mês passado (25-30 transações)
  for (let i = 0; i < 28; i++) {
    const date = randomDate(mesPassadoInicio, mesPassadoFim);
    const type = transactionTypes[Math.floor(Math.random() * transactionTypes.length)];
    const shift = shifts[Math.floor(Math.random() * shifts.length)];
    const isIncome = type === "venda" || type === "receita";
    const amount = (Math.random() * 18000 + 800).toFixed(2);
    
    transactionsData.push({
      customerId: isIncome ? insertedCustomers[Math.floor(Math.random() * insertedCustomers.length)].id : null,
      supplierId: !isIncome ? insertedSuppliers[Math.floor(Math.random() * insertedSuppliers.length)].id : null,
      type,
      amount,
      description: isIncome 
        ? `Venda de combustível - ${["Gasolina Comum", "Gasolina Aditivada", "Diesel S10", "Diesel S500", "Etanol"][Math.floor(Math.random() * 5)]}`
        : `Compra de ${["Gasolina", "Diesel", "Etanol", "Lubrificantes", "Aditivos"][Math.floor(Math.random() * 5)]}`,
      date,
      shift,
      status: "concluído",
    });
  }

  console.log("Gerando transações desta semana...");
  // Transações desta semana (8-12 transações)
  for (let i = 0; i < 10; i++) {
    const date = randomDate(inicioSemana, fimSemana);
    const type = transactionTypes[Math.floor(Math.random() * transactionTypes.length)];
    const shift = shifts[Math.floor(Math.random() * shifts.length)];
    const isIncome = type === "venda" || type === "receita";
    const amount = (Math.random() * 12000 + 1000).toFixed(2);
    
    transactionsData.push({
      customerId: isIncome ? insertedCustomers[Math.floor(Math.random() * insertedCustomers.length)].id : null,
      supplierId: !isIncome ? insertedSuppliers[Math.floor(Math.random() * insertedSuppliers.length)].id : null,
      type,
      amount,
      description: isIncome 
        ? `Venda de combustível - ${["Gasolina Comum", "Gasolina Aditivada", "Diesel S10", "Etanol"][Math.floor(Math.random() * 4)]}`
        : `Compra de ${["Gasolina", "Diesel", "Etanol"][Math.floor(Math.random() * 3)]}`,
      date,
      shift,
      status: Math.random() > 0.3 ? "concluído" : "pendente",
    });
  }

  console.log("Inserindo transações...");
  const insertedTransactions = await db.insert(transactions).values(transactionsData).returning();
  console.log(`${insertedTransactions.length} transações inseridas.`);

  // Gerar fluxo de caixa diário
  console.log("Gerando fluxo de caixa...");
  let balance = 50000; // Saldo inicial

  // Para cada dia dos últimos 3 meses
  const dataAtual = new Date(mesRetrasadoInicio);
  while (dataAtual <= hoje) {
    for (const shift of shifts) {
      const inflow = Math.random() * 8000 + 2000;
      const outflow = Math.random() * 5000 + 1000;
      balance = balance + inflow - outflow;

      cashFlowData.push({
        date: new Date(dataAtual),
        inflow: inflow.toFixed(2),
        outflow: outflow.toFixed(2),
        balance: balance.toFixed(2),
        description: `Movimentação do turno ${shift}`,
        shift,
      });
    }
    dataAtual.setDate(dataAtual.getDate() + 1);
  }

  console.log("Inserindo fluxo de caixa...");
  // Inserir em lotes de 100 para evitar timeout
  for (let i = 0; i < cashFlowData.length; i += 100) {
    const batch = cashFlowData.slice(i, i + 100);
    await db.insert(cashFlow).values(batch);
    console.log(`Inserido lote ${Math.floor(i / 100) + 1}/${Math.ceil(cashFlowData.length / 100)}`);
  }
  console.log(`${cashFlowData.length} registros de fluxo de caixa inseridos.`);

  console.log("\n=== RESUMO ===");
  console.log(`Clientes: ${insertedCustomers.length}`);
  console.log(`Fornecedores: ${insertedSuppliers.length}`);
  console.log(`Transações: ${insertedTransactions.length}`);
  console.log(`Fluxo de Caixa: ${cashFlowData.length}`);
  console.log("\nPovoamento concluído com sucesso!");

  await pool.end();
}

seed().catch((err) => {
  console.error("Erro ao povoar banco:", err);
  process.exit(1);
});
