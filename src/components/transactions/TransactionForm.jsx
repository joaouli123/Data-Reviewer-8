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
import { CalendarIcon, Plus, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { CurrencyInput, formatCurrency, parseCurrency } from "@/components/ui/currency-input";
import { Switch } from "@/components/ui/switch";
import CreateCategoryModal from './CreateCategoryModal';
import { useAuth } from '@/contexts/AuthContext';
import { Customer, Supplier, ROLES } from '@/api/entities';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function TransactionForm({ open, onOpenChange, onSubmit, initialData = null }) {
  const { company, user } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateCategoryModalOpen, setIsCreateCategoryModalOpen] = useState(false);
  const [isSuggestingCategory, setIsSuggestingCategory] = useState(false);
  const [customInstallments, setCustomInstallments] = useState([]);

  // Use ROLES instead of direct strings to be safer
  const canEdit = user?.role === ROLES.ADMIN || user?.isSuperAdmin || (initialData ? user?.permissions?.edit_transactions : user?.permissions?.create_transactions);

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
        // ... (existing logic for initialData)
      } else {
        // Pre-select first appropriate category when opening new transaction form
        const filteredCats = categories.filter(cat => {
          if (formData.entityType === 'customer') return cat.type === 'entrada';
          if (formData.entityType === 'supplier') return cat.type === 'saida';
          return true;
        });
        const defaultCategoryId = filteredCats.length > 0 ? filteredCats[0].id : '';
        
        setFormData({
          description: '',
          amount: '',
          type: formData.entityType === 'customer' ? 'venda' : (formData.entityType === 'supplier' ? 'compra' : 'venda'),
          categoryId: defaultCategoryId,
          date: new Date(),
          installments: 1,
          installment_amount: '',
          status: 'pago',
          paymentDate: new Date(),
          entityType: formData.entityType || 'none',
          customerId: formData.customerId || '',
          supplierId: formData.supplierId || ''
        });
        setCustomInstallments([]);
      }
    }
  }, [initialData, open, categories, formData.entityType]);

  const handleInstallmentsChange = (value) => {
    const numValue = value === '' ? 1 : parseInt(value);
    setFormData({ ...formData, installments: numValue, installment_amount: '' });

    if (numValue > 1) {
      const totalAmount = parseFloat(formData.amount) || 0;
      const defaultAmount = totalAmount > 0 ? (totalAmount / numValue).toFixed(2) : '0.00';

      // Extract local date from formData.date (which might be Date or string)
      let baseDate;
      if (typeof formData.date === 'string') {
        const [year, month, day] = formData.date.split('-');
        baseDate = new Date(year, parseInt(month) - 1, parseInt(day));
      } else {
        baseDate = new Date(formData.date);
      }
      
      const dayOfMonth = baseDate.getDate();
      const monthIdx = baseDate.getMonth();
      const yearVal = baseDate.getFullYear();

      const newCustomInstallments = Array.from({ length: numValue }, (_, i) => {
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
    const numericAmount = parseFloat(formData.amount);
    let amount = numericAmount.toFixed(2);

    // If category is "saida" (expense), make amount negative
    if (selectedCategory && selectedCategory.type === 'saida') {
      amount = (-Math.abs(numericAmount)).toFixed(2);
    } else {
      amount = Math.abs(numericAmount).toFixed(2);
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

        {!canEdit ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center">
              <CalendarIcon className="w-8 h-8 text-rose-600" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-slate-900">Acesso Negado</h3>
              <p className="text-sm text-slate-500 max-w-[250px]">
                Você não tem permissão para {initialData ? 'editar' : 'criar'} transações no sistema.
              </p>
            </div>
          </div>
        ) : (
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
              value={formData.amount !== '' ? parseFloat(formData.amount) : ''}
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
                        {categories
                          .filter(cat => {
                            if (formData.entityType === 'customer') return cat.type === 'entrada';
                            if (formData.entityType === 'supplier') return cat.type === 'saida';
                            return true;
                          })
                          .map((cat) => (
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
            />
          </div>

          {formData.status !== 'pago' && (
            <div className="space-y-2">
              <Label>Número de Parcelas</Label>
              <Input 
                type="number" 
                min="1" 
                max="60"
                value={formData.installments}
                onChange={(e) => handleInstallmentsChange(e.target.value)}
              />
            </div>
          )}

          {customInstallments.length > 0 && (
            <div className="space-y-3 pt-2">
              <Label className="text-xs uppercase text-slate-500 font-bold">Detalhamento das Parcelas</Label>
              <div className="max-h-40 overflow-y-auto space-y-2 pr-2">
                {customInstallments.map((inst, idx) => (
                  <div key={idx} className="flex gap-2 items-center bg-slate-50 p-2 rounded border border-slate-200">
                    <span className="text-xs font-bold text-slate-400 w-6">{idx + 1}ª</span>
                    <div className="flex-1">
                      <CurrencyInput 
                        value={inst.amount}
                        onChange={(e) => updateCustomInstallment(idx, 'amount', e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="flex-1">
                      <Input 
                        type="date"
                        value={inst.due_date}
                        onChange={(e) => updateCustomInstallment(idx, 'due_date', e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>{formData.status === 'pago' ? 'Data do Pagamento' : 'Data de Vencimento'}</Label>
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
                  selected={formData.date}
                  onSelect={(date) => setFormData({...formData, date: date || new Date()})}
                  initialFocus
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>

          <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
            {initialData ? 'Atualizar Transação' : 'Criar Transação'}
          </Button>
          </form>
        )}
      </DialogContent>
      <CreateCategoryModal 
        open={isCreateCategoryModalOpen}
        onOpenChange={setIsCreateCategoryModalOpen}
        onSubmit={(data) => createCategoryMutation.mutate(data)}
      />
    </Dialog>
  );
}
