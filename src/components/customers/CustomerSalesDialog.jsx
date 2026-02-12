import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle2, Clock, X, ChevronDown, ChevronRight, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import PaymentEditDialog from '../suppliers/PaymentEditDialog';
import InstallmentEditDialog from '../transactions/InstallmentEditDialog';
import { useAuth } from '@/contexts/AuthContext';
import { Transaction } from '@/api/entities';
import { apiRequest } from '@/lib/queryClient';

const parseLocalDate = (dateStr) => {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return dateStr;
  if (typeof dateStr === 'number') return new Date(dateStr);
  if (typeof dateStr === 'string') {
    const [year, month, day] = dateStr.split('T')[0].split('-');
    if (year && month && day) {
      return new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
    }
  }
  const fallback = new Date(dateStr);
  return Number.isNaN(fallback.getTime()) ? new Date() : fallback;
};

// Garante uma data para exibição/ordenação usando date -> paymentDate -> createdAt
const extractTxDate = (t) => {
  if (!t) return null;
  const candidate = t.date || t.due_date || t.paymentDate || t.createdAt || t.created_at;
  if (!candidate) return null;
  try {
    const d = new Date(candidate);
    return isNaN(d.getTime()) ? null : d;
  } catch (e) {
    return null;
  }
};

const getPaymentHistory = (transaction) => {
  const raw = transaction?.paymentHistory;
  let parsed = [];

  if (Array.isArray(raw)) {
    parsed = raw;
  } else if (typeof raw === 'string') {
    try {
      const json = JSON.parse(raw);
      parsed = Array.isArray(json) ? json : [];
    } catch {
      parsed = [];
    }
  }

  if (parsed.length === 0 && (transaction?.paidAmount || transaction?.paymentDate)) {
    parsed = [{
      amount: String(parseFloat(transaction.paidAmount || transaction.amount || 0)),
      paymentDate: transaction.paymentDate,
      paymentMethod: transaction.paymentMethod || null,
    }];
  }

  return parsed.filter((entry) => parseFloat(entry?.amount || 0) > 0);
};

