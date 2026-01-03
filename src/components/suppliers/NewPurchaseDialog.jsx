import React, { useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput, formatCurrency } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Category, Purchase, PurchaseInstallment } from '@/api/entities';
import { toast } from 'sonner';
import { format, addMonths } from 'date-fns';
import { Plus } from 'lucide-react';
import CreateCategoryModal from '../transactions/CreateCategoryModal';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';
import { Switch } from '@/components/ui/switch';

export default function NewPurchaseDialog({ supplier, open, onOpenChange }) {
  const { company } = useAuth();
  const [formData, setFormData] = useState({
    description: '',
    total_amount: '',
    category: '',
    purchase_date: format(new Date(), 'yyyy-MM-dd'),
    installments: 1,
    installment_amount: '',
    status: 'pago',
    paymentDate: format(new Date(), 'yyyy-MM-dd'),
    paymentMethod: ''
  });
  const [customInstallments, setCustomInstallments] = useState([]);
  const [isCreateCategoryModalOpen, setIsCreateCategoryModalOpen] = useState(false);

  // Reset form when dialog closes
  React.useEffect(() => {
    if (open) {
      setFormData(prev => ({
        ...prev,
        category: supplier?.category || '',
        purchase_date: format(new Date(), 'yyyy-MM-dd'),
        paymentDate: format(new Date(), 'yyyy-MM-dd')
      }));
    } else {
      setFormData({
        description: '',
        total_amount: '',
        category: '',
        purchase_date: format(new Date(), 'yyyy-MM-dd'),
        installments: 1,
        installment_amount: '',
        status: 'pago',
        paymentDate: format(new Date(), 'yyyy-MM-dd'),
        paymentMethod: ''
      });
      setCustomInstallments([]);
    }
  }, [open, supplier]);

  const queryClient = useQueryClient();

  const { data: categories } = useQuery({
    queryKey: ['/api/categories', company?.id],
    queryFn: () => apiRequest('GET', '/api/categories'),
    initialData: []
  });

  const createCategoryMutation = useMutation({
    mutationFn: (data) => apiRequest('POST', '/api/categories', data),
    onSuccess: (newCat) => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories', company?.id] });
      setFormData((prev) => ({ ...prev, category: newCat.name }));
      setIsCreateCategoryModalOpen(false);
      toast.success('Categoria criada!', { duration: 5000 });
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao criar categoria', { duration: 5000 });
    }
  });

  // No need to filter - use all categories
  const expenseCategories = categories;

  const createPurchaseMutation = useMutation({
    mutationFn: async (data) => {
      const payload = {
        supplierId: supplier.id,
        purchaseDate: data.purchase_date,
        totalAmount: String(data.total_amount),
        status: data.status,
        description: data.description,
        categoryId: categories.find(c => c.name === data.category)?.id,
        paymentMethod: data.paymentMethod,
        installmentCount: parseInt(data.installments) || 1,
        customInstallments: data.customInstallments
      };

      const res = await apiRequest('POST', '/api/purchases', payload);
      return res;
    },
    onSuccess: async () => {
      // Force immediate refetch (invalidation alone won't work with staleTime: Infinity)
      await queryClient.refetchQueries({ queryKey: ['/api/transactions', company?.id] });
      await queryClient.refetchQueries({ queryKey: ['/api/transactions'] });
      await queryClient.refetchQueries({ queryKey: ['/api/cash-flow'] });
      await queryClient.refetchQueries({ queryKey: ['/api/suppliers', company?.id] });
      toast.success('Compra registrada com sucesso!');
      setFormData({
        description: '',
        total_amount: '',
        category: '',
        purchase_date: format(new Date(), 'yyyy-MM-dd'),
        installments: 1,
        installment_amount: '',
        status: 'pendente',
        paymentMethod: ''
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao registrar compra');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.description.trim()) {
      toast.error('Digite uma descrição', { duration: 5000 });
      return;
    }
    if (!formData.total_amount || Number(formData.total_amount) <= 0) {
      toast.error('Digite um valor válido', { duration: 5000 });
      return;
    }
    if (!formData.category) {
      toast.error('Selecione uma categoria', { duration: 5000 });
      return;
    }

    if (!formData.paymentMethod) {
      toast.error('Selecione a forma de pagamento');
      return;
    }

    // Validate that category exists and is found
    const selectedCategory = categories.find(c => c.name === formData.category);
    if (!selectedCategory) {
      toast.error('Selecione uma categoria válida');
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

    createPurchaseMutation.mutate({
      ...formData,
      total_amount: Number(formData.total_amount),
      installments: Number(formData.installments),
      customInstallments: customInstallments.length > 0 ? customInstallments : null
    });
  };

  const handleInstallmentsChange = (value) => {
    const numValue = value === '' ? '1' : value;
    setFormData({ ...formData, installments: numValue, installment_amount: '' });

    // Initialize custom installments array
    const numInstallments = parseInt(numValue);
    if (numInstallments > 1) {
      const totalAmount = typeof formData.total_amount === 'string' 
        ? parseFloat(formData.total_amount.replace(/\./g, '').replace(',', '.'))
        : parseFloat(formData.total_amount);
      const defaultAmount = totalAmount / numInstallments;
      // Parse date in UTC to avoid timezone offset issues (UTC-3 São Paulo)
      const baseDate = new Date(formData.purchase_date + 'T12:00:00Z');
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
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Compra - {supplier?.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Descrição da Compra</Label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Ex: Matéria-prima..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Forma de Pagamento</Label>
            <Select 
              value={formData.paymentMethod} 
              onValueChange={(v) => {
                const canInstall = ['Cartão de Crédito', 'Boleto', 'Crediário'].includes(v);
                setFormData(prev => ({
                  ...prev, 
                  paymentMethod: v,
                  status: (v === 'Pix' || v === 'Dinheiro' || v === 'Cartão de Débito') ? 'pago' : prev.status,
                  installments: canInstall ? prev.installments : 1
                }));
              }}
            >
              <SelectTrigger className="w-full" required>
                <SelectValue placeholder="Selecione a forma..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                <SelectItem value="Pix">Pix</SelectItem>
                <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
                <SelectItem value="Cartão de Débito">Cartão de Débito</SelectItem>
                <SelectItem value="Boleto">Boleto</SelectItem>
                <SelectItem value="Crediário">Crediário</SelectItem>
                <SelectItem value="Transferência">Transferência</SelectItem>
                <SelectItem value="Outros">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900 border border-emerald-200 dark:border-emerald-700">
            <Label className="cursor-pointer">Pago à Vista</Label>
            <Switch 
              checked={formData.status === 'pago'}
              onCheckedChange={(checked) => {
                setFormData({
                  ...formData, 
                  status: checked ? 'pago' : 'pendente',
                  paymentDate: checked ? format(new Date(), 'yyyy-MM-dd') : null,
                  installments: checked ? 1 : formData.installments
                });
                if (checked) {
                  setCustomInstallments([]);
                }
              }}
              disabled={['Pix', 'Dinheiro', 'Cartão de Débito'].includes(formData.paymentMethod)}
            />
          </div>

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

          {formData.status !== 'pago' && (
            <div className="space-y-2">
              <Label>Número de Parcelas</Label>
              <Input
                type="number"
                min="1"
                value={formData.installments}
                onChange={(e) => handleInstallmentsChange(e.target.value)}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data da Compra</Label>
              <Input
                type="date"
                value={formData.purchase_date}
                onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                required
              />
            </div>
            {formData.status === 'pago' ? (
              <div className="space-y-2">
                <Label>Data do Pagamento</Label>
                <Input
                  type="date"
                  value={formData.paymentDate}
                  onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                  required
                />
              </div>
            ) : (
              parseInt(formData.installments) === 1 && (
                <div className="space-y-2">
                  <Label>Data de Vencimento</Label>
                  <Input
                    type="date"
                    value={formData.purchase_date}
                    onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                    required
                  />
                </div>
              )
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <div className="flex gap-2">
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger className="flex-1" required>
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

          {formData.status !== 'pago' && Number(formData.installments) > 1 && customInstallments.length === 0 && (
            <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-600 mt-6">
              <p>
                {formData.installment_amount && !isNaN(parseFloat(formData.installment_amount))
                  ? `${formData.installments}x de R$ ${formatCurrency(formData.installment_amount)}`
                  : (() => {
                      const total = typeof formData.total_amount === 'string' 
                        ? parseFloat(formData.total_amount.replace(/\./g, '').replace(',', '.'))
                        : parseFloat(formData.total_amount || 0);
                      const perInstallment = total / Number(formData.installments || 1);
                      return `${formData.installments}x de R$ ${formatCurrency(perInstallment)}`;
                    })()
                }
              </p>
            </div>
          )}

          {formData.status !== 'pago' && customInstallments.length > 1 && (
            <div className="space-y-3 mt-6">
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
              <div className="max-h-72 overflow-y-auto space-y-3 border rounded-lg p-3 bg-slate-50">
                {customInstallments.map((inst, idx) => (
                  <div key={idx} className="bg-white p-3 rounded border space-y-3">
                    <div className="text-sm font-medium text-slate-600">
                      Parcela {idx + 1}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-600 text-sm">R$</span>
                        <CurrencyInput
                          placeholder="Valor"
                          value={inst.amount}
                          onChange={(e) => updateCustomInstallment(idx, 'amount', e.target.value)}
                          className="text-sm flex-1"
                        />
                      </div>
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