import express from 'express';
import path from 'path';

const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);

app.use(express.json());

// Always serve from dist/public - Vite handles dev server separately
const cwd = process.cwd();
const staticPath = path.join(cwd, 'dist', 'public');
app.use(express.static(staticPath));

// Mock data for API endpoints - with proper categoryId links
const mockData: {
  transactions: any[];
  customers: any[];
  categories: any[];
  suppliers: any[];
  sales: any[];
  purchases: any[];
  installments: any[];
  purchaseInstallments: any[];
  cashFlow: any[];
} = {
  transactions: [
    { id: '1', date: new Date().toISOString(), description: 'Venda de Produto A', amount: 1500, type: 'entrada', status: 'completed', categoryId: '1', customerId: '1' },
    { id: '2', date: new Date(Date.now() - 86400000).toISOString(), description: 'Compra de Material', amount: -500, type: 'saida', status: 'completed', categoryId: '2', supplierId: '1' },
    { id: '3', date: new Date(Date.now() - 172800000).toISOString(), description: 'Conta de Luz', amount: -250, type: 'saida', status: 'completed', categoryId: '3' },
    { id: '4', date: new Date(Date.now() - 259200000).toISOString(), description: 'Venda de Serviço', amount: 800, type: 'entrada', status: 'completed', categoryId: '1', customerId: '1' }
  ],
  customers: [
    { id: '1', name: 'Cliente A', email: 'cliente@email.com', phone: '11999999999', address: 'Rua A, 123' },
    { id: '2', name: 'Cliente B', email: 'clienteb@email.com', phone: '11888888888', address: 'Rua B, 456' }
  ],
  categories: [
    { id: '1', name: 'Vendas', type: 'entrada' },
    { id: '2', name: 'Matéria Prima', type: 'saida' },
    { id: '3', name: 'Utilidades', type: 'saida' },
    { id: '4', name: 'Salários', type: 'saida' },
    { id: '5', name: 'Serviços', type: 'entrada' }
  ],
  suppliers: [
    { id: '1', name: 'Fornecedor A', email: 'fornecedor@email.com', phone: '1133333333', address: 'Rua B, 456' },
    { id: '2', name: 'Fornecedor B', email: 'fornecedorb@email.com', phone: '1144444444', address: 'Rua C, 789' }
  ],
  sales: [
    { id: '1', customerId: '1', date: new Date().toISOString(), totalAmount: 1500, description: 'Venda de Produto A', status: 'completed' }
  ],
  purchases: [
    { id: '1', supplierId: '1', date: new Date().toISOString(), totalAmount: 500, description: 'Compra de Material', status: 'pending', installments: 3 }
  ],
  installments: [
    { id: '1', saleId: '1', customerId: '1', amount: 500, dueDate: new Date().toISOString(), status: 'paid', paidAmount: '500', interest: '0' },
    { id: '2', saleId: '1', customerId: '1', amount: 500, dueDate: new Date(Date.now() + 30*86400000).toISOString(), status: 'pending', paidAmount: '0', interest: '0' },
    { id: '3', saleId: '1', customerId: '1', amount: 500, dueDate: new Date(Date.now() + 60*86400000).toISOString(), status: 'pending', paidAmount: '0', interest: '0' }
  ],
  purchaseInstallments: [
    { id: '1', purchaseId: '1', supplierId: '1', amount: 166.67, dueDate: new Date().toISOString(), status: 'pending', paidAmount: '0', interest: '0' },
    { id: '2', purchaseId: '1', supplierId: '1', amount: 166.67, dueDate: new Date(Date.now() + 30*86400000).toISOString(), status: 'pending', paidAmount: '0', interest: '0' },
    { id: '3', purchaseId: '1', supplierId: '1', amount: 166.66, dueDate: new Date(Date.now() + 60*86400000).toISOString(), status: 'pending', paidAmount: '0', interest: '0' }
  ],
  cashFlow: [
    { id: '1', date: new Date().toISOString(), inflow: '1500', outflow: '0', balance: '1500', description: 'Venda de Produto A', shift: 'manhã' },
    { id: '2', date: new Date(Date.now() - 86400000).toISOString(), inflow: '0', outflow: '500', balance: '-500', description: 'Compra de Material', shift: 'manhã' }
  ]
};

// Helper to find and update item
const findAndUpdate = (arr: any[], id: string, data: any) => {
  const idx = arr.findIndex((item: any) => item.id === id);
  if (idx !== -1) {
    arr[idx] = { ...arr[idx], ...data };
    return arr[idx];
  }
  return null;
};

