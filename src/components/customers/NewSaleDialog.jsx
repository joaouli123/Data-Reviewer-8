import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { format, addMonths } from 'date-fns';
import { toast } from 'sonner';

export default function NewSaleDialog({ customer, open, onOpenChange }) {
  const [formData, setFormData] = useState({
    description: '',
    total_amount: '',
    category: '',
    sale_date: format(new Date(), 'yyyy-MM-dd'),
    installments: '1',
    installment_amount: ''
  });
  const [customInstallments, setCustomInstallments] = useState([]);

  const queryClient = useQueryClient();

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => Category.list(),
    initialData: []
  });

  const createSaleMutation = useMutation({
    mutationFn: async (data) => {
      // Create sale
      const sale = await Sale.create({
        customer_id: customer.id,
        description: data.description,
        total_amount: data.total_amount,
        category: data.category,
        sale_date: data.sale_date,
        installments: data.installments,
        status: 'pending'
      });

      // Create installments
      const installmentPromises = [];
      
      if (data.customInstallments && data.customInstallments.length > 0) {
        // Use custom installments
        data.customInstallments.forEach((inst, idx) => {
          installmentPromises.push(
            Installment.create({
              sale_id: sale.id,
              installment_number: idx + 1,
              amount: parseFloat(inst.amount),
              due_date: inst.due_date,
              paid: false
            })
          );
        });
      } else {
        // Use automatic calculation
        const installmentAmount = data.installment_amount 
          ? parseFloat(data.installment_amount) 
          : data.total_amount / data.installments;
        
        for (let i = 1; i <= data.installments; i++) {
          const dueDate = addMonths(new Date(data.sale_date), i - 1);
          installmentPromises.push(
            Installment.create({
              sale_id: sale.id,
              installment_number: i,
              amount: installmentAmount,
              due_date: format(dueDate, 'yyyy-MM-dd'),
              paid: false
            })
          );
        }
      }

      await Promise.all(installmentPromises);
      return sale;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['installments'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      onOpenChange(false);
      setFormData({
        description: '',
        total_amount: '',
        category: '',
        sale_date: format(new Date(), 'yyyy-MM-dd'),
        installments: '1',
        installment_amount: ''
      });
      setCustomInstallments([]);
      toast.success('Venda registrada com sucesso!');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.category) {
      toast.error('Selecione uma categoria');
      return;
    }
    
    // Validate custom installments if provided
    if (customInstallments.length > 0) {
      const totalCustom = customInstallments.reduce((sum, inst) => sum + parseFloat(inst.amount || 0), 0);
      if (Math.abs(totalCustom - Number(formData.total_amount)) > 0.01) {
        toast.error('A soma das parcelas deve ser igual ao valor total');
        return;
      }
    }
    
    createSaleMutation.mutate({
      ...formData,
      total_amount: Number(formData.total_amount),
      installments: Number(formData.installments),
      installment_amount: formData.installment_amount,
      customInstallments: customInstallments.length > 0 ? customInstallments : null
    });
  };

  const handleInstallmentsChange = (value) => {
    const numValue = value === '' ? '1' : value;
    setFormData({ ...formData, installments: numValue, installment_amount: '' });
    
    // Initialize custom installments array
    const numInstallments = parseInt(numValue);
    if (numInstallments > 1) {
      const defaultAmount = formData.total_amount ? (parseFloat(formData.total_amount) / numInstallments).toFixed(2) : '';
      const newCustomInstallments = Array.from({ length: numInstallments }, (_, i) => ({
        amount: defaultAmount,
        due_date: format(addMonths(new Date(formData.sale_date), i), 'yyyy-MM-dd')
      }));
      setCustomInstallments(newCustomInstallments);
    } else {
      setCustomInstallments([]);
    }
  };

  const updateCustomInstallment = (index, field, value) => {
    const updated = [...customInstallments];
    updated[index] = { ...updated[index], [field]: value };
    setCustomInstallments(updated);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nova Venda - {customer?.name}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Descrição da Venda</Label>
            <Input 
              placeholder="Ex: Produto/Serviço vendido" 
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label>Valor Total (R$)</Label>
            <Input 
              type="number" 
              step="0.01" 
              placeholder="0.00"
              value={formData.total_amount}
              onChange={(e) => setFormData({...formData, total_amount: e.target.value})}
              required
            />
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
            {Number(formData.installments) > 1 && (
              <div className="space-y-2">
                <Label>Valor da Parcela (opcional)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.installment_amount}
                  onChange={(e) => setFormData({ ...formData, installment_amount: e.target.value })}
                  placeholder={`R$ ${(parseFloat(formData.total_amount || 0) / Number(formData.installments || 1)).toFixed(2)}`}
                />
              </div>
            )}
          </div>

          {Number(formData.installments) > 1 && customInstallments.length === 0 && (
            <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-600">
              <p>
                {formData.installment_amount && !isNaN(parseFloat(formData.installment_amount))
                  ? `${formData.installments}x de R$ ${parseFloat(formData.installment_amount).toFixed(2)}`
                  : `${formData.installments}x de R$ ${(parseFloat(formData.total_amount || 0) / Number(formData.installments || 1)).toFixed(2)}`
                }
              </p>
            </div>
          )}

          {customInstallments.length > 1 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Detalhamento das Parcelas</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setCustomInstallments([])}
                  className="text-xs"
                >
                  Usar valor padrão
                </Button>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-2 border rounded-lg p-3 bg-slate-50">
                {customInstallments.map((inst, idx) => (
                  <div key={idx} className="grid grid-cols-3 gap-2 items-center bg-white p-2 rounded border">
                    <div className="text-sm font-medium text-slate-600">
                      Parcela {idx + 1}
                    </div>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Valor"
                      value={inst.amount}
                      onChange={(e) => updateCustomInstallment(idx, 'amount', e.target.value)}
                      className="text-sm"
                    />
                    <Input
                      type="date"
                      value={inst.due_date}
                      onChange={(e) => updateCustomInstallment(idx, 'due_date', e.target.value)}
                      className="text-sm"
                    />
                  </div>
                ))}
                <div className="pt-2 border-t mt-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium">Total das Parcelas:</span>
                    <span className={`font-bold ${
                      Math.abs(customInstallments.reduce((sum, inst) => sum + parseFloat(inst.amount || 0), 0) - parseFloat(formData.total_amount || 0)) < 0.01
                        ? 'text-emerald-600'
                        : 'text-rose-600'
                    }`}>
                      R$ {customInstallments.reduce((sum, inst) => sum + parseFloat(inst.amount || 0), 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select 
                value={formData.category} 
                onValueChange={(v) => setFormData({...formData, category: v})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {categories.filter(cat => cat.type === 'income' || cat.type === 'both').map((cat) => (
                    <SelectItem key={cat.id} value={cat.name}>
                      {cat.name.charAt(0).toUpperCase() + cat.name.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Data da Venda</Label>
              <Input 
                type="date" 
                value={formData.sale_date}
                onChange={(e) => setFormData({...formData, sale_date: e.target.value})}
                required
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
              Registrar Venda
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}