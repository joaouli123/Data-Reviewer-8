// Local Database Client - Sem dependências externas
// Dados em memória para inicialização

const generateId = () => Math.random().toString(36).substr(2, 9);

const mockData = {
  transactions: [
    { id: '1', date: new Date().toISOString(), description: 'Venda de Produto A', amount: 1500.00, type: 'income', category: 'Vendas' },
    { id: '2', date: new Date(Date.now() - 86400000).toISOString(), description: 'Compra de Material', amount: 500.00, type: 'expense', category: 'Matéria Prima' },
    { id: '3', date: new Date(Date.now() - 172800000).toISOString(), description: 'Serviço de Consultoria', amount: 2000.00, type: 'income', category: 'Serviços' },
    { id: '4', date: new Date(Date.now() - 259200000).toISOString(), description: 'Conta de Energia', amount: 350.00, type: 'expense', category: 'Utilidades' },
    { id: '5', date: new Date(Date.now() - 400000000).toISOString(), description: 'Venda Online', amount: 800.00, type: 'income', category: 'Vendas' },
  ],
  categories: [
    { id: '1', name: 'Vendas' },
    { id: '2', name: 'Serviços' },
    { id: '3', name: 'Matéria Prima' },
    { id: '4', name: 'Utilidades' },
    { id: '5', name: 'Aluguel' },
    { id: '6', name: 'Salários' },
  ],
  customers: [
    { id: '1', name: 'Empresa ABC', email: 'contato@abc.com' },
    { id: '2', name: 'Cliente XYZ', email: 'xyz@email.com' },
  ],
  suppliers: [
    { id: '1', name: 'Fornecedor A', email: 'vendas@fornecedora.com' },
  ],
  saleInstallments: [
    { id: '1', amount: 1000, due_date: new Date(Date.now() + 86400000 * 10).toISOString(), paid: false },
    { id: '2', amount: 1000, due_date: new Date(Date.now() + 86400000 * 40).toISOString(), paid: false },
  ],
  purchaseInstallments: [
    { id: '1', amount: 200, due_date: new Date(Date.now() + 86400000 * 5).toISOString(), paid: false },
  ],
};

const createEntity = (dataArray) => ({
  list: async () => {
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

export const base44 = {
  entities: {
    Transaction: createEntity(mockData.transactions),
    Category: createEntity(mockData.categories),
    Customer: createEntity(mockData.customers),
    Supplier: createEntity(mockData.suppliers),
    Installment: createEntity(mockData.saleInstallments),
    PurchaseInstallment: createEntity(mockData.purchaseInstallments),
    Sale: createEntity([]),
    Purchase: createEntity([]),
  },
  auth: {
    user: {
      id: 'user-id',
      name: 'Usuário',
      email: 'user@app.com'
    },
    logout: async () => { console.log('Logout'); }
  },
  integrations: {
    Core: {
      InvokeLLM: async () => null,
      SendEmail: async () => null,
      UploadFile: async () => null,
      GenerateImage: async () => null,
      ExtractDataFromUploadedFile: async () => null,
      CreateFileSignedUrl: async () => null,
      UploadPrivateFile: async () => null,
    }
  }
};
