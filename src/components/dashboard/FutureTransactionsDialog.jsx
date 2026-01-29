import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrendingUp, TrendingDown, User, Building } from 'lucide-react';

export default function FutureTransactionsDialog({ 
  open, 
  onOpenChange, 
  title, 
  transactions = [], 
  type = 'income' // 'income' ou 'expense'
}) {
  const isIncome = type === 'income';
  const [page, setPage] = useState(1);
  const pageSize = 15;

  useEffect(() => {
    if (open) setPage(1);
  }, [open, transactions]);
  
  // Helper para extrair data de VENCIMENTO (usa date primeiro, pois é a data de vencimento)
  const extractDate = (t) => {
    // Para transações pendentes, date é a data de vencimento
    const candidate = t.date || t.paymentDate || t.payment_date;
    if (!candidate) return null;
    if (candidate instanceof Date) {
      return isNaN(candidate.getTime()) ? null : candidate;
    }
    const raw = String(candidate).trim();
    const ymdMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (ymdMatch) {
      const year = Number(ymdMatch[1]);
      const month = Number(ymdMatch[2]);
      const day = Number(ymdMatch[3]);
      const d = new Date(year, month - 1, day, 12, 0, 0, 0);
      return isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  };

  // Ordenar por data de vencimento
  const sortedTransactions = useMemo(() => {
    return [...transactions]
      .filter(t => extractDate(t) !== null) // Remove transações sem data válida
      .sort((a, b) => {
        const dateA = extractDate(a);
        const dateB = extractDate(b);
        return dateA - dateB;
      });
  }, [transactions]);

  const totalPages = Math.max(1, Math.ceil(sortedTransactions.length / pageSize));
  const startIndex = (page - 1) * pageSize;
  const paginatedTransactions = sortedTransactions.slice(startIndex, startIndex + pageSize);

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
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="pl-6 text-left w-[140px]">Vencimento</TableHead>
                    <TableHead className="text-left">Descrição</TableHead>
                    <TableHead className="text-right pr-6 w-[140px]">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTransactions.map((t, idx) => {
                    const txDate = extractDate(t);
                    const amount = Math.abs(parseFloat(t.amount || 0));
                    const interest = parseFloat(t.interest || 0);
                    const cardFee = t.hasCardFee ? (amount * (parseFloat(t.cardFee) || 0)) / 100 : 0;
                    const netAmount = amount + interest - (isIncome ? cardFee : 0);
                    
                    return (
                      <TableRow key={t.id || idx} className="hover:bg-slate-50/50">
                        <TableCell className="font-medium text-slate-600 pl-6 whitespace-nowrap text-left">
                          {txDate ? format(txDate, "dd/MM/yyyy", { locale: ptBR }) : '-'}
                        </TableCell>
                        <TableCell className="text-left align-middle">
                          <div>
                            <p className="font-medium text-slate-900 text-sm">
                              {t.description}
                              {t.installmentNumber && t.installmentTotal && (
                                <span className="ml-2 text-xs text-slate-500 font-normal">
                                  ({String(t.installmentNumber).padStart(2, '0')}/{String(t.installmentTotal).padStart(2, '0')})
                                </span>
                              )}
                            </p>
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
                        <TableCell className={`text-right pr-6 font-bold ${isIncome ? 'text-emerald-600' : 'text-rose-600'}`}>
                          <div className="flex flex-col items-end">
                            <span>R$ {netAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            {cardFee > 0 && (
                              <span className="text-[10px] text-amber-600 font-normal">
                                Taxa: R$ {cardFee.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
                <span className="text-xs text-muted-foreground">
                  Mostrando {sortedTransactions.length === 0 ? 0 : startIndex + 1}–{Math.min(startIndex + pageSize, sortedTransactions.length)} de {sortedTransactions.length}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 text-xs border rounded-md hover:bg-slate-100 disabled:opacity-50"
                  >
                    Anterior
                  </button>
                  <span className="text-xs text-muted-foreground">
                    Página {page} de {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages || sortedTransactions.length === 0}
                    className="px-3 py-1 text-xs border rounded-md hover:bg-slate-100 disabled:opacity-50"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            </div>
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
