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

export default function CustomerSalesDialog({ customer, open, onOpenChange }) {
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

  const sales = transactions.filter(t => t.customerId === customer?.id && t.type === 'venda');
  
  // Sort sales by date (most recent first), no grouping
  const sortedSales = sales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getTotalReceived = () => {
    return sales.reduce((acc, s) => {
      if (s.status === 'completed' || s.status === 'pago') {
        // Fully paid: add full amount + interest
        return acc + parseFloat(s.amount || 0) + parseFloat(s.interest || 0);
      } else if (s.status === 'parcial') {
        // Partially paid: add only paid amount + interest
        return acc + parseFloat(s.paidAmount || 0) + parseFloat(s.interest || 0);
      }
      return acc;
    }, 0);
  };

  const getTotalPending = () => {
    return sales.reduce((acc, s) => {
      if (s.status === 'pendente') {
        // Pending: full amount is pending
        return acc + parseFloat(s.amount || 0);
      } else if (s.status === 'parcial') {
        // Partially paid: remaining amount is pending
        return acc + (parseFloat(s.amount || 0) - parseFloat(s.paidAmount || 0));
      }
      return acc;
    }, 0);
  };

  const confirmPaymentMutation = useMutation({
    mutationFn: async ({ saleId, paidAmount, interest, paymentDate }) => {
      
      // Get the transaction first to check the amount
      const getResponse = await fetch(`/api/transactions/${saleId}`);
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
      const groupSales = sales.filter(s => {
        const sDesc = (s.description || '').replace(/\s*\(\d+\/\d+.*?\)\s*$/, '').trim();
        return sDesc === baseDescription;
      });
      const totalInstallments = groupSales.length;
      const paidInstallments = groupSales.filter(s => s.status === 'pago' || s.status === 'completed').length + 1;
      
      // Add installment indicator to description (e.g., "Venda (1/5 recebida)")
      let updatedDescription = baseDescription;
      if (totalInstallments > 1) {
        updatedDescription = `${baseDescription} (${paidInstallments}/${totalInstallments} recebida)`;
      }
      
      // IMPORTANT: Do NOT update 'date' field - that's the due date and must remain unchanged
      // Only update paymentDate (when payment was made), status, paidAmount, and interest
      const response = await fetch(`/api/transactions/${saleId}`, {
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
      
      // Then create corresponding cash flow entry (using payment date, not due date)
      const totalReceived = parseFloat(paidAmount || 0) + parseFloat(interest || 0);
      const cashFlowResponse = await fetch('/api/cash-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: formattedPaymentDate,
          inflow: totalReceived.toFixed(2),
          outflow: '0',
          balance: totalReceived.toFixed(2),
          description: `Recebimento de venda: ${transaction.description}`,
          shift: transaction.shift || 'manhã'
        })
      });
      
      if (!cashFlowResponse.ok) {
      }
      
      return transaction;
    },
    onSuccess: (data) => {
      toast.success('Pagamento confirmado!', { duration: 5000 });
      // Refetch immediately and wait for it to complete before closing
      queryClient.refetchQueries({ queryKey: ['transactions'] }).then(() => {
        setPaymentEditOpen(false);
        setSelectedTransaction(null);
      });
    },
    onError: (error) => {
      toast.error(error.message, { duration: 5000 });
    }
  });

  const cancelPaymentMutation = useMutation({
    mutationFn: async (saleId) => {
      
      // Get the transaction to know the amount to reverse
      const transactionRes = await fetch(`/api/transactions/${saleId}`);
      const transaction = await transactionRes.json();
      
      // Remove installment indicator from description
      const baseDescription = (transaction.description || '').replace(/\s*\(\d+\/\d+.*?\)\s*$/, '').trim();
      
      // Revert the transaction status
      const response = await fetch(`/api/transactions/${saleId}`, {
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

        <div className="space-y-3 mt-4">
          {sortedSales.length > 0 ? (
              sortedSales.map((sale, idx) => (
                <div key={sale.id} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between gap-4 p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-7 h-7 rounded-full border-2 border-slate-300 text-slate-500 text-sm font-medium flex-shrink-0">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">
                          R$ {parseFloat(sale.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-slate-500">
                          Venc: {sale.date ? format(parseISO(sale.date), "dd/MM/yyyy") : '-'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {(sale.status === 'completed' || sale.status === 'pago') ? (
                        <>
                          <div className="flex flex-col items-end gap-0.5 mr-2">
                            {sale.paymentDate && (
                              <p className="text-xs text-emerald-600">
                                {format(parseISO(sale.paymentDate), "dd/MM/yyyy")}
                              </p>
                            )}
                            {sale.paidAmount && (
                              <p className="text-xs text-slate-500">
                                Recebido: R$ {parseFloat(sale.paidAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </p>
                            )}
                            {sale.interest && parseFloat(sale.interest) > 0 && (
                              <p className="text-xs text-amber-600">
                                Juros: R$ {parseFloat(sale.interest).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                                cancelPaymentMutation.mutate(sale.id);
                              }
                            }}
                            disabled={cancelPaymentMutation.isPending}
                            className="text-slate-400 hover:text-red-600"
                            data-testid={`button-cancel-payment-${sale.id}`}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedTransaction(sale);
                            setPaymentEditOpen(true);
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4"
                          disabled={confirmPaymentMutation.isPending}
                          data-testid={`button-confirm-payment-${sale.id}`}
                        >
                          Confirmar Recebimento
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 border-2 border-dashed rounded-lg border-slate-200">
                <p className="text-slate-500">Nenhuma venda registrada para este cliente.</p>
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
              saleId: selectedTransaction.id,
              paidAmount: data.paidAmount,
              interest: data.interest,
              paymentDate: data.paymentDate
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
