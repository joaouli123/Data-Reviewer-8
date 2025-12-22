// Direct database API calls - bypass Base44 and use our PostgreSQL backend

export const Transaction = {
  async list() {
    try {
      const response = await fetch('/api/transactions');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return data || [];
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }
  },

  async get(id) {
    try {
      const response = await fetch(`/api/transactions/${id}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching transaction:', error);
      return null;
    }
  },

  async create(data) {
    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (!response.ok) {
        console.error('Transaction API error:', result);
        throw new Error(result.details || result.error || `HTTP ${response.status}`);
      }
      return result;
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw error;
    }
  },

  async update(id, data) {
    try {
      const response = await fetch(`/api/transactions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.details || result.error || `HTTP ${response.status}`);
      }
      return result;
    } catch (error) {
      console.error('Error updating transaction:', error);
      throw error;
    }
  },

  async delete(id) {
    try {
      const response = await fetch(`/api/transactions/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return true;
    } catch (error) {
      console.error('Error deleting transaction:', error);
      throw error;
    }
  }
};

export const Customer = {
  async list() {
    try {
      const response = await fetch('/api/customers');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return data || [];
    } catch (error) {
      console.error('Error fetching customers:', error);
      return [];
    }
  },

  async get(id) {
    try {
      const response = await fetch(`/api/customers/${id}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching customer:', error);
      return null;
    }
  },

  async create(data) {
    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error creating customer:', error);
      throw error;
    }
  },

  async update(id, data) {
    try {
      const response = await fetch(`/api/customers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error updating customer:', error);
      throw error;
    }
  },

  async delete(id) {
    try {
      const response = await fetch(`/api/customers/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return true;
    } catch (error) {
      console.error('Error deleting customer:', error);
      throw error;
    }
  }
};

export const Supplier = {
  async list() {
    try {
      const response = await fetch('/api/suppliers');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return data || [];
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      return [];
    }
  },

  async get(id) {
    try {
      const response = await fetch(`/api/suppliers/${id}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching supplier:', error);
      return null;
    }
  },

  async create(data) {
    try {
      const response = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error creating supplier:', error);
      throw error;
    }
  },

  async update(id, data) {
    try {
      const response = await fetch(`/api/suppliers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error updating supplier:', error);
      throw error;
    }
  },

  async delete(id) {
    try {
      const response = await fetch(`/api/suppliers/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return true;
    } catch (error) {
      console.error('Error deleting supplier:', error);
      throw error;
    }
  }
};

export const Category = {
  async list() {
    try {
      const response = await fetch('/api/categories');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  },

  async get(id) {
    try {
      const response = await fetch(`/api/categories/${id}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching category:', error);
      return null;
    }
  },

  async create(data) {
    try {
      console.log('API Request - Creating category:', data);
      const payload = {
        name: String(data.name || '').trim(),
        type: String(data.type || 'entrada')
      };
      
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const contentType = response.headers.get("content-type");
      let result;
      if (contentType && contentType.includes("application/json")) {
        result = await response.json();
      } else {
        const text = await response.text();
        console.error('API Response - Non-JSON received:', text);
        throw new Error(`Resposta inválida do servidor: ${text.substring(0, 100)}`);
      }

      if (!response.ok) {
        console.error('API Error Response:', result);
        throw new Error(result.error || result.details || `Erro do servidor (${response.status})`);
      }
      
      console.log('API Success - Category created:', result);
      return result;
    } catch (error) {
      console.error('API Creation Exception:', error);
      throw new Error(error.message || 'Erro inesperado ao criar categoria');
    }
  },

  async update(id, data) {
    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  },

  async delete(id) {
    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return true;
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  }
};

export const Sale = {
  async list() { return []; },
  async get() { return null; }
};

export const Installment = {
  async list() { return []; },
  async get() { return null; }
};

export const Purchase = {
  async list() { return []; },
  async get() { return null; }
};

export const PurchaseInstallment = {
  async list() { return []; },
  async get() { return null; }
};
