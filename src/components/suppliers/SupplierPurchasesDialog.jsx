import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, parseISO, addMonths } from 'date-fns';
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
  
  // Group purchases by installment group
  const groupedPurchases = React.useMemo(() => {
    const groups = {};
    purchases.forEach(p => {
      const groupKey = p.installmentGroup || p.id;
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(p);
    });
    return Object.values(groups).map(group => ({
      main: group[0],
      installments: group.sort((a, b) => (a.installmentNumber || 0) - (b.installmentNumber || 0))
    }));
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

        <Tabs defaultValue="por-compra">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="por-compra">Por Compra</TabsTrigger>
            <TabsTrigger value="todas-parcelas">Todas Parcelas</TabsTrigger>
          </TabsList>

          <TabsContent value="por-compra" className="space-y-4 mt-4">
            {groupedPurchases.length > 0 ? (
              groupedPurchases.map((group) => (
                <div key={group.main.id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden p-6">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h4 className="font-bold text-xl text-slate-900 leading-tight">{group.main.description || 'Compra'}</h4>
                      <p className="text-sm text-slate-500 mt-1">
                        {group.main.date ? format(parseISO(group.main.date), "dd 'de' MMMM, yyyy", { locale: ptBR }) : '-'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-slate-900">
                        R$ {group.installments.reduce((acc, p) => acc + parseFloat(p.amount || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-none shadow-none text-[10px] h-5 uppercase tracking-wider mt-1 px-2">
                        {group.installments.every(s => s.status === 'completed' || s.status === 'pago') ? 'Pago' : 'Parcial'}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {group.installments.map((installment, idx) => (
                      <div key={installment.id} className="flex items-center justify-between p-4 bg-slate-50/30 rounded-xl border border-slate-100/50 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-5">
                          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 text-slate-500 text-base font-bold flex-shrink-0">
                            {idx + 1}
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
                          {installment.status === 'completed' || installment.status === 'pago' ? (
                            <Badge className="bg-emerald-50 text-emerald-600 hover:bg-emerald-50 border-none shadow-none font-medium flex items-center gap-2 px-4 py-1.5 text-sm rounded-lg">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Pago
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => confirmPaymentMutation.mutate(installment.id)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2 h-10 rounded-lg shadow-sm text-sm"
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
              <div className="text-center py-12 border-2 border-dashed rounded-xl border-slate-200">
                <p className="text-slate-500">Nenhuma compra registrada para este fornecedor.</p>
              </div>
            )}
          </TabsContent>

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
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none shadow-none font-medium flex items-center gap-1 px-3 py-1">
                          <CheckCircle2 className="w-3 h-3" /> Pago
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => confirmPaymentMutation.mutate(purchase.id)}
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
