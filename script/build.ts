<<<<<<< HEAD
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

console.log('🔨 Building frontend with Vite...');
execSync('npx vite build', { stdio: 'inherit' });

console.log('📦 Creating production server...');
const serverCode = `"use strict";
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const mockData = {
  transactions: [
    { id: '1', date: new Date().toISOString(), description: 'Venda de Produto', amount: 1500, type: 'venda', status: 'completed' },
    { id: '2', date: new Date(Date.now() - 86400000).toISOString(), description: 'Compra de Material', amount: 500, type: 'compra', status: 'completed' }
  ],
  customers: [{ id: '1', name: 'Cliente A', email: 'cliente@email.com', phone: '11999999999', address: 'Rua A, 123' }],
  categories: [
    { id: '1', name: 'Vendas', type: 'entrada' },
    { id: '2', name: 'Matéria Prima', type: 'saida' },
    { id: '3', name: 'Utilidades', type: 'saida' }
  ],
  suppliers: [{ id: '1', name: 'Fornecedor A', email: 'fornecedor@email.com', phone: '1133333333', address: 'Rua B, 456' }]
};

app.get('/api/transactions', (req, res) => res.json(mockData.transactions));
app.get('/api/customers', (req, res) => res.json(mockData.customers));
app.get('/api/categories', (req, res) => res.json(mockData.categories));
app.get('/api/suppliers', (req, res) => res.json(mockData.suppliers));
app.get('/api/sales', (req, res) => res.json([]));
app.get('/api/purchases', (req, res) => res.json([]));
app.get('/api/installments', (req, res) => res.json([]));
app.get('/api/purchase-installments', (req, res) => res.json([]));

app.post('/api/transactions', (req, res) => {
  const id = Date.now().toString();
  const newItem = { id, ...req.body };
  mockData.transactions.push(newItem);
  res.json(newItem);
});

app.post('/api/customers', (req, res) => {
  const id = Date.now().toString();
  const newItem = { id, ...req.body };
  mockData.customers.push(newItem);
  res.json(newItem);
});

app.post('/api/categories', (req, res) => {
  const id = Date.now().toString();
  const newItem = { id, ...req.body };
  mockData.categories.push(newItem);
  res.json(newItem);
});

app.post('/api/suppliers', (req, res) => {
  const id = Date.now().toString();
  const newItem = { id, ...req.body };
  mockData.suppliers.push(newItem);
  res.json(newItem);
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(\`✓ Server running on port \${PORT}\`);
});
`;

fs.writeFileSync(path.join(process.cwd(), 'dist', 'index.cjs'), serverCode);
console.log('✅ Build complete! Server ready at dist/index.cjs');
=======
import { build } from "esbuild";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runBuild() {
  const rootDir = path.resolve(__dirname, "..");
  const distDir = path.resolve(rootDir, "dist");

  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true });
  }

  console.log("Building backend...");
  await build({
    entryPoints: [path.resolve(rootDir, "server/index.ts")],
    bundle: true,
    platform: "node",
    target: "node20",
    format: "esm",
    outdir: path.resolve(distDir, "server"),
    external: [
      "express",
      "vite",
      "@neondatabase/serverless",
      "drizzle-orm",
      "lucide-react",
      "recharts",
      "framer-motion",
      "react",
      "react-dom",
      "wouter",
      "path",
      "fs",
      "url",
      "http",
      "https",
      "zod",
      "drizzle-zod",
      "cookie-parser",
      "bcryptjs",
      "jsonwebtoken",
      "nodemailer",
      "node-ofx-parser",
      "xlsx",
      "jspdf",
      "jspdf-autotable",
      "html2canvas",
      "canvas-confetti",
      "mercadopago"
    ],
    outExtension: { ".js": ".js" },
    loader: {
      ".ts": "ts",
    },
  });

  console.log("Build complete!");
}

runBuild().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});
>>>>>>> 421df1f960deb88f8be303df4d1aba395442d6c0
