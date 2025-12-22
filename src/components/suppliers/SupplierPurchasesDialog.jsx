import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { CheckCircle2, Calendar, Clock } from 'lucide-react';

export default function SupplierPurchasesDialog({ supplier, open, onOpenChange }) {
  const queryClient = useQueryClient();

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => fetch('/api/transactions').then(res => res.json()),
    initialData: []
  });

  const purchases = transactions.filter(t => t.supplierId === supplier?.id && t.type === 'compra');

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
    mutationFn: async (purchaseId) => {
      const response = await fetch(`/api/transactions/${purchaseId}`, {
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

        <Tabs defaultValue="purchases">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="purchases">Compras</TabsTrigger>
            <TabsTrigger value="installments">Parcelas</TabsTrigger>
          </TabsList>

          <TabsContent value="purchases" className="space-y-4 mt-4">
            {purchases?.map((purchase) => (
              <div key={purchase.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-slate-900">{purchase.description || 'Compra'}</h4>
                    <p className="text-sm text-slate-500">
                      {purchase.date ? format(parseISO(purchase.date), "d 'de' MMMM, yyyy", { locale: ptBR }) : '-'}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      {purchase.status === 'completed' || purchase.status === 'pago' ? (
                        <Badge className="bg-emerald-100 text-emerald-700">
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
                      R$ {parseFloat(purchase.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    {(purchase.status !== 'completed' && purchase.status !== 'pago') && (
                      <Button
                        size="sm"
                        onClick={() => confirmPaymentMutation.mutate(purchase.id)}
                        className="bg-emerald-600 hover:bg-emerald-700"
                        disabled={confirmPaymentMutation.isPending}
                      >
                        Confirmar Pagamento
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {!purchases?.length && (
              <p className="text-center text-slate-500 py-8">Nenhuma compra registrada.</p>
            )}
          </TabsContent>

          <TabsContent value="installments" className="space-y-4 mt-4">
            {purchases.length > 0 ? (
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
                    {purchases.map((purchase) => (
                      <tr key={purchase.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3">
                          {purchase.date ? format(parseISO(purchase.date), "dd/MM/yyyy") : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-slate-900">{purchase.description}</p>
                            <Badge variant="outline" className={`mt-1 text-[10px] ${
                              purchase.status === 'completed' || purchase.status === 'pago' 
                                ? 'text-emerald-600 border-emerald-200' 
                                : 'text-amber-600 border-amber-200'
                            }`}>
                              {purchase.status === 'completed' || purchase.status === 'pago' ? 'Pago' : 'Pendente'}
                            </Badge>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-semibold text-rose-600">
                          - R$ {parseFloat(purchase.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {(purchase.status !== 'completed' && purchase.status !== 'pago') && (
                            <Button 
                              size="sm" 
                              variant="ghost"
                              className="text-emerald-600 hover:text-emerald-700 p-0 h-auto font-medium"
                              onClick={() => confirmPaymentMutation.mutate(purchase.id)}
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
