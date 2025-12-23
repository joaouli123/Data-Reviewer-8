import express from "express";
import path from "path";
import http from "http";
import { fileURLToPath } from "url";
import { storage } from "./storage";

const app = express();
const PORT = parseInt(process.env.PORT || "5000", 10);
const isDev = process.env.NODE_ENV !== "production";

app.use(express.json());

// Get __dirname from import.meta.url for both ES modules and CommonJS
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Only serve static files in production mode
if (!isDev) {
  const staticPath = path.join(__dirname, "..", "public");
  app.use(express.static(staticPath));
}

// ============== TRANSACTIONS ==============
app.get("/api/transactions", async (_req, res) => {
  try {
    const data = await storage.getTransactions();
    res.json(data);
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

app.get("/api/transactions/:id", async (req, res) => {
  try {
    const item = await storage.getTransaction(req.params.id);
    item ? res.json(item) : res.status(404).json({ error: "Not found" });
  } catch (error) {
    console.error("Error fetching transaction:", error);
    res.status(500).json({ error: "Failed to fetch transaction" });
  }
});

app.post("/api/transactions", async (req, res) => {
  try {
    const data = req.body;
    console.log("📝 Received transaction data:", JSON.stringify(data));

    // Convert date string to Date object if it's a string
    if (data.date && typeof data.date === "string") {
      data.date = new Date(data.date);
    }

    // Validate required fields
    if (!data.date || !data.shift || !data.type || !data.amount) {
      console.error("❌ Missing required fields:", {
        date: !!data.date,
        shift: !!data.shift,
        type: !!data.type,
        amount: !!data.amount,
      });
      return res
        .status(400)
        .json({ error: "Missing required fields: date, shift, type, amount" });
    }

    const newItem = await storage.createTransaction(data);
    console.log("✅ Transaction created:", newItem.id);
    res.status(201).json(newItem);
  } catch (error) {
    console.error("❌ Error creating transaction:", error);
    res.status(500).json({ error: String(error) });
  }
});

app.patch("/api/transactions/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const data = req.body;
    console.log("🔄 Updating transaction", id, ":", JSON.stringify(data));

    // Convert date string to Date object if it's a string
    if (data.date && typeof data.date === "string") {
      data.date = new Date(data.date);
    }

    // Convert paymentDate string to Date object if it's a string
    if (data.paymentDate && typeof data.paymentDate === "string") {
      data.paymentDate = new Date(data.paymentDate);
    }

    const updated = await storage.updateTransaction(id, data);
    if (updated) {
      console.log("✅ Transaction updated:", updated.id);
      res.json(updated);
    } else {
      console.error("❌ Transaction not found:", id);
      res.status(404).json({ error: "Not found" });
    }
  } catch (error) {
    console.error("❌ Error updating transaction:", error);
    res.status(500).json({ error: String(error) });
  }
});

app.delete("/api/transactions/:id", async (req, res) => {
  try {
    await storage.deleteTransaction(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting transaction:", error);
    res.status(500).json({ error: "Failed to delete transaction" });
  }
});

// ============== CUSTOMERS ==============
app.get("/api/customers", async (_req, res) => {
  try {
    const data = await storage.getCustomers();
    res.json(data);
  } catch (error) {
    console.error("Error fetching customers:", error);
    res.status(500).json({ error: "Failed to fetch customers" });
  }
});

app.get("/api/customers/:id", async (req, res) => {
  try {
    const item = await storage.getCustomer(req.params.id);
    item ? res.json(item) : res.status(404).json({ error: "Not found" });
  } catch (error) {
    console.error("Error fetching customer:", error);
    res.status(500).json({ error: "Failed to fetch customer" });
  }
});

app.post("/api/customers", async (req, res) => {
  try {
    const newItem = await storage.createCustomer(req.body);
    res.status(201).json(newItem);
  } catch (error) {
    console.error("Error creating customer:", error);
    res.status(500).json({ error: "Failed to create customer" });
  }
});

app.patch("/api/customers/:id", async (req, res) => {
  try {
    const updated = await storage.updateCustomer(req.params.id, req.body);
    updated ? res.json(updated) : res.status(404).json({ error: "Not found" });
  } catch (error) {
    console.error("Error updating customer:", error);
    res.status(500).json({ error: "Failed to update customer" });
  }
});

app.delete("/api/customers/:id", async (req, res) => {
  try {
    await storage.deleteCustomer(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting customer:", error);
    res.status(500).json({ error: "Failed to delete customer" });
  }
});

// ============== CATEGORIES ==============
app.get("/api/categories", async (_req, res) => {
  try {
    const data = await storage.getCategories();
    res.json(data);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

app.get("/api/categories/:id", async (req, res) => {
  try {
    const item = await storage.getCategory(req.params.id);
    item ? res.json(item) : res.status(404).json({ error: "Not found" });
  } catch (error) {
    console.error("Error fetching category:", error);
    res.status(500).json({ error: "Failed to fetch category" });
  }
});

app.post("/api/categories", async (req, res) => {
  try {
    const newItem = await storage.createCategory(req.body);
    res.status(201).json(newItem);
  } catch (error) {
    console.error("Error creating category:", error);
    res.status(500).json({ error: "Failed to create category" });
  }
});

app.patch("/api/categories/:id", async (req, res) => {
  try {
    const updated = await storage.updateCategory(req.params.id, req.body);
    updated ? res.json(updated) : res.status(404).json({ error: "Not found" });
  } catch (error) {
    console.error("Error updating category:", error);
    res.status(500).json({ error: "Failed to update category" });
  }
});

app.delete("/api/categories/:id", async (req, res) => {
  try {
    await storage.deleteCategory(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(500).json({ error: "Failed to delete category" });
  }
});

// ============== SUPPLIERS ==============
app.get("/api/suppliers", async (_req, res) => {
  try {
    const data = await storage.getSuppliers();
    res.json(data);
  } catch (error) {
    console.error("Error fetching suppliers:", error);
    res.status(500).json({ error: "Failed to fetch suppliers" });
  }
});

app.get("/api/suppliers/:id", async (req, res) => {
  try {
    const item = await storage.getSupplier(req.params.id);
    item ? res.json(item) : res.status(404).json({ error: "Not found" });
  } catch (error) {
    console.error("Error fetching supplier:", error);
    res.status(500).json({ error: "Failed to fetch supplier" });
  }
});

app.post("/api/suppliers", async (req, res) => {
  try {
    const newItem = await storage.createSupplier(req.body);
    res.status(201).json(newItem);
  } catch (error) {
    console.error("Error creating supplier:", error);
    res.status(500).json({ error: "Failed to create supplier" });
  }
});

app.patch("/api/suppliers/:id", async (req, res) => {
  try {
    const updated = await storage.updateSupplier(req.params.id, req.body);
    updated ? res.json(updated) : res.status(404).json({ error: "Not found" });
  } catch (error) {
    console.error("Error updating supplier:", error);
    res.status(500).json({ error: "Failed to update supplier" });
  }
});

app.delete("/api/suppliers/:id", async (req, res) => {
  try {
    await storage.deleteSupplier(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting supplier:", error);
    res.status(500).json({ error: "Failed to delete supplier" });
  }
});

// ============== CASH FLOW ==============
app.get("/api/cash-flow", async (_req, res) => {
  try {
    const data = await storage.getCashFlows();
    res.json(data);
  } catch (error) {
    console.error("Error fetching cash flow:", error);
    res.status(500).json({ error: "Failed to fetch cash flow" });
  }
});

app.get("/api/cash-flow/:id", async (req, res) => {
  try {
    const item = await storage.getCashFlow(req.params.id);
    item ? res.json(item) : res.status(404).json({ error: "Not found" });
  } catch (error) {
    console.error("Error fetching cash flow:", error);
    res.status(500).json({ error: "Failed to fetch cash flow" });
  }
});

app.post("/api/cash-flow", async (req, res) => {
  try {
    const data = req.body;
    // Convert date string to Date object if it's a string
    if (data.date && typeof data.date === "string") {
      data.date = new Date(data.date);
    }
    const newItem = await storage.createCashFlow(data);
    res.status(201).json(newItem);
  } catch (error) {
    console.error("Error creating cash flow:", error);
    res.status(500).json({ error: "Failed to create cash flow" });
  }
});

app.patch("/api/cash-flow/:id", async (req, res) => {
  try {
    const data = req.body;
    // Convert date string to Date object if it's a string
    if (data.date && typeof data.date === "string") {
      data.date = new Date(data.date);
    }
    const updated = await storage.updateCashFlow(req.params.id, data);
    updated ? res.json(updated) : res.status(404).json({ error: "Not found" });
  } catch (error) {
    console.error("Error updating cash flow:", error);
    res.status(500).json({ error: "Failed to update cash flow" });
  }
});

app.delete("/api/cash-flow/:id", async (req, res) => {
  try {
    await storage.deleteCashFlow(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting cash flow:", error);
    res.status(500).json({ error: "Failed to delete cash flow" });
  }
});

// ============== SALES ==============
app.get("/api/sales", async (_req, res) => {
  try {
    const data = await storage.getSales();
    res.json(data);
  } catch (error) {
    console.error("Error fetching sales:", error);
    res.status(500).json({ error: "Failed to fetch sales" });
  }
});

app.get("/api/sales/:id", async (req, res) => {
  try {
    const item = await storage.getSale(req.params.id);
    item ? res.json(item) : res.status(404).json({ error: "Not found" });
  } catch (error) {
    console.error("Error fetching sale:", error);
    res.status(500).json({ error: "Failed to fetch sale" });
  }
});

app.post("/api/sales", async (req, res) => {
  try {
    const newItem = await storage.createSale(req.body);
    res.status(201).json(newItem);
  } catch (error) {
    console.error("Error creating sale:", error);
    res.status(500).json({ error: "Failed to create sale" });
  }
});

app.patch("/api/sales/:id", async (req, res) => {
  try {
    const updated = await storage.updateSale(req.params.id, req.body);
    updated ? res.json(updated) : res.status(404).json({ error: "Not found" });
  } catch (error) {
    console.error("Error updating sale:", error);
    res.status(500).json({ error: "Failed to update sale" });
  }
});

app.delete("/api/sales/:id", async (req, res) => {
  try {
    await storage.deleteSale(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting sale:", error);
    res.status(500).json({ error: "Failed to delete sale" });
  }
});

// ============== PURCHASES ==============
app.get("/api/purchases", async (_req, res) => {
  try {
    const data = await storage.getPurchases();
    res.json(data);
  } catch (error) {
    console.error("Error fetching purchases:", error);
    res.status(500).json({ error: "Failed to fetch purchases" });
  }
});

app.get("/api/purchases/:id", async (req, res) => {
  try {
    const item = await storage.getPurchase(req.params.id);
    item ? res.json(item) : res.status(404).json({ error: "Not found" });
  } catch (error) {
    console.error("Error fetching purchase:", error);
    res.status(500).json({ error: "Failed to fetch purchase" });
  }
});

app.post("/api/purchases", async (req, res) => {
  try {
    const newItem = await storage.createPurchase(req.body);
    res.status(201).json(newItem);
  } catch (error) {
    console.error("Error creating purchase:", error);
    res.status(500).json({ error: "Failed to create purchase" });
  }
});

app.patch("/api/purchases/:id", async (req, res) => {
  try {
    const updated = await storage.updatePurchase(req.params.id, req.body);
    updated ? res.json(updated) : res.status(404).json({ error: "Not found" });
  } catch (error) {
    console.error("Error updating purchase:", error);
    res.status(500).json({ error: "Failed to update purchase" });
  }
});

app.delete("/api/purchases/:id", async (req, res) => {
  try {
    await storage.deletePurchase(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting purchase:", error);
    res.status(500).json({ error: "Failed to delete purchase" });
  }
});

// ============== INSTALLMENTS ==============
app.get("/api/installments", async (_req, res) => {
  try {
    const data = await storage.getInstallments();
    res.json(data);
  } catch (error) {
    console.error("Error fetching installments:", error);
    res.status(500).json({ error: "Failed to fetch installments" });
  }
});

app.get("/api/installments/:id", async (req, res) => {
  try {
    const item = await storage.getInstallment(req.params.id);
    item ? res.json(item) : res.status(404).json({ error: "Not found" });
  } catch (error) {
    console.error("Error fetching installment:", error);
    res.status(500).json({ error: "Failed to fetch installment" });
  }
});

app.post("/api/installments", async (req, res) => {
  try {
    const newItem = await storage.createInstallment(req.body);
    res.status(201).json(newItem);
  } catch (error) {
    console.error("Error creating installment:", error);
    res.status(500).json({ error: "Failed to create installment" });
  }
});

app.patch("/api/installments/:id", async (req, res) => {
  try {
    const updated = await storage.updateInstallment(req.params.id, req.body);
    updated ? res.json(updated) : res.status(404).json({ error: "Not found" });
  } catch (error) {
    console.error("Error updating installment:", error);
    res.status(500).json({ error: "Failed to update installment" });
  }
});

app.delete("/api/installments/:id", async (req, res) => {
  try {
    await storage.deleteInstallment(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting installment:", error);
    res.status(500).json({ error: "Failed to delete installment" });
  }
});

// ============== PURCHASE INSTALLMENTS ==============
app.get("/api/purchase-installments", async (_req, res) => {
  try {
    const data = await storage.getPurchaseInstallments();
    res.json(data);
  } catch (error) {
    console.error("Error fetching purchase installments:", error);
    res.status(500).json({ error: "Failed to fetch purchase installments" });
  }
});

app.get("/api/purchase-installments/:id", async (req, res) => {
  try {
    const item = await storage.getPurchaseInstallment(req.params.id);
    item ? res.json(item) : res.status(404).json({ error: "Not found" });
  } catch (error) {
    console.error("Error fetching purchase installment:", error);
    res.status(500).json({ error: "Failed to fetch purchase installment" });
  }
});

app.post("/api/purchase-installments", async (req, res) => {
  try {
    const newItem = await storage.createPurchaseInstallment(req.body);
    res.status(201).json(newItem);
  } catch (error) {
    console.error("Error creating purchase installment:", error);
    res.status(500).json({ error: "Failed to create purchase installment" });
  }
});

app.patch("/api/purchase-installments/:id", async (req, res) => {
  try {
    const updated = await storage.updatePurchaseInstallment(
      req.params.id,
      req.body,
    );
    updated ? res.json(updated) : res.status(404).json({ error: "Not found" });
  } catch (error) {
    console.error("Error updating purchase installment:", error);
    res.status(500).json({ error: "Failed to update purchase installment" });
  }
});

app.delete("/api/purchase-installments/:id", async (req, res) => {
  try {
    await storage.deletePurchaseInstallment(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting purchase installment:", error);
    res.status(500).json({ error: "Failed to delete purchase installment" });
  }
});

// ============== ADMIN API ==============
// Initialize database in production
app.post("/api/admin/init-db", async (_req, res) => {
  try {
    if (isDev) {
      return res.status(400).json({ error: "This endpoint is for production only" });
    }
    
    console.log("🚀 Initializing production database...");
    
    // Import setup function
    const { db, pool } = await import("./db");
    const { sql } = await import("drizzle-orm");
    const { customers, suppliers, categories, DEFAULT_CATEGORIES } = await import("../shared/schema");
    
    // Create all tables
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS customers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        contact VARCHAR(255),
        phone VARCHAR(20),
        status VARCHAR(50) DEFAULT 'ativo',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS suppliers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        contact VARCHAR(255),
        phone VARCHAR(20),
        cnpj VARCHAR(20),
        status VARCHAR(50) DEFAULT 'ativo',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id UUID,
        supplier_id UUID,
        category_id INTEGER,
        type VARCHAR(50) NOT NULL,
        amount DECIMAL(12, 2) NOT NULL,
        paid_amount DECIMAL(12, 2) DEFAULT 0,
        interest DECIMAL(12, 2) DEFAULT 0,
        payment_date DATE,
        description TEXT,
        date DATE NOT NULL,
        shift VARCHAR(50),
        status VARCHAR(50) DEFAULT 'pendente',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id),
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
        FOREIGN KEY (category_id) REFERENCES categories(id)
      )
    `);
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS sales (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id UUID NOT NULL,
        total_amount DECIMAL(12, 2) NOT NULL,
        due_date DATE,
        status VARCHAR(50) DEFAULT 'pendente',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id)
      )
    `);
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS installments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sale_id UUID NOT NULL,
        installment_number INTEGER NOT NULL,
        amount DECIMAL(12, 2) NOT NULL,
        due_date DATE NOT NULL,
        paid_date DATE,
        status VARCHAR(50) DEFAULT 'pendente',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sale_id) REFERENCES sales(id)
      )
    `);
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS purchases (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        supplier_id UUID NOT NULL,
        total_amount DECIMAL(12, 2) NOT NULL,
        due_date DATE,
        status VARCHAR(50) DEFAULT 'pendente',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
      )
    `);
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS purchase_installments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        purchase_id UUID NOT NULL,
        installment_number INTEGER NOT NULL,
        amount DECIMAL(12, 2) NOT NULL,
        due_date DATE NOT NULL,
        paid_date DATE,
        status VARCHAR(50) DEFAULT 'pendente',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (purchase_id) REFERENCES purchases(id)
      )
    `);
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS cash_flow (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        date DATE NOT NULL,
        type VARCHAR(50) NOT NULL,
        amount DECIMAL(12, 2) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'pendente',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Seed categories
    const categoryData = DEFAULT_CATEGORIES.map((cat: any) => ({
      name: cat.name,
      type: cat.type,
    }));
    await db.insert(categories).values(categoryData).onConflictDoNothing();
    
    // Seed basic customers
    const customerData = [
      { name: 'Maria Silva Santos', contact: 'maria@email.com', phone: '(11) 99999-1111', status: 'ativo' },
      { name: 'João Pedro Oliveira', contact: 'joao@email.com', phone: '(11) 99999-2222', status: 'ativo' },
      { name: 'Ana Costa Ferreira', contact: 'ana@email.com', phone: '(11) 99999-3333', status: 'ativo' },
    ];
    await db.insert(customers).values(customerData).onConflictDoNothing();
    
    // Seed basic suppliers
    const supplierData = [
      { name: 'Fornecedor ABC Ltda', contact: 'abc@fornecedor.com', phone: '(11) 3333-1111', cnpj: '12.345.678/0001-90', status: 'ativo' },
      { name: 'Distribuidora XYZ', contact: 'xyz@fornecedor.com', phone: '(11) 3333-2222', cnpj: '98.765.432/0001-10', status: 'ativo' },
    ];
    await db.insert(suppliers).values(supplierData).onConflictDoNothing();
    
    console.log("✅ Database initialized successfully!");
    res.json({ 
      success: true, 
      message: "Database initialized with tables, categories, customers, and suppliers" 
    });
  } catch (error) {
    console.error("❌ Error initializing database:", error);
    res.status(500).json({ error: String(error) });
  }
});

// SPA fallback - serve index.html for all other routes (production only)
if (!isDev) {
  app.get("*", (_req, res) => {
    const indexPath = path.join(__dirname, "..", "public", "index.html");
    res.sendFile(indexPath);
  });
}

const server = http.createServer(app);

async function startServer() {
  if (isDev) {
    const { setupVite } = await import("./vite");
    await setupVite(server, app);
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(
      `Server running on port ${PORT} - Connected to Neon PostgreSQL${isDev ? " (Development Mode)" : ""}`,
    );
  });
}

startServer();

export default app;
