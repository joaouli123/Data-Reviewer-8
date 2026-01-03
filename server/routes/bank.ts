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
      
      // Sanitização básica do conteúdo OFX
      // Alguns bancos brasileiros usam ISO-8859-1 ou caracteres especiais que quebram o XML
      let sanitizedContent = ofxContent;
      
      // Tenta encontrar o início do OFX
      const ofxStart = sanitizedContent.indexOf('<OFX>');
      if (ofxStart === -1) {
        return res.status(400).json({ error: "Arquivo OFX inválido: tag <OFX> não encontrada" });
      }

      const xmlBody = sanitizedContent.substring(ofxStart);
      
      // node-ofx-parser espera um formato bem específico. 
      // Se falhar, tentamos uma limpeza mais agressiva ou retornamos erro amigável.
      let data;
      try {
        // Remove espaços em branco extras antes do processamento
        const trimmedContent = ofxContent.trim();
        data = ofx.parse(trimmedContent);
      } catch (parseError) {
        // Tenta encontrar o início real do conteúdo (ignora cabeçalhos proprietários se necessário)
        const ofxStartPos = ofxContent.indexOf('<OFX>');
        const contentToParse = ofxStartPos !== -1 ? ofxContent.substring(ofxStartPos) : ofxContent;
        
        // Tenta limpar tags não fechadas comuns em OFX de bancos brasileiros
        const cleanedXml = contentToParse
          .replace(/<(\w+)>([^<]+)(?!\/<\1>)/g, '<$1>$2</$1>') // Fecha tags simples
          .replace(/&(?!(amp|lt|gt|quot|apos);)/g, '&amp;'); // Escapa ampersands apenas se não estiverem escapados
        
        try {
          data = ofx.parse(cleanedXml);
        } catch (finalError) {
          console.error('Falha crítica no parsing OFX:', finalError);
          throw finalError;
        }
      }
      
      // Navigate the OFX structure
      const stmttrns = data.OFX?.BANKMSGSRSV1?.STMTTRNRS?.STMTRS?.BANKTRANLIST?.STMTTRN;
      
      if (!stmttrns) {
        return res.status(400).json({ error: "Estrutura do arquivo OFX inválida ou sem transações" });
      }

      const transactions = Array.isArray(stmttrns) ? stmttrns : [stmttrns];
      
      const newItems = [];
      let duplicateCount = 0;
      
      const existing = await storage.getBankStatementItems(req.user.companyId);
      
      for (const trn of transactions) {
        const amount = parseFloat(trn.TRNAMT);
        // OFX dates are usually YYYYMMDDHHMMSS
        const rawDate = trn.DTPOSTED;
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
      
      res.json({ newItems, duplicateCount });
    } catch (error: any) {
      console.error('Erro OFX:', error);
      res.status(400).json({ error: "Erro ao processar arquivo OFX: formato inválido ou corrompido" });
    }
  });
}
