// Local storage fallback with API fetch
const STORAGE_KEY = 'financial_app_data';

const getMockData = () => ({
  transactions: [
    { id: '1', date: new Date().toISOString(), description: 'Venda de Produto A', amount: 1500, type: 'venda', status: 'completed', customerId: '1', categoryId: '1' },
    { id: '2', date: new Date(Date.now() - 86400000).toISOString(), description: 'Compra de Material', amount: 500, type: 'compra', status: 'completed', supplierId: '1', categoryId: '2' }
  ],
  customers: [{ id: '1', name: 'Cliente A', email: 'cliente@email.com', phone: '11999999999', address: 'Rua A, 123' }],
  categories: [
    { id: '1', name: 'Vendas', type: 'entrada' },
    { id: '2', name: 'Matéria Prima', type: 'saida' },
    { id: '3', name: 'Utilidades', type: 'saida' }
  ],
  suppliers: [{ id: '1', name: 'Fornecedor A', email: 'fornecedor@email.com', phone: '1133333333', address: 'Rua B, 456' }],
  sales: [],
  purchases: [],
  installments: []
});

const getStorageData = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : getMockData();
  } catch (e) {
    return getMockData();
  }
};

const setStorageData = (data) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Storage error:', e);
  }
};

const fetchWithTimeout = (url, options = {}) => {
  const timeout = options.timeout || 2000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timeoutId));
};

export const Transaction = {
  async list() {
    try {
      const response = await fetchWithTimeout('/api/transactions');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json() || [];
    } catch (error) {
      const data = getStorageData();
      return data.transactions || [];
    }
  },
  async get(id) {
    try {
      const response = await fetchWithTimeout(`/api/transactions/${id}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      const data = getStorageData();
      return data.transactions.find(t => t.id === id) || null;
    }
  },
  async create(data) {
    try {
      const response = await fetchWithTimeout('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      const id = Date.now().toString();
      const newTransaction = { id, ...data };
      const storage = getStorageData();
      storage.transactions.push(newTransaction);
      setStorageData(storage);
      return newTransaction;
    }
  },
  async update(id, data) {
    try {
      const response = await fetchWithTimeout(`/api/transactions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      const storage = getStorageData();
      const idx = storage.transactions.findIndex(t => t.id === id);
      if (idx !== -1) {
        storage.transactions[idx] = { ...storage.transactions[idx], ...data };
        setStorageData(storage);
        return storage.transactions[idx];
      }
      throw error;
    }
  },
  async delete(id) {
    try {
      const response = await fetchWithTimeout(`/api/transactions/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return true;
    } catch (error) {
      const storage = getStorageData();
      storage.transactions = storage.transactions.filter(t => t.id !== id);
      setStorageData(storage);
      return true;
    }
  }
};

export const Customer = {
  async list() {
    try {
      const response = await fetchWithTimeout('/api/customers');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      return getStorageData().customers || [];
    }
  },
  async get(id) {
    try {
      const response = await fetchWithTimeout(`/api/customers/${id}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      return getStorageData().customers.find(c => c.id === id) || null;
    }
  },
  async create(data) {
    try {
      const response = await fetchWithTimeout('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      const id = Date.now().toString();
      const newCustomer = { id, ...data };
      const storage = getStorageData();
      storage.customers.push(newCustomer);
      setStorageData(storage);
      return newCustomer;
    }
  },
  async update(id, data) {
    try {
      const response = await fetchWithTimeout(`/api/customers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      const storage = getStorageData();
      const idx = storage.customers.findIndex(c => c.id === id);
      if (idx !== -1) {
        storage.customers[idx] = { ...storage.customers[idx], ...data };
        setStorageData(storage);
        return storage.customers[idx];
      }
      throw error;
    }
  },
  async delete(id) {
    try {
      const response = await fetchWithTimeout(`/api/customers/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return true;
    } catch (error) {
      const storage = getStorageData();
      storage.customers = storage.customers.filter(c => c.id !== id);
      setStorageData(storage);
      return true;
    }
  }
};

export const Supplier = {
  async list() {
    try {
      const response = await fetchWithTimeout('/api/suppliers');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json() || [];
    } catch (error) {
      return getStorageData().suppliers || [];
    }
  },
  async get(id) {
    try {
      const response = await fetchWithTimeout(`/api/suppliers/${id}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      return getStorageData().suppliers.find(s => s.id === id) || null;
    }
  },
  async create(data) {
    try {
      const response = await fetchWithTimeout('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      const id = Date.now().toString();
      const newSupplier = { id, ...data };
      const storage = getStorageData();
      storage.suppliers.push(newSupplier);
      setStorageData(storage);
      return newSupplier;
    }
  },
  async update(id, data) {
    try {
      const response = await fetchWithTimeout(`/api/suppliers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      const storage = getStorageData();
      const idx = storage.suppliers.findIndex(s => s.id === id);
      if (idx !== -1) {
        storage.suppliers[idx] = { ...storage.suppliers[idx], ...data };
        setStorageData(storage);
        return storage.suppliers[idx];
      }
      throw error;
    }
  },
  async delete(id) {
    try {
      const response = await fetchWithTimeout(`/api/suppliers/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return true;
    } catch (error) {
      const storage = getStorageData();
      storage.suppliers = storage.suppliers.filter(s => s.id !== id);
      setStorageData(storage);
      return true;
    }
  }
};

export const Category = {
  async list() {
    try {
      const response = await fetchWithTimeout('/api/categories');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json() || [];
    } catch (error) {
      return getStorageData().categories || [];
    }
  },
  async get(id) {
    try {
      const response = await fetchWithTimeout(`/api/categories/${id}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      return getStorageData().categories.find(c => c.id === id) || null;
    }
  },
  async create(data) {
    try {
      const response = await fetchWithTimeout('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      const id = Date.now().toString();
      const newCategory = { id, ...data };
      const storage = getStorageData();
      storage.categories.push(newCategory);
      setStorageData(storage);
      return newCategory;
    }
  },
  async update(id, data) {
    try {
      const response = await fetchWithTimeout(`/api/categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      const storage = getStorageData();
      const idx = storage.categories.findIndex(c => c.id === id);
      if (idx !== -1) {
        storage.categories[idx] = { ...storage.categories[idx], ...data };
        setStorageData(storage);
        return storage.categories[idx];
      }
      throw error;
    }
  },
  async delete(id) {
    try {
      const response = await fetchWithTimeout(`/api/categories/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return true;
    } catch (error) {
      const storage = getStorageData();
      storage.categories = storage.categories.filter(c => c.id !== id);
      setStorageData(storage);
      return true;
    }
  }
};

export const Sale = {
  async list() {
    try {
      const response = await fetchWithTimeout('/api/sales');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json() || [];
    } catch (error) {
      return getStorageData().sales || [];
    }
  },
  async create(data) {
    try {
      const response = await fetchWithTimeout('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      const id = Date.now().toString();
      const newSale = { id, ...data };
      const storage = getStorageData();
      storage.sales.push(newSale);
      setStorageData(storage);
      return newSale;
    }
  }
};

export const Purchase = {
  async list() {
    try {
      const response = await fetchWithTimeout('/api/purchases');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json() || [];
    } catch (error) {
      return getStorageData().purchases || [];
    }
  },
  async create(data) {
    try {
      const response = await fetchWithTimeout('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      const id = Date.now().toString();
      const newPurchase = { id, ...data };
      const storage = getStorageData();
      storage.purchases.push(newPurchase);
      setStorageData(storage);
      return newPurchase;
    }
  }
};

export const Installment = {
  async list() {
    try {
      const response = await fetchWithTimeout('/api/installments');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json() || [];
    } catch (error) {
      return getStorageData().installments || [];
    }
  },
  async create(data) {
    try {
      const response = await fetchWithTimeout('/api/installments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      const id = Date.now().toString();
      const newInstallment = { id, ...data };
      const storage = getStorageData();
      storage.installments.push(newInstallment);
      setStorageData(storage);
      return newInstallment;
    }
  }
};

export const PurchaseInstallment = {
  async list() {
    try {
      const response = await fetchWithTimeout('/api/purchase-installments');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json() || [];
    } catch (error) {
      return [];
    }
  },
  async create(data) {
    try {
      const response = await fetchWithTimeout('/api/purchase-installments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      return { id: Date.now().toString(), ...data };
    }
  }
};
