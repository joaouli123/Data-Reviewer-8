import express from 'express';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';
import * as schema from './drizzle/schema.js';

const app = express();
app.use(express.json());

// Connect to Neon database
const client = new Client({ connectionString: process.env.DATABASE_URL });
let db;

client.connect().then(() => {
  db = drizzle(client, { schema });
  console.log('✓ Database connected to Neon');
}).catch(err => {
  console.error('✗ Database connection failed:', err.message);
});

// Mock data for fallback - empty to ensure clean data
const mockData = {
  transactions: [],
  customers: [],
  categories: []
};

// Transactions endpoints
app.get('/api/transactions', async (req, res) => {
  try {
    if (!db) return res.json(mockData.transactions);
    const result = await db.select().from(schema.transactions);
    res.json(result || []);
  } catch (err) {
    console.error('Error fetching transactions:', err.message);
    res.json([]);
  }
});

app.post('/api/transactions', async (req, res) => {
  try {
    if (!db) return res.json({ id: Date.now().toString(), ...req.body });
    const result = await db.insert(schema.transactions).values(req.body).returning();
    res.json(result[0]);
  } catch (err) {
    console.error('Error creating transaction:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// Customers endpoints
app.get('/api/customers', async (req, res) => {
  try {
    if (!db) return res.json(mockData.customers);
    const result = await db.select().from(schema.customers);
    res.json(result || []);
  } catch (err) {
    console.error('Error fetching customers:', err.message);
    res.json([]);
  }
});

app.post('/api/customers', async (req, res) => {
  try {
    if (!db) return res.json({ id: Date.now().toString(), ...req.body });
    const result = await db.insert(schema.customers).values(req.body).returning();
    res.json(result[0]);
  } catch (err) {
    console.error('Error creating customer:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// Categories endpoints
app.get('/api/categories', async (req, res) => {
  try {
    if (!db) return res.json(mockData.categories);
    const result = await db.select().from(schema.categories);
    res.json(result || []);
  } catch (err) {
    console.error('Error fetching categories:', err.message);
    res.json([]);
  }
});

// Generic endpoint handler
const entityMap = { suppliers: 'suppliers', sales: 'sales', purchases: 'purchases', installments: 'installments' };

Object.keys(entityMap).forEach(entity => {
  app.get(`/api/${entity}`, async (req, res) => {
    try {
      if (!db) return res.json([]);
      const table = schema[entity];
      if (table) {
        const result = await db.select().from(table);
        res.json(result || []);
      } else {
        res.json([]);
      }
    } catch (err) {
      console.error(`Error fetching ${entity}:`, err.message);
      res.json([]);
    }
  });

  app.post(`/api/${entity}`, async (req, res) => {
    try {
      if (!db) return res.json({ id: Date.now().toString(), ...req.body });
      const table = schema[entity];
      if (table) {
        const result = await db.insert(table).values(req.body).returning();
        res.json(result[0]);
      } else {
        res.status(404).json({ error: `Table ${entity} not found` });
      }
    } catch (err) {
      console.error(`Error creating ${entity}:`, err.message);
      res.status(400).json({ error: err.message });
    }
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`✓ Backend server running on port ${PORT}`));
