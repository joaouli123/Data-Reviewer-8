import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';

export default function CustomerSalesDialog({ customer, open, onOpenChange }) {
  const queryClient = useQueryClient();

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => fetch('/api/transactions').then(res => res.json()),
    initialData: []
  });

  const sales = transactions.filter(t => t.customerId === customer?.id && t.type === 'venda');
  
  // Group sales by installment group
  const groupedSales = React.useMemo(() => {
    const groups = {};
    sales.forEach(s => {
      // Key: description + total amount + base date (stripping time)
      // Since installmentGroup might not be perfectly populated, we group by description and total set logic
      // But for now, let's use description as the primary grouping key if it's unique enough
      const groupKey = s.installmentGroup || s.description || `sale-${s.date}`;
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(s);
    });
    return Object.values(groups).map(group => {
      const main = group[0];
      const installments = group.sort((a, b) => (a.installmentNumber || 0) - (b.installmentNumber || 0));
      const totalAmount = installments.reduce((acc, s) => acc + parseFloat(s.amount || 0), 0);
      const isPaid = installments.every(s => s.status === 'completed' || s.status === 'pago');
      
      return {
        main: {
          ...main,
          totalAmount,
          isPaid
        },
        installments
      };
    }).sort((a, b) => new Date(b.main.date).getTime() - new Date(a.main.date).getTime());
  }, [sales]);

  const getTotalReceived = () => {
    return sales
      .filter(s => s.status === 'completed' || s.status === 'pago')
      .reduce((acc, s) => acc + parseFloat(s.amount || 0), 0);
  };

  const getTotalPending = () => {
    return sales
      .filter(s => s.status !== 'completed' && s.status !== 'pago')
      .reduce((acc, s) => acc + parseFloat(s.amount || 0), 0);
  };

  const confirmPaymentMutation = useMutation({
    mutationFn: async (saleId) => {
      console.log('Confirming payment for:', saleId);
      const response = await fetch(`/api/transactions/${saleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'pago' })
      });
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Payment confirmation failed:', errorData);
        throw new Error(errorData.error || 'Falha ao confirmar pagamento');
      }
      return response.json();
    },
    onSuccess: (data) => {
      console.log('Payment confirmed successfully:', data);
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      toast.success('Pagamento confirmado!');
    },
    onError: (error) => {
      console.error('Mutation error:', error);
      toast.error(error.message);
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

        <Tabs defaultValue="por-venda" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="por-venda">Por Venda</TabsTrigger>
            <TabsTrigger value="todas-parcelas">Todas Parcelas</TabsTrigger>
          </TabsList>

          <TabsContent value="por-venda" className="space-y-4 mt-4">
            {groupedSales.length > 0 ? (
              groupedSales.map((group) => (
                <div key={group.main.id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden p-6">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h4 className="font-bold text-xl text-slate-900 leading-tight">{group.main.description || 'Venda'}</h4>
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
                          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 text-base font-bold flex-shrink-0">
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
                        <div className="flex items-center">
                          {(installment.status === 'completed' || installment.status === 'pago') ? (
                            <Badge className="bg-emerald-50 text-emerald-600 hover:bg-emerald-50 border-none shadow-none font-medium flex items-center gap-2 px-4 py-1.5 text-sm rounded-lg">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Pago
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => {
                                console.log('Button clicked for installment:', installment.id);
                                confirmPaymentMutation.mutate(installment.id);
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2 h-10 rounded-lg shadow-sm text-sm"
                              disabled={confirmPaymentMutation.isPending}
                            >
                              {confirmPaymentMutation.isPending && confirmPaymentMutation.variables === installment.id ? 'Processando...' : 'Confirmar Pagamento'}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 border-2 border-dashed rounded-xl border-slate-200">
                <p className="text-slate-500">Nenhuma venda registrada para este cliente.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="todas-parcelas" className="space-y-3 mt-4">
            {sales.length > 0 ? (
              <div className="space-y-2">
                {sales.map((sale, idx) => (
                  <div key={sale.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-700 text-sm font-bold flex-shrink-0">
                        {sale.installmentNumber || (idx + 1)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 truncate">{sale.description || 'Parcela'}</p>
                        <p className="text-xs text-slate-500">
                          {sale.date ? format(parseISO(sale.date), "dd 'de' MMMM, yyyy", { locale: ptBR }) : '-'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                      <p className="font-bold text-slate-900 whitespace-nowrap">
                        R$ {parseFloat(sale.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      {sale.status === 'completed' || sale.status === 'pago' ? (
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none shadow-none font-medium flex items-center gap-1 px-3 py-1">
                          <CheckCircle2 className="w-3 h-3" /> Pago
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => confirmPaymentMutation.mutate(sale.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 shadow-sm"
                          disabled={confirmPaymentMutation.isPending}
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
      </DialogContent>
    </Dialog>
  );
}
