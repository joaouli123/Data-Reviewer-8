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
  
  // Sort purchases by date (most recent first), no grouping
  const sortedPurchases = purchases.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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
    mutationFn: async ({ purchaseId, paidAmount, interest, paymentDate }) => {
      
      // Get the transaction first to check the amount
      const getResponse = await fetch(`/api/transactions/${purchaseId}`);
      const currentTransaction = await getResponse.json();
      
      // Determine status based on paid amount vs total amount
      const totalAmount = parseFloat(currentTransaction.amount || 0);
      const paidAmountValue = parseFloat(paidAmount || 0);
      const interestValue = parseFloat(interest || 0);
      const totalPaid = paidAmountValue + interestValue;
      
      // Status should be 'pago' only if fully paid
      const status = totalPaid >= totalAmount ? 'pago' : 'parcial';
      
      // Format payment date (NOT the due date - that stays unchanged)
      let formattedPaymentDate = new Date().toISOString(); // Default to today
      if (paymentDate && paymentDate.trim()) {
        // Parse yyyy-MM-dd format correctly with timezone awareness (use noon UTC to avoid -1 day offset)
        const [year, month, day] = paymentDate.split('-');
        formattedPaymentDate = new Date(`${year}-${month}-${day}T12:00:00Z`).toISOString();
      }
      
      // Find the group this installment belongs to to count paid/total
      const baseDescription = (currentTransaction.description || '').replace(/\s*\(\d+\/\d+.*?\)\s*$/, '').trim();
      const groupPurchases = purchases.filter(p => {
        const pDesc = (p.description || '').replace(/\s*\(\d+\/\d+.*?\)\s*$/, '').trim();
        return pDesc === baseDescription;
      });
      const totalInstallments = groupPurchases.length;
      const paidInstallments = groupPurchases.filter(p => p.status === 'pago' || p.status === 'completed').length + 1;
      
      // Add installment indicator to description (e.g., "Compra (1/5 paga)")
      let updatedDescription = baseDescription;
      if (totalInstallments > 1) {
        updatedDescription = `${baseDescription} (${paidInstallments}/${totalInstallments} paga)`;
      }
      
      // IMPORTANT: Do NOT update 'date' field - that's the due date and must remain unchanged
      // Only update paymentDate (when payment was made), status, paidAmount, and interest
      const response = await fetch(`/api/transactions/${purchaseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: status,
          paidAmount: paidAmount ? parseFloat(paidAmount).toString() : undefined,
          interest: interest ? parseFloat(interest).toString() : '0',
          paymentDate: formattedPaymentDate,
          description: updatedDescription
        })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao confirmar pagamento');
      }
      const transaction = await response.json();
      
      // Then create corresponding cash flow entry (outflow for purchases, using payment date)
      const cashFlowResponse = await fetch('/api/cash-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: formattedPaymentDate,
          inflow: '0',
          outflow: totalPaid.toFixed(2),
          balance: (-totalPaid).toFixed(2),
          description: `Pagamento de compra: ${transaction.description}`,
          shift: transaction.shift || 'manhã'
        })
      });
      
      if (!cashFlowResponse.ok) {
      }
      
      return transaction;
    },
    onSuccess: (data) => {
      toast.success('Pagamento confirmado!');
      // Refetch immediately and wait for it to complete before closing
      queryClient.refetchQueries({ queryKey: ['transactions'] }).then(() => {
        setPaymentEditOpen(false);
        setSelectedTransaction(null);
      });
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const cancelPaymentMutation = useMutation({
    mutationFn: async (purchaseId) => {
      
      // Get the transaction to know the amount to reverse
      const transactionRes = await fetch(`/api/transactions/${purchaseId}`);
      const transaction = await transactionRes.json();
      
      // Remove installment indicator from description
      const baseDescription = (transaction.description || '').replace(/\s*\(\d+\/\d+.*?\)\s*$/, '').trim();
      
      // Revert the transaction status
      const response = await fetch(`/api/transactions/${purchaseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'pendente', 
          paidAmount: null, 
          interest: '0',
          description: baseDescription
        })
      });
      if (!response.ok) {
        const errorData = await response.json();
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
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cash-flow'] });
      toast.success('Pagamento cancelado!');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  if (!supplier) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
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

        <div className="space-y-3 mt-4">
          {sortedPurchases.length > 0 ? (
              sortedPurchases.map((purchase, idx) => (
                <div key={purchase.id} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between gap-4 p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-7 h-7 rounded-full border-2 border-slate-300 text-slate-500 text-sm font-medium flex-shrink-0">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">
                          R$ {parseFloat(purchase.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-slate-500">
                          Venc: {purchase.date ? format(parseISO(purchase.date), "dd/MM/yyyy") : '-'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {(purchase.status === 'completed' || purchase.status === 'pago') ? (
                        <>
                          <div className="flex flex-col items-end gap-0.5 mr-2">
                            {purchase.paymentDate && (
                              <p className="text-xs text-emerald-600">
                                {format(parseISO(purchase.paymentDate), "dd/MM/yyyy")}
                              </p>
                            )}
                            {purchase.paidAmount && (
                              <p className="text-xs text-slate-500">
                                Pago: R$ {parseFloat(purchase.paidAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </p>
                            )}
                            {purchase.interest && parseFloat(purchase.interest) > 0 && (
                              <p className="text-xs text-amber-600">
                                Juros: R$ {parseFloat(purchase.interest).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                                cancelPaymentMutation.mutate(purchase.id);
                              }
                            }}
                            disabled={cancelPaymentMutation.isPending}
                            className="text-slate-400 hover:text-red-600"
                            data-testid={`button-cancel-payment-${purchase.id}`}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedTransaction(purchase);
                            setPaymentEditOpen(true);
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4"
                          disabled={confirmPaymentMutation.isPending}
                          data-testid={`button-confirm-payment-${purchase.id}`}
                        >
                          Confirmar Pagamento
                        </Button>
                      )}
                    </div>
                  </div>
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
              paymentDate: data.paymentDate
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
