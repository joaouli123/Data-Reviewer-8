import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, parseISO, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { CheckCircle2, Calendar, Clock, X } from 'lucide-react';
import PaymentEditDialog from './PaymentEditDialog';

export default function SupplierPurchasesDialog({ supplier, open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [paymentEditOpen, setPaymentEditOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

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
      // Key: description + base date
      const groupKey = p.installmentGroup || p.description || `purchase-${p.date}`;
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(p);
    });
    return Object.values(groups).map(group => {
      const main = group[0];
      const installments = group.sort((a, b) => (a.installmentNumber || 0) - (b.installmentNumber || 0));
      const totalAmount = installments.reduce((acc, p) => acc + parseFloat(p.amount || 0), 0);
      const isPaid = installments.every(p => p.status === 'completed' || p.status === 'pago');

      return {
        main: {
          ...main,
          totalAmount,
          isPaid
        },
        installments
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
      return response.json();
    },
    onSuccess: (data) => {
      console.log('Purchase payment confirmed successfully:', data);
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
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
      return response.json();
    },
    onSuccess: () => {
      console.log('Payment canceled successfully');
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      toast.success('Pagamento cancelado!');
    },
    onError: (error) => {
      console.error('Cancel mutation error:', error);
      toast.error(error.message);
    }
  });

  if (!supplier) return null;

  const [activeTab, setActiveTab] = useState(groupedPurchases.length > 0 ? groupedPurchases[0].main.id : 'todas-parcelas');

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

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full auto-cols-max overflow-x-auto">
            {groupedPurchases.map((group) => (
              <TabsTrigger key={group.main.id} value={group.main.id} className="text-sm whitespace-nowrap">
                {group.main.description ? group.main.description.substring(0, 20) : 'Compra'} ({group.installments.length})
              </TabsTrigger>
            ))}
            {groupedPurchases.length > 0 && <div className="w-px bg-slate-200" />}
            <TabsTrigger value="todas-parcelas" className="text-sm">Todas Parcelas</TabsTrigger>
          </TabsList>

          {groupedPurchases.map((group) => (
            <TabsContent key={group.main.id} value={group.main.id} className="space-y-4 mt-4">
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h4 className="font-bold text-xl text-slate-900 leading-tight">{group.main.description || 'Compra'}</h4>
                    <p className="text-sm text-slate-500 mt-1">
                      {group.main.date ? format(parseISO(group.main.date), "dd 'de' MMMM, yyyy", { locale: ptBR }) : '-'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-slate-900">
                      R$ {group.main.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-none shadow-none text-[10px] h-5 uppercase tracking-wider mt-1 px-2">
                      {group.main.isPaid ? 'Pago' : 'Parcial'}
                    </Badge>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {group.installments.map((installment, idx) => (
                      <div key={installment.id} className="flex items-center justify-between p-4 bg-slate-50/30 rounded-xl border border-slate-100/50 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-5">
                          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 text-slate-500 text-base font-bold flex-shrink-0">
                            {installment.installmentNumber || (idx + 1)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-lg">
                              R$ {parseFloat(installment.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                            <p className="text-xs text-slate-500">
                              Venc: {installment.date ? format(parseISO(installment.date), "dd/MM/yyyy") : '-'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {(installment.status === 'completed' || installment.status === 'pago') ? (
                            <>
                              <div className="flex flex-col items-end gap-1">
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
                              <div className="flex items-center gap-1">
                                <Badge className="bg-emerald-50 text-emerald-600 hover:bg-emerald-50 border-none shadow-none font-medium flex items-center gap-2 px-3 py-1 text-xs rounded-lg">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Pago
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
                                  className="h-8 w-8 text-slate-400 hover:text-red-600"
                                  data-testid={`button-cancel-payment-${installment.id}`}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedTransaction(installment);
                                setPaymentEditOpen(true);
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2 h-10 rounded-lg shadow-sm text-sm"
                              disabled={confirmPaymentMutation.isPending}
                              data-testid={`button-confirm-payment-${installment.id}`}
                            >
                              {confirmPaymentMutation.isPending ? 'Processando...' : 'Confirmar Pagamento'}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </TabsContent>
          ))}

          <TabsContent value="todas-parcelas" className="space-y-3 mt-4">
            {purchases.length > 0 ? (
              <div className="space-y-2">
                {purchases.map((purchase, idx) => (
                  <div key={purchase.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-700 text-sm font-bold flex-shrink-0">
                        {purchase.installmentNumber || (idx + 1)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 truncate">{purchase.description || 'Parcela'}</p>
                        <p className="text-xs text-slate-500">
                          {purchase.date ? format(parseISO(purchase.date), "dd 'de' MMMM, yyyy", { locale: ptBR }) : '-'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                      <p className="font-bold text-slate-900 whitespace-nowrap">
                        R$ {parseFloat(purchase.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      {purchase.status === 'completed' || purchase.status === 'pago' ? (
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col items-end gap-1">
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
                          <div className="flex items-center gap-1">
                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none shadow-none font-medium flex items-center gap-1 px-3 py-1">
                              <CheckCircle2 className="w-3 h-3" /> Pago
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
                              className="h-8 w-8 text-slate-400 hover:text-red-600"
                              data-testid={`button-cancel-payment-${purchase.id}`}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedTransaction(purchase);
                            setPaymentEditOpen(true);
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 shadow-sm"
                          disabled={confirmPaymentMutation.isPending}
                          data-testid={`button-confirm-payment-${purchase.id}`}
                        >
                          Confirmar Pagamento
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 border-2 border-dashed rounded-xl border-slate-200">
                <p className="text-slate-500">Nenhuma parcela encontrada.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

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
