import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import { customers, suppliers, transactions, cashFlow } from "../shared/schema";

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });

async function cleanAndSeed() {
  console.log("Limpando dados antigos...");
  
  // Delete all data
  await db.delete(transactions);
  await db.delete(cashFlow);
  await db.delete(customers);
  await db.delete(suppliers);
  
  console.log("Inserindo novos clientes...");
  const clientesData = [
    { name: "Auto Posto Central", contact: "João Silva", email: "joao@postocentral.com", phone: "(11) 99999-1111", status: "ativo" },
    { name: "Transportadora Rápida", contact: "Maria Santos", email: "maria@transportadora.com", phone: "(11) 99999-2222", status: "ativo" },
    { name: "Frota ABC Ltda", contact: "Carlos Oliveira", email: "carlos@frotaabc.com", phone: "(11) 99999-3333", status: "ativo" },
    { name: "Táxi Cidade", contact: "Ana Costa", email: "ana@taxicidade.com", phone: "(11) 99999-4444", status: "ativo" },
    { name: "Logística Express", contact: "Pedro Souza", email: "pedro@logisticaexpress.com", phone: "(11) 99999-5555", status: "ativo" },
    { name: "Cooperativa de Transporte", contact: "Lucia Mendes", email: "lucia@cooptransporte.com", phone: "(11) 99999-6666", status: "ativo" },
  ];

  const insertedCustomers = await db.insert(customers).values(clientesData).returning();
  console.log(`${insertedCustomers.length} clientes inseridos.`);

  console.log("Inserindo fornecedores...");
  const fornecedoresData = [
    { name: "Petrobras Distribuidora", contact: "Marcos Ferreira", email: "marcos@petrobras.com", phone: "(11) 98888-1111", paymentTerms: "30 dias", status: "ativo" },
    { name: "Shell Brasil", contact: "Patricia Gomes", email: "patricia@shell.com", phone: "(11) 98888-2222", paymentTerms: "15 dias", status: "ativo" },
    { name: "Ipiranga", contact: "Ricardo Santos", email: "ricardo@ipiranga.com", phone: "(11) 98888-3333", paymentTerms: "21 dias", status: "ativo" },
    { name: "Raízen (Cosan)", contact: "Juliana Costa", email: "juliana@raizen.com", phone: "(11) 98888-4444", paymentTerms: "30 dias", status: "ativo" },
  ];

  const insertedSuppliers = await db.insert(suppliers).values(fornecedoresData).returning();
  console.log(`${insertedSuppliers.length} fornecedores inseridos.`);

  const transactionsData: any[] = [];
  const cashFlowData: any[] = [];
  
  const hoje = new Date();
  const shifts = ["Manhã", "Tarde", "Noite"];

  function randomDate(start: Date, end: Date): Date {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  }

  const mesRetrasadoInicio = new Date(hoje.getFullYear(), hoje.getMonth() - 2, 1);
  const mesRetrasadoFim = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 0);
  
  const mesPassadoInicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
  const mesPassadoFim = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
  
  const inicioSemana = new Date(hoje);
  inicioSemana.setDate(hoje.getDate() - hoje.getDay());
  const fimSemana = hoje;

  console.log("Gerando transações balanceadas...");
  
  // Mês retrasado - vendas
  for (let i = 0; i < 15; i++) {
    const date = randomDate(mesRetrasadoInicio, mesRetrasadoFim);
    const shift = shifts[Math.floor(Math.random() * shifts.length)];
    const amount = (Math.random() * 3000 + 1500).toFixed(2);
    
    transactionsData.push({
      customerId: insertedCustomers[Math.floor(Math.random() * insertedCustomers.length)].id,
      supplierId: null,
      type: "venda",
      amount,
      description: `Venda de ${["Gasolina", "Diesel", "Etanol"][Math.floor(Math.random() * 3)]}`,
      date,
      shift,
      status: "concluído",
    });
  }

  // Compras para mês retrasado
  for (let i = 0; i < 10; i++) {
    const date = randomDate(mesRetrasadoInicio, mesRetrasadoFim);
    const shift = shifts[Math.floor(Math.random() * shifts.length)];
    const amount = (Math.random() * 2000 + 1000).toFixed(2);
    
    transactionsData.push({
      customerId: null,
      supplierId: insertedSuppliers[Math.floor(Math.random() * insertedSuppliers.length)].id,
      type: "compra",
      amount,
      description: `Compra de ${["Gasolina", "Diesel", "Etanol"][Math.floor(Math.random() * 3)]}`,
      date,
      shift,
      status: "concluído",
    });
  }

  // Mês passado - vendas
  for (let i = 0; i < 18; i++) {
    const date = randomDate(mesPassadoInicio, mesPassadoFim);
    const shift = shifts[Math.floor(Math.random() * shifts.length)];
    const amount = (Math.random() * 3500 + 2000).toFixed(2);
    
    transactionsData.push({
      customerId: insertedCustomers[Math.floor(Math.random() * insertedCustomers.length)].id,
      supplierId: null,
      type: "venda",
      amount,
      description: `Venda de ${["Gasolina Comum", "Gasolina Aditivada", "Diesel S10", "Etanol"][Math.floor(Math.random() * 4)]}`,
      date,
      shift,
      status: "concluído",
    });
  }

  // Mês passado - compras
  for (let i = 0; i < 12; i++) {
    const date = randomDate(mesPassadoInicio, mesPassadoFim);
    const shift = shifts[Math.floor(Math.random() * shifts.length)];
    const amount = (Math.random() * 2500 + 1200).toFixed(2);
    
    transactionsData.push({
      customerId: null,
      supplierId: insertedSuppliers[Math.floor(Math.random() * insertedSuppliers.length)].id,
      type: "compra",
      amount,
      description: `Compra de combustível`,
      date,
      shift,
      status: "concluído",
    });
  }

  // Esta semana - vendas
  for (let i = 0; i < 8; i++) {
    const date = randomDate(inicioSemana, fimSemana);
    const shift = shifts[Math.floor(Math.random() * shifts.length)];
    const amount = (Math.random() * 2500 + 1000).toFixed(2);
    
    transactionsData.push({
      customerId: insertedCustomers[Math.floor(Math.random() * insertedCustomers.length)].id,
      supplierId: null,
      type: "venda",
      amount,
      description: `Venda de combustível`,
      date,
      shift,
      status: "concluído",
    });
  }

  // Esta semana - compras
  for (let i = 0; i < 5; i++) {
    const date = randomDate(inicioSemana, fimSemana);
    const shift = shifts[Math.floor(Math.random() * shifts.length)];
    const amount = (Math.random() * 1500 + 800).toFixed(2);
    
    transactionsData.push({
      customerId: null,
      supplierId: insertedSuppliers[Math.floor(Math.random() * insertedSuppliers.length)].id,
      type: "compra",
      amount,
      description: `Compra de combustível`,
      date,
      shift,
      status: "concluído",
    });
  }

  console.log("Inserindo transações...");
  const insertedTransactions = await db.insert(transactions).values(transactionsData).returning();
  console.log(`${insertedTransactions.length} transações inseridas.`);

  // Fluxo de caixa realista
  console.log("Gerando fluxo de caixa...");
  let balance = 50000;

  const dataAtual = new Date(mesRetrasadoInicio);
  while (dataAtual <= hoje) {
    for (const shift of shifts) {
      const inflow = Math.random() * 4000 + 2000;
      const outflow = Math.random() * 3000 + 800;
      balance = balance + inflow - outflow;

      cashFlowData.push({
        date: new Date(dataAtual),
        inflow: inflow.toFixed(2),
        outflow: outflow.toFixed(2),
        balance: Math.max(balance, 1000).toFixed(2),
        description: `Fluxo ${shift}`,
        shift,
      });
    }
    dataAtual.setDate(dataAtual.getDate() + 1);
  }

  console.log("Inserindo fluxo de caixa...");
  for (let i = 0; i < cashFlowData.length; i += 100) {
    const batch = cashFlowData.slice(i, i + 100);
    await db.insert(cashFlow).values(batch);
  }
  console.log(`${cashFlowData.length} registros de fluxo de caixa inseridos.`);

  console.log("\n=== RESUMO FINAL ===");
  console.log(`✓ Clientes: ${insertedCustomers.length}`);
  console.log(`✓ Fornecedores: ${insertedSuppliers.length}`);
  console.log(`✓ Transações: ${insertedTransactions.length}`);
  console.log(`✓ Fluxo de Caixa: ${cashFlowData.length}`);
  console.log("\n✓ Dados corrigidos com sucesso!");

  await pool.end();
}

cleanAndSeed().catch((err) => {
  console.error("Erro:", err);
  process.exit(1);
});
