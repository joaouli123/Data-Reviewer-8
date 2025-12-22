// Direct database API calls - bypass Base44 and use our PostgreSQL backend

export const Transaction = {
  async list() {
    try {
      const response = await fetch('/api/transactions');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return data || [];
    } catch (error) {
      return [];
    }
  },

  async get(id) {
    try {
      const response = await fetch(`/api/transactions/${id}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
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
        throw new Error(result.details || result.error || `HTTP ${response.status}`);
      }
      return result;
    } catch (error) {
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
      throw error;
    }
  }
};

export const Customer = {
  async list() {
    try {
      const response = await fetch('/api/customers');
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      return [];
    }
  },

  async get(id) {
    try {
      const response = await fetch(`/api/customers/${id}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
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
      throw error;
    }
  }
};

export const Supplier = {
  async list() {
    try {
      const response = await fetch('/api/suppliers');
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      return [];
    }
  },

  async get(id) {
    try {
      const response = await fetch(`/api/suppliers/${id}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
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
      return [];
    }
  },

  async get(id) {
    try {
      const response = await fetch(`/api/categories/${id}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      return null;
    }
  },

  async create(data) {
    try {
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
        throw new Error(`Resposta inválida do servidor: ${text.substring(0, 100)}`);
      }

      if (!response.ok) {
        throw new Error(result.error || result.details || `Erro do servidor (${response.status})`);
      }
      
      return result;
    } catch (error) {
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
      throw error;
    }
  }
};

export const Sale = {
  async list() {
    try {
      const response = await fetch('/api/transactions?type=venda');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      return [];
    }
  },

  async get(id) {
    try {
      const response = await fetch(`/api/transactions/${id}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      return null;
    }
  },

  async create(data) {
    try {
      // Find category ID if category name is provided
      let categoryId = data.categoryId;
      if (!categoryId && data.category) {
        const categories = await Category.list();
        const cat = categories.find(c => c.name === data.category);
        if (cat) {
          categoryId = cat.id;
        } else {
          // If not found by name, it might be an ID already
          const catById = categories.find(c => c.id === data.category);
          if (catById) categoryId = catById.id;
        }
      }

      const payload = {
        customerId: data.customer_id || data.customerId,
        supplierId: data.supplier_id || data.supplierId,
        categoryId: categoryId,
        type: 'venda',
        date: new Date(data.sale_date || data.date || new Date()).toISOString(),
        shift: 'manhã',
        amount: String(data.total_amount || data.amount),
        description: data.description || 'Venda registrada'
      };
      
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}`);
      }
      return result;
    } catch (error) {
      throw error;
    }
  }
};

export const Installment = {
  async list() {
    try {
      const response = await fetch('/api/sale-installments');
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      return [];
    }
  },
  async get(id) {
    try {
      const response = await fetch(`/api/sale-installments/${id}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      return null;
    }
  },
  async create(data) { 
    try {
      const response = await fetch('/api/sale-installments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      throw error;
    }
  }
};

export const Purchase = {
  async list() {
    try {
      const response = await fetch('/api/transactions?type=compra');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      return [];
    }
  },

  async get(id) {
    try {
      const response = await fetch(`/api/transactions/${id}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      return null;
    }
  },

  async create(data) {
    try {
      // Find category ID if category name is provided
      let categoryId = data.categoryId;
      if (!categoryId && data.category) {
        const categories = await Category.list();
        const cat = categories.find(c => c.name === data.category);
        if (cat) {
          categoryId = cat.id;
        } else {
          // If not found by name, it might be an ID already
          const catById = categories.find(c => c.id === data.category);
          if (catById) categoryId = catById.id;
        }
      }

      const payload = {
        customerId: data.customer_id || data.customerId,
        supplierId: data.supplier_id || data.supplierId,
        categoryId: categoryId,
        type: 'compra',
        date: new Date(data.purchase_date || data.date || new Date()).toISOString(),
        shift: 'manhã',
        amount: String(data.total_amount || data.amount),
        description: data.description || 'Compra registrada'
      };
      
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}`);
      }
      return result;
    } catch (error) {
      throw error;
    }
  }
};

export const PurchaseInstallment = {
  async list() {
    try {
      const response = await fetch('/api/purchase-installments');
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      return [];
    }
  },
  async get(id) {
    try {
      const response = await fetch(`/api/purchase-installments/${id}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      return null;
    }
  },
  async create(data) {
    try {
      const response = await fetch('/api/purchase-installments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      throw error;
    }
  }
};
