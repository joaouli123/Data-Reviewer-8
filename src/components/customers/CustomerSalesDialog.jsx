import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';

export default function CustomerSalesDialog({ customer, open, onOpenChange }) {
  const queryClient = useQueryClient();

  const { data: sales } = useQuery({
    queryKey: ['sales', customer?.id],
    queryFn: () => Sale.filter({ customer_id: customer.id }),
    enabled: !!customer,
    initialData: []
  });

  const { data: allInstallments } = useQuery({
    queryKey: ['installments', customer?.id],
    queryFn: async () => {
      const saleIds = sales.map(s => s.id);
      if (saleIds.length === 0) return [];
      const installments = await Installment.list();
      return installments.filter(i => saleIds.includes(i.sale_id));
    },
    enabled: !!customer && sales.length > 0,
    initialData: []
  });

  const confirmPaymentMutation = useMutation({
    mutationFn: async ({ installment, sale }) => {
      // Create transaction
      const transaction = await Transaction.create({
        description: `${sale.description} - Parcela ${installment.installment_number}/${sale.installments}`,
        amount: installment.amount,
        type: 'income',
        category: sale.category,
        date: format(new Date(), 'yyyy-MM-dd'),
        status: 'completed',
        customer_id: customer.id
      });

      // Update installment
      await Installment.update(installment.id, {
        paid: true,
        paid_date: format(new Date(), 'yyyy-MM-dd'),
        transaction_id: transaction.id
      });

      // Check if all installments are paid to update sale status
      const saleInstallments = allInstallments.filter(i => i.sale_id === sale.id);
      const allPaid = saleInstallments.every(i => i.id === installment.id || i.paid);
      
      if (allPaid) {
        await Sale.update(sale.id, { status: 'completed' });
      } else {
        await Sale.update(sale.id, { status: 'partial' });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installments'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Pagamento confirmado!');
    }
  });

  const getInstallmentsForSale = (saleId) => {
    return allInstallments.filter(i => i.sale_id === saleId).sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
  };

  const getTotalReceived = () => {
    return allInstallments.filter(i => i.paid).reduce((acc, i) => acc + i.amount, 0);
  };

  const getTotalPending = () => {
    return allInstallments.filter(i => !i.paid).reduce((acc, i) => acc + i.amount, 0);
  };

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
              R$ {sales.reduce((acc, s) => acc + s.total_amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
              sales.map((sale) => {
                const installments = getInstallmentsForSale(sale.id);
                const paidCount = installments.filter(i => i.paid).length;
                
                return (
                  <div key={sale.id} className="border rounded-lg p-4 bg-white">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold text-slate-900">{sale.description}</h4>
                        <p className="text-sm text-slate-500">
                          {format(parseISO(sale.sale_date), "d 'de' MMM, yyyy", { locale: ptBR })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-slate-900">
                          R$ {sale.total_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <Badge variant={sale.status === 'completed' ? 'default' : sale.status === 'partial' ? 'secondary' : 'outline'} 
                          className={sale.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : sale.status === 'partial' ? 'bg-amber-100 text-amber-700' : ''}>
                          {paidCount}/{sale.installments} Parcelas
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {installments.map((inst) => (
                        <div key={inst.id} className="flex items-center justify-between p-2 bg-slate-50 rounded border">
                          <div className="flex items-center gap-3">
                            {inst.paid ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                            ) : (
                              <Clock className="w-5 h-5 text-amber-500" />
                            )}
                            <div>
                              <p className="text-sm font-medium">Parcela {inst.installment_number}</p>
                              <p className="text-xs text-slate-500">
                                Venc: {format(parseISO(inst.due_date), "dd/MM/yyyy")}
                                {inst.paid && inst.paid_date && ` • Pago em ${format(parseISO(inst.paid_date), "dd/MM/yyyy")}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-slate-900">
                              R$ {inst.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                            {!inst.paid && (
                              <Button 
                                size="sm" 
                                className="bg-emerald-600 hover:bg-emerald-700"
                                onClick={() => confirmPaymentMutation.mutate({ installment: inst, sale })}
                              >
                                Confirmar
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-center text-slate-500 py-8">Nenhuma venda registrada.</p>
            )}
          </TabsContent>

          <TabsContent value="installments" className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Venda</TableHead>
                  <TableHead>Parcela</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allInstallments.length > 0 ? (
                  allInstallments.sort((a, b) => new Date(a.due_date) - new Date(b.due_date)).map((inst) => {
                    const sale = sales.find(s => s.id === inst.sale_id);
                    return (
                      <TableRow key={inst.id}>
                        <TableCell>
                          {inst.paid ? (
                            <Badge className="bg-emerald-100 text-emerald-700">Pago</Badge>
                          ) : (
                            <Badge variant="outline" className="text-amber-600 border-amber-300">Pendente</Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{sale?.description}</TableCell>
                        <TableCell>{inst.installment_number}/{sale?.installments}</TableCell>
                        <TableCell>{format(parseISO(inst.due_date), "dd/MM/yyyy")}</TableCell>
                        <TableCell className="text-right font-semibold">
                          R$ {inst.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          {!inst.paid && (
                            <Button 
                              size="sm" 
                              className="bg-emerald-600 hover:bg-emerald-700"
                              onClick={() => confirmPaymentMutation.mutate({ installment: inst, sale })}
                            >
                              Confirmar
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                      Nenhuma parcela encontrada.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}