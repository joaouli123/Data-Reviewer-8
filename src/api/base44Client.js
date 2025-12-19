
// MOCK CLIENT implementation to bypass Base44 auth and provide demo data

const generateId = () => Math.random().toString(36).substr(2, 9);

const transactions = [
  { id: '1', date: new Date().toISOString(), description: 'Venda de Produto A', amount: 1500.00, type: 'income', category: 'Vendas' },
  { id: '2', date: new Date(Date.now() - 86400000).toISOString(), description: 'Compra de Material', amount: 500.00, type: 'expense', category: 'Matéria Prima' },
  { id: '3', date: new Date(Date.now() - 172800000).toISOString(), description: 'Serviço de Consultoria', amount: 2000.00, type: 'income', category: 'Serviços' },
  { id: '4', date: new Date(Date.now() - 259200000).toISOString(), description: 'Conta de Energia', amount: 350.00, type: 'expense', category: 'Utilidades' },
  { id: '5', date: new Date(Date.now() - 400000000).toISOString(), description: 'Venda Online', amount: 800.00, type: 'income', category: 'Vendas' },
];

const categories = [
  { id: '1', name: 'Vendas' },
  { id: '2', name: 'Serviços' },
  { id: '3', name: 'Matéria Prima' },
  { id: '4', name: 'Utilidades' },
  { id: '5', name: 'Aluguel' },
  { id: '6', name: 'Salários' },
];

const customers = [
  { id: '1', name: 'Empresa ABC', email: 'contato@abc.com' },
  { id: '2', name: 'Cliente XYZ', email: 'xyz@email.com' },
];

const suppliers = [
  { id: '1', name: 'Fornecedor A', email: 'vendas@fornecedora.com' },
];

// Mock installments
const saleInstallments = [
    { id: '1', amount: 1000, due_date: new Date(Date.now() + 86400000 * 10).toISOString(), paid: false },
    { id: '2', amount: 1000, due_date: new Date(Date.now() + 86400000 * 40).toISOString(), paid: false },
];

const purchaseInstallments = [
    { id: '1', amount: 200, due_date: new Date(Date.now() + 86400000 * 5).toISOString(), paid: false },
];


const createMockEntity = (dataArray) => ({
  list: async () => {
    // Simulate network delay
    await new Promise(r => setTimeout(r, 500));
    return [...dataArray];
  },
  create: async (data) => {
    await new Promise(r => setTimeout(r, 500));
    const newItem = { ...data, id: generateId() };
    dataArray.push(newItem);
    return newItem;
  },
  update: async (id, data) => {
    await new Promise(r => setTimeout(r, 500));
    const idx = dataArray.findIndex(i => i.id === id);
    if (idx >= 0) {
        dataArray[idx] = { ...dataArray[idx], ...data };
        return dataArray[idx];
    }
    return null;
  },
  delete: async (id) => {
    await new Promise(r => setTimeout(r, 500));
    const idx = dataArray.findIndex(i => i.id === id);
    if (idx >= 0) dataArray.splice(idx, 1);
    return true;
  }
});

const mockEntities = {
  Transaction: createMockEntity(transactions),
  Category: createMockEntity(categories),
  Customer: createMockEntity(customers),
  Supplier: createMockEntity(suppliers),
  Installment: createMockEntity(saleInstallments),
  PurchaseInstallment: createMockEntity(purchaseInstallments),
  Sale: createMockEntity([]),
  Purchase: createMockEntity([]),
};

export const base44 = {
  entities: mockEntities,
  auth: {
    user: {
      id: 'mock-user-id',
      name: 'Usuário Demo',
      email: 'demo@financaspro.com'
    },
    logout: async () => { console.log('Mock logout'); }
  }
};
