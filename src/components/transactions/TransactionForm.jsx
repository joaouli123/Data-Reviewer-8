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
import { format, addMonths, addDays, startOfDay } from "date-fns";
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
import { apiRequest } from '@/lib/queryClient';

const parseLocalDateString = (value) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const str = String(value).trim();
  if (!str) return null;

  const ymdMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymdMatch) {
    const year = Number(ymdMatch[1]);
    const month = Number(ymdMatch[2]);
    const day = Number(ymdMatch[3]);
    const d = new Date(year, month - 1, day, 12, 0, 0, 0);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const dmyMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (dmyMatch) {
    const day = Number(dmyMatch[1]);
    const month = Number(dmyMatch[2]);
    const year = Number(dmyMatch[3]);
    const d = new Date(year, month - 1, day, 12, 0, 0, 0);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const parsed = new Date(str);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export default function TransactionForm({ open, onOpenChange, onSubmit, initialData = null }) {
  const { company, user } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateCategoryModalOpen, setIsCreateCategoryModalOpen] = useState(false);
  const [isSuggestingCategory, setIsSuggestingCategory] = useState(false);
  const [customInstallments, setCustomInstallments] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [installmentsInput, setInstallmentsInput] = useState('1');

  const updateInstallmentDatesMutation = useMutation({
    mutationFn: ({ installmentGroup, newFirstDate }) => apiRequest('PATCH', `/api/transactions/group/${installmentGroup}/dates`, { newFirstDate }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cash-flow'] });
      toast.success('Vencimentos das parcelas atualizados!');
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao atualizar vencimentos');
    }
  });

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
    supplierId: '',
    hasCardFee: false,
    cardFee: ''
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
    if (!open) return;

    const toDate = (value) => {
      if (!value) return null;
      return parseLocalDateString(value);
    };

    if (initialData) {
      const rawAmount = parseFloat(initialData.amount || 0);
      const normalizedAmount = Math.abs(rawAmount).toFixed(2);
      const inferredEntityType = initialData.customerId
        ? 'customer'
        : initialData.supplierId
        ? 'supplier'
        : 'none';

      const baseDate = toDate(initialData.date) || new Date();
      const paymentDate = toDate(initialData.paymentDate);
      const inferredStatus = initialData.status
        || (paymentDate ? 'pago' : 'pendente');

      setFormData({
        description: initialData.description || '',
        amount: normalizedAmount,
        type: initialData.type || (inferredEntityType === 'supplier' ? 'compra' : 'venda'),
        categoryId: initialData.categoryId || '',
        date: baseDate,
        installments: 1,
        installment_amount: '',
        status: inferredStatus,
        paymentDate: paymentDate || (inferredStatus === 'pago' ? baseDate : null),
        paymentMethod: initialData.paymentMethod || '',
        entityType: inferredEntityType,
        customerId: initialData.customerId || '',
        supplierId: initialData.supplierId || '',
        hasCardFee: initialData.hasCardFee || false,
        cardFee: initialData.cardFee || ''
      });
      setInstallmentsInput('1');
      setCustomInstallments([]);
      return;
    }

    setFormData(prev => ({
      ...prev,
      description: '',
      amount: '',
      type: prev.entityType === 'customer' ? 'venda' : (prev.entityType === 'supplier' ? 'compra' : 'venda'),
      categoryId: '',
      date: new Date(),
      installments: 1,
      installment_amount: '',
      status: 'pago',
      paymentDate: new Date(),
      entityType: prev.entityType || 'none',
      customerId: prev.customerId || '',
      supplierId: prev.supplierId || '',
      hasCardFee: false,
      cardFee: ''
    }));
    setCustomInstallments([]);
  }, [initialData, open]);

  React.useEffect(() => {
    setInstallmentsInput(String(formData.installments || '1'));
  }, [formData.installments]);

  const applyInstallments = (numValue) => {
    const safeValue = Math.max(1, Math.min(60, Number(numValue) || 1));
    const newStatus = safeValue > 1 ? 'pendente' : formData.status;

    // Regra: ao parcelar (>1), a 1ª parcela SEMPRE começa em +30 dias (nova transação)
    let nextDueDate = formData.date;
    if (safeValue > 1 && !initialData) {
      // Sempre +30 dias para parcelamento novo
      nextDueDate = addDays(new Date(), 30);
    }

    setFormData(prev => ({
      ...prev,
      date: nextDueDate,
      installments: safeValue,
      installment_amount: '',
      status: newStatus,
      paymentDate: newStatus === 'pendente' ? null : prev.paymentDate,
    }));

    if (safeValue > 1) {
      const totalAmount = parseCurrency(formData.amount);
      const defaultAmount = totalAmount > 0 ? (totalAmount / safeValue).toFixed(2) : '0.00';
      const baseDate = nextDueDate ? new Date(nextDueDate) : new Date();
      const dayOfMonth = baseDate.getDate();
      const monthIdx = baseDate.getMonth();
      const yearVal = baseDate.getFullYear();

      const newCustomInstallments = Array.from({ length: safeValue }, (_, i) => {
        const installmentDate = new Date(yearVal, monthIdx + i, dayOfMonth);
        const year = installmentDate.getFullYear();
        const month = String(installmentDate.getMonth() + 1).padStart(2, '0');
        const day = String(installmentDate.getDate()).padStart(2, '0');
        return {
          amount: defaultAmount,
          due_date: `${year}-${month}-${day}`,
        };
      });
      setCustomInstallments(newCustomInstallments);
    } else {
      setCustomInstallments([]);
    }
  };

  const handleInstallmentsChange = (raw) => {
    setInstallmentsInput(raw);
    const cleaned = String(raw).replace(/[^0-9]/g, '');
    if (!cleaned) return;
    const parsed = Number(cleaned);
    if (!Number.isFinite(parsed)) return;
    applyInstallments(parsed);
  };

  const updateCustomInstallment = (index, field, value) => {
    const updated = [...customInstallments];
    updated[index] = { ...updated[index], [field]: value };
    
    // Se alterou a data da PRIMEIRA parcela, recalcular todas as outras
    if (field === 'due_date' && index === 0 && customInstallments.length > 1) {
      const newBaseDate = new Date(value + 'T12:00:00');
      const dayOfMonth = newBaseDate.getDate();
      const monthIdx = newBaseDate.getMonth();
      const yearVal = newBaseDate.getFullYear();
      
      for (let i = 1; i < updated.length; i++) {
        const installmentDate = new Date(yearVal, monthIdx + i, dayOfMonth);
        const year = installmentDate.getFullYear();
        const month = String(installmentDate.getMonth() + 1).padStart(2, '0');
        const day = String(installmentDate.getDate()).padStart(2, '0');
        updated[i] = { ...updated[i], due_date: `${year}-${month}-${day}` };
      }
      toast.info('Datas das parcelas atualizadas automaticamente', { duration: 3000 });
    }
    
    setCustomInstallments(updated);
  };

  const formatDateOnly = (dateObj) => {
    if (!dateObj) return null;
    const d = new Date(dateObj);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!formData.description.trim()) {
      toast.error('Digite uma descrição', { duration: 5000 });
      return;
    }

    const numericAmount = parseCurrency(formData.amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      toast.error('Digite um valor válido', { duration: 5000 });
      return;
    }

    if (!formData.categoryId) {
      toast.error('Selecione uma categoria', { duration: 5000 });
      return;
    }

    if (!formData.paymentMethod) {
      toast.error('Selecione a forma de pagamento', { duration: 5000 });
      return;
    }

    if (formData.status === 'pago') {
      if (!formData.paymentDate) {
        toast.error('Selecione a data do pagamento', { duration: 5000 });
        return;
      }
    } else {
      if (!formData.date) {
        toast.error('Selecione uma data de vencimento', { duration: 5000 });
        return;
      }
    }

    const selectedCategory = categories.find(c => c.id === formData.categoryId);
    const isExpense = selectedCategory && (selectedCategory.type === 'saida' || selectedCategory.type === 'expense');
    const signedAmount = isExpense
      ? (-Math.abs(numericAmount)).toFixed(2)
      : Math.abs(numericAmount).toFixed(2);

    const effectiveTxDate = formData.status === 'pago'
      ? (formData.paymentDate || formData.date)
      : formData.date;

    const isoDate = formatDateOnly(effectiveTxDate);

    const paymentDateISO = formData.status === 'pago'
      ? formatDateOnly(formData.paymentDate || formData.date)
      : null;

    if (!isoDate) {
      toast.error('Selecione uma data válida', { duration: 5000 });
      return;
    }

    // Handle installments
    const installmentCount = Number(formData.installments || 1);
    if (installmentCount > 1) {
      // Preenche customInstallments se estiver vazio ou incompleto
      let filledCustomInstallments = customInstallments.slice();
      if (filledCustomInstallments.length < installmentCount) {
        const baseDate = new Date(formData.date);
        const defaultInstallmentAmount = (Math.abs(parseFloat(signedAmount)) / installmentCount).toFixed(2);
        for (let i = filledCustomInstallments.length; i < installmentCount; i++) {
          const dueDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, baseDate.getDate());
          filledCustomInstallments.push({
            amount: defaultInstallmentAmount,
            due_date: formatDateOnly(dueDate)
          });
        }
      }

      const installmentGroupId = `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const transactions = [];
      for (let i = 0; i < installmentCount; i++) {
        const dueDateISO = filledCustomInstallments[i].due_date;
        const rawInstallmentAmount = parseCurrency(filledCustomInstallments[i].amount);
        const signedInstallmentAmount = isExpense
          ? -Math.abs(rawInstallmentAmount)
          : Math.abs(rawInstallmentAmount);

        const payload = {
          categoryId: formData.categoryId,
          amount: Number.isFinite(signedInstallmentAmount) ? signedInstallmentAmount.toFixed(2) : '0.00',
          date: dueDateISO,
          paymentDate: paymentDateISO,
          shift: 'turno1',
          type: formData.type,
          description: formData.description,
          status: formData.status,
          paymentMethod: formData.paymentMethod,
          installmentGroup: installmentGroupId,
          installmentNumber: i + 1,
          installmentTotal: installmentCount,
          hasCardFee: formData.hasCardFee,
          cardFee: formData.hasCardFee ? (parseFloat(formData.cardFee) || 0).toFixed(2) : '0'
        };
        if (formData.entityType === 'customer' && formData.customerId) {
          payload.customerId = formData.customerId;
        }
        if (formData.entityType === 'supplier' && formData.supplierId) {
          payload.supplierId = formData.supplierId;
        }
        transactions.push(payload);
      }

      setIsSubmitting(true);
      try {
        const result = onSubmit(transactions);
        Promise.resolve(result).finally(() => setIsSubmitting(false));
      } catch (error) {
        setIsSubmitting(false);
      }
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cash-flow'] });
      if (formData.customerId) {
        queryClient.invalidateQueries({ queryKey: ['/api/customers', company?.id] });
      }
      if (formData.supplierId) {
        queryClient.invalidateQueries({ queryKey: ['/api/suppliers', company?.id] });
      }
      return;
    }

    const payload = {
      categoryId: formData.categoryId,
      amount: signedAmount,
      date: isoDate,
      paymentDate: paymentDateISO,
      shift: 'Geral',
      type: formData.type,
      description: formData.description,
      status: formData.status,
      paymentMethod: formData.paymentMethod,
      hasCardFee: formData.hasCardFee,
      cardFee: formData.hasCardFee ? (parseFloat(formData.cardFee) || 0).toFixed(2) : '0'
    };

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

    setIsSubmitting(true);
    try {
      const result = onSubmit(payload);
      Promise.resolve(result).finally(() => setIsSubmitting(false));
    } catch (error) {
      setIsSubmitting(false);
    }
    
    // Invalidate queries to update UI in real-time
    queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
    queryClient.invalidateQueries({ queryKey: ['/api/cash-flow'] });
    if (formData.customerId) {
      queryClient.invalidateQueries({ queryKey: ['/api/customers', company?.id] });
    }
    if (formData.supplierId) {
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers', company?.id] });
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
                            if (formData.entityType === 'customer') return cat.type === 'entrada' || cat.type === 'income';
                            if (formData.entityType === 'supplier') return cat.type === 'saida' || cat.type === 'expense';
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
                const isCardPayment = ['Cartão de Crédito', 'Cartão de Débito'].includes(v);
                const isPaidImmediately = ['Pix', 'Dinheiro', 'Cartão de Débito'].includes(v);
                const isPendingPayment = ['Cartão de Crédito', 'Boleto', 'Crediário'].includes(v);

                  if (!canInstall) {
                    setInstallmentsInput('1');
                  }
                
                setFormData(prev => {
                  // Determina o novo status
                  let newStatus = prev.status;
                  if (isPaidImmediately) {
                    newStatus = 'pago';
                  } else if (isPendingPayment) {
                    newStatus = 'pendente';
                  }
                  
                  return {
                    ...prev, 
                    paymentMethod: v,
                    status: newStatus,
                    paymentDate: newStatus === 'pago' ? (prev.paymentDate || new Date()) : null,
                    installments: canInstall ? prev.installments : 1,
                    hasCardFee: isCardPayment ? prev.hasCardFee : false,
                    cardFee: isCardPayment ? prev.cardFee : ''
                  };
                });
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

          {/* Campo de Taxa de Cartão - só aparece para Débito e Crédito à vista */}
          {['Cartão de Crédito', 'Cartão de Débito'].includes(formData.paymentMethod) && (
            <div className="space-y-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700">
              <div className="flex items-center justify-between">
                <Label className="cursor-pointer text-amber-800 dark:text-amber-200">
                  Aplicar taxa de cartão?
                </Label>
                <Switch 
                  checked={formData.hasCardFee}
                  onCheckedChange={(checked) => {
                    setFormData(prev => ({
                      ...prev, 
                      hasCardFee: checked,
                      cardFee: checked ? prev.cardFee : ''
                    }));
                  }}
                />
              </div>
              
              {formData.hasCardFee && (
                <div className="space-y-2">
                  <Label className="text-xs text-amber-700 dark:text-amber-300">
                    Taxa (%) - Ex: 2.99 para 2,99%
                  </Label>
                  <div className="flex gap-2 items-center">
                    <Input 
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      placeholder="0.00"
                      value={formData.cardFee}
                      onChange={(e) => setFormData(prev => ({...prev, cardFee: e.target.value}))}
                      className="flex-1"
                    />
                    <span className="text-sm font-medium text-amber-700 dark:text-amber-300">%</span>
                  </div>
                  {formData.amount && formData.cardFee && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Valor da taxa: R$ {((parseFloat(formData.amount) * parseFloat(formData.cardFee)) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      {' • '}
                      Valor líquido: R$ {(parseFloat(formData.amount) - ((parseFloat(formData.amount) * parseFloat(formData.cardFee)) / 100)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

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
                  setInstallmentsInput('1');
                  setCustomInstallments([]);
                }
              }}
            />
          </div>

          {formData.status !== 'pago' && (
            <div className="space-y-2">
              <Label>Número de Parcelas</Label>
              <Input 
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="1"
                value={installmentsInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setInstallmentsInput(val);
                  const cleaned = val.replace(/[^0-9]/g, '');
                  if (cleaned) {
                    const parsed = Math.max(1, Math.min(60, Number(cleaned) || 1));
                    applyInstallments(parsed);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Delete' || e.key === 'Backspace') {
                    // Permite limpar normalmente
                  }
                }}
                onBlur={() => {
                  const cleaned = String(installmentsInput).replace(/[^0-9]/g, '');
                  if (!cleaned || cleaned === '0') {
                    setInstallmentsInput('1');
                    applyInstallments(1);
                  } else {
                    const parsed = Math.max(1, Math.min(60, Number(cleaned)));
                    setInstallmentsInput(String(parsed));
                  }
                }}
                className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <p className="text-xs text-muted-foreground">Digite o número de parcelas (use Delete/Backspace para apagar)</p>
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
                        onKeyDown={(e) => {
                          if (e.key === 'Delete' || e.key === 'Backspace') {
                            e.preventDefault();
                            updateCustomInstallment(idx, 'due_date', '');
                          }
                        }}
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
                    !(formData.status === 'pago' ? formData.paymentDate : formData.date) && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.status === 'pago'
                    ? (formData.paymentDate ? format(formData.paymentDate, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>)
                    : (formData.date ? format(formData.date, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.status === 'pago' ? formData.paymentDate : formData.date}
                  onSelect={(date) => setFormData({
                    ...formData,
                    ...(formData.status === 'pago'
                      ? { paymentDate: date || null }
                      : { date: date || null })
                  })}
                  initialFocus
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
            {initialData?.installmentGroup && formData.status !== 'pago' && (
              <div className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={updateInstallmentDatesMutation.isPending}
                  onClick={() => {
                    if (!formData.date) {
                      toast.error('Selecione uma data de vencimento primeiro');
                      return;
                    }
                    const installmentNumber = Number(initialData.installmentNumber || 1);
                    const baseDate = new Date(formData.date);
                    const firstDate = addMonths(baseDate, -(installmentNumber - 1));
                    const newFirstDate = formatDateOnly(firstDate);
                    updateInstallmentDatesMutation.mutate({
                      installmentGroup: initialData.installmentGroup,
                      newFirstDate
                    });
                  }}
                >
                  {updateInstallmentDatesMutation.isPending ? 'Atualizando...' : 'Atualizar vencimento de todas as parcelas'}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Atualiza todas as parcelas do grupo mantendo o intervalo mensal.
                </p>
              </div>
            )}
          </div>

          <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : (initialData ? 'Atualizar Transação' : 'Criar Transação')}
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
