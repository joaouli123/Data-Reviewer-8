#!/bin/bash
set -e
echo "Building Vite frontend..."
npm run build > /dev/null 2>&1
echo "Creating server..."
cat > dist/index.cjs << 'SERVEREOF'
const express = require('express');
const path = require('path');
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
const mockData = {transactions:[{id:'1',date:new Date().toISOString(),description:'Venda',amount:1500,type:'venda'}],customers:[{id:'1',name:'Cliente A',email:'c@c.com'}],categories:[{id:'1',name:'Vendas',type:'entrada'}],suppliers:[{id:'1',name:'Fornecedor',email:'f@f.com'}]};
app.get('/api/transactions', (r,s)=>s.json(mockData.transactions));
app.get('/api/customers', (r,s)=>s.json(mockData.customers));
app.get('/api/categories', (r,s)=>s.json(mockData.categories));
app.get('/api/suppliers', (r,s)=>s.json(mockData.suppliers));
app.get('/api/sales', (r,s)=>s.json([]));
app.get('/api/purchases', (r,s)=>s.json([]));
app.get('/api/installments', (r,s)=>s.json([]));
app.get('*', (r,s)=>s.sendFile(path.join(__dirname,'public','index.html')));
app.listen(process.env.PORT||5000,'0.0.0.0',()=>console.log('✓ Server ready'));
SERVEREOF
echo "✓ Build complete!"
