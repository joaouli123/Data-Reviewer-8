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
      const sortedInstallments = group.sort((a, b) => (a.installmentNumber || 0) - (b.installmentNumber || 0));
      const main = sortedInstallments[0];
      const totalAmount = sortedInstallments.reduce((acc, s) => acc + parseFloat(s.amount || 0), 0);
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

          <TabsContent value="por-venda" className="space-y-6 mt-4">
            {groupedSales.length > 0 ? (
              groupedSales.map((group) => (
                <div key={group.main.id} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                  {/* Header da venda */}
                  <div className="flex items-start justify-between gap-4 p-5 border-b border-slate-100">
                    <div>
                      <h4 className="font-semibold text-base text-slate-900">{group.main.description || 'Venda'}</h4>
                      <p className="text-sm text-slate-500 mt-0.5">
                        {group.main.date ? format(parseISO(group.main.date), "dd 'de' MMMM, yyyy", { locale: ptBR }) : '-'}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-bold text-slate-900">
                        R$ {group.main.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {group.main.isPaid ? 'Pago' : 'Parcial'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Lista de parcelas */}
                  <div className="divide-y divide-slate-100">
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
                            <Badge className="bg-emerald-50 text-emerald-600 hover:bg-emerald-50 border border-emerald-200 shadow-none font-medium flex items-center gap-1.5 px-3 py-1 text-xs rounded-md">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Pago
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => {
                                console.log('Button clicked for installment:', installment.id);
                                confirmPaymentMutation.mutate(installment.id);
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4"
                              disabled={confirmPaymentMutation.isPending}
                            >
                              Confirmar Pagamento
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 border-2 border-dashed rounded-lg border-slate-200">
                <p className="text-slate-500">Nenhuma venda registrada para este cliente.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="todas-parcelas" className="space-y-6 mt-4">
            {groupedSales.length > 0 ? (
              groupedSales.map((group) => (
                <div key={group.main.id} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                  {/* Header da venda */}
                  <div className="flex items-start justify-between gap-4 p-5 border-b border-slate-100">
                    <div>
                      <h4 className="font-semibold text-base text-slate-900">{group.main.description || 'Venda'}</h4>
                      <p className="text-sm text-slate-500 mt-0.5">
                        {group.main.date ? format(parseISO(group.main.date), "dd 'de' MMMM, yyyy", { locale: ptBR }) : '-'}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-bold text-slate-900">
                        R$ {group.main.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {group.main.isPaid ? 'Pago' : 'Parcial'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Lista de parcelas */}
                  <div className="divide-y divide-slate-100">
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
                            <Badge className="bg-emerald-50 text-emerald-600 hover:bg-emerald-50 border border-emerald-200 shadow-none font-medium flex items-center gap-1.5 px-3 py-1 text-xs rounded-md">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Pago
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => confirmPaymentMutation.mutate(installment.id)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4"
                              disabled={confirmPaymentMutation.isPending}
                            >
                              Confirmar Pagamento
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 border-2 border-dashed rounded-lg border-slate-200">
                <p className="text-slate-500">Nenhuma parcela encontrada.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
