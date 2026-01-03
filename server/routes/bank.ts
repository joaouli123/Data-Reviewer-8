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
      
      const data = ofx.parse(ofxContent);
      
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
