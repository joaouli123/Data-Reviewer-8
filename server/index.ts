import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());

// Serve static files from Vite build
const publicDir = path.join(__dirname, '..', 'dist', 'public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
}

// API mock endpoints (fallback)
app.get('/api/transactions', (req, res) => {
  res.json([
    { id: '1', date: new Date().toISOString(), description: 'Venda de Produto', amount: 1500, type: 'venda' },
    { id: '2', date: new Date(Date.now() - 86400000).toISOString(), description: 'Compra de Material', amount: 500, type: 'compra' }
  ]);
});

app.get('/api/customers', (req, res) => {
  res.json([{ id: '1', name: 'Cliente A', email: 'cliente@email.com', phone: '11999999999' }]);
});

app.get('/api/categories', (req, res) => {
  res.json([
    { id: '1', name: 'Vendas', type: 'entrada' },
    { id: '2', name: 'Matéria Prima', type: 'saida' }
  ]);
});

app.get('/api/suppliers', (req, res) => {
  res.json([{ id: '1', name: 'Fornecedor A', email: 'fornecedor@email.com' }]);
});

app.get('/api/sales', (req, res) => res.json([]));
app.get('/api/purchases', (req, res) => res.json([]));
app.get('/api/installments', (req, res) => res.json([]));

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req, res) => {
  const indexPath = path.join(publicDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('App not built. Run: npm run build');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✓ Server running on port ${PORT}`);
  console.log(`✓ Serving static files from: ${publicDir}`);
});