export default function CustomerSalesDialog({ customer, open, onOpenChange }) {
  const { company } = useAuth();
  const queryClient = useQueryClient();
  const [paymentEditOpen, setPaymentEditOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [editOpen, setEditOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const isGroupExpanded = (groupId) => {
    return expandedGroups[groupId] !== false;
  };

  // Fetch transactions specific to this customer when modal opens
  const { data: transactionsData = [], isLoading } = useQuery({
    queryKey: ['/api/transactions', { customerId: customer?.id }],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/transactions?customerId=${customer?.id}&type=venda`);
      return response;
    },
    initialData: [],
    enabled: !!customer?.id && open,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true
  });

  const transactions = Array.isArray(transactionsData) ? transactionsData : (transactionsData?.data || []);
  const sales = transactions; 
  
  // No frontend filter, show all sales
  // const sales = transactions.filter(t => t.type === 'venda' || t.type === 'income'); 
  
  // Group sales by installment group
  const groupedSales = React.useMemo(() => {
    const groups = {};
    sales.forEach(s => {
      // Use installmentGroup if available, otherwise extract base description (remove (X/Y) suffix)
      let groupKey = s.installmentGroup;
      if (!groupKey) {
        // Remove installment number suffix like "(1/5)" from description to group properly
        const baseDescription = (s.description || '').replace(/\s*\(\d+\/\d+\)\s*$/, '').trim();
        groupKey = baseDescription || `sale-${s.id}`;
      }
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(s);
    });
    return Object.values(groups).map(group => {
      const sortedInstallments = group.sort((a, b) => {
        const na = Number(a.installmentNumber) || 0;
        const nb = Number(b.installmentNumber) || 0;
        if (na && nb && na !== nb) return na - nb;

        const da = extractTxDate(a);
        const db = extractTxDate(b);
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return da.getTime() - db.getTime();
      });
      const main = sortedInstallments[0];
      
      // Precision math for total amount
      const totalAmount = sortedInstallments.reduce((acc, s) => {
        const val = parseFloat(s.amount || 0);
        return Math.round((acc + val) * 100) / 100;
      }, 0);

      // Calcula saldo restante (o que falta receber)
      const totalRemaining = sortedInstallments.reduce((acc, s) => {
        if (s.status === 'completed' || s.status === 'pago') return acc;
        if (s.status === 'parcial') {
          const remaining = parseFloat(s.amount || 0) - parseFloat(s.paidAmount || 0);
          return Math.round((acc + remaining) * 100) / 100;
        }
        return Math.round((acc + parseFloat(s.amount || 0)) * 100) / 100;
      }, 0);

      const isPaid = sortedInstallments.every(s => s.status === 'completed' || s.status === 'pago');
      // Get base description without installment number
      const baseDescription = (main.description || '').replace(/\s*\(\d+\/\d+\)\s*$/, '').trim() || 'Venda';
      
      const dates = sortedInstallments
        .map(installment => extractTxDate(installment))
        .filter(Boolean);
      const baseDate = dates[0] || extractTxDate(main) || null;
      const sameDay = baseDate
        ? dates.every(d => format(d, 'yyyy-MM-dd') === format(baseDate, 'yyyy-MM-dd'))
        : false;
      const singleMonth = baseDate
        ? dates.every(d => format(d, 'yyyy-MM') === format(baseDate, 'yyyy-MM'))
        : false;
      const shouldOffset = !!baseDate && (sameDay || singleMonth);

      return {
        main: {
          ...main,
          description: baseDescription,
          totalAmount,
          totalRemaining,
          isPaid,
          installmentTotal: sortedInstallments.length
        },
        installments: sortedInstallments,
        baseDate,
        shouldOffset
      };
    }).sort((a, b) => {
      const da = extractTxDate(a.main);
      const db = extractTxDate(b.main);
      if (da && db) {
        const dateDiff = db.getTime() - da.getTime();
        if (dateDiff !== 0) return dateDiff;
      }
      
      // Secondary sort by createdAt if available
      if (a.main.createdAt && b.main.createdAt) {
        return new Date(b.main.createdAt).getTime() - new Date(a.main.createdAt).getTime();
      }
      
      return b.main.id.localeCompare(a.main.id);
    });
  }, [sales]);

  const getTotalReceived = () => {
    return sales.reduce((acc, s) => {
      let amountToAdd = 0;
      if (s.status === 'completed' || s.status === 'pago') {
        amountToAdd = parseFloat(s.amount || 0) + parseFloat(s.interest || 0);
      } else if (s.status === 'parcial') {
        amountToAdd = parseFloat(s.paidAmount || 0) + parseFloat(s.interest || 0);
      }
      return Math.round((acc + amountToAdd) * 100) / 100;
    }, 0);
  };

  const getTotalPending = () => {
    return sales.reduce((acc, s) => {
      let amountToAdd = 0;
      if (s.status === 'pendente') {
        amountToAdd = parseFloat(s.amount || 0);
      } else if (s.status === 'parcial') {
        amountToAdd = parseFloat(s.amount || 0) - parseFloat(s.paidAmount || 0);
      }
      return Math.round((acc + amountToAdd) * 100) / 100;
    }, 0);
  };

  const confirmPaymentMutation = useMutation({
    mutationFn: async ({ saleId, paidAmount, interest, paymentDate, paymentMethod, hasCardFee, cardFee }) => {
      // Get the transaction first to check the amount
      const currentTransaction = await apiRequest('GET', `/api/transactions/${saleId}`);

      const totalAmount = parseFloat(currentTransaction.amount || 0);
      const previouslyPaid = parseFloat(currentTransaction.paidAmount || 0);
      const newPayment = parseFloat(paidAmount || 0);
      const interestValue = parseFloat(interest || 0);
      
      // Acumula: soma o que já foi pago + novo pagamento
      const accumulatedPaid = (currentTransaction.status === 'parcial' && previouslyPaid > 0)
        ? previouslyPaid + newPayment
        : newPayment;
      
      // Status: completed se acumulado + juros >= total
      const status = (accumulatedPaid + interestValue) >= totalAmount ? 'completed' : 'parcial';

      // Format payment date (NOT the due date - that stays unchanged)
      let formattedPaymentDate = new Date().toISOString();
      let paymentDateYmd = format(new Date(), 'yyyy-MM-dd');
      if (paymentDate && paymentDate.trim()) {
        const [year, month, day] = paymentDate.split('-');
        formattedPaymentDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0).toISOString();
        paymentDateYmd = `${year}-${month}-${day}`;
      }

      // Update the transaction with accumulated paidAmount
      const transaction = await apiRequest('PATCH', `/api/transactions/${saleId}`, {
        status: status,
        paidAmount: accumulatedPaid.toString(),
        interest: interest ? interest.toString() : '0',
        paymentDate: formattedPaymentDate,
        appendPaymentEntry: {
          amount: newPayment.toString(),
          paymentDate: paymentDateYmd,
          paymentMethod: paymentMethod || null,
          interest: interest ? interest.toString() : '0',
        },
        paymentMethod: paymentMethod,
        hasCardFee: hasCardFee || false,
        cardFee: hasCardFee ? (parseFloat(cardFee) || 0).toString() : '0'
      });

      return transaction;
    },
    onSuccess: () => {
      toast.success('Pagamento confirmado!', { duration: 5000 });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.refetchQueries({ queryKey: ['/api/transactions', { customerId: customer?.id }] });
      setPaymentEditOpen(false);
      setSelectedTransaction(null);
    },
    onError: (error) => {
      toast.error(error.message, { duration: 5000 });
    }
  });

  const cancelPaymentMutation = useMutation({
    mutationFn: async (transactionId) => {
      // Get the transaction first
      const transaction = await apiRequest('GET', `/api/transactions/${transactionId}`);
      
      // Revert the transaction status to pending
      const result = await apiRequest('PATCH', `/api/transactions/${transactionId}`, {
        status: 'pendente',
        paidAmount: null,
        interest: '0',
        paymentDate: null,
        clearPaymentHistory: true
      });
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions', { customerId: customer?.id }] });
      toast.success('Pagamento cancelado!', { duration: 5000 });
    },
    onError: (error) => {
      toast.error(error.message, { duration: 5000 });
    }
  });

  const updateTransactionMutation = useMutation({
    mutationFn: async (payload) => {
      if (!editingTransaction?.id) throw new Error('Transação inválida');
      return apiRequest('PATCH', `/api/transactions/${editingTransaction.id}`, payload);
    },
    onSuccess: async () => {
      toast.success('Parcela atualizada!', { duration: 4000 });
      // Força refetch imediato
      await queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      await queryClient.refetchQueries({ queryKey: ['/api/transactions', { customerId: customer?.id }] });
      setEditOpen(false);
      setEditingTransaction(null);
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao atualizar parcela', { duration: 5000 });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg">Vendas - {customer?.name}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="p-3 rounded-lg bg-slate-50 border">
            <p className="text-xs text-slate-500 mb-0.5">Total em Vendas</p>
            <p className="text-base font-bold text-slate-900">
              R$ {sales.reduce((acc, s) => acc + parseFloat(s.amount || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100">
            <p className="text-xs text-emerald-600 mb-0.5">Recebido</p>
            <p className="text-base font-bold text-emerald-700">
              R$ {getTotalReceived().toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-100">
            <p className="text-xs text-amber-600 mb-0.5">A Receber</p>
            <p className="text-base font-bold text-amber-700">
              R$ {getTotalPending().toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-300 mx-auto mb-2"></div>
              <p className="text-sm text-slate-500">Carregando transações...</p>
            </div>
          </div>
        )}

        {!isLoading && (
        <div className="space-y-6 mt-4">
          {groupedSales.length > 0 ? (
              groupedSales.map((group) => (
                <div key={group.main.id} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                  {/* Header da venda - clicável para expandir/recolher */}
                  <div 
                    className="flex items-center justify-between gap-4 p-5 cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => toggleGroup(group.main.id)}
                    data-testid={`toggle-sale-${group.main.id}`}
                  >
                    <div className="flex items-center gap-3">
                      {isGroupExpanded(group.main.id) ? (
                        <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
                      )}
                      <div>
                        <h4 className="font-semibold text-base text-slate-900">{group.main.description || 'Venda'}</h4>
                        <p className="text-sm text-slate-500 mt-0.5">
                          {(() => {
                            const dt = extractTxDate(group.main);
                            return dt ? format(dt, "dd 'de' MMMM, yyyy", { locale: ptBR }) : '-';
                          })()}
                          <span className="ml-2 text-slate-400">({group.installments.length} parcela{group.installments.length > 1 ? 's' : ''})</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-bold text-slate-900">
                        R$ {(group.main.isPaid ? group.main.totalAmount : group.main.totalRemaining).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      {!group.main.isPaid && group.main.totalRemaining < group.main.totalAmount && (
                        <p className="text-xs text-slate-400">de R$ {group.main.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      )}
                      <Badge className={`${group.main.isPaid ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200'} shadow-none font-medium text-xs`}>
                        {group.main.isPaid ? 'Pago' : 'Parcial'}
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Lista de parcelas - recolhível */}
                  {isGroupExpanded(group.main.id) && (
                  <div className="divide-y divide-slate-100 border-t border-slate-100">
                    {group.installments.map((installment, idx) => {
                      // Verifica se a parcela foi alterada
                      const wasModified = installment.originalAmount && 
                        parseFloat(installment.originalAmount) !== parseFloat(installment.amount);
                      const originalAmt = parseFloat(installment.originalAmount || 0);
                      const currentAmt = parseFloat(installment.amount || 0);
                      const amountDiff = currentAmt - originalAmt;
                      
                      // Calcula taxa do cartão
                      const cardFeeAmount = installment.hasCardFee && parseFloat(installment.cardFee || 0) > 0
                        ? (parseFloat(installment.paidAmount || installment.amount || 0) * parseFloat(installment.cardFee)) / 100
                        : 0;
                      
                      // Calcula saldo devedor para pagamento parcial
                      const isParcial = installment.status === 'parcial';
                      const valorParcela = parseFloat(installment.amount || 0);
                      const valorPago = parseFloat(installment.paidAmount || 0);
                      const saldoDevedor = valorParcela - valorPago;
                      const paymentHistory = getPaymentHistory(installment);
                      
                      return (
                      <div key={installment.id} className="px-5 py-4 space-y-3">
                        {/* Linha principal da parcela */}
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center justify-center w-7 h-7 rounded-full border-2 border-slate-300 text-slate-500 text-sm font-medium flex-shrink-0">
                              {idx + 1}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">
                                R$ {(isParcial && saldoDevedor > 0
                                  ? saldoDevedor
                                  : (parseFloat(installment.amount || 0) + parseFloat(installment.interest || 0))
                                ).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </p>
                              {isParcial && saldoDevedor > 0 && (
                                <p className="text-xs text-slate-400">
                                  de R$ {valorParcela.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                              )}
                              <p className="text-xs text-slate-500">
                                {(() => {
                                  const dt = extractTxDate(installment);
                                  return dt ? `Venc: ${format(dt, "dd/MM/yyyy")}` : 'Venc: -';
                                })()}
                              </p>
                              {wasModified && (
                                <p className="text-xs text-blue-600 mt-0.5">
                                  ✏️ Alterado (era R$ {originalAmt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {(installment.status === 'completed' || installment.status === 'pago') ? (
                              <>
                                <div className="flex flex-col items-end gap-0.5 mr-2">
                                  {installment.paymentDate && (
                                    <p className="text-xs text-emerald-600">
                                      {format(parseLocalDate(installment.paymentDate), "dd/MM/yyyy")}
                                    </p>
                                  )}
                                  {(installment.paidAmount || installment.amount) && (
                                    <div className="flex flex-col items-end gap-0.5">
                                      <p className="text-xs text-slate-500">
                                        Recebido: R$ {parseFloat(installment.paidAmount || installment.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </p>
                                      {installment.paymentMethod && (
                                        <p className="text-xs text-slate-400">
                                          Forma: {installment.paymentMethod}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                  {parseFloat(installment.interest || 0) > 0 && (
                                    <p className="text-xs text-amber-600">
                                      Juros: R$ {parseFloat(installment.interest).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                  )}
                                  {cardFeeAmount > 0 && (
                                    <p className="text-xs text-rose-500">
                                      Taxa cartão: R$ {cardFeeAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({installment.cardFee}%)
                                    </p>
                                  )}
                                </div>
                                <Badge className="bg-emerald-50 text-emerald-600 hover:bg-emerald-50 border border-emerald-200 shadow-none font-medium flex items-center gap-1.5 px-3 py-1 text-xs rounded-md">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Pago
                                </Badge>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingTransaction(installment);
                                    setEditOpen(true);
                                  }}
                                  className="text-slate-400 hover:text-slate-700"
                                  data-testid={`button-edit-installment-${installment.id}`}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                              </>
                            ) : installment.status === 'parcial' ? (
                              <Badge className="bg-amber-50 text-amber-600 hover:bg-amber-50 border border-amber-200 shadow-none font-medium flex items-center gap-1.5 px-3 py-1 text-xs rounded-md">
                                <Clock className="w-3.5 h-3.5" /> Parcial
                              </Badge>
                            ) : (
                              <Badge className="bg-slate-50 text-slate-600 hover:bg-slate-50 border border-slate-200 shadow-none font-medium flex items-center gap-1.5 px-3 py-1 text-xs rounded-md">
                                <Clock className="w-3.5 h-3.5" /> Pendente
                              </Badge>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReceive(installment.id);
                              }}
                              className="text-slate-400 hover:text-emerald-600"
                              data-testid={`button-receive-installment-${installment.id}`}
                            >
                              <DollarSign className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        
                        {/* Saldo devedor - largura total */}
                        {isParcial && saldoDevedor > 0 && (
                          <div className="w-full bg-gradient-to-r from-slate-50 to-white border border-slate-200 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-6">
                                <div>
                                  <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Valor Original</div>
                                  <div className="text-base font-bold text-slate-700">R$ {valorParcela.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                                </div>
                                <div className="w-px h-10 bg-slate-200"></div>
                                <div>
                                  <div className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider mb-1">Valor Pago</div>
                                  <div className="text-base font-bold text-emerald-700">R$ {valorPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                                </div>
                                <div className="w-px h-10 bg-slate-200"></div>
                                <div>
                                  <div className="text-[10px] font-semibold text-rose-600 uppercase tracking-wider mb-1">Saldo Restante</div>
                                  <div className="text-base font-bold text-rose-700">R$ {saldoDevedor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Histórico de pagamentos - largura total */}
                        {paymentHistory.length > 0 && (
                          <div className="w-full border border-slate-200 rounded-lg overflow-hidden">
                            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                                Histórico de Recebimentos
                              </span>
                              <span className="ml-2 text-xs text-slate-500">({paymentHistory.length} {paymentHistory.length === 1 ? 'pagamento' : 'pagamentos'})</span>
                            </div>
                            <div className="bg-white">
                              <table className="w-full">
                                <thead className="bg-slate-50/50">
                                  <tr className="border-b border-slate-100">
                                    <th className="text-left py-2 px-4 text-[10px] font-semibold text-slate-600 uppercase tracking-wider w-12">#</th>
                                    <th className="text-left py-2 px-4 text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Data</th>
                                    <th className="text-right py-2 px-4 text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Valor</th>
                                    <th className="text-right py-2 px-4 text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Forma</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {paymentHistory.map((entry, hIdx) => (
                                    <tr key={`${installment.id}-payment-${hIdx}`} className="hover:bg-emerald-50/30 transition-colors">
                                      <td className="py-2.5 px-4">
                                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                                          {hIdx + 1}
                                        </span>
                                      </td>
                                      <td className="py-2.5 px-4 text-sm font-medium text-slate-700">
                                        {format(parseLocalDate(entry.paymentDate), 'dd/MM/yyyy')}
                                      </td>
                                      <td className="py-2.5 px-4 text-right text-sm font-bold text-emerald-600">
                                        R$ {parseFloat(entry.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </td>
                                      <td className="py-2.5 px-4 text-right">
                                        {entry.paymentMethod ? (
                                          <span className="inline-block text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
                                            {entry.paymentMethod}
                                          </span>
                                        ) : (
                                          <span className="text-xs text-slate-400">—</span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                    })}
                  </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-12 border-2 border-dashed rounded-lg border-slate-200">
                <p className="text-slate-500">Nenhuma venda registrada para este cliente.</p>
              </div>
            )}
        </div>
        )}

        <PaymentEditDialog
          isOpen={paymentEditOpen}
          onClose={() => {
            setPaymentEditOpen(false);
            setSelectedTransaction(null);
          }}
          transaction={selectedTransaction}
          onConfirm={(data) => {
            confirmPaymentMutation.mutate({
              saleId: selectedTransaction.id,
              paidAmount: data.paidAmount,
              interest: data.interest,
              paymentDate: data.paymentDate,
              paymentMethod: data.paymentMethod,
              hasCardFee: data.hasCardFee,
              cardFee: data.cardFee
            });
          }}
          isLoading={confirmPaymentMutation.isPending}
          title="Confirmar Recebimento"
          amountLabel="Valor Recebido"
        />

        <InstallmentEditDialog
          isOpen={editOpen}
          onClose={() => {
            setEditOpen(false);
            setEditingTransaction(null);
          }}
          installment={editingTransaction}
          onConfirm={(data) => {
            // Salva o valor original se for a primeira alteração
            const originalAmount = editingTransaction?.originalAmount || editingTransaction?.amount;
            updateTransactionMutation.mutate({
              amount: data.amount.toString(),
              originalAmount: originalAmount?.toString(),
              date: data.dueDate
            });
          }}
          isLoading={updateTransactionMutation.isPending}
        />
      </DialogContent>
    </Dialog>
  );
}
