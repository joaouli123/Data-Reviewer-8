import { Express } from "express";
import { storage } from "../storage";
import { authMiddleware, AuthenticatedRequest } from "../middleware";
import * as ofx from 'node-ofx-parser';

export function registerBankRoutes(app: Express) {
  app.get("/api/bank/items", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const items = await storage.getBankStatementItems(req.user.companyId);
      res.json(items);
    } catch (error) {
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
        const initialClean = ofxContent.trim().replace(/\[-?\d+:\w+\]/g, '');
        data = ofx.parse(initialClean);
        console.log("[OFX Debug] Parse inicial bem-sucedido");
      } catch (parseError) {
        console.warn("[OFX Debug] Falha no parse inicial, tentando limpeza SGML...");
        try {
          const cleanedXml = body
            .replace(/<(\w+)>([^<\n\r]+)(?!\/<\1>)/g, '<$1>$2</$1>')
            .replace(/&(?!(amp|lt|gt|quot|apos);)/g, '&amp;')
            .replace(/\[-?\d+:\w+\]/g, '');
          data = ofx.parse(header + cleanedXml);
          console.log("[OFX Debug] Parse com limpeza SGML bem-sucedido");
        } catch (finalError) {
          console.warn("[OFX Debug] Falha na limpeza SGML, tentando limpeza radical...");
          try {
            const extremeClean = body
              .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
              .replace(/\[-?\d+:\w+\]/g, '')
              .replace(/<(\w+)>([^<\r\n]+)/g, '<$1>$2</$1>');
            data = ofx.parse(extremeClean);
            console.log("[OFX Debug] Parse radical bem-sucedido");
          } catch (e) {
            console.error('[OFX Debug] Falha crítica em todos os níveis de parsing');
            throw finalError;
          }
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
      res.json({ newItems, duplicateCount });
    } catch (error: any) {
      console.error('[OFX Debug] Erro fatal:', error);
      res.status(400).json({ error: "Erro ao processar arquivo OFX: formato inválido ou corrompido" });
    }
  });
}
