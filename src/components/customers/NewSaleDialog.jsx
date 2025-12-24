import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput, formatCurrency } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Category, Sale, Installment } from '@/api/entities';
import { format, addMonths } from 'date-fns';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import CreateCategoryModal from '../transactions/CreateCategoryModal';
import { useAuth } from '@/contexts/AuthContext';

export default function NewSaleDialog({ customer, open, onOpenChange }) {
  const { company } = useAuth();
  const [formData, setFormData] = useState({
    description: '',
    total_amount: '',
    category: '',
    sale_date: format(new Date(), 'yyyy-MM-dd'),
    installments: '1',
    installment_amount: '',
    status: 'pendente'
  });
  const [customInstallments, setCustomInstallments] = useState([]);
  const [isCreateCategoryModalOpen, setIsCreateCategoryModalOpen] = useState(false);

  // Reset form when dialog closes
  React.useEffect(() => {
    if (open) {
      setFormData(prev => ({
        ...prev,
        category: customer?.category || '',
        sale_date: format(new Date(), 'yyyy-MM-dd')
      }));
    } else {
      setFormData({
        description: '',
        total_amount: '',
        category: '',
        sale_date: format(new Date(), 'yyyy-MM-dd'),
        installments: '1',
        installment_amount: ''
      });
      setCustomInstallments([]);
    }
  }, [open, customer]);

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
      toast.success('Categoria criada!', { duration: 5000 });
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao criar categoria', { duration: 5000 });
    }
  });

  const createSaleMutation = useMutation({
    mutationFn: async (data) => {
      const categories = await Category.list();
      const cat = categories.find(c => c.name === data.category);
      
      const installmentCount = parseInt(data.installments) || 1;
      const totalAmount = parseFloat(data.total_amount);
      const installmentAmount = parseFloat(data.installment_amount) || (totalAmount / installmentCount);
      
      const installmentGroupId = `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      // Convert YYYY-MM-DD to ISO date at noon UTC (avoids timezone issues)
      // Parse the date string directly to ensure correct day
      const [year, month, day] = data.sale_date.split('-');
      const baseDate = new Date(`${year}-${month}-${day}T12:00:00Z`);
      
      const promises = [];
      
      for (let i = 0; i < installmentCount; i++) {
        // Use addMonths from date-fns to properly handle timezone-aware date arithmetic
        const dueDate = addMonths(baseDate, i);
        const dueDateISO = dueDate.toISOString();
        
        const payload = {
          companyId: company?.id,
          customerId: customer.id,
          categoryId: cat?.id,
          type: 'venda',
          date: dueDateISO,
          shift: 'manhã',
          amount: String(installmentAmount.toFixed(2)),
          description: `${data.description}${installmentCount > 1 ? ` (${i + 1}/${installmentCount})` : ''}`,
          status: data.status || 'pendente',
          installmentGroup: installmentGroupId,
          installmentNumber: i + 1,
          installmentTotal: installmentCount
        };
        
        const promise = apiRequest('/api/transactions', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        
        promises.push(promise);
      }
      
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      onOpenChange(false);
      setFormData({
        description: '',
        total_amount: '',
        category: '',
        sale_date: format(new Date(), 'yyyy-MM-dd'),
        installments: '1',
        installment_amount: '',
        status: 'pendente'
      });
      setCustomInstallments([]);
      toast.success('Venda registrada com sucesso!', { duration: 5000 });
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao registrar venda', { duration: 5000 });
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.category) {
      toast.error('Selecione uma categoria', { duration: 5000 });
      return;
    }
    
    // Validate custom installments if provided
    if (customInstallments.length > 0) {
      const totalCustom = customInstallments.reduce((sum, inst) => sum + parseFloat(inst.amount || 0), 0);
      if (Math.abs(totalCustom - Number(formData.total_amount)) > 0.01) {
        toast.error('A soma das parcelas deve ser igual ao valor total', { duration: 5000 });
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
      const totalAmount = parseFloat(formData.total_amount) || 0;
      const defaultAmount = totalAmount > 0 ? totalAmount / numInstallments : '';
      // Parse date at noon to avoid timezone offset issues (UTC-3 São Paulo)
      const baseDate = new Date(formData.sale_date + 'T12:00:00');
      const newCustomInstallments = Array.from({ length: numInstallments }, (_, i) => ({
        amount: defaultAmount,
        due_date: format(addMonths(baseDate, i), 'yyyy-MM-dd')
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
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
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
            <Label>Valor Total</Label>
            <div className="flex items-center gap-2">
              <span className="text-slate-600">R$</span>
              <CurrencyInput 
                placeholder="0,00"
                value={formData.total_amount}
                onChange={(e) => setFormData({...formData, total_amount: e.target.value})}
                className="flex-1"
                required
              />
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
              {Number(formData.installments) > 1 && (
                <div className="space-y-2">
                  <Label>Valor da Parcela (opcional)</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600">R$</span>
                    <CurrencyInput
                      value={formData.installment_amount}
                      onChange={(e) => setFormData({ ...formData, installment_amount: e.target.value })}
                      placeholder={formatCurrency((parseFloat(formData.total_amount || 0) / Number(formData.installments || 1)))}
                      className="flex-1"
                    />
                  </div>
                </div>
              )}
            </div>

          {Number(formData.installments) > 1 && customInstallments.length === 0 && (
            <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-600">
              <p>
                {formData.installment_amount && !isNaN(parseFloat(formData.installment_amount))
                  ? `${formData.installments}x de R$ ${formatCurrency(formData.installment_amount)}`
                  : `${formData.installments}x de R$ ${formatCurrency((parseFloat(formData.total_amount || 0) / Number(formData.installments || 1)))}`
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
              <div className="max-h-60 overflow-y-auto space-y-2 border rounded-lg p-3 bg-slate-50 pr-2">
                {customInstallments.map((inst, idx) => (
                  <div key={idx} className="grid grid-cols-2 gap-2 items-center bg-white p-2 rounded border">
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-slate-600">
                        Parcela {idx + 1}
                      </div>
                      <CurrencyInput
                        placeholder="Valor"
                        value={inst.amount}
                        onChange={(e) => updateCustomInstallment(idx, 'amount', e.target.value)}
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-slate-500">Vencimento</Label>
                      <Input
                        type="date"
                        value={inst.due_date}
                        onChange={(e) => updateCustomInstallment(idx, 'due_date', e.target.value)}
                        className="text-sm"
                      />
                    </div>
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
              <div className="flex gap-2">
                <Select 
                  value={formData.category} 
                  onValueChange={(v) => setFormData({...formData, category: v})}
                >
                  <SelectTrigger className="flex-1" required>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
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
              <div className={`px-3 py-2 rounded-md border border-slate-200 text-sm font-medium flex items-center ${
                'bg-emerald-50 text-emerald-700'
              }`}>
                + Receita
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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

      <CreateCategoryModal 
        open={isCreateCategoryModalOpen}
        onOpenChange={setIsCreateCategoryModalOpen}
        onSubmit={(data) => createCategoryMutation.mutate(data)}
        isLoading={createCategoryMutation.isPending}
      />
    </Dialog>
  );
}