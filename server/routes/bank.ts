import { Express } from "express";
import { storage } from "../storage";
import { authMiddleware, AuthenticatedRequest } from "../middleware";
import * as ofx from 'node-ofx-parser';

// --- CORREÇÃO 1: Caminho relativo duplo para chegar na raiz 'shared' ---
import { db } from "../db";
import { bankStatementItems } from "../../shared/schema"; 

export function registerBankRoutes(app: Express) {

  // --- ROTA 1: BUSCAR ITENS ---
  app.get("/api/bank/items", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      res.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

      // CORREÇÃO 2: Uso do ! para garantir que user existe
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const companyId = req.user!.companyId;

      console.log(`[Bank API] Buscando itens para empresa: ${companyId}`);

      const items = await storage.getBankStatementItems(companyId);
      console.log(`[Bank API] Encontrados ${items.length} itens.`);

      res.json(items);
    } catch (error) {
      console.error("[Bank API] Erro ao buscar itens:", error);
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
        // Fallback simples
        const transactions: any[] = [];
        const lines = cleanContent.split('\n');
        let currentTrn: any = null;
        for (let line of lines) {
            line = line.trim();
            if (line.includes('<STMTTRN>')) currentTrn = {};
            else if (line.includes('</STMTTRN>')) { if(currentTrn) transactions.push(currentTrn); currentTrn = null; }
            else if (currentTrn) {
                const match = line.match(/<(\w+)>([^<\n\r]+)/);
                if (match) currentTrn[match[1]] = match[2].trim().replace(/\[-?\d+:\w+\]/g, '');
            }
        }
        data = { OFX: { BANKMSGSRSV1: { STMTTRNRS: { STMTRS: { BANKTRANLIST: { STMTTRN: transactions } } } } } };
      }

      const ofxObj = data.OFX || data;
      const bankMsg = ofxObj.BANKMSGSRSV1?.STMTTRNRS?.STMTRS || ofxObj.CREDITCARDMSGSRSV1?.CCSTMTTRNRS?.CCSTMTRS;
      let stmttrns = bankMsg?.BANKTRANLIST?.STMTTRN;

      if (!stmttrns) return res.status(400).json({ error: "Sem transações" });
      const transactions = Array.isArray(stmttrns) ? stmttrns : [stmttrns];

      // 2. Processamento
      const processedItems: any[] = [];
      let duplicateCount = 0;
      const companyId = req.user!.companyId;

      // --- CORREÇÃO 3: Tipagem 'any[]' para evitar erro de propriedade inexistente ---
      const existingDbItems = (await storage.getBankStatementItems(companyId)) as any[];

      for (const trn of transactions) {
        const amount = parseFloat(trn.TRNAMT);
        const rawDate = trn.DTPOSTED || "";
        const date = new Date(
          parseInt(rawDate.substring(0, 4)),
          parseInt(rawDate.substring(4, 6)) - 1,
          parseInt(rawDate.substring(6, 8))
        );
        const description = (trn.MEMO || trn.NAME || "Transação").trim();

        // Log para depuração de duplicatas
        console.log(`[Bank API] Verificando item: ${description} | Data: ${date.toISOString()} | Valor: ${amount} | Empresa: ${companyId}`);

        // Busca no banco se já existe ESSA transação para ESSA empresa
        const existingItem = existingDbItems.find(item => 
          item.description === description && 
          new Date(item.date).toDateString() === date.toDateString() && 
          Math.abs(parseFloat(item.amount) - amount) < 0.01
        );

        if (existingItem) {
          console.log(`[Bank API] Item ignorado (já existe): ${description}`);
          processedItems.push(existingItem);
          duplicateCount++;
        } else {
          console.log(`[Bank API] Criando novo item: ${description} - ${amount} para empresa ${companyId}`);
          const newItem = await storage.createBankStatementItem(companyId, {
            date,
            amount: amount.toString(),
            description: description,
            status: 'PENDING'
          });
          processedItems.push(newItem);
        }
      }

      res.json({ newItems: processedItems, duplicateCount, totalItems: processedItems.length });

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
      await storage.clearBankStatementItems(req.user!.companyId);
      res.json({ message: "Limpo" });
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