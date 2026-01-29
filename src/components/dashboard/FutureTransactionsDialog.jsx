import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrendingUp, TrendingDown, Calendar, User, Building } from 'lucide-react';

export default function FutureTransactionsDialog({ 
  open, 
  onOpenChange, 
  title, 
  transactions = [], 
  type = 'income' // 'income' ou 'expense'
}) {
  const isIncome = type === 'income';
  
  // Ordenar por data de vencimento
  const sortedTransactions = [...transactions].sort((a, b) => {
    const dateA = new Date(a.paymentDate || a.date);
    const dateB = new Date(b.paymentDate || b.date);
    return dateA - dateB;
  });

  const total = sortedTransactions.reduce((sum, t) => {
    const amount = Math.abs(parseFloat(t.amount || 0));
    const interest = parseFloat(t.interest || 0);
    const cardFee = t.hasCardFee ? (amount * (parseFloat(t.cardFee) || 0)) / 100 : 0;
    return sum + amount + interest - (isIncome ? cardFee : 0);
  }, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isIncome ? (
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            ) : (
              <TrendingDown className="w-5 h-5 text-rose-600" />
            )}
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Resumo */}
          <div className={`p-4 rounded-lg border ${isIncome ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
            <div className="flex justify-between items-center">
              <div>
                <p className={`text-sm font-medium ${isIncome ? 'text-emerald-700' : 'text-rose-700'}`}>
                  Total de {sortedTransactions.length} transações
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Pendentes nos próximos 30 dias
                </p>
              </div>
              <p className={`text-2xl font-bold ${isIncome ? 'text-emerald-700' : 'text-rose-700'}`}>
                R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Tabela de transações */}
          {sortedTransactions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Vencimento</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTransactions.map((t, idx) => {
                  const txDate = new Date(t.paymentDate || t.date);
                  const amount = Math.abs(parseFloat(t.amount || 0));
                  const interest = parseFloat(t.interest || 0);
                  const cardFee = t.hasCardFee ? (amount * (parseFloat(t.cardFee) || 0)) / 100 : 0;
                  const netAmount = amount + interest - (isIncome ? cardFee : 0);
                  
                  return (
                    <TableRow key={t.id || idx}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-muted-foreground" />
                          {format(txDate, "dd/MM/yyyy", { locale: ptBR })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{t.description}</p>
                          {t.installmentNumber && t.installmentTotal && (
                            <Badge variant="outline" className="text-xs mt-1">
                              Parcela {t.installmentNumber}/{t.installmentTotal}
                            </Badge>
                          )}
                          {t.customerName && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                              <User className="w-3 h-3" />
                              {t.customerName}
                            </div>
                          )}
                          {t.supplierName && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                              <Building className="w-3 h-3" />
                              {t.supplierName}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${isIncome ? 'text-emerald-600' : 'text-rose-600'}`}>
                        R$ {netAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        {cardFee > 0 && (
                          <p className="text-xs text-muted-foreground font-normal">
                            (taxa: R$ {cardFee.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                          </p>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhuma transação pendente encontrada</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
