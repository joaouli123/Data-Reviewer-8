import { formatCurrencySimple } from '@/utils/formatters';
import React from 'react';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { CheckCircle2, Calendar, DollarSign } from 'lucide-react';

export default function SupplierPurchasesDialog({ supplier, open, onOpenChange }) {
  const queryClient = useQueryClient();

  const { data: purchases } = useQuery({
    queryKey: ['purchases', supplier?.id],
    queryFn: () => entities.Purchase.list(),
    enabled: !!supplier,
    select: (data) => data.filter(p => p.supplier_id === supplier?.id)
  });

  const { data: allInstallments } = useQuery({
    queryKey: ['purchaseInstallments'],
    queryFn: () => entities.PurchaseInstallment.list(),
    enabled: !!supplier,
    initialData: []
  });

  const supplierInstallments = allInstallments.filter(inst => 
    purchases?.some(p => p.id === inst.purchase_id)
  );

  const confirmPaymentMutation = useMutation({
    mutationFn: async ({ installment, purchase }) => {
      const transaction = await Transaction.create({
        description: `Pagamento - ${purchase.description} (Parcela ${installment.installment_number})`,
        amount: installment.amount,
        type: 'expense',
        category: purchase.category,
        date: format(new Date(), 'yyyy-MM-dd'),
        status: 'completed'
      });

      await entities.PurchaseInstallment.update(installment.id, {
        paid: true,
        paid_date: format(new Date(), 'yyyy-MM-dd'),
        transaction_id: transaction.id
      });

      const purchaseInstallments = supplierInstallments.filter(i => i.purchase_id === purchase.id);
      const paidCount = purchaseInstallments.filter(i => i.id === installment.id || i.paid).length;
      const newStatus = paidCount === purchaseInstallments.length ? 'completed' : 
                        paidCount > 0 ? 'partial' : 'pending';

      await entities.Purchase.update(purchase.id, { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['purchaseInstallments'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Pagamento confirmado!');
    }
  });

  const getPurchaseInstallments = (purchaseId) => {
    return supplierInstallments.filter(i => i.purchase_id === purchaseId).sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
  };

  const getTotalReceived = () => {
    return supplierInstallments.filter(i => i.paid).reduce((acc, i) => acc + i.amount, 0);
  };

  const getTotalPending = () => {
    return supplierInstallments.filter(i => !i.paid).reduce((acc, i) => acc + i.amount, 0);
  };

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
              R$ {formatCurrencySimple((purchases?.reduce((acc, p) => acc + p.total_amount, 0) || 0)}
            </p>
          </div>
          <div className="p-4 bg-rose-50 rounded-lg border border-rose-100">
            <p className="text-xs text-rose-600 mb-1">Pago</p>
            <p className="text-xl font-bold text-rose-700">
              R$ {formatCurrencySimple(getTotalReceived()}
            </p>
          </div>
          <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
            <p className="text-xs text-amber-600 mb-1">Pendente</p>
            <p className="text-xl font-bold text-amber-700">
              R$ {formatCurrencySimple(getTotalPending()}
            </p>
          </div>
        </div>

        <Tabs defaultValue="purchases">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="purchases">Por Compra</TabsTrigger>
            <TabsTrigger value="installments">Todas Parcelas</TabsTrigger>
          </TabsList>

          <TabsContent value="purchases" className="space-y-4 mt-4">
            {purchases?.map((purchase) => {
              const installments = getPurchaseInstallments(purchase.id);
              return (
                <div key={purchase.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-slate-900">{purchase.description}</h4>
                      <p className="text-sm text-slate-500">
                        {format(parseISO(purchase.purchase_date), "d 'de' MMMM, yyyy", { locale: ptBR })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-slate-900">
                        R$ {formatCurrencySimple(purchase.total_amount}
                      </p>
                      <Badge variant={purchase.status === 'completed' ? 'default' : purchase.status === 'partial' ? 'secondary' : 'outline'}>
                        {purchase.status === 'completed' ? 'Pago' : purchase.status === 'partial' ? 'Parcial' : 'Pendente'}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {installments.map((inst) => (
                      <div key={inst.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${inst.paid ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-600'}`}>
                            {inst.installment_number}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              R$ {formatCurrencySimple(inst.amount}
                            </p>
                            <p className="text-xs text-slate-500">
                              Venc: {format(parseISO(inst.due_date), "dd/MM/yyyy")}
                            </p>
                          </div>
                        </div>
                        {inst.paid ? (
                          <Badge variant="default" className="bg-emerald-100 text-emerald-700">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Pago
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => confirmPaymentMutation.mutate({ installment: inst, purchase })}
                            className="bg-emerald-600 hover:bg-emerald-700"
                          >
                            Confirmar Pagamento
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {!purchases?.length && (
              <p className="text-center text-slate-500 py-8">Nenhuma compra registrada.</p>
            )}
          </TabsContent>

          <TabsContent value="installments" className="space-y-2 mt-4">
            {supplierInstallments.sort((a, b) => new Date(a.due_date) - new Date(b.due_date)).map((inst) => {
              const purchase = purchases?.find(p => p.id === inst.purchase_id);
              return (
                <div key={inst.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${inst.paid ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                      {inst.installment_number}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{purchase?.description}</p>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(parseISO(inst.due_date), "dd/MM/yyyy")}
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          R$ {formatCurrencySimple(inst.amount}
                        </span>
                      </div>
                    </div>
                  </div>
                  {inst.paid ? (
                    <Badge variant="default" className="bg-emerald-100 text-emerald-700">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Pago
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => confirmPaymentMutation.mutate({ installment: inst, purchase })}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      Confirmar
                    </Button>
                  )}
                </div>
              );
            })}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}