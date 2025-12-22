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

        <Tabs defaultValue="sales" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sales">Vendas</TabsTrigger>
            <TabsTrigger value="installments">Parcelas</TabsTrigger>
          </TabsList>

          <TabsContent value="sales" className="space-y-4 mt-4">
            {sales.length > 0 ? (
              sales.map((sale) => (
                <div key={sale.id} className="border rounded-lg p-4 bg-white">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-slate-900">{sale.description || 'Venda'}</h4>
                      <p className="text-sm text-slate-500">
                        {sale.date ? format(parseISO(sale.date), "d 'de' MMM, yyyy", { locale: ptBR }) : '-'}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        {sale.status === 'completed' || sale.status === 'pago' ? (
                          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Pago
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-600 border-amber-300">
                            <Clock className="w-3 h-3 mr-1" /> Pendente
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-2">
                      <p className="text-lg font-bold text-slate-900">
                        R$ {parseFloat(sale.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      {(sale.status !== 'completed' && sale.status !== 'pago') && (
                        <Button 
                          size="sm" 
                          className="bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => confirmPaymentMutation.mutate(sale.id)}
                          disabled={confirmPaymentMutation.isPending}
                        >
                          Confirmar Recebimento
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-slate-500 py-8">Nenhuma venda registrada.</p>
            )}
          </TabsContent>

          <TabsContent value="installments" className="space-y-4 mt-4">
            {sales.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 font-medium border-b">
                    <tr>
                      <th className="px-4 py-3">Data</th>
                      <th className="px-4 py-3">Descrição</th>
                      <th className="px-4 py-3">Valor</th>
                      <th className="px-4 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {sales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3">
                          {sale.date ? format(parseISO(sale.date), "dd/MM/yyyy") : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-slate-900">{sale.description}</p>
                            <Badge variant="outline" className={`mt-1 text-[10px] ${
                              sale.status === 'completed' || sale.status === 'pago' 
                                ? 'text-emerald-600 border-emerald-200' 
                                : 'text-amber-600 border-amber-200'
                            }`}>
                              {sale.status === 'completed' || sale.status === 'pago' ? 'Pago' : 'Pendente'}
                            </Badge>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-semibold">
                          R$ {parseFloat(sale.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {(sale.status !== 'completed' && sale.status !== 'pago') && (
                            <Button 
                              size="sm" 
                              variant="ghost"
                              className="text-emerald-600 hover:text-emerald-700 p-0 h-auto font-medium"
                              onClick={() => confirmPaymentMutation.mutate(sale.id)}
                              disabled={confirmPaymentMutation.isPending}
                            >
                              Confirmar
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
