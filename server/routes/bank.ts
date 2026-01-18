import { Express } from "express";
import { storage } from "../storage";
import { authMiddleware, AuthenticatedRequest, requirePermission } from "../middleware";
import * as ofx from 'node-ofx-parser';
import { z } from "zod";

// --- CORREÇÃO 1: Caminho relativo duplo para chegar na raiz 'shared' ---
import { db } from "../db";
import { bankStatementItems } from "../../shared/schema"; 

export function registerBankRoutes(app: Express) {

  const uploadSchema = z.object({
    ofxContent: z.string().min(1)
  });

  const matchSchema = z.object({
    bankItemId: z.string().min(1),
    transactionId: z.string().min(1)
  });

  app.get("/api/bank/items", authMiddleware, requirePermission("import_bank"), async (req: AuthenticatedRequest, res) => {
    try {
      res.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

      if (!req.user || !req.user.companyId) {
        return res.status(400).json({ error: "Company ID missing" });
      }
      
      const companyId = req.user.companyId;
      const items = await storage.getBankStatementItems(companyId);
      res.json(items);
    } catch (error) {
      console.error("[Bank] list items error", error);
      res.status(500).json({ error: "Failed to fetch bank statement items" });
    }
  });

  // --- ROTA 2: UPLOAD OFX ---
  app.post("/api/bank/upload-ofx", authMiddleware, requirePermission("import_bank"), async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      if (!req.user.companyId) return res.status(400).json({ error: "Company ID missing" });
      const parsed = uploadSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Conteúdo inválido" });
      }

      const { ofxContent } = parsed.data;

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
  app.get("/api/bank/suggest/:id", authMiddleware, requirePermission("import_bank"), async (req: AuthenticatedRequest, res) => {
    try {
      const bankItemId = req.params.id;
      if (!bankItemId) return res.json([]);
      if (!req.user?.companyId) return res.status(400).json({ error: "Company ID missing" });
      const companyId = req.user.companyId;
      
      // 1. Buscar o item bancário
      const bankItem = await storage.getBankStatementItemById(companyId, bankItemId);
      if (!bankItem) return res.json([]);
      
      const bankAmount = Math.abs(parseFloat(bankItem.amount));
      const bankDate = new Date(bankItem.date);
      const bankDesc = (bankItem.description || '').toLowerCase().trim();
      
      // 2. Buscar todas transações não-conciliadas
      const allTransactions = await storage.getTransactions(companyId);
      
      // 3. Filtrar e pontuar transações candidatas
      const candidates = allTransactions
        .filter((t: any) => !t.isReconciled) // Apenas não conciliadas
        .map((t: any) => {
          const txAmount = Math.abs(parseFloat(t.amount || '0'));
          const txDate = new Date(t.date);
          const txDesc = (t.description || '').toLowerCase().trim();
          
          // Calcular scores
          let score = 0;
          
          // Score por valor (0-50 pontos)
          const amountDiff = Math.abs(bankAmount - txAmount);
          const amountTolerance = bankAmount * 0.02; // 2% tolerância
          if (amountDiff < 0.01) {
            score += 50; // Match exato
          } else if (amountDiff <= amountTolerance) {
            score += 40; // Muito próximo
          } else if (amountDiff <= bankAmount * 0.05) {
            score += 20; // Próximo (5%)
          }
          
          // Score por data (0-30 pontos)
          const daysDiff = Math.abs((bankDate.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysDiff === 0) {
            score += 30; // Mesmo dia
          } else if (daysDiff <= 1) {
            score += 25; // 1 dia de diferença
          } else if (daysDiff <= 3) {
            score += 15; // Até 3 dias
          } else if (daysDiff <= 7) {
            score += 5; // Até 7 dias
          }
          
          // Score por descrição (0-20 pontos)
          if (bankDesc === txDesc) {
            score += 20; // Match exato
          } else if (bankDesc.includes(txDesc) || txDesc.includes(bankDesc)) {
            score += 15; // Um contém o outro
          } else {
            // Busca por palavras em comum
            const bankWords = bankDesc.split(/\s+/).filter(w => w.length > 2);
            const txWords = txDesc.split(/\s+/).filter(w => w.length > 2);
            const commonWords = bankWords.filter(w => txWords.some(tw => tw.includes(w) || w.includes(tw)));
            if (commonWords.length > 0) {
              score += Math.min(10, commonWords.length * 3);
            }
          }
          
          return { ...t, score, amountDiff, daysDiff };
        })
        .filter((t: any) => t.score >= 15) // Mínimo de relevância
        .sort((a: any, b: any) => b.score - a.score) // Melhor score primeiro
        .slice(0, 10); // Top 10 sugestões
      
      res.json(candidates);
    } catch (error) {
      console.error('[Suggest Error]', error);
      res.json([]);
    }
  });

  app.post("/api/bank/match", authMiddleware, requirePermission("import_bank"), async (req: AuthenticatedRequest, res) => {
      if (!req.user?.companyId) return res.status(400).json({ error: "Company ID missing" });
      const parsed = matchSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Dados inválidos" });
      }

      const { bankItemId, transactionId } = parsed.data;
        const matched = await storage.matchBankStatementItem(req.user.companyId, bankItemId, transactionId);
      res.json(matched);
  });

  app.delete("/api/bank/clear", authMiddleware, requirePermission("import_bank"), async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user?.companyId) return res.status(400).json({ error: "Company ID missing" });
      await storage.clearBankStatementItems(req.user.companyId);
      res.json({ message: "Limpo" });
    } catch (error) {
      res.status(500).json({ error: "Failed to clear items" });
    }
  });

}