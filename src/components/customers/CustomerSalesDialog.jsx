import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle2, Clock, X, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import PaymentEditDialog from '../suppliers/PaymentEditDialog';
import { useAuth } from '@/contexts/AuthContext';
import { Transaction } from '@/api/entities';
import { apiRequest } from '@/lib/queryClient';

export default function CustomerSalesDialog({ customer, open, onOpenChange }) {
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
  const sales = transactions; // Filtered by backend now
  
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
      const sortedInstallments = group.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const main = sortedInstallments[0];
      
      // Precision math for total amount
      const totalAmount = sortedInstallments.reduce((acc, s) => {
        const val = parseFloat(s.amount || 0);
        return Math.round((acc + val) * 100) / 100;
      }, 0);

      const isPaid = sortedInstallments.every(s => s.status === 'completed' || s.status === 'pago');
      // Get base description without installment number
      const baseDescription = (main.description || '').replace(/\s*\(\d+\/\d+\)\s*$/, '').trim() || 'Venda';
      
      return {
        main: {
          ...main,
          description: baseDescription,
          totalAmount,
          isPaid,
          installmentTotal: sortedInstallments.length
        },
        installments: sortedInstallments
      };
    }).sort((a, b) => new Date(b.main.date).getTime() - new Date(a.main.date).getTime());
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
    mutationFn: async ({ saleId, paidAmount, interest, paymentDate, paymentMethod }) => {
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
        paymentMethod: paymentMethod
      });

      // Create corresponding cash flow entry (inflow for sales)
      await apiRequest('POST', '/api/cash-flow', {
        date: formattedPaymentDate,
        inflow: totalPaid.toFixed(2),
        outflow: '0',
        balance: totalPaid.toFixed(2),
        description: `Recebimento: ${transaction.description}`,
        shift: transaction.shift || 'manhã'
      });

      return transaction;
    },
    onSuccess: () => {
      toast.success('Pagamento confirmado!', { duration: 5000 });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cash-flow'] });
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
      
      // Delete corresponding cash flow entry
      try {
        const cashFlows = await apiRequest('GET', '/api/cash-flow');
        const relatedCashFlow = cashFlows.find(cf => cf.description?.includes(transaction.description));
        if (relatedCashFlow) {
          await apiRequest('DELETE', `/api/cash-flow/${relatedCashFlow.id}`);
        }
      } catch (err) {
        console.warn('Could not delete related cash flow:', err);
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cash-flow'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions', { customerId: customer?.id }] });
      toast.success('Pagamento cancelado!', { duration: 5000 });
    },
    onError: (error) => {
      toast.error(error.message, { duration: 5000 });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Vendas - {customer?.name}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-4 my-4">
          <div className="p-4 rounded-lg bg-slate-50 border">
            <p className="text-xs text-slate-500 mb-1">Total em Vendas</p>
            <p className="text-lg font-bold text-slate-900">
              R$ {sales.reduce((acc, s) => acc + parseFloat(s.amount || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-100">
            <p className="text-xs text-emerald-600 mb-1">Recebido</p>
            <p className="text-lg font-bold text-emerald-700">
              R$ {getTotalReceived().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-4 rounded-lg bg-amber-50 border border-amber-100">
            <p className="text-xs text-amber-600 mb-1">A Receber</p>
            <p className="text-lg font-bold text-amber-700">
              R$ {getTotalPending().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                          {group.main.date ? format(parseISO(group.main.date), "dd 'de' MMMM, yyyy", { locale: ptBR }) : '-'}
                          <span className="ml-2 text-slate-400">({group.installments.length} parcela{group.installments.length > 1 ? 's' : ''})</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-bold text-slate-900">
                        R$ {group.main.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                              R$ {(parseFloat(installment.amount || 0) + parseFloat(installment.interest || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                            <p className="text-xs text-slate-500">
                              Venc: {installment.date ? format(parseISO(installment.date), "dd/MM/yyyy") : '-'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {(installment.status === 'completed' || installment.status === 'pago') ? (
                            <>
                              <div className="flex flex-col items-end gap-0.5 mr-2">
                                {installment.paymentDate && (
                                  <p className="text-xs text-emerald-600">
                                    {format(parseISO(installment.paymentDate), "dd/MM/yyyy")}
                                  </p>
                                )}
                                {(installment.paidAmount || installment.amount) && (
                                  <div className="flex flex-col items-end gap-0.5">
                                    <p className="text-xs text-slate-500">
                                      Recebido: R$ {parseFloat(installment.paidAmount || installment.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                                    Juros: R$ {parseFloat(installment.interest).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedTransaction(installment);
                                setPaymentEditOpen(true);
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4"
                              disabled={confirmPaymentMutation.isPending}
                              data-testid={`button-confirm-payment-${installment.id}`}
                            >
                              Confirmar Recebimento
                            </Button>
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
              paymentMethod: data.paymentMethod
            });
          }}
          isLoading={confirmPaymentMutation.isPending}
          title="Confirmar Recebimento"
          amountLabel="Valor Recebido"
        />
      </DialogContent>
    </Dialog>
  );
}
