import { Express } from "express";
<<<<<<< HEAD
import { storage } from "../storage";
import { authMiddleware, AuthenticatedRequest } from "../middleware";
import * as ofx from 'node-ofx-parser';

// --- CORREÇÃO 1: Caminho relativo duplo para chegar na raiz 'shared' ---
import { db } from "../db";
import { bankStatementItems } from "../../shared/schema"; 
=======
import { storage } from "../storage.js";
import { authMiddleware, AuthenticatedRequest } from "../middleware.js";
import * as ofx from 'node-ofx-parser';

// --- CORREÇÃO 1: Caminho relativo duplo para chegar na raiz 'shared' ---
import { db } from "../db.js";
import { bankStatementItems } from "../../shared/schema.js"; 
>>>>>>> 421df1f960deb88f8be303df4d1aba395442d6c0

export function registerBankRoutes(app: Express) {

  app.get("/api/bank/items", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      res.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

      if (!req.user || !req.user.companyId) {
        return res.status(401).json({ error: "Unauthorized - Company ID missing" });
      }
      
      const companyId = req.user.companyId;
      const items = await storage.getBankStatementItems(companyId);
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch bank statement items" });
    }
  });

  // --- ROTA 2: UPLOAD OFX ---
  app.post("/api/bank/upload-ofx", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const { ofxContent } = req.body;

      if (!ofxContent) return res.status(400).json({ error: "Conteúdo inválido" });

      // 1. Parse
      const cleanContent = ofxContent.replace(/&/g, '&amp;');
      const initialClean = cleanContent.trim().replace(/\[-?\d+:\w+\]/g, '');
      let data;
      try {
        data = ofx.parse(initialClean);
      } catch (e) {
        // Fallback simples para quando o parser falha
        const transactions: any[] = [];
        const lines = cleanContent.split('\n');
        let currentTrn: any = null;
        for (let line of lines) {
            line = line.trim();
            if (line.toUpperCase().includes('<STMTTRN>')) currentTrn = {};
            else if (line.toUpperCase().includes('</STMTTRN>')) { 
              if(currentTrn) transactions.push(currentTrn); 
              currentTrn = null; 
            }
            else if (currentTrn) {
                const match = line.match(/<(\w+)>([^<\n\r]+)/);
                if (match) {
                  const tag = match[1].toUpperCase();
                  currentTrn[tag] = match[2].trim().replace(/\[-?\d+:\w+\]/g, '');
                }
            }
        }
        data = { OFX: { BANKMSGSRSV1: { STMTTRNRS: { STMTRS: { BANKTRANLIST: { STMTTRN: transactions } } } } } };
      }

      const ofxObj = data.OFX || data;
      const bankMsg = ofxObj.BANKMSGSRSV1?.STMTTRNRS?.STMTRS || 
                      ofxObj.CREDITCARDMSGSRSV1?.CCSTMTTRNRS?.CCSTMTRS ||
                      ofxObj.BANKMSGSRSV1?.STMTTRNRS?.[0]?.STMTRS; // Suporte a arrays
      
      let stmttrns = bankMsg?.BANKTRANLIST?.STMTTRN;

      if (!stmttrns) return res.status(400).json({ error: "Sem transações" });
      const transactions = Array.isArray(stmttrns) ? stmttrns : [stmttrns];

      // 2. Processamento
      const processedItems: any[] = [];
      let duplicateCount = 0;
      const companyId = req.user!.companyId;

      if (!companyId) {
        return res.status(401).json({ error: "Company ID missing in user session" });
      }

      // Busca itens existentes APENAS desta empresa para verificação de duplicatas
      const existingDbItems = (await storage.getBankStatementItems(companyId)) as any[];

      for (const trn of transactions) {
        const amount = parseFloat(trn.TRNAMT);
        if (isNaN(amount)) continue;

        const rawDate = trn.DTPOSTED || "";
        const year = parseInt(rawDate.substring(0, 4));
        const month = parseInt(rawDate.substring(4, 6)) - 1;
        const day = parseInt(rawDate.substring(6, 8));
        
        if (isNaN(year) || isNaN(month) || isNaN(day)) continue;

        const date = new Date(year, month, day);
        const description = (trn.MEMO || trn.NAME || "Transação").trim();

        // Busca no banco se JÁ EXISTE essa transação PARA ESSA EMPRESA ESPECÍFICA
        const isDuplicate = existingDbItems.some(item => {
          // O getBankStatementItems já filtra por companyId, mas reforçamos a verificação por segurança
          if (item.companyId !== companyId) return false;
          
          const itemDate = new Date(item.date);
          const itemAmount = parseFloat(item.amount);

          return item.description === description && 
                 itemDate.toDateString() === date.toDateString() && 
                 Math.abs(itemAmount - amount) < 0.001;
        });

        if (isDuplicate) {
          duplicateCount++;
        } else {
          const newItem = await storage.createBankStatementItem(companyId, {
            date,
            amount: amount.toString(),
            description: description,
            status: 'PENDING'
          });
          processedItems.push(newItem);
        }
      }

      res.json({ 
        newItems: processedItems, 
        duplicateCount, 
        totalItems: processedItems.length,
        message: `${processedItems.length} novas transações importadas, ${duplicateCount} duplicatas ignoradas.`
      });

    } catch (error: any) {
      console.error('[OFX Error]', error);
      res.status(400).json({ error: "Erro no processamento" });
    }
  });

  // --- ROTAS DE SUPORTE ---
  app.get("/api/bank/suggest/:id", authMiddleware, async (req: AuthenticatedRequest, res) => {
      res.json([]); 
  });

  app.post("/api/bank/match", authMiddleware, async (req: AuthenticatedRequest, res) => {
      const { bankItemId, transactionId } = req.body;
      const matched = await storage.matchBankStatementItem(req.user!.companyId, bankItemId, transactionId);
      res.json(matched);
  });

  app.delete("/api/bank/clear", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user || !req.user.companyId) return res.status(401).json({ error: "Unauthorized" });
      await storage.clearBankStatementItems(req.user.companyId);
      res.json({ message: "Limpo" });
    } catch (error) {
      res.status(500).json({ error: "Failed to clear items" });
    }
  });

  // --- ROTA DE EMERGÊNCIA (RAIO-X) ---
  app.get("/api/bank/debug-dump", async (req, res) => {
    try {
      const allItems = await db.select().from(bankStatementItems).limit(20);
      res.json({
        total: allItems.length,
        data: allItems
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
}