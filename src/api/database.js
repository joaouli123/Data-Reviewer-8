import { apiRequest } from '@/lib/queryClient';

export const Transaction = {
  async list() {
    return apiRequest('GET', '/api/transactions');
  },
  async get(id) {
    return apiRequest('GET', `/api/transactions/${id}`);
  },
  async create(data) {
    return apiRequest('POST', '/api/transactions', data);
  },
  async update(id, data) {
    return apiRequest('PATCH', `/api/transactions/${id}`, data);
  },
  async delete(id) {
    return apiRequest('DELETE', `/api/transactions/${id}`);
  }
};

export const Customer = {
  async list() {
    return apiRequest('GET', '/api/customers');
  },
  async get(id) {
    return apiRequest('GET', `/api/customers/${id}`);
  },
  async create(data) {
    return apiRequest('POST', '/api/customers', data);
  },
  async update(id, data) {
    return apiRequest('PATCH', `/api/customers/${id}`, data);
  },
  async delete(id) {
    return apiRequest('DELETE', `/api/customers/${id}`);
  }
};

export const Supplier = {
  async list() {
    return apiRequest('GET', '/api/suppliers');
  },
  async get(id) {
    return apiRequest('GET', `/api/suppliers/${id}`);
  },
  async create(data) {
    return apiRequest('POST', '/api/suppliers', data);
  },
  async update(id, data) {
    return apiRequest('PATCH', `/api/suppliers/${id}`, data);
  },
  async delete(id) {
    return apiRequest('DELETE', `/api/suppliers/${id}`);
  }
};

export const Category = {
  async list() {
    const data = await apiRequest('GET', '/api/categories') || [];
    return data;
  },
  async get(id) {
    return apiRequest('GET', `/api/categories/${id}`);
  },
  async create(data) {
    return apiRequest('POST', '/api/categories', data);
  },
  async update(id, data) {
    return apiRequest('PATCH', `/api/categories/${id}`, data);
  },
  async delete(id) {
    return apiRequest('DELETE', `/api/categories/${id}`);
  }
};

export const CashFlow = {
  async list() {
    return apiRequest('GET', '/api/cash-flow');
  },
  async get(id) {
    return apiRequest('GET', `/api/cash-flow/${id}`);
  },
  async create(data) {
    return apiRequest('POST', '/api/cash-flow', data);
  },
  async update(id, data) {
    return apiRequest('PATCH', `/api/cash-flow/${id}`, data);
  },
  async delete(id) {
    return apiRequest('DELETE', `/api/cash-flow/${id}`);
  }
};

export const Report = {
  async getSummary(companyId, period) {
    return apiRequest('GET', `/api/reports/summary?companyId=${companyId}&period=${period}`);
  },
  async getCashFlow(companyId, startDate, endDate) {
    return apiRequest('GET', `/api/reports/cash-flow?companyId=${companyId}&startDate=${startDate}&endDate=${endDate}`);
  },
  async getTransactionsByCategory(companyId, startDate, endDate) {
    return apiRequest('GET', `/api/reports/transactions-by-category?companyId=${companyId}&startDate=${startDate}&endDate=${endDate}`);
  }
};

// Aliases for backwards compatibility
export const Sale = Transaction;
export const Installment = Transaction;
export const Purchase = Transaction;
export const PurchaseInstallment = Transaction;
