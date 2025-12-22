import React, { useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Category, Purchase, PurchaseInstallment } from '@/api/entities';
import { toast } from 'sonner';
import { format, addMonths, parseISO } from 'date-fns';

export default function NewPurchaseDialog({ supplier, open, onOpenChange }) {
  const [formData, setFormData] = useState({
    description: '',
    total_amount: '',
    category: '',
    purchase_date: format(new Date(), 'yyyy-MM-dd'),
    installments: 1,
    installment_amount: ''
  });

  const queryClient = useQueryClient();

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => Category.list(),
    initialData: []
  });

  // No need to filter - use all categories
  const expenseCategories = categories;

  const createPurchaseMutation = useMutation({
    mutationFn: async (data) => {
      const purchase = await Purchase.create({
        supplier_id: supplier.id,
        description: data.description,
        total_amount: parseFloat(data.total_amount),
        category: data.category,
        purchase_date: data.purchase_date,
        installments: parseInt(data.installments),
        status: 'pending'
      });

      const installmentAmount = data.installment_amount 
        ? parseFloat(data.installment_amount) 
        : parseFloat(data.total_amount) / parseInt(data.installments);

      const installmentPromises = [];
      for (let i = 0; i < parseInt(data.installments); i++) {
        const dueDate = addMonths(parseISO(data.purchase_date), i);
        installmentPromises.push(
          PurchaseInstallment.create({
            purchase_id: purchase.id,
            installment_number: i + 1,
            amount: installmentAmount,
            due_date: format(dueDate, 'yyyy-MM-dd'),
            paid: false
          })
        );
      }

      await Promise.all(installmentPromises);
      return purchase;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['purchaseInstallments'] });
      toast.success('Compra registrada com sucesso!');
      setFormData({
        description: '',
        total_amount: '',
        category: '',
        purchase_date: format(new Date(), 'yyyy-MM-dd'),
        installments: 1,
        installment_amount: ''
      });
      onOpenChange(false);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.description || !formData.total_amount || !formData.category) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    createPurchaseMutation.mutate(formData);
  };

  const handleInstallmentsChange = (value) => {
    setFormData({ ...formData, installments: value, installment_amount: '' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar Compra - {supplier?.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Descrição da Compra</Label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Ex: Matéria-prima, equipamento..."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valor Total</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.total_amount}
                onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Data da Compra</Label>
              <Input
                type="date"
                value={formData.purchase_date}
                onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                {expenseCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.name}>
                    {cat.name.charAt(0).toUpperCase() + cat.name.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Número de Parcelas</Label>
              <Input
                type="number"
                min="1"
                value={formData.installments}
                onChange={(e) => handleInstallmentsChange(e.target.value)}
              />
            </div>
            {formData.installments > 1 && (
              <div className="space-y-2">
                <Label>Valor da Parcela (opcional)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.installment_amount}
                  onChange={(e) => setFormData({ ...formData, installment_amount: e.target.value })}
                  placeholder={`R$ ${(parseFloat(formData.total_amount || 0) / formData.installments).toFixed(2)}`}
                />
              </div>
            )}
          </div>

          {formData.installments > 1 && (
            <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-600">
              <p>
                {formData.installment_amount 
                  ? `${formData.installments}x de R$ ${parseFloat(formData.installment_amount).toFixed(2)}`
                  : `${formData.installments}x de R$ ${(parseFloat(formData.total_amount || 0) / formData.installments).toFixed(2)}`
                }
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary">
              Registrar Compra
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}