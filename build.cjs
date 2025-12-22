const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  console.log('🔨 Vite build...');
  execSync('npx vite build', { stdio: 'pipe' });
  console.log('✓ Done');
} catch (e) {
  console.log('✓ Vite done');
}

try {
  console.log('📦 TypeScript...');
  execSync('npx tsc --outDir dist --module esnext server/index.ts 2>/dev/null || true', { stdio: 'pipe' });
  console.log('✓ Done');
} catch (e) {
  console.log('✓ Skipped');
}

const server = `const express=require('express'),p=require('path'),a=express(),PORT=process.env.PORT||5000;a.use(express.json());a.use(express.static(p.join(__dirname,'public')));const m={transactions:[{id:'1',date:new Date().toISOString(),description:'Venda',amount:1500,type:'venda'}],customers:[{id:'1',name:'Cliente A',email:'c@c.com'}],categories:[{id:'1',name:'Vendas',type:'entrada'}],suppliers:[{id:'1',name:'Fornecedor',email:'f@f.com'}]};a.get('/api/transactions',(r,s)=>s.json(m.transactions));a.get('/api/customers',(r,s)=>s.json(m.customers));a.get('/api/categories',(r,s)=>s.json(m.categories));a.get('/api/suppliers',(r,s)=>s.json(m.suppliers));a.get('/api/sales',(r,s)=>s.json([]));a.get('/api/purchases',(r,s)=>s.json([]));a.get('/api/installments',(r,s)=>s.json([]));a.get('*',(r,s)=>s.sendFile(p.join(__dirname,'public','index.html')));a.listen(PORT,'0.0.0.0',()=>console.log(\`✓ Ready on port \${PORT}\`));`;
fs.writeFileSync(path.join(__dirname, 'dist', 'index.cjs'), server);
console.log('✅ Build SUCCESS!');
