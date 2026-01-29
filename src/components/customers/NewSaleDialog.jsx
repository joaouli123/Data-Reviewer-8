import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput, formatCurrency, parseCurrency } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addMonths } from 'date-fns';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import CreateCategoryModal from '../transactions/CreateCategoryModal';
import { useAuth } from '@/contexts/AuthContext';
import { Switch } from '@/components/ui/switch';

export default function NewSaleDialog({ customer, open, onOpenChange }) {
  const { company } = useAuth();
  const [formData, setFormData] = useState({
    description: '',
    total_amount: '',
    category: '',
    sale_date: format(new Date(), 'yyyy-MM-dd'),
    installments: '1',
    installment_amount: '',
    status: 'pago',
    paymentDate: format(new Date(), 'yyyy-MM-dd'),
    paymentMethod: '',
    hasCardFee: false,
    cardFee: ''
  });
  const [customInstallments, setCustomInstallments] = useState([]);
  const [isCreateCategoryModalOpen, setIsCreateCategoryModalOpen] = useState(false);

  // Reset form when dialog closes
  React.useEffect(() => {
    if (open) {
      setFormData(prev => ({
        ...prev,
        category: customer?.category || '',
        sale_date: format(new Date(), 'yyyy-MM-dd'),
        paymentDate: format(new Date(), 'yyyy-MM-dd')
      }));
    } else {
      setFormData({
        description: '',
        total_amount: '',
        category: '',
        sale_date: format(new Date(), 'yyyy-MM-dd'),
        installments: '1',
        installment_amount: '',
        status: 'pago',
        paymentDate: format(new Date(), 'yyyy-MM-dd'),
        paymentMethod: '',
        hasCardFee: false,
        cardFee: ''
      });
      setCustomInstallments([]);
    }
  }, [open, customer]);

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

  const createSaleMutation = useMutation({
    mutationFn: async (data) => {
      // SEGURANÇA: Garante que o valor vai como Float limpo (ex: 5454.51)
      const rawTotal = parseCurrency(data.total_amount);

      const payload = {
        customerId: customer.id,
        saleDate: data.sale_date,
        totalAmount: rawTotal, 
        status: data.status,
        description: data.description,
        categoryId: categories.find(c => c.name === data.category)?.id,
        paymentMethod: data.paymentMethod,
        installmentCount: parseInt(data.installments) || 1,
        hasCardFee: data.hasCardFee || false,
        cardFee: data.hasCardFee ? (parseFloat(data.cardFee) || 0) : 0,
        // SEGURANÇA: Limpa também as parcelas customizadas
        customInstallments: data.customInstallments?.map(inst => ({
          ...inst,
          amount: parseCurrency(inst.amount)
        }))
      };

      const res = await apiRequest('POST', '/api/sales', payload);
      return res;
    },
    onSuccess: () => {
      // Invalida caches - React Query refaz automaticamente quando necessário
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sales'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cash-flow'] });

      // Reset form
      setFormData({
        description: '',
        total_amount: '',
        category: '',
        sale_date: format(new Date(), 'yyyy-MM-dd'),
        installments: '1',
        installment_amount: '',
        status: 'pago',
        paymentDate: format(new Date(), 'yyyy-MM-dd'),
        paymentMethod: '',
        hasCardFee: false,
        cardFee: ''
      });
      setCustomInstallments([]);

      toast.success('Venda registrada com sucesso!');
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao registrar venda', { duration: 5000 });
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (createSaleMutation.isPending) return;

    const rawTotal = parseCurrency(formData.total_amount);

    if (!formData.description.trim()) {
      toast.error('Digite uma descrição', { duration: 5000 });
      return;
    }
    if (rawTotal <= 0) {
      toast.error('Digite um valor válido', { duration: 5000 });
      return;
    }
    if (!formData.category) {
      toast.error('Selecione uma categoria', { duration: 5000 });
      return;
    }
    if (!formData.paymentMethod) {
      toast.error('Selecione a forma de pagamento', { duration: 5000 });
      return;
    }

    // Validação de parcelas customizadas
    if (customInstallments.length > 0) {
      const totalCustom = customInstallments.reduce((sum, inst) => sum + parseCurrency(inst.amount), 0);

      // Margem de erro pequena para arredondamentos
      if (Math.abs(totalCustom - rawTotal) > 0.05) {
        toast.error(`A soma das parcelas (R$ ${totalCustom.toFixed(2)}) deve ser igual ao total (R$ ${rawTotal.toFixed(2)})`, { duration: 5000 });
        return;
      }
    }

    createSaleMutation.mutate({
      ...formData,
      installments: Number(formData.installments),
      installment_amount: formData.installment_amount,
      paymentMethod: formData.paymentMethod,
      hasCardFee: formData.hasCardFee,
      cardFee: formData.cardFee,
      customInstallments: customInstallments.length > 0 ? customInstallments : null
    });
  };

  const handleInstallmentsChange = (value) => {
    const numValue = value === '' ? '1' : value;
    setFormData({ ...formData, installments: numValue, installment_amount: '' });

    const numInstallments = parseInt(numValue);
    if (numInstallments > 1) {
      const totalAmount = parseCurrency(formData.total_amount);

      // MELHORIA: toFixed(2) para garantir que não gere números como 33.333333 no input
      const defaultAmount = totalAmount > 0 
        ? parseFloat((totalAmount / numInstallments).toFixed(2)) 
        : '';

      const baseDate = new Date(formData.sale_date + 'T12:00:00Z');
      const newCustomInstallments = Array.from({ length: numInstallments }, (_, i) => ({
        amount: defaultAmount, 
        due_date: format(addMonths(baseDate, i), 'yyyy-MM-dd')
      }));

      // Ajuste do centavo na última parcela para bater o total exato
      if (typeof defaultAmount === 'number') {
        const somaAtual = parseFloat((defaultAmount * numInstallments).toFixed(2));
        const diferenca = parseFloat((totalAmount - somaAtual).toFixed(2));
        if (diferenca !== 0) {
          newCustomInstallments[numInstallments - 1].amount = parseFloat(
            (newCustomInstallments[numInstallments - 1].amount + diferenca).toFixed(2)
          );
        }
      }
      setCustomInstallments(newCustomInstallments);
    } else {
      setCustomInstallments([]);
    }
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
        updated[i] = { 
          ...updated[i], 
          due_date: format(installmentDate, 'yyyy-MM-dd')
        };
      }
      toast.info('Datas das parcelas atualizadas automaticamente', { duration: 3000 });
    }
    
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
            <Label>Forma de Pagamento</Label>
            <Select 
              value={formData.paymentMethod} 
              onValueChange={(v) => {
                const canInstall = ['Cartão de Crédito', 'Boleto', 'Crediário'].includes(v);
                const isCardPayment = ['Cartão de Crédito', 'Cartão de Débito'].includes(v);
                setFormData(prev => ({
                  ...prev, 
                  paymentMethod: v,
                  status: (v === 'Pix' || v === 'Dinheiro' || v === 'Cartão de Débito') ? 'pago' : prev.status,
                  installments: canInstall ? prev.installments : '1',
                  hasCardFee: isCardPayment ? prev.hasCardFee : false,
                  cardFee: isCardPayment ? prev.cardFee : ''
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

          {/* Campo de Taxa de Cartão - só aparece para Débito e Crédito */}
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
                  {formData.total_amount && formData.cardFee && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Valor da taxa: R$ {((parseCurrency(formData.total_amount) * parseFloat(formData.cardFee)) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      {' • '}
                      Valor líquido: R$ {(parseCurrency(formData.total_amount) - ((parseCurrency(formData.total_amount) * parseFloat(formData.cardFee)) / 100)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                  paymentDate: checked ? format(new Date(), 'yyyy-MM-dd') : null,
                  installments: checked ? '1' : formData.installments
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
                placeholder="0,00"
                value={formData.total_amount}
                onChange={(e) => setFormData({...formData, total_amount: e.target.value})}
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

          {formData.status !== 'pago' && Number(formData.installments) > 1 && customInstallments.length === 0 && (
            <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-600">
              <p>
                {formData.installment_amount && !isNaN(parseCurrency(formData.installment_amount))
                  ? `${formData.installments}x de R$ ${formatCurrency(formData.installment_amount)}`
                  : `${formData.installments}x de R$ ${formatCurrency((parseCurrency(formData.total_amount) / Number(formData.installments || 1)))}`
                }
              </p>
            </div>
          )}

          {formData.status !== 'pago' && customInstallments.length > 1 && (
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
                  <div key={idx} className="flex gap-2 items-center bg-white p-2 rounded border shadow-sm pr-1">
                    <span className="text-xs font-bold text-slate-400 w-8 pl-1">{idx + 1}º</span>
                    <div className="flex-[2] flex items-center gap-1">
                      <span className="text-xs text-slate-400">R$</span>
                      <CurrencyInput
                        placeholder="Valor"
                        value={inst.amount}
                        onChange={(e) => updateCustomInstallment(idx, 'amount', e.target.value)}
                        className="h-8 text-sm w-full"
                      />
                    </div>
                    <div className="flex-[3]">
                      <Input
                        type="date"
                        value={inst.due_date}
                        onChange={(e) => updateCustomInstallment(idx, 'due_date', e.target.value)}
                        className="h-8 text-sm w-full px-2"
                      />
                    </div>
                  </div>
                ))}
                <div className="pt-2 border-t mt-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium">Total das Parcelas:</span>
                    <span className={`font-bold ${
                      Math.abs(customInstallments.reduce((sum, inst) => sum + parseCurrency(inst.amount), 0) - parseCurrency(formData.total_amount)) < 0.05
                        ? 'text-emerald-600'
                        : 'text-rose-600'
                    }`}>
                      R$ {formatCurrency(customInstallments.reduce((sum, inst) => sum + parseCurrency(inst.amount), 0))}
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
                    {categories
                      .filter(cat => cat.type === 'entrada' || cat.type === 'income')
                      .map((cat) => (
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
            {formData.status === 'pago' ? (
              <div className="space-y-2">
                <Label>Data do Pagamento</Label>
                <Input 
                  type="date" 
                  value={formData.paymentDate}
                  onChange={(e) => setFormData({...formData, paymentDate: e.target.value})}
                  required
                />
              </div>
            ) : (
              parseInt(formData.installments) === 1 && (
                <div className="space-y-2">
                  <Label>Data de Vencimento</Label>
                  <Input 
                    type="date" 
                    value={formData.sale_date}
                    onChange={(e) => setFormData({...formData, sale_date: e.target.value})}
                    required
                  />
                </div>
              )
            )}
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={createSaleMutation.isPending}>
              {createSaleMutation.isPending ? 'Salvando...' : 'Registrar Venda'}
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