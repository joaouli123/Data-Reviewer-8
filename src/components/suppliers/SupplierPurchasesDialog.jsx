import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Transaction } from '@/api/entities';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { CheckCircle2, Calendar, Clock, X, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import PaymentEditDialog from './PaymentEditDialog';
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

// Garante uma data para exibição/ordenação usando paymentDate -> date -> createdAt
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

export default function SupplierPurchasesDialog({ supplier, open, onOpenChange }) {
  const { company } = useAuth();
  const queryClient = useQueryClient();
  const [paymentEditOpen, setPaymentEditOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState({});

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const isGroupExpanded = (groupId) => {
    return expandedGroups[groupId] !== false;
  };

  const { data: transactionsData = [] } = useQuery({
    queryKey: ['/api/transactions', { supplierId: supplier?.id }],
    queryFn: () => apiRequest('GET', `/api/transactions?supplierId=${supplier?.id}&type=compra`),
    initialData: [],
    enabled: !!supplier?.id && open,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true
  });

  const transactions = Array.isArray(transactionsData) ? transactionsData : (transactionsData?.data || []);
  const purchases = transactions; // Filtered by backend now

  // Group purchases by installment group
  const groupedPurchases = React.useMemo(() => {
    const groups = {};
    purchases.forEach(p => {
      // Use installmentGroup if available, otherwise extract base description (remove (X/Y) suffix)
      let groupKey = p.installmentGroup;
      if (!groupKey) {
        // Remove installment number suffix like "(1/5)" from description to group properly
        const baseDescription = (p.description || '').replace(/\s*\(\d+\/\d+\)\s*$/, '').trim();
        groupKey = baseDescription || `purchase-${p.id}`;
      }
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(p);
    });
    return Object.values(groups).map(group => {
      const sortedInstallments = group.sort((a, b) => {
        const na = Number(a.installmentNumber) || 0;
        const nb = Number(b.installmentNumber) || 0;
        if (na && nb && na !== nb) return na - nb;

        const da = extractTxDate(a);
        const db = extractTxDate(b);
        const ta = da ? da.getTime() : 0;
        const tb = db ? db.getTime() : 0;
        return ta - tb;
      });
      const main = sortedInstallments[0];
      const totalAmount = sortedInstallments.reduce((acc, p) => acc + parseFloat(p.amount || 0), 0);
      const isPaid = sortedInstallments.every(p => p.status === 'completed' || p.status === 'pago');
      // Get base description without installment number
      const baseDescription = (main.description || '').replace(/\s*\(\d+\/\d+\)\s*$/, '').trim() || 'Compra';

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
      const db = extractTxDate(b.main);
      const da = extractTxDate(a.main);
      const dateB = db ? db.getTime() : 0;
      const dateA = da ? da.getTime() : 0;
      if (dateB !== dateA) return dateB - dateA;
      
      const createB = b.main.createdAt ? new Date(b.main.createdAt).getTime() : 0;
      const createA = a.main.createdAt ? new Date(a.main.createdAt).getTime() : 0;
      if (createB !== createA) return createB - createA;

      return b.main.id.localeCompare(a.main.id);
    });
  }, [purchases]);

  const getTotalPaid = () => {
    return purchases.reduce((acc, p) => {
      if (p.status === 'completed' || p.status === 'pago') {
        // Fully paid: add full amount + interest
        return acc + parseFloat(p.amount || 0) + parseFloat(p.interest || 0);
      } else if (p.status === 'parcial') {
        // Partially paid: add only paid amount + interest
        return acc + parseFloat(p.paidAmount || 0) + parseFloat(p.interest || 0);
      }
      return acc;
    }, 0);
  };

  const getTotalPending = () => {
    return purchases.reduce((acc, p) => {
      if (p.status === 'pendente') {
        // Pending: full amount is pending
        return acc + parseFloat(p.amount || 0);
      } else if (p.status === 'parcial') {
        // Partially paid: remaining amount is pending
        return acc + (parseFloat(p.amount || 0) - parseFloat(p.paidAmount || 0));
      }
      return acc;
    }, 0);
  };

  const confirmPaymentMutation = useMutation({
    mutationFn: async ({ purchaseId, paidAmount, interest, paymentDate, paymentMethod, hasCardFee, cardFee }) => {

      // Get the transaction first to check the amount
      const currentTransaction = await apiRequest('GET', `/api/transactions/${purchaseId}`);

      // Determine status based on paid amount vs total amount
      const totalAmount = parseFloat(currentTransaction.amount || 0);
      const paidAmountValue = parseFloat(paidAmount || 0);
      const interestValue = parseFloat(interest || 0);
      const totalPaid = paidAmountValue + interestValue;

      // Status should be 'pago' only if fully paid
      const status = totalPaid >= totalAmount ? 'completed' : 'parcial';

      // Format payment date (NOT the due date - that stays unchanged)
      let formattedPaymentDate = new Date().toISOString(); // Default to today
      if (paymentDate && paymentDate.trim()) {
        // Parse yyyy-MM-dd format correctly with timezone awareness (use noon UTC to avoid -1 day offset)
        const [year, month, day] = paymentDate.split('-');
        formattedPaymentDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0).toISOString();
      }

      // IMPORTANT: Do NOT update 'date' field - that's the due date and must remain unchanged
      // IMPORTANT: Do NOT update 'description' - keep the base description to maintain grouping
      // Only update paymentDate (when payment was made), status, paidAmount, and interest
      const transaction = await apiRequest('PATCH', `/api/transactions/${purchaseId}`, {
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
    onSuccess: (data) => {
      toast.success('Pagamento confirmado!');
      // Invalidate both general and specific queries
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.refetchQueries({ queryKey: ['/api/transactions', { supplierId: supplier?.id }] });
      
      setPaymentEditOpen(false);
      setSelectedTransaction(null);
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const cancelPaymentMutation = useMutation({
    mutationFn: async (purchaseId) => {

      // Get the transaction to know the amount to reverse
      const transaction = await apiRequest('GET', `/api/transactions/${purchaseId}`);

      // Revert the transaction status (description stays the same)
      const result = await apiRequest('PATCH', `/api/transactions/${purchaseId}`, {
          status: 'pendente', 
          paidAmount: undefined, 
          interest: '0'
        });

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'], exact: false });
      toast.success('Pagamento cancelado!');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const deletePurchaseMutation = useMutation({
    mutationFn: async (purchaseId) => {
      await apiRequest('DELETE', `/api/transactions/${purchaseId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      toast.success('Compra excluída com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir compra: ' + error.message);
    }
  });

  if (!supplier) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg">Compras - {supplier.name}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="p-3 bg-slate-50 rounded-lg border">
            <p className="text-xs text-slate-500 mb-0.5">Total em Compras</p>
            <p className="text-base font-bold text-slate-900">
              R$ {Math.abs(purchases.reduce((acc, p) => acc + parseFloat(p.amount || 0), 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-3 bg-rose-50 rounded-lg border border-rose-100">
            <p className="text-xs text-rose-600 mb-0.5">Pago</p>
            <p className="text-base font-bold text-rose-700">
              R$ {Math.abs(getTotalPaid()).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
            <p className="text-xs text-amber-600 mb-0.5">Pendente</p>
            <p className="text-base font-bold text-amber-700">
              R$ {Math.abs(getTotalPending()).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className="space-y-6 mt-4">
          {groupedPurchases.length > 0 ? (
              groupedPurchases.map((group) => (
                <div key={group.main.id} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                  {/* Header da compra - clicável para expandir/recolher */}
                  <div 
                    className="flex items-center justify-between gap-4 p-5 cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => toggleGroup(group.main.id)}
                    data-testid={`toggle-purchase-${group.main.id}`}
                  >
                    <div className="flex items-center gap-3">
                      {isGroupExpanded(group.main.id) ? (
                        <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
                      )}
                      <div>
                        <h4 className="font-semibold text-base text-slate-900">{group.main.description || 'Compra'}</h4>
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
                        R$ {Math.abs(group.main.totalAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <Badge className={`${group.main.isPaid ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200'} shadow-none font-medium text-xs`}>
                        {group.main.isPaid ? 'Pago' : 'Parcial'}
                      </Badge>
                    </div>
                  </div>

                  {/* Lista de parcelas - recolhível */}
                  {isGroupExpanded(group.main.id) && (
                  <div className="divide-y divide-slate-100 border-t border-slate-100">
                    {group.installments.map((installment, idx) => (
                      <div key={installment.id} className="flex items-center justify-between gap-4 px-5 py-4">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center justify-center w-7 h-7 rounded-full border-2 border-slate-300 text-slate-500 text-sm font-medium flex-shrink-0">
                            {idx + 1}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">
                              R$ {Math.abs(parseFloat(installment.amount || 0) + parseFloat(installment.interest || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                            <p className="text-xs text-slate-500">
                              {(() => {
                                const dt = (() => {
                                  if (!group.shouldOffset || !group.baseDate) return extractTxDate(installment);
                                  const offset = Math.max(0, (Number(installment.installmentNumber) || idx + 1) - 1);
                                  return addMonths(group.baseDate, offset);
                                })();
                                return dt ? `Venc: ${format(dt, "dd/MM/yyyy", { locale: ptBR })}` : 'Venc: -';
                              })()}
                            </p>
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
                                      Pago: R$ {Math.abs(parseFloat(installment.paidAmount || installment.amount || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                                    Juros: R$ {Math.abs(parseFloat(installment.interest)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </p>
                                )}
                              </div>
                              <Badge className="bg-emerald-50 text-emerald-600 hover:bg-emerald-50 border border-emerald-200 shadow-none font-medium flex items-center gap-1.5 px-3 py-1 text-xs rounded-md">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Pago
                              </Badge>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  if (confirm('Tem certeza que deseja cancelar este pagamento?')) {
                                    cancelPaymentMutation.mutate(installment.id);
                                  }
                                }}
                                disabled={cancelPaymentMutation.isPending}
                                className="text-slate-400 hover:text-red-600"
                                data-testid={`button-cancel-payment-${installment.id}`}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  if (confirm('Tem certeza que deseja excluir permanentemente esta compra?')) {
                                    deletePurchaseMutation.mutate(installment.id);
                                  }
                                }}
                                disabled={deletePurchaseMutation.isPending}
                                className="text-slate-400 hover:text-red-600"
                                data-testid={`button-delete-purchase-${installment.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          ) : (
                            <div className="flex items-center gap-1">
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
                                Pagar
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  if (confirm('Tem certeza que deseja excluir esta compra pendente?')) {
                                    deletePurchaseMutation.mutate(installment.id);
                                  }
                                }}
                                disabled={deletePurchaseMutation.isPending}
                                className="text-slate-400 hover:text-red-600 h-8 w-8"
                                data-testid={`button-delete-purchase-${installment.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-12 border-2 border-dashed rounded-lg border-slate-200">
                <p className="text-slate-500">Nenhuma compra registrada para este fornecedor.</p>
              </div>
            )}
        </div>

        <PaymentEditDialog
          isOpen={paymentEditOpen}
          onClose={() => {
            setPaymentEditOpen(false);
            setSelectedTransaction(null);
          }}
          transaction={selectedTransaction}
          onConfirm={(data) => {
            confirmPaymentMutation.mutate({
              purchaseId: selectedTransaction.id,
              paidAmount: data.paidAmount,
              interest: data.interest,
              paymentDate: data.paymentDate,
              paymentMethod: data.paymentMethod,
              hasCardFee: data.hasCardFee,
              cardFee: data.cardFee
            });
          }}
          isLoading={confirmPaymentMutation.isPending}
          title="Confirmar Pagamento"
          amountLabel="Valor Pago"
        />
      </DialogContent>
    </Dialog>
  );
}