const findAndDelete = (arr: any[], id: string) => {
  const idx = arr.findIndex((item: any) => item.id === id);
  if (idx !== -1) {
    arr.splice(idx, 1);
    return true;
  }
  return false;
};

// ============== TRANSACTIONS ==============
app.get('/api/transactions', (_req: any, res: any) => res.json(mockData.transactions));
app.get('/api/transactions/:id', (req: any, res: any) => {
  const item = mockData.transactions.find(t => t.id === req.params.id);
  item ? res.json(item) : res.status(404).json({ error: 'Not found' });
});
app.post('/api/transactions', (req: any, res: any) => {
  const id = Date.now().toString();
  const newItem = { id, ...req.body };
  mockData.transactions.push(newItem);
  res.status(201).json(newItem);
});
app.patch('/api/transactions/:id', (req: any, res: any) => {
  const updated = findAndUpdate(mockData.transactions, req.params.id, req.body);
  updated ? res.json(updated) : res.status(404).json({ error: 'Not found' });
});
app.delete('/api/transactions/:id', (req: any, res: any) => {
  findAndDelete(mockData.transactions, req.params.id);
  res.status(204).send();
});

// ============== CUSTOMERS ==============
app.get('/api/customers', (_req: any, res: any) => res.json(mockData.customers));
app.get('/api/customers/:id', (req: any, res: any) => {
  const item = mockData.customers.find(c => c.id === req.params.id);
  item ? res.json(item) : res.status(404).json({ error: 'Not found' });
});
app.post('/api/customers', (req: any, res: any) => {
  const id = Date.now().toString();
  const newItem = { id, ...req.body };
  mockData.customers.push(newItem);
  res.status(201).json(newItem);
});
app.patch('/api/customers/:id', (req: any, res: any) => {
  const updated = findAndUpdate(mockData.customers, req.params.id, req.body);
  updated ? res.json(updated) : res.status(404).json({ error: 'Not found' });
});
app.delete('/api/customers/:id', (req: any, res: any) => {
  findAndDelete(mockData.customers, req.params.id);
  res.status(204).send();
});

// ============== CATEGORIES ==============
app.get('/api/categories', (_req: any, res: any) => res.json(mockData.categories));
app.get('/api/categories/:id', (req: any, res: any) => {
  const item = mockData.categories.find(c => c.id === req.params.id);
  item ? res.json(item) : res.status(404).json({ error: 'Not found' });
});
app.post('/api/categories', (req: any, res: any) => {
  const id = Date.now().toString();
  const newItem = { id, ...req.body };
  mockData.categories.push(newItem);
  res.status(201).json(newItem);
});
app.patch('/api/categories/:id', (req: any, res: any) => {
  const updated = findAndUpdate(mockData.categories, req.params.id, req.body);
  updated ? res.json(updated) : res.status(404).json({ error: 'Not found' });
});
app.delete('/api/categories/:id', (req: any, res: any) => {
  findAndDelete(mockData.categories, req.params.id);
  res.status(204).send();
});

// ============== SUPPLIERS ==============
app.get('/api/suppliers', (_req: any, res: any) => res.json(mockData.suppliers));
app.get('/api/suppliers/:id', (req: any, res: any) => {
  const item = mockData.suppliers.find(s => s.id === req.params.id);
  item ? res.json(item) : res.status(404).json({ error: 'Not found' });
});
app.post('/api/suppliers', (req: any, res: any) => {
  const id = Date.now().toString();
  const newItem = { id, ...req.body };
  mockData.suppliers.push(newItem);
  res.status(201).json(newItem);
});
app.patch('/api/suppliers/:id', (req: any, res: any) => {
  const updated = findAndUpdate(mockData.suppliers, req.params.id, req.body);
  updated ? res.json(updated) : res.status(404).json({ error: 'Not found' });
});
app.delete('/api/suppliers/:id', (req: any, res: any) => {
  findAndDelete(mockData.suppliers, req.params.id);
  res.status(204).send();
});

// ============== SALES ==============
app.get('/api/sales', (_req: any, res: any) => res.json(mockData.sales));
app.get('/api/sales/:id', (req: any, res: any) => {
  const item = mockData.sales.find(s => s.id === req.params.id);
  item ? res.json(item) : res.status(404).json({ error: 'Not found' });
});
app.post('/api/sales', (req: any, res: any) => {
  const id = Date.now().toString();
  const newItem = { id, ...req.body };
  mockData.sales.push(newItem);
  res.status(201).json(newItem);
});
app.patch('/api/sales/:id', (req: any, res: any) => {
  const updated = findAndUpdate(mockData.sales, req.params.id, req.body);
  updated ? res.json(updated) : res.status(404).json({ error: 'Not found' });
});
app.delete('/api/sales/:id', (req: any, res: any) => {
  findAndDelete(mockData.sales, req.params.id);
  res.status(204).send();
});

