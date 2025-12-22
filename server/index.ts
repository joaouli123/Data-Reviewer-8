import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Mock data for API endpoints
const mockData = {
  transactions: [
    { id: '1', date: new Date().toISOString(), description: 'Venda de Produto', amount: 1500, type: 'venda', status: 'completed' },
    { id: '2', date: new Date(Date.now() - 86400000).toISOString(), description: 'Compra de Material', amount: 500, type: 'compra', status: 'completed' }
  ],
  customers: [
    { id: '1', name: 'Cliente A', email: 'cliente@email.com', phone: '11999999999', address: 'Rua A, 123' }
  ],
  categories: [
    { id: '1', name: 'Vendas', type: 'entrada' },
    { id: '2', name: 'Matéria Prima', type: 'saida' },
    { id: '3', name: 'Utilidades', type: 'saida' }
  ],
  suppliers: [
    { id: '1', name: 'Fornecedor A', email: 'fornecedor@email.com', phone: '1133333333', address: 'Rua B, 456' }
  ]
};

// API Endpoints
app.get('/api/transactions', (_req, res) => res.json(mockData.transactions));
app.get('/api/customers', (_req, res) => res.json(mockData.customers));
app.get('/api/categories', (_req, res) => res.json(mockData.categories));
app.get('/api/suppliers', (_req, res) => res.json(mockData.suppliers));
app.get('/api/sales', (_req, res) => res.json([]));
app.get('/api/purchases', (_req, res) => res.json([]));
app.get('/api/installments', (_req, res) => res.json([]));
app.get('/api/purchase-installments', (_req, res) => res.json([]));

// POST endpoints
app.post('/api/transactions', (req, res) => {
  const id = Date.now().toString();
  const newTransaction = { id, ...req.body };
  mockData.transactions.push(newTransaction);
  res.json(newTransaction);
});

app.post('/api/customers', (req, res) => {
  const id = Date.now().toString();
  const newCustomer = { id, ...req.body };
  mockData.customers.push(newCustomer);
  res.json(newCustomer);
});

app.post('/api/categories', (req, res) => {
  const id = Date.now().toString();
  const newCategory = { id, ...req.body };
  mockData.categories.push(newCategory);
  res.json(newCategory);
});

app.post('/api/suppliers', (req, res) => {
  const id = Date.now().toString();
  const newSupplier = { id, ...req.body };
  mockData.suppliers.push(newSupplier);
  res.json(newSupplier);
});

// SPA fallback - serve index.html for all other routes
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✓ Server running on port ${PORT}`);
});

export {};
