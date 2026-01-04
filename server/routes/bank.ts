import { Express } from "express";
import { storage } from "../storage";
import { authMiddleware, AuthenticatedRequest } from "../middleware";
import * as ofx from 'node-ofx-parser';

export function registerBankRoutes(app: Express) {
  // ROTA 1: BUSCAR ITENS
  app.get("/api/bank/items", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      console.log("\n--- [DEBUG] INICIANDO BUSCA DE ITENS BANCÁRIOS ---");
      
      if (!req.user) {
        console.log("[DEBUG] Erro: Usuário não autenticado.");
        return res.status(401).json({ error: "Unauthorized" });
      }

      const companyId = req.user.companyId;
      const userId = req.user.id;
      console.log(`[DEBUG] Usuário: ${userId} | Empresa: ${companyId}`);
      
      // Busca direta no storage
      const items = await storage.getBankStatementItems(companyId);
      
      console.log(`[DEBUG] Quantidade de itens encontrados no Banco de Dados: ${items.length}`);
      
      if (items.length > 0) {
        console.log("[DEBUG] Exemplo do primeiro item encontrado:");
        console.log(JSON.stringify(items[0], null, 2));
      } else {
        console.log("[DEBUG] A lista retornou VAZIA do banco de dados.");
        console.log("[DEBUG] DICA: Verifique se o upload salvou com o companyId correto.");
      }

      console.log("--- [DEBUG] FIM DA BUSCA ---\n");
      
      // Cabeçalhos para matar cache
      res.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.header('Pragma', 'no-cache');
      res.header('Expires', '0');
      
      res.json(items);
    } catch (error) {
      console.error("[DEBUG] ERRO CRÍTICO NA ROTA:", error);
      res.status(500).json({ error: "Failed to fetch bank statement items" });
    }
  });

  // ROTA 2: UPLOAD E PROCESSAMENTO DO OFX (CORRIGIDO)
  app.post("/api/bank/upload-ofx", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const { ofxContent } = req.body;

      if (!ofxContent) return res.status(400).json({ error: "Conteúdo inválido" });

      // --- 1. PARSE DO ARQUIVO ---
      const cleanContent = ofxContent.replace(/&/g, '&amp;'); 
      const ofxStart = cleanContent.indexOf('<OFX>');

      let data;
      try {
        const initialClean = cleanContent.trim().replace(/\[-?\d+:\w+\]/g, '');
        data = ofx.parse(initialClean);
      } catch (e) {
        // Fallback para OFX manual
        const transactions: any[] = [];
        const lines = cleanContent.split('\n');
        let currentTrn: any = null;
        for (let line of lines) {
          line = line.trim();
          if (line.includes('<STMTTRN>')) currentTrn = {};
          else if (line.includes('</STMTTRN>')) {
            if (currentTrn) transactions.push(currentTrn);
            currentTrn = null;
          } else if (currentTrn) {
            const match = line.match(/<(\w+)>([^<\n\r]+)/);
            if (match) {
              const tag = match[1];
              let value = match[2].trim();
              if (tag === 'DTPOSTED') value = value.replace(/\[-?\d+:\w+\]/g, '');
              currentTrn[tag] = value;
            }
          }
        }
        if (transactions.length > 0) {
          data = { OFX: { BANKMSGSRSV1: { STMTTRNRS: { STMTRS: { BANKTRANLIST: { STMTTRN: transactions } } } } } };
        } else {
          throw new Error("Não foi possível ler as transações do OFX");
        }
      }

      // --- 2. EXTRAÇÃO ---
      const ofxObj = data.OFX || data;
      const bankMsg = ofxObj.BANKMSGSRSV1?.STMTTRNRS?.STMTRS || 
                      ofxObj.CREDITCARDMSGSRSV1?.CCSTMTTRNRS?.CCSTMTRS;

      let stmttrns = bankMsg?.BANKTRANLIST?.STMTTRN;
      if (!stmttrns) return res.status(400).json({ error: "Sem transações no arquivo" });

      const transactions = Array.isArray(stmttrns) ? stmttrns : [stmttrns];

      // --- 3. LÓGICA DE CONCILIAÇÃO INTELIGENTE ---
      const companyId = req.user.companyId;
      const processedItems: any[] = [];
      let duplicateCount = 0;

      const existingDbItems = await storage.getBankStatementItems(companyId);

      for (const trn of transactions) {
        const amount = parseFloat(trn.TRNAMT);
        const rawDate = trn.DTPOSTED || "";
        const date = new Date(
          parseInt(rawDate.substring(0, 4)),
          parseInt(rawDate.substring(4, 6)) - 1,
          parseInt(rawDate.substring(6, 8))
        );

        const description = (trn.MEMO || trn.NAME || "Transação Bancária").trim();

        // Verifica se já existe
        const existingItem = existingDbItems.find(item => 
          item.description === description && 
          new Date(item.date).getTime() === date.getTime() && 
          Math.abs(parseFloat(item.amount.toString()) - amount) < 0.01
        );

        if (existingItem) {
          console.log(`[DEBUG] Item duplicado encontrado: ${description}. ID: ${existingItem.id}`);
          processedItems.push(existingItem);
          duplicateCount++; 
        } else {
          console.log(`[DEBUG] Criando NOVO item: ${description} para empresa ${companyId}`);
          const newItem = await storage.createBankStatementItem(companyId, {
            date,
            amount: amount.toString(),
            description: description,
            status: 'PENDING'
          });
          console.log(`[DEBUG] Item criado com sucesso. ID: ${newItem.id}`);
          processedItems.push(newItem);
        }
      }

      // Retorna TUDO para o frontend preencher a lista
      res.json({ 
        newItems: processedItems, 
        duplicateCount,
        totalItems: processedItems.length 
      });

    } catch (error: any) {
      console.error('[OFX Error]', error);
      res.status(400).json({ error: "Erro ao processar arquivo OFX" });
    }
  });

  // ROTA 3: SUGESTÕES DE MATCH
  app.get("/api/bank/suggest/:id", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const item = await storage.getBankStatementItemById(req.user.companyId, req.params.id);
      if (!item) return res.status(404).json({ error: "Item not found" });

      const transactions = await storage.getTransactions(req.user.companyId);

      const suggestions = transactions.filter(t => {
        const bankVal = Math.abs(parseFloat(item.amount));
        const sysVal = Math.abs(parseFloat(t.amount));

        const amountMatch = Math.abs(sysVal - bankVal) < 0.05; 
        const descMatch = (t.description || "").toLowerCase().includes(item.description.toLowerCase().split(' ')[0]);

        return amountMatch || descMatch;
      }).slice(0, 5);

      res.json(suggestions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch suggestions" });
    }
  });

  // ROTA 4: MATCH MANUAL
  app.post("/api/bank/match", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const { bankItemId, transactionId } = req.body;
      const matched = await storage.matchBankStatementItem(req.user.companyId, bankItemId, transactionId);
      res.json(matched);
    } catch (error) {
      res.status(500).json({ error: "Failed to match bank item" });
    }
  });

  // ROTA 5: LIMPAR DADOS
  app.delete("/api/bank/clear", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      await storage.clearBankStatementItems(req.user.companyId);
      res.json({ message: "Limpo com sucesso" });
    } catch (error) {
      res.status(500).json({ error: "Failed to clear" });
    }
  });
}