// ============== PURCHASES ==============
app.get('/api/purchases', (_req: any, res: any) => res.json(mockData.purchases));
app.get('/api/purchases/:id', (req: any, res: any) => {
  const item = mockData.purchases.find(p => p.id === req.params.id);
  item ? res.json(item) : res.status(404).json({ error: 'Not found' });
});
app.post('/api/purchases', (req: any, res: any) => {
  const id = Date.now().toString();
  const newItem = { id, ...req.body };
  mockData.purchases.push(newItem);
  res.status(201).json(newItem);
});
app.patch('/api/purchases/:id', (req: any, res: any) => {
  const updated = findAndUpdate(mockData.purchases, req.params.id, req.body);
  updated ? res.json(updated) : res.status(404).json({ error: 'Not found' });
});
app.delete('/api/purchases/:id', (req: any, res: any) => {
  findAndDelete(mockData.purchases, req.params.id);
  res.status(204).send();
});

// ============== INSTALLMENTS (for sales/customers) ==============
app.get('/api/installments', (_req: any, res: any) => res.json(mockData.installments));
app.get('/api/installments/:id', (req: any, res: any) => {
  const item = mockData.installments.find(i => i.id === req.params.id);
  item ? res.json(item) : res.status(404).json({ error: 'Not found' });
});
app.post('/api/installments', (req: any, res: any) => {
  const id = Date.now().toString();
  const newItem = { id, ...req.body };
  mockData.installments.push(newItem);
  res.status(201).json(newItem);
});
app.patch('/api/installments/:id', (req: any, res: any) => {
  const updated = findAndUpdate(mockData.installments, req.params.id, req.body);
  updated ? res.json(updated) : res.status(404).json({ error: 'Not found' });
});
app.delete('/api/installments/:id', (req: any, res: any) => {
  findAndDelete(mockData.installments, req.params.id);
  res.status(204).send();
});

// ============== PURCHASE INSTALLMENTS (for purchases/suppliers) ==============
app.get('/api/purchase-installments', (_req: any, res: any) => res.json(mockData.purchaseInstallments));
app.get('/api/purchase-installments/:id', (req: any, res: any) => {
  const item = mockData.purchaseInstallments.find(i => i.id === req.params.id);
  item ? res.json(item) : res.status(404).json({ error: 'Not found' });
});
app.post('/api/purchase-installments', (req: any, res: any) => {
  const id = Date.now().toString();
  const newItem = { id, ...req.body };
  mockData.purchaseInstallments.push(newItem);
  res.status(201).json(newItem);
});
app.patch('/api/purchase-installments/:id', (req: any, res: any) => {
  const updated = findAndUpdate(mockData.purchaseInstallments, req.params.id, req.body);
  updated ? res.json(updated) : res.status(404).json({ error: 'Not found' });
});
app.delete('/api/purchase-installments/:id', (req: any, res: any) => {
  findAndDelete(mockData.purchaseInstallments, req.params.id);
  res.status(204).send();
});

// ============== CASH FLOW ==============
app.get('/api/cash-flow', (_req: any, res: any) => res.json(mockData.cashFlow));
app.get('/api/cash-flow/:id', (req: any, res: any) => {
  const item = mockData.cashFlow.find(cf => cf.id === req.params.id);
  item ? res.json(item) : res.status(404).json({ error: 'Not found' });
});
app.post('/api/cash-flow', (req: any, res: any) => {
  const id = Date.now().toString();
  const newItem = { id, ...req.body };
  mockData.cashFlow.push(newItem);
  res.status(201).json(newItem);
});
app.patch('/api/cash-flow/:id', (req: any, res: any) => {
  const updated = findAndUpdate(mockData.cashFlow, req.params.id, req.body);
  updated ? res.json(updated) : res.status(404).json({ error: 'Not found' });
});
app.delete('/api/cash-flow/:id', (req: any, res: any) => {
  findAndDelete(mockData.cashFlow, req.params.id);
  res.status(204).send();
});

// SPA fallback - serve index.html for all other routes
app.get('*', (_req: any, res: any) => {
  const indexPath = path.join(cwd, 'dist', 'public', 'index.html');
  res.sendFile(indexPath);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
