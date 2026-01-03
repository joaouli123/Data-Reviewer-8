import { Express } from "express";
import { storage } from "../storage";
import { authMiddleware, AuthenticatedRequest } from "../middleware";
import * as ofx from 'node-ofx-parser';

export function registerBankRoutes(app: Express) {
  app.get("/api/bank/items", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const items = await storage.getBankStatementItems(req.user.companyId);
      console.log(`[Bank API] Retornando ${items.length} itens para empresa ${req.user.companyId}`);
      res.json(items);
    } catch (error) {
      console.error("[Bank API] Erro ao buscar itens:", error);
      res.status(500).json({ error: "Failed to fetch bank statement items" });
    }
  });

  app.post("/api/bank/upload-ofx", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const { ofxContent } = req.body;
      
      console.log("[OFX Debug] Recebido conteúdo. Tamanho:", ofxContent?.length);
      
      if (!ofxContent) {
        return res.status(400).json({ error: "Conteúdo do arquivo não fornecido" });
      }

      const ofxStart = ofxContent.indexOf('<OFX>');
      if (ofxStart === -1) {
        console.error("[OFX Debug] Tag <OFX> não encontrada no conteúdo");
        return res.status(400).json({ error: "Arquivo OFX inválido: tag <OFX> não encontrada" });
      }

      console.log("[OFX Debug] Tag <OFX> encontrada na posição:", ofxStart);

      const header = ofxContent.substring(0, ofxStart);
      const body = ofxContent.substring(ofxStart);
      
      let data;
      try {
        console.log("[OFX Debug] Tentando parse inicial...");
        // Limpeza básica e remoção de fuso horário
        const initialClean = ofxContent.trim().replace(/\[-?\d+:\w+\]/g, '');
        data = ofx.parse(initialClean);
        console.log("[OFX Debug] Parse inicial bem-sucedido");
      } catch (parseError) {
        console.warn("[OFX Debug] Falha no parse inicial, tentando limpeza SGML customizada...");
        try {
          // Lógica manual para converter SGML malformado em objeto JSON
          // Baseado na estrutura do arquivo enviado pelo usuário
          const transactions: any[] = [];
          const lines = ofxContent.split('\n');
          let currentTrn: any = null;
          
          for (let line of lines) {
            line = line.trim();
            if (line.includes('<STMTTRN>')) {
              currentTrn = {};
            } else if (line.includes('</STMTTRN>')) {
              if (currentTrn) transactions.push(currentTrn);
              currentTrn = null;
            } else if (currentTrn) {
              const match = line.match(/<(\w+)>([^<\n\r]+)/);
              if (match) {
                const tag = match[1];
                let value = match[2].trim();
                // Limpeza específica para data
                if (tag === 'DTPOSTED') value = value.replace(/\[-?\d+:\w+\]/g, '');
                currentTrn[tag] = value;
              }
            }
          }
          
          if (transactions.length > 0) {
            data = {
              OFX: {
                BANKMSGSRSV1: {
                  STMTTRNRS: {
                    STMTRS: {
                      BANKTRANLIST: {
                        STMTTRN: transactions
                      }
                    }
                  }
                }
              }
            };
            console.log("[OFX Debug] Parse manual SGML bem-sucedido. Transações:", transactions.length);
          } else {
            throw new Error("Nenhuma transação encontrada no parse manual");
          }
        } catch (manualError) {
          console.error('[OFX Debug] Falha no parse manual:', manualError);
          throw parseError;
        }
      }

      if (!data || typeof data !== 'object') {
        throw new Error("Falha ao gerar objeto de dados do OFX");
      }
      
      console.log("[OFX Debug] Estrutura detectada:", Object.keys(data));
      
      const ofxObj = data.OFX || data;
      const bankMsg = ofxObj.BANKMSGSRSV1?.STMTTRNRS?.STMTRS || 
                     ofxObj.CREDITCARDMSGSRSV1?.CCSTMTTRNRS?.CCSTMTRS;
      
      const stmttrns = bankMsg?.BANKTRANLIST?.STMTTRN;
      
      if (!stmttrns) {
        console.error("[OFX Debug] Estrutura de transações não encontrada. Chaves OFX:", Object.keys(ofxObj));
        return res.status(400).json({ error: "Estrutura do arquivo OFX inválida ou sem transações" });
      }

      const transactions = Array.isArray(stmttrns) ? stmttrns : [stmttrns];
      console.log("[OFX Debug] Número de transações encontradas:", transactions.length);
      
      const newItems = [];
      let duplicateCount = 0;
      const existing = await storage.getBankStatementItems(req.user.companyId);
      
      for (const trn of transactions) {
        const amount = parseFloat(trn.TRNAMT);
        const rawDate = trn.DTPOSTED || "";
        const date = new Date(
          parseInt(rawDate.substring(0, 4)),
          parseInt(rawDate.substring(4, 6)) - 1,
          parseInt(rawDate.substring(6, 8))
        );
        
        const isDuplicate = existing.some(item => 
          item.description === trn.MEMO && 
          new Date(item.date).getTime() === date.getTime() && 
          Math.abs(parseFloat(item.amount.toString()) - amount) < 0.001
        );
        
        if (!isDuplicate) {
          const newItem = await storage.createBankStatementItem(req.user.companyId, {
            date,
            amount: amount.toString(),
            description: trn.MEMO || trn.NAME || "Transação Bancária",
            status: 'PENDING'
          });
          newItems.push(newItem);
        } else {
          duplicateCount++;
        }
      }
      
      console.log("[OFX Debug] Importação finalizada. Novos:", newItems.length, "Duplicados:", duplicateCount);
      console.log("[OFX Debug] Itens atuais no banco para esta empresa:", (await storage.getBankStatementItems(req.user.companyId)).length);
      res.json({ newItems, duplicateCount });
    } catch (error: any) {
      console.error('[OFX Debug] Erro fatal:', error);
      res.status(400).json({ error: "Erro ao processar arquivo OFX: formato inválido ou corrompido" });
    }
  });

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
