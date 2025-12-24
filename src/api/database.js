// Get stored auth token from localStorage (NOT data storage)
const getAuthToken = () => {
  try {
    return localStorage.getItem('auth_token');
  } catch (e) {
    return null;
  }
};

const fetchWithTimeout = (url, options = {}) => {
  const timeout = options.timeout || 30000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  // Add auth token if available
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return fetch(url, { ...options, headers, signal: controller.signal })
    .finally(() => clearTimeout(timeoutId));
};

export const Transaction = {
  async list() {
    const response = await fetchWithTimeout('/api/transactions');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json() || [];
  },
  async get(id) {
    const response = await fetchWithTimeout(`/api/transactions/${id}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  },
  async create(data) {
    const response = await fetchWithTimeout('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    return await response.json();
  },
  async update(id, data) {
    const response = await fetchWithTimeout(`/api/transactions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  },
  async delete(id) {
    const response = await fetchWithTimeout(`/api/transactions/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return true;
  }
};

export const Customer = {
  async list() {
    const response = await fetchWithTimeout('/api/customers');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  },
  async get(id) {
    const response = await fetchWithTimeout(`/api/customers/${id}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  },
  async create(data) {
    const response = await fetchWithTimeout('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    return await response.json();
  },
  async update(id, data) {
    const response = await fetchWithTimeout(`/api/customers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  },
  async delete(id) {
    const response = await fetchWithTimeout(`/api/customers/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return true;
  }
};

export const Supplier = {
  async list() {
    const response = await fetchWithTimeout('/api/suppliers');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  },
  async get(id) {
    const response = await fetchWithTimeout(`/api/suppliers/${id}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  },
  async create(data) {
    const response = await fetchWithTimeout('/api/suppliers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    return await response.json();
  },
  async update(id, data) {
    const response = await fetchWithTimeout(`/api/suppliers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  },
  async delete(id) {
    const response = await fetchWithTimeout(`/api/suppliers/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return true;
  }
};

export const Category = {
  async list() {
    const response = await fetchWithTimeout('/api/categories', { timeout: 60000 });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json() || [];
    // Filter out invalid categories (with timestamp IDs instead of UUIDs)
    return data.filter(cat => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cat.id));
  },
  async get(id) {
    const response = await fetchWithTimeout(`/api/categories/${id}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  },
  async create(data) {
    const response = await fetchWithTimeout('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    return await response.json();
  },
  async update(id, data) {
    const response = await fetchWithTimeout(`/api/categories/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  },
  async delete(id) {
    const response = await fetchWithTimeout(`/api/categories/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return true;
  }
};

export const CashFlow = {
  async list() {
    const response = await fetchWithTimeout('/api/cash-flow');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json() || [];
  },
  async get(id) {
    const response = await fetchWithTimeout(`/api/cash-flow/${id}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  },
  async create(data) {
    const response = await fetchWithTimeout('/api/cash-flow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    return await response.json();
  },
  async update(id, data) {
    const response = await fetchWithTimeout(`/api/cash-flow/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  },
  async delete(id) {
    const response = await fetchWithTimeout(`/api/cash-flow/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return true;
  }
};

export const Report = {
  async getSummary(companyId, period) {
    const response = await fetchWithTimeout(`/api/reports/summary?companyId=${companyId}&period=${period}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  },
  async getCashFlow(companyId, startDate, endDate) {
    const response = await fetchWithTimeout(
      `/api/reports/cash-flow?companyId=${companyId}&startDate=${startDate}&endDate=${endDate}`
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  },
  async getTransactionsByCategory(companyId, startDate, endDate) {
    const response = await fetchWithTimeout(
      `/api/reports/transactions-by-category?companyId=${companyId}&startDate=${startDate}&endDate=${endDate}`
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  }
};

// Aliases for backwards compatibility
export const Sale = Transaction;
export const Installment = Transaction;
export const Purchase = Transaction;
export const PurchaseInstallment = Transaction;
