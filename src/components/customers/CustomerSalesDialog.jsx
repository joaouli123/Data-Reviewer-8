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

      // Determine status based on paid amount vs total amount
      const totalAmount = parseFloat(currentTransaction.amount || 0);
      const paidAmountValue = parseFloat(paidAmount || 0);
      const interestValue = parseFloat(interest || 0);
      const totalPaid = paidAmountValue + interestValue;

      // Status should be 'pago' only if fully paid
      const status = totalPaid >= totalAmount ? 'completed' : 'parcial';

      // Format payment date (NOT the due date - that stays unchanged)
      let formattedPaymentDate = new Date().toISOString();
      if (paymentDate && paymentDate.trim()) {
        const [year, month, day] = paymentDate.split('-');
        formattedPaymentDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0).toISOString();
      }

      // Update the transaction
      const transaction = await apiRequest('PATCH', `/api/transactions/${saleId}`, {
        status: status,
        paidAmount: paidAmount ? paidAmount.toString() : totalAmount.toString(),
        interest: interest ? interest.toString() : '0',
        paymentDate: formattedPaymentDate,
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
        paymentDate: null
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
                        R$ {group.main.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
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
                      
                      return (
                      <div key={installment.id} className="flex items-center justify-between gap-4 px-5 py-4">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center justify-center w-7 h-7 rounded-full border-2 border-slate-300 text-slate-500 text-sm font-medium flex-shrink-0">
                            {idx + 1}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">
                              R$ {(parseFloat(installment.amount || 0) + parseFloat(installment.interest || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                            <p className="text-xs text-slate-500">
                              {(() => {
                                const dt = (() => {
                                  if (!group.shouldOffset || !group.baseDate) return extractTxDate(installment);
                                  const offset = Math.max(0, (Number(installment.installmentNumber) || idx + 1) - 1);
                                  return addMonths(group.baseDate, offset);
                                })();
                                return dt ? `Venc: ${format(dt, "dd/MM/yyyy")}` : 'Venc: -';
                              })()}
                            </p>
                            {/* Observação de parcela alterada */}
                            {wasModified && (
                              <p className="text-xs text-blue-600 mt-0.5">
                                ✏️ Alterado (era R$ {originalAmt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                              </p>
                            )}
                            {/* Saldo devedor para pagamento parcial */}
                            {isParcial && saldoDevedor > 0 && (
                              <div className="mt-1 p-1.5 bg-amber-50 border border-amber-200 rounded text-xs">
                                <p className="text-amber-700">
                                  Valor: R$ {valorParcela.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                                <p className="text-emerald-600">
                                  - Pago: R$ {valorPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                                <p className="text-rose-600 font-semibold">
                                  = Saldo: R$ {saldoDevedor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                              </div>
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
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  if (confirm('Tem certeza que deseja cancelar este recebimento?')) {
                                    cancelPaymentMutation.mutate(installment.id);
                                  }
                                }}
                                disabled={cancelPaymentMutation.isPending}
                                className="text-slate-400 hover:text-red-600"
                                data-testid={`button-cancel-payment-${installment.id}`}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          ) : installment.status === 'parcial' ? (
                            <>
                              <div className="flex flex-col items-end gap-0.5 mr-2">
                                {installment.paymentDate && (
                                  <p className="text-xs text-emerald-600">
                                    {format(parseLocalDate(installment.paymentDate), "dd/MM/yyyy")}
                                  </p>
                                )}
                                {installment.paidAmount && (
                                  <p className="text-xs text-slate-500">
                                    Pago: R$ {parseFloat(installment.paidAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </p>
                                )}
                                {installment.paymentMethod && (
                                  <p className="text-xs text-slate-400">
                                    Forma: {installment.paymentMethod}
                                  </p>
                                )}
                                {parseFloat(installment.interest || 0) > 0 && (
                                  <p className="text-xs text-amber-600">
                                    Juros: R$ {parseFloat(installment.interest).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </p>
                                )}
                                {cardFeeAmount > 0 && (
                                  <p className="text-xs text-rose-500">
                                    Taxa: R$ {cardFeeAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({installment.cardFee}%)
                                  </p>
                                )}
                              </div>
                              <Badge className="bg-amber-50 text-amber-600 hover:bg-amber-50 border border-amber-200 shadow-none font-medium flex items-center gap-1.5 px-3 py-1 text-xs rounded-md">
                                <Clock className="w-3.5 h-3.5" /> Parcial
                              </Badge>
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedTransaction(installment);
                                  setPaymentEditOpen(true);
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-2 h-7 text-xs"
                                disabled={confirmPaymentMutation.isPending}
                              >
                                Receber Resto
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingTransaction(installment);
                                  setEditOpen(true);
                                }}
                                className="text-slate-400 hover:text-slate-700 h-8 w-8"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedTransaction(installment);
                                  setPaymentEditOpen(true);
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-3 h-8 text-xs"
                                disabled={confirmPaymentMutation.isPending}
                                data-testid={`button-confirm-payment-${installment.id}`}
                              >
                                Receber
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingTransaction(installment);
                                  setEditOpen(true);
                                }}
                                className="text-slate-400 hover:text-slate-700 h-8 w-8"
                                data-testid={`button-edit-installment-${installment.id}`}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
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
