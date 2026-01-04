import { InvokeLLM, UploadFile, ExtractDataFromUploadedFile } from '@/api/integrations';
import React, { useState } from 'react';
import { Category } from '@/api/entities';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { CurrencyInput, formatCurrency, parseCurrency } from "@/components/ui/currency-input";
import { Switch } from "@/components/ui/switch";
import CreateCategoryModal from './CreateCategoryModal';
import { useAuth } from '@/contexts/AuthContext';
import { Customer, Supplier } from '@/api/entities';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function TransactionForm({ open, onOpenChange, onSubmit, initialData = null }) {
  const { company } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateCategoryModalOpen, setIsCreateCategoryModalOpen] = useState(false);
  const [isSuggestingCategory, setIsSuggestingCategory] = useState(false);
  const [customInstallments, setCustomInstallments] = useState([]);

  const [formData, setFormData] = React.useState({
    description: '',
    amount: '',
    type: 'venda',
    categoryId: '',
    date: new Date(),
    installments: 1,
    installment_amount: '',
    status: 'pago',
    paymentDate: new Date(),
    paymentMethod: '',
    entityType: 'none',
    customerId: '',
    supplierId: ''
  });

  // Fetch Categories, Customers, Suppliers
  const { data: categories } = useQuery({
    queryKey: ['/api/categories', company?.id],
    queryFn: () => Category.list(),
    initialData: []
  });

  const { data: customers } = useQuery({
    queryKey: ['/api/customers', company?.id],
    queryFn: () => Customer.list(),
    enabled: !!company?.id,
    initialData: []
  });

  const { data: suppliers } = useQuery({
    queryKey: ['/api/suppliers', company?.id],
    queryFn: () => Supplier.list(),
    enabled: !!company?.id,
    initialData: []
  });

  const createCategoryMutation = useMutation({
    mutationFn: (data) => Category.create(data),
    onSuccess: (newCat) => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories', company?.id] });
      setFormData((prev) => ({ ...prev, categoryId: newCat.id }));
      setIsCreateCategoryModalOpen(false);
      toast.success('Categoria criada!');
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao criar categoria');
    }
  });

  React.useEffect(() => {
    if (open) {
      if (initialData) {
        // First try to use categoryId directly, then find by name
        let categoryId = initialData.categoryId;
        let selectedCategory = categories.find(c => c.id === categoryId);

        // If no categoryId match found, try matching by category name
        if (!selectedCategory && initialData.category) {
          selectedCategory = categories.find(c => c.name.toLowerCase() === (initialData.category || '').toLowerCase());
          categoryId = selectedCategory?.id || '';
        }

        // If still no category, try to find by ID as string
        if (!selectedCategory && initialData.categoryId) {
          selectedCategory = categories.find(c => c.id === initialData.categoryId);
        }

        // Try to get amount from either amount or paidAmount (fallback)
        let amountValue = parseFloat(initialData.amount) || parseFloat(initialData.paidAmount) || 0;
        amountValue = Math.abs(amountValue);

        // Determine entity type from saved data
        let entityType = 'none';
        let customerId = '';
        let supplierId = '';

        if (initialData.customerId) {
          entityType = 'customer';
          customerId = initialData.customerId;
        } else if (initialData.supplierId) {
          entityType = 'supplier';
          supplierId = initialData.supplierId;
        }

        // Get payment date
        let paymentDate = null;
        if (initialData.paymentDate) {
          paymentDate = new Date(initialData.paymentDate);
        }

        setFormData({
          ...initialData,
          categoryId: categoryId || initialData.categoryId || '',
          type: initialData.type || (selectedCategory?.type === 'entrada' ? 'venda' : 'compra'),
          date: new Date(initialData.date),
          amount: amountValue > 0 ? amountValue.toString() : '',
          entityType: entityType,
          customerId: customerId,
          supplierId: supplierId,
          paymentDate: paymentDate
        });

        // If this is a parcelada transaction, load the custom installments
        // (This would come from parent component with all installments data)
        setCustomInstallments([]);
      } else {
        // Pre-select first category when opening new transaction form
        const defaultCategoryId = categories.length > 0 ? categories[0].id : '';
        setFormData({
          description: '',
          amount: '',
          type: 'venda',
          categoryId: defaultCategoryId,
          date: new Date(),
          installments: 1,
          installment_amount: '',
          status: 'pago',
          paymentDate: new Date(),
          entityType: 'none',
          customerId: '',
          supplierId: ''
        });
        setCustomInstallments([]);
      }
    }
  }, [initialData, open, categories]);

  const handleInstallmentsChange = (value) => {
    const numValue = value === '' ? 1 : parseInt(value);
    setFormData({ ...formData, installments: numValue, installment_amount: '' });

    if (numValue > 1) {
      const totalAmount = parseFloat(formData.amount) || 0;
      const defaultAmount = totalAmount > 0 ? (totalAmount / numValue).toFixed(2) : '';

      // Extract local date from formData.date (which might be Date or string)
      let baseDate;
      if (typeof formData.date === 'string') {
        // If it's a string like "2025-12-23", parse it correctly
        const [year, month, day] = formData.date.split('-');
        baseDate = new Date(year, parseInt(month) - 1, parseInt(day));
      } else {
        baseDate = new Date(formData.date);
      }
      
      // Fix: Ensure we use the correct local day for calculation to avoid timezone shift
      const dayOfMonth = baseDate.getDate();
      const monthIdx = baseDate.getMonth();
      const yearVal = baseDate.getFullYear();

      const newCustomInstallments = Array.from({ length: numValue }, (_, i) => {
        // Use local date constructor to avoid UTC shift
        const installmentDate = new Date(yearVal, monthIdx + i, dayOfMonth);
        const year = installmentDate.getFullYear();
        const month = String(installmentDate.getMonth() + 1).padStart(2, '0');
        const day = String(installmentDate.getDate()).padStart(2, '0');
        return {
          amount: defaultAmount,
          due_date: `${year}-${month}-${day}`
        };
      });
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.description.trim()) {
        toast.error('Digite uma descrição', { duration: 5000 });
        return;
    }
    if (!formData.amount || Number(formData.amount) <= 0) {
        toast.error('Digite um valor válido', { duration: 5000 });
        return;
    }
    if (!formData.categoryId) {
        toast.error('Selecione uma categoria', { duration: 5000 });
        return;
    }
    if (formData.entityType === 'none') {
        toast.error('Escolha entre Cliente ou Fornecedor', { duration: 5000 });
        return;
    }
    if (formData.entityType === 'customer' && !formData.customerId) {
        toast.error('Selecione um cliente', { duration: 5000 });
        return;
    }
    if (formData.entityType === 'supplier' && !formData.supplierId) {
        toast.error('Selecione um fornecedor', { duration: 5000 });
        return;
    }

    if (!formData.paymentMethod) {
        toast.error('Selecione a forma de pagamento', { duration: 5000 });
        return;
    }

    // Get selected category to determine if value should be negative
    const selectedCategory = categories.find(c => c.id === formData.categoryId);
    let amount = Number(formData.amount).toFixed(2);

    // If category is "saida" (expense), make amount negative
    if (selectedCategory && selectedCategory.type === 'saida') {
      amount = (-Math.abs(Number(amount))).toFixed(2);
    } else {
      amount = Math.abs(Number(amount)).toFixed(2);
    }

    // Helper to convert Date to YYYY-MM-DD format (local date, no timezone)
    const formatDateOnly = (dateObj) => {
      if (!dateObj) return null;
      const d = new Date(dateObj);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    let isoDate = formatDateOnly(formData.date);

    let paymentDateISO = formatDateOnly(formData.paymentDate);

    // Handle installments
    const installmentCount = formData.installments || 1;
    if (installmentCount > 1) {
      // Create multiple transactions for installments
      const installmentGroupId = `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const transactions = [];
      for (let i = 0; i < installmentCount; i++) {
        let dueDateISO;

        // ALWAYS use customInstallments if they exist (user may have edited dates)
        if (customInstallments.length > 0 && customInstallments[i]?.due_date) {
          // due_date is already in YYYY-MM-DD format, just use it directly
          dueDateISO = customInstallments[i].due_date;
        } else if (customInstallments.length > i) {
          // If customInstallments exist but due_date is missing, calculate it
          const baseDate = new Date(formData.date);
          const dueDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, baseDate.getDate());
          dueDateISO = formatDateOnly(dueDate);
        } else {
          // Fallback: calculate from transaction date
          const baseDate = new Date(formData.date);
          const dueDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, baseDate.getDate());
          dueDateISO = formatDateOnly(dueDate);
        }

        const installmentAmount = customInstallments.length > i 
          ? parseFloat(customInstallments[i].amount) 
          : parseFloat(amount) / installmentCount;

        const payload = {
          categoryId: formData.categoryId,
          amount: installmentAmount.toFixed(2),
          date: dueDateISO,
          paymentDate: paymentDateISO,
          shift: 'turno1',
          type: formData.type,
          description: formData.description,
          status: formData.status,
          paymentMethod: formData.paymentMethod,
          installmentGroup: installmentGroupId,
          installmentNumber: i + 1,
          installmentTotal: installmentCount
        };

        // Only add customer/supplier if selected
        if (formData.entityType === 'customer' && formData.customerId) {
          payload.customerId = formData.customerId;
        }
        if (formData.entityType === 'supplier' && formData.supplierId) {
          payload.supplierId = formData.supplierId;
        }

        transactions.push(payload);
      }
      onSubmit(transactions);
      
      // Invalidate queries to update UI in real-time
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cash-flow'] });
      if (formData.customerId) {
        queryClient.invalidateQueries({ queryKey: ['/api/customers', company?.id] });
      }
      if (formData.supplierId) {
        queryClient.invalidateQueries({ queryKey: ['/api/suppliers', company?.id] });
      }
    } else {
      const payload = {
        categoryId: formData.categoryId,
        amount: amount,
        date: isoDate,
        paymentDate: paymentDateISO,
        shift: 'Geral',
        type: formData.type,
        description: formData.description,
        status: formData.status,
        paymentMethod: formData.paymentMethod
      };

      // Only add customer/supplier if selected and has value
      if (formData.entityType === 'customer' && formData.customerId) {
        payload.customerId = formData.customerId;
      } else if (formData.entityType === 'customer') {
        console.warn('Customer selected but no customerId provided');
      }

      if (formData.entityType === 'supplier' && formData.supplierId) {
        payload.supplierId = formData.supplierId;
      } else if (formData.entityType === 'supplier') {
        console.warn('Supplier selected but no supplierId provided');
      }

      onSubmit(payload);
      
      // Invalidate queries to update UI in real-time
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cash-flow'] });
      if (formData.customerId) {
        queryClient.invalidateQueries({ queryKey: ['/api/customers', company?.id] });
      }
      if (formData.supplierId) {
        queryClient.invalidateQueries({ queryKey: ['/api/suppliers', company?.id] });
      }
    }
  };


  const suggestCategory = async () => {
    if (!formData.description.trim() || categories.length === 0) {
      toast.error('Digite uma descrição primeiro', { duration: 5000 });
      return;
    }

    setIsSuggestingCategory(true);
    try {
      const categoryNames = categories.map(c => c.name).join(', ');
      const prompt = `Baseado na descrição "${formData.description}" e no tipo "${formData.type === 'venda' ? 'receita' : 'despesa'}", 
      sugira a categoria mais apropriada dentre as seguintes: ${categoryNames}.
      Retorne apenas o nome exato da categoria, nada mais.`;

      const response = await InvokeLLM(prompt);

      const suggestedCategory = response.toLowerCase().trim();
      const matchingCategory = categories.find(c => c.name.toLowerCase() === suggestedCategory);

      if (matchingCategory) {
        const newType = matchingCategory.type === 'entrada' ? 'venda' : 'compra';
        setFormData({ ...formData, categoryId: matchingCategory.id, type: newType });
        toast.success('Categoria sugerida aplicada!', { duration: 5000 });
      } else {
        toast.error('Não foi possível sugerir uma categoria apropriada', { duration: 5000 });
      }
    } catch (error) {
      toast.error('Erro ao sugerir categoria', { duration: 5000 });
    } finally {
      setIsSuggestingCategory(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Editar Transação' : 'Nova Transação'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">

          <div className="space-y-2">
            <Label>Cliente ou Fornecedor</Label>
            <Select 
              value={formData.entityType || 'none'} 
              onValueChange={(v) => setFormData({...formData, entityType: v, customerId: '', supplierId: '', type: v === 'customer' ? 'venda' : 'compra'})}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                <SelectItem value="customer">Cliente</SelectItem>
                <SelectItem value="supplier">Fornecedor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.entityType === 'customer' && (
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select 
                value={formData.customerId || ''} 
                onValueChange={(v) => setFormData({...formData, customerId: v})}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione um cliente..." />
                </SelectTrigger>
                <SelectContent>
                  {customers && customers.length > 0 ? (
                    customers.map((cust) => (
                      <SelectItem key={cust.id} value={cust.id}>
                        {cust.name}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-sm text-muted-foreground text-center">Nenhum cliente cadastrado</div>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {formData.entityType === 'supplier' && (
            <div className="space-y-2">
              <Label>Fornecedor</Label>
              <Select 
                value={formData.supplierId || ''} 
                onValueChange={(v) => setFormData({...formData, supplierId: v})}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione um fornecedor..." />
                </SelectTrigger>
                <SelectContent>
                  {suppliers && suppliers.length > 0 ? (
                    suppliers.map((supp) => (
                      <SelectItem key={supp.id} value={supp.id}>
                        {supp.name}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-sm text-muted-foreground text-center">Nenhum fornecedor cadastrado</div>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Valor (R$)</Label>
            <CurrencyInput 
              value={formData.amount ? parseFloat(formData.amount) : ''}
              onChange={(e) => {
                setFormData({...formData, amount: e.target.value.toString()})
              }}
              placeholder="0,00"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Input 
              placeholder="Ex: Venda de Produto X" 
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <div className="flex gap-2">
                <Select 
                    value={formData.categoryId} 
                    onValueChange={(v) => {
                      const selectedCat = categories.find(c => c.id === v);
                      const newType = selectedCat?.type === 'entrada' ? 'venda' : 'compra';
                      setFormData({...formData, categoryId: v, type: newType});
                    }}
                >
                    <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                        {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                                {cat.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Button 
                    type="button" 
                    variant="outline" 
                    size="icon" 
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
                formData.type === 'venda' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
              }`}>
                {formData.type === 'venda' ? '+ Receita' : '- Despesa'}
              </div>
            </div>
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
                  paymentDate: checked ? new Date() : null,
                  installments: checked ? 1 : formData.installments
                });
                if (checked) {
                  setCustomInstallments([]);
                }
              }}
              disabled={['Pix', 'Dinheiro', 'Cartão de Débito'].includes(formData.paymentMethod)}
            />
          </div>

          {formData.status !== 'pago' && (
            <>
              <div className="space-y-2">
                <Label>Número de Parcelas</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.installments}
                  onChange={(e) => handleInstallmentsChange(e.target.value)}
                />
              </div>

              {Number(formData.installments) > 1 && customInstallments.length === 0 && (
                <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-600">
                  <p>
                    {formData.installment_amount && !isNaN(parseFloat(formData.installment_amount))
                      ? `${formData.installments}x de R$ ${formatCurrency(formData.installment_amount)}`
                      : `${formData.installments}x de R$ ${formatCurrency((parseFloat(formData.amount || 0) / Number(formData.installments || 1)))}`
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
                      <div key={idx} className="bg-white p-2 rounded border space-y-2">
                        <div className="text-sm font-medium text-slate-600">
                          Parcela {idx + 1}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex items-center gap-1">
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
                          Math.abs(customInstallments.reduce((sum, inst) => sum + parseFloat(inst.amount || 0), 0) - parseFloat(formData.amount || 0)) < 0.01
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
            </>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{formData.status === 'pago' ? 'Data da Transação' : (parseInt(formData.installments) === 1 ? 'Data de Vencimento' : 'Data da Transação')}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.date ? format(formData.date, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.date instanceof Date ? formData.date : new Date(formData.date)}
                    onSelect={(date) => setFormData({ ...formData, date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {formData.status === 'pago' && (
              <div className="space-y-2">
                <Label>Data do Pagamento</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.paymentDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.paymentDate ? format(formData.paymentDate, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.paymentDate instanceof Date ? formData.paymentDate : (formData.paymentDate ? new Date(formData.paymentDate) : new Date())}
                      onSelect={(date) => setFormData({ ...formData, paymentDate: date })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary">
              {initialData ? 'Atualizar' : 'Salvar'}
            </Button>
          </div>
        </form>

        <CreateCategoryModal 
          open={isCreateCategoryModalOpen}
          onOpenChange={setIsCreateCategoryModalOpen}
          onSubmit={(data) => createCategoryMutation.mutate(data)}
          isLoading={createCategoryMutation.isPending}
        />
      </DialogContent>
    </Dialog>
  );
}