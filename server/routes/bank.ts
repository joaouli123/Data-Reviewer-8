import { Express } from "express";
import { storage } from "../storage";
import { authMiddleware, AuthenticatedRequest } from "../middleware";
import * as ofx from 'node-ofx-parser';

export function registerBankRoutes(app: Express) {

  // --- ROTA 1: BUSCAR ITENS (Com Debug e Sem Cache) ---
  app.get("/api/bank/items", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      // Matar Cache do Navegador (Importante para ver atualizações na hora)
      res.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.header('Pragma', 'no-cache');
      res.header('Expires', '0');

      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const companyId = req.user.companyId;

      console.log(`[Bank API] Buscando itens para empresa: ${companyId}`);

      const items = await storage.getBankStatementItems(companyId);
      console.log(`[Bank API] Encontrados ${items.length} itens no banco de dados.`);

      res.json(items);
    } catch (error) {
      console.error("[Bank API] Erro ao buscar itens:", error);
      res.status(500).json({ error: "Failed to fetch bank statement items" });
    }
  });

  // --- ROTA 2: UPLOAD OFX (A CORREÇÃO ESTÁ AQUI) ---
  app.post("/api/bank/upload-ofx", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const { ofxContent } = req.body;

      if (!ofxContent) return res.status(400).json({ error: "Conteúdo do arquivo não fornecido" });

      console.log("[OFX] Iniciando processamento...");

      // 1. Limpeza e Parse do Arquivo
      const cleanContent = ofxContent.replace(/&/g, '&amp;');
      const ofxStart = cleanContent.indexOf('<OFX>');

      if (ofxStart === -1) return res.status(400).json({ error: "Arquivo OFX inválido" });

      let data;
      try {
        const initialClean = cleanContent.trim().replace(/\[-?\d+:\w+\]/g, '');
        data = ofx.parse(initialClean);
      } catch (parseError) {
        // Fallback manual para arquivos mal formatados
        console.log("[OFX] Parse automático falhou, tentando manual...");
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
          throw new Error("Falha ao ler transações do arquivo");
        }
      }

      // 2. Extração das Transações
      const ofxObj = data.OFX || data;
      const bankMsg = ofxObj.BANKMSGSRSV1?.STMTTRNRS?.STMTRS || 
                      ofxObj.CREDITCARDMSGSRSV1?.CCSTMTTRNRS?.CCSTMTRS;

      let stmttrns = bankMsg?.BANKTRANLIST?.STMTTRN;

      if (!stmttrns) return res.status(400).json({ error: "Sem transações no arquivo" });

      const transactions = Array.isArray(stmttrns) ? stmttrns : [stmttrns];
      console.log(`[OFX] ${transactions.length} transações encontradas no arquivo.`);

      // 3. Processamento e Verificação de Duplicatas
      const processedItems: any[] = [];
      let duplicateCount = 0;
      let newCount = 0;
      const companyId = req.user.companyId;

      // Busca o que já existe no banco
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

        // Verifica se essa transação já existe no banco
        const existingItem = existingDbItems.find(item => 
          item.description === description && 
          new Date(item.date).getTime() === date.getTime() && 
          Math.abs(parseFloat(item.amount.toString()) - amount) < 0.01
        );

        if (existingItem) {
          // --- A CORREÇÃO MÁGICA ---
          // Se já existe, nós ADICIONAMOS à lista de resposta (processedItems) em vez de ignorar via 'continue'.
          // Assim o frontend recebe o item e mostra na tela.
          processedItems.push(existingItem);
          duplicateCount++;
        } else {
          // Se é novo, salva no banco e adiciona à lista
          const newItem = await storage.createBankStatementItem(companyId, {
            date,
            amount: amount.toString(),
            description: description,
            status: 'PENDING'
          });
          processedItems.push(newItem);
          newCount++;
        }
      }

      console.log(`[OFX] Resultado: ${newCount} novos, ${duplicateCount} duplicados.`);

      // Retorna TUDO (novos + existentes) para a lista preencher
      res.json({ 
        newItems: processedItems, 
        duplicateCount, 
        totalItems: processedItems.length 
      });

    } catch (error: any) {
      console.error('[OFX Error]', error);
      res.status(400).json({ error: "Erro ao processar arquivo OFX. Verifique o formato." });
    }
  });

  // --- ROTA 3: SUGESTÕES (Mantida igual) ---
  app.get("/api/bank/suggest/:id", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const item = await storage.getBankStatementItemById(req.user.companyId, req.params.id);
      if (!item) return res.status(404).json({ error: "Item not found" });

      const transactions = await storage.getTransactions(req.user.companyId);
      const suggestions = transactions.filter(t => {
        const bankDesc = item.description.toLowerCase();
        const transDesc = (t.description || "").toLowerCase();

        const amountMatch = Math.abs(parseFloat(t.amount) - Math.abs(parseFloat(item.amount))) < 0.05;
        const descMatch = transDesc.includes(bankDesc.split(' ')[0]) || bankDesc.includes(transDesc.split(' ')[0]);

        return amountMatch || descMatch;
      }).slice(0, 5);

      res.json(suggestions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch suggestions" });
    }
  });

  // --- ROTA 4: MATCH (Mantida igual) ---
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

  // --- ROTA 5: LIMPAR (Mantida igual) ---
  app.delete("/api/bank/clear", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      await storage.clearBankStatementItems(req.user.companyId);
      res.json({ message: "Dados bancários removidos com sucesso" });
    } catch (error) {
      res.status(500).json({ error: "Failed to clear bank statement items" });
    }
  });
}