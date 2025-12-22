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
      const groupKey = s.installmentGroup || s.id;
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(s);
    });
    return Object.values(groups).map(group => ({
      main: group[0],
      installments: group.sort((a, b) => (a.installmentNumber || 0) - (b.installmentNumber || 0))
    }));
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
      const response = await fetch(`/api/transactions/${saleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' })
      });
      if (!response.ok) throw new Error('Falha ao confirmar pagamento');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Pagamento confirmado!');
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
                <div key={group.main.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="font-semibold text-slate-900">{group.main.description || 'Venda'}</h4>
                      <p className="text-sm text-slate-500">
                        {group.main.date ? format(parseISO(group.main.date), "d 'de' MMMM, yyyy", { locale: ptBR }) : '-'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-slate-900">
                        R$ {group.installments.reduce((acc, s) => acc + parseFloat(s.amount || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 border-t pt-3">
                    {group.installments.map((installment, idx) => (
                      <div key={installment.id} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
                            {idx + 1}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-700">
                              R$ {parseFloat(installment.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                            <p className="text-xs text-slate-500">
                              Venc: {installment.date ? format(parseISO(installment.date), "dd/MM/yyyy") : '-'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {installment.status === 'completed' || installment.status === 'pago' ? (
                            <Badge className="bg-emerald-100 text-emerald-700">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Recebido
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-amber-600 border-amber-300">
                              <Clock className="w-3 h-3 mr-1" /> Pendente
                            </Badge>
                          )}
                          {(installment.status !== 'completed' && installment.status !== 'pago') && (
                            <Button
                              size="sm"
                              onClick={() => confirmPaymentMutation.mutate(installment.id)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-xs"
                              disabled={confirmPaymentMutation.isPending}
                            >
                              Confirmar
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-slate-500 py-8">Nenhuma venda registrada.</p>
            )}
          </TabsContent>

          <TabsContent value="todas-parcelas" className="space-y-4 mt-4">
            {sales.length > 0 ? (
              <div className="space-y-2">
                {sales.map((sale, idx) => (
                  <div key={sale.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
                        {sale.installmentNumber || (idx + 1)}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{sale.description || 'Parcela'}</p>
                        <p className="text-xs text-slate-500">
                          📅 {sale.date ? format(parseISO(sale.date), "dd/MM/yyyy") : '-'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <p className="font-semibold text-emerald-600">
                        R$ {parseFloat(sale.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      {sale.status === 'completed' || sale.status === 'pago' ? (
                        <Badge className="bg-emerald-100 text-emerald-700">
                          Recebido
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => confirmPaymentMutation.mutate(sale.id)}
                          className="bg-emerald-600 hover:bg-emerald-700"
                          disabled={confirmPaymentMutation.isPending}
                        >
                          Confirmar
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-slate-500 py-8">Nenhuma parcela encontrada.</p>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
