// Local Database Client - Busca dados da API
const generateId = () => Math.random().toString(36).substr(2, 9);

const createEntity = (endpoint) => ({
  list: async () => {
    try {
      const response = await fetch(`/api/${endpoint}`);
      if (!response.ok) throw new Error(`Failed to fetch ${endpoint}`);
      return await response.json();
    } catch (error) {
      console.error(`Error fetching ${endpoint}:`, error);
      return [];
    }
  },
  create: async (data) => {
    try {
      const response = await fetch(`/api/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error(`Failed to create ${endpoint}`);
      return await response.json();
    } catch (error) {
      console.error(`Error creating ${endpoint}:`, error);
      return null;
    }
  },
  update: async (id, data) => {
    try {
      const response = await fetch(`/api/${endpoint}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error(`Failed to update ${endpoint}`);
      return await response.json();
    } catch (error) {
      console.error(`Error updating ${endpoint}:`, error);
      return null;
    }
  },
  delete: async (id) => {
    try {
      const response = await fetch(`/api/${endpoint}/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error(`Failed to delete ${endpoint}`);
      return true;
    } catch (error) {
      console.error(`Error deleting ${endpoint}:`, error);
      return false;
    }
  }
});

// Dados de fallback em caso de erro
const fallbackData = {
  transactions: [
    { id: '1', date: new Date().toISOString(), description: 'Venda de Produto A', amount: 1500.00, type: 'income', category: 'Vendas' },
  ],
  categories: [
    { id: '1', name: 'Vendas' },
    { id: '2', name: 'Serviços' },
    { id: '3', name: 'Matéria Prima' },
    { id: '4', name: 'Utilidades' },
  ],
};

export const base44 = {
  entities: {
    Transaction: createEntity('transactions'),
    Category: {
      list: async () => fallbackData.categories,
      create: async (data) => ({ ...data, id: generateId() }),
      update: async (id, data) => data,
      delete: async (id) => true
    },
    Customer: createEntity('customers'),
    Supplier: createEntity('suppliers'),
    Installment: createEntity('installments'),
    PurchaseInstallment: createEntity('purchase-installments'),
    Sale: createEntity('sales'),
    Purchase: createEntity('purchases'),
  },
  auth: {
    user: {
      id: 'user-id',
      name: 'Usuário',
      email: 'user@app.com'
    },
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
