import React, { useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput, formatCurrency, parseCurrency } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Category, Purchase, PurchaseInstallment } from '@/api/entities';
import { toast } from 'sonner';
import { format, addMonths, parseISO } from 'date-fns';
import { Plus } from 'lucide-react';
import CreateCategoryModal from '../transactions/CreateCategoryModal';

export default function NewPurchaseDialog({ supplier, open, onOpenChange }) {
  const [formData, setFormData] = useState({
    description: '',
    total_amount: '',
    category: '',
    purchase_date: format(new Date(), 'yyyy-MM-dd'),
    installments: 1,
    installment_amount: ''
  });
  const [isCreateCategoryModalOpen, setIsCreateCategoryModalOpen] = useState(false);

  // Reset form when dialog closes
  React.useEffect(() => {
    if (open) {
      setFormData(prev => ({
        ...prev,
        category: supplier?.category || '',
        purchase_date: format(new Date(), 'yyyy-MM-dd')
      }));
    } else {
      setFormData({
        description: '',
        total_amount: '',
        category: '',
        purchase_date: format(new Date(), 'yyyy-MM-dd'),
        installments: 1,
        installment_amount: ''
      });
    }
  }, [open, supplier]);

  const queryClient = useQueryClient();

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => Category.list(),
    initialData: []
  });

  const createCategoryMutation = useMutation({
    mutationFn: (data) => Category.create(data),
    onSuccess: (newCat) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setFormData((prev) => ({ ...prev, category: newCat.name }));
      setIsCreateCategoryModalOpen(false);
      toast.success('Categoria criada!');
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao criar categoria');
    }
  });

  // No need to filter - use all categories
  const expenseCategories = categories;

  const createPurchaseMutation = useMutation({
    mutationFn: async (data) => {
      const categories = await Category.list();
      const cat = categories.find(c => c.name === data.category);
      
      const installmentCount = parseInt(data.installments) || 1;
      const totalAmount = parseFloat(data.total_amount);
      const installmentAmount = parseFloat(data.installment_amount) || (totalAmount / installmentCount);
      
      const installmentGroupId = `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const baseDate = new Date(data.purchase_date);
      
      const promises = [];
      
      for (let i = 0; i < installmentCount; i++) {
        const dueDate = new Date(baseDate);
        dueDate.setMonth(dueDate.getMonth() + i);
        
        const payload = {
          supplierId: supplier.id,
          categoryId: cat?.id,
          type: 'compra',
          date: dueDate.toISOString(),
          shift: 'manhã',
          amount: String(installmentAmount.toFixed(2)),
          description: `${data.description}${installmentCount > 1 ? ` (${i + 1}/${installmentCount})` : ''}`,
          status: 'pendente',
          installmentGroup: installmentGroupId,
          installmentNumber: i + 1,
          installmentTotal: installmentCount
        };
        
        const promise = fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        });
        
        promises.push(promise);
      }
      
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
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
              <div className="flex items-center gap-2">
                <span className="text-slate-600">R$</span>
                <CurrencyInput
                  value={formData.total_amount}
                  onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
                  placeholder="0,00"
                  className="flex-1"
                  required
                />
              </div>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <div className="flex gap-2">
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger className="flex-1">
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
                <Button 
                  type="button" 
                  size="icon" 
                  variant="outline" 
                  onClick={() => setIsCreateCategoryModalOpen(true)}
                  title="Nova Categoria"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <div className={`px-3 py-2 rounded-md border border-slate-200 text-sm font-medium flex items-center bg-rose-50 text-rose-700`}>
                - Despesa
              </div>
            </div>
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
                <div className="flex items-center gap-2">
                  <span className="text-slate-600">R$</span>
                  <CurrencyInput
                    value={formData.installment_amount}
                    onChange={(e) => setFormData({ ...formData, installment_amount: e.target.value })}
                    placeholder={formatCurrency((parseFloat(formData.total_amount || 0) / formData.installments))}
                    className="flex-1"
                  />
                </div>
              </div>
            )}
          </div>

          {formData.installments > 1 && (
            <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-600">
              <p>
                {formData.installment_amount 
                  ? `${formData.installments}x de R$ ${formatCurrency(formData.installment_amount)}`
                  : `${formData.installments}x de R$ ${formatCurrency((parseFloat(formData.total_amount || 0) / formData.installments))}`
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

      <CreateCategoryModal 
        open={isCreateCategoryModalOpen}
        onOpenChange={setIsCreateCategoryModalOpen}
        onSubmit={(data) => createCategoryMutation.mutate(data)}
        isLoading={createCategoryMutation.isPending}
      />
    </Dialog>
  );
}