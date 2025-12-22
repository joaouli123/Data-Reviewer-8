import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { CheckCircle2, Calendar, Clock, X, ChevronDown, ChevronRight } from 'lucide-react';
import PaymentEditDialog from './PaymentEditDialog';

export default function SupplierPurchasesDialog({ supplier, open, onOpenChange }) {
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

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => fetch('/api/transactions').then(res => res.json()),
    initialData: []
  });

  const purchases = transactions.filter(t => t.supplierId === supplier?.id && t.type === 'compra');
  
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
      const sortedInstallments = group.sort((a, b) => (a.installmentNumber || 0) - (b.installmentNumber || 0));
      const main = sortedInstallments[0];
      const totalAmount = sortedInstallments.reduce((acc, p) => acc + parseFloat(p.amount || 0), 0);
      const isPaid = sortedInstallments.every(p => p.status === 'completed' || p.status === 'pago');
      // Get base description without installment number
      const baseDescription = (main.description || '').replace(/\s*\(\d+\/\d+\)\s*$/, '').trim() || 'Compra';

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
  }, [purchases]);

  const getTotalPaid = () => {
    return purchases
      .filter(p => p.status === 'completed' || p.status === 'pago')
      .reduce((acc, p) => acc + parseFloat(p.amount || 0), 0);
  };

  const getTotalPending = () => {
    return purchases
      .filter(p => p.status !== 'completed' && p.status !== 'pago')
      .reduce((acc, p) => acc + parseFloat(p.amount || 0), 0);
  };

  const confirmPaymentMutation = useMutation({
    mutationFn: async ({ purchaseId, paidAmount, interest }) => {
      console.log('Confirming purchase payment for:', purchaseId, { paidAmount, interest });
      
      // First update the transaction
      const response = await fetch(`/api/transactions/${purchaseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'pago',
          paidAmount: paidAmount ? parseFloat(paidAmount).toString() : undefined,
          interest: interest ? parseFloat(interest).toString() : '0'
        })
      });
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Purchase payment confirmation failed:', errorData);
        throw new Error(errorData.error || 'Falha ao confirmar pagamento');
      }
      const transaction = await response.json();
      
      // Then create corresponding cash flow entry (outflow for purchases)
      const totalPaid = parseFloat(paidAmount || 0) + parseFloat(interest || 0);
      const cashFlowResponse = await fetch('/api/cash-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: new Date(transaction.date),
          inflow: '0',
          outflow: totalPaid.toFixed(2),
          balance: (-totalPaid).toFixed(2),
          description: `Pagamento de compra: ${transaction.description}`,
          shift: transaction.shift || 'manhã'
        })
      });
      
      if (!cashFlowResponse.ok) {
        console.warn('Failed to create cash flow entry, but transaction was updated');
      }
      
      return transaction;
    },
    onSuccess: (data) => {
      console.log('Purchase payment confirmed successfully:', data);
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cash-flow'] });
      setPaymentEditOpen(false);
      setSelectedTransaction(null);
      toast.success('Pagamento confirmado!');
    },
    onError: (error) => {
      console.error('Mutation error:', error);
      toast.error(error.message);
    }
  });

  const cancelPaymentMutation = useMutation({
    mutationFn: async (purchaseId) => {
      console.log('Canceling payment for:', purchaseId);
      
      // Get the transaction to know the amount to reverse
      const transactionRes = await fetch(`/api/transactions/${purchaseId}`);
      const transaction = await transactionRes.json();
      
      // Revert the transaction status
      const response = await fetch(`/api/transactions/${purchaseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'pendente', paidAmount: null, interest: '0' })
      });
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Cancel payment failed:', errorData);
        throw new Error(errorData.error || 'Falha ao cancelar pagamento');
      }
      
      // Delete corresponding cash flow entry
      try {
        const cashFlowsRes = await fetch('/api/cash-flow');
        const cashFlows = await cashFlowsRes.json();
        const relatedCashFlow = cashFlows.find(cf => cf.description?.includes(transaction.description));
        if (relatedCashFlow) {
          await fetch(`/api/cash-flow/${relatedCashFlow.id}`, { method: 'DELETE' });
        }
      } catch (err) {
        console.warn('Failed to delete cash flow entry, but transaction was reverted');
      }
      
      return response.json();
    },
    onSuccess: () => {
      console.log('Payment canceled successfully');
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cash-flow'] });
      toast.success('Pagamento cancelado!');
    },
    onError: (error) => {
      console.error('Cancel mutation error:', error);
      toast.error(error.message);
    }
  });

  if (!supplier) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Compras - {supplier.name}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-slate-50 rounded-lg border">
            <p className="text-xs text-slate-500 mb-1">Total em Compras</p>
            <p className="text-xl font-bold text-slate-900">
              R$ {purchases.reduce((acc, p) => acc + parseFloat(p.amount || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-4 bg-rose-50 rounded-lg border border-rose-100">
            <p className="text-xs text-rose-600 mb-1">Pago</p>
            <p className="text-xl font-bold text-rose-700">
              R$ {getTotalPaid().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
            <p className="text-xs text-amber-600 mb-1">Pendente</p>
            <p className="text-xl font-bold text-amber-700">
              R$ {getTotalPending().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                            {installment.installmentNumber || (idx + 1)}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">
                              R$ {parseFloat(installment.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                                {installment.paidAmount && (
                                  <p className="text-xs text-slate-500">
                                    Pago: R$ {parseFloat(installment.paidAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </p>
                                )}
                                {installment.interest && parseFloat(installment.interest) > 0 && (
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
                              Confirmar Pagamento
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
              interest: data.interest
            });
          }}
          isLoading={confirmPaymentMutation.isPending}
        />
      </DialogContent>
    </Dialog>
  );
}
