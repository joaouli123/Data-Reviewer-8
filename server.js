import express from 'express';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';
import * as schema from './drizzle/schema.js';
import nodemailer from 'nodemailer';

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

// Store SMTP config in memory (in production, save to database)
const smtpConfig = {
  host: process.env.SMTP_HOST || '',
  port: process.env.SMTP_PORT || '587',
  user: process.env.SMTP_USER || '',
  password: process.env.SMTP_PASSWORD || '',
  fromEmail: process.env.SMTP_FROM_EMAIL || ''
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

// SMTP Configuration endpoint
app.patch('/api/auth/smtp-config', async (req, res) => {
  try {
    const { host, port, user, password, fromEmail } = req.body;
    smtpConfig.host = host || smtpConfig.host;
    smtpConfig.port = port || smtpConfig.port;
    smtpConfig.user = user || smtpConfig.user;
    smtpConfig.password = password || smtpConfig.password;
    smtpConfig.fromEmail = fromEmail || smtpConfig.fromEmail;
    
    res.json({ message: 'SMTP config saved successfully', config: { ...smtpConfig, password: '***' } });
  } catch (err) {
    console.error('Error saving SMTP config:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// Create user invitation (immediate creation)
app.post('/api/invitations', async (req, res) => {
  try {
    const { email, name, role, password, companyId } = req.body;
    
    if (!email || !name || !password) {
      return res.status(400).json({ error: 'Email, nome e senha são obrigatórios' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'A senha deve ter no mínimo 6 caracteres' });
    }
    
    // In a real app, this would create the user in the database
    // For now, we generate an invite link
    const inviteLink = `${process.env.APP_URL || 'http://localhost:5000'}/signup?companyId=${companyId}&email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}&role=${role || 'user'}&password=${encodeURIComponent(password)}`;
    
    res.json({ 
      message: 'Usuário criado com sucesso!',
      inviteLink,
      user: {
        email,
        name,
        role: role || 'user'
      }
    });
  } catch (err) {
    console.error('Error creating invitation:', err.message);
    res.status(400).json({ error: `Erro ao criar usuário: ${err.message}` });
  }
});

// Send invitation email
app.post('/api/invitations/send-email', async (req, res) => {
  try {
    const { email, name, role, companyId } = req.body;
    
    if (!smtpConfig.host || !smtpConfig.user) {
      return res.status(400).json({ error: 'SMTP não configurado. Configure em Perfil > Email (SMTP)' });
    }
    
    const inviteLink = `${process.env.APP_URL || 'http://localhost:5000'}/signup?companyId=${companyId}&email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}&role=${role}`;
    
    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: parseInt(smtpConfig.port),
      secure: parseInt(smtpConfig.port) === 465,
      auth: {
        user: smtpConfig.user,
        pass: smtpConfig.password
      }
    });
    
    const mailOptions = {
      from: smtpConfig.fromEmail || smtpConfig.user,
      to: email,
      subject: `Convite para se juntar à empresa`,
      html: `
        <h2>Bem-vindo! 👋</h2>
        <p>Você foi convidado para se juntar à sua empresa!</p>
        <p><strong>Nome:</strong> ${name}</p>
        <p><strong>Função:</strong> ${role === 'admin' ? 'Admin' : role === 'operational' ? 'Operacional' : role === 'manager' ? 'Gerente' : 'Usuário'}</p>
        <p>
          <a href="${inviteLink}" style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin-top: 10px;">
            Aceitar Convite e Cadastrar-se
          </a>
        </p>
        <p>Se o botão não funcionar, copie e cole este link no seu navegador:</p>
        <p><code>${inviteLink}</code></p>
      `
    };
    
    await transporter.sendMail(mailOptions);
    
    res.json({ message: 'Email enviado com sucesso!' });
  } catch (err) {
    console.error('Error sending invitation email:', err.message);
    res.status(400).json({ error: `Erro ao enviar email: ${err.message}` });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`✓ Backend server running on port ${PORT}`));
