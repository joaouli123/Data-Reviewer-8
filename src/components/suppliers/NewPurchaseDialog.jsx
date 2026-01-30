import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput, formatCurrency, parseCurrency } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from 'sonner';
import { format, addMonths, addDays } from 'date-fns';
import { Plus } from 'lucide-react';
import CreateCategoryModal from '../transactions/CreateCategoryModal';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';
import { Switch } from '@/components/ui/switch';

export default function NewPurchaseDialog({ supplier, open, onOpenChange }) {
  const { company } = useAuth();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    description: '',
    total_amount: '',
    category: '',
    purchase_date: format(new Date(), 'yyyy-MM-dd'),
    installments: '1',
    installment_amount: '',
    status: 'pago',
    paymentDate: format(new Date(), 'yyyy-MM-dd'),
    paymentMethod: '',
    hasCardFee: false,
    cardFee: ''
  });
  const [installmentsInput, setInstallmentsInput] = useState('1');

  const [customInstallments, setCustomInstallments] = useState([]);
  const [isCreateCategoryModalOpen, setIsCreateCategoryModalOpen] = useState(false);

  // Reset do formulário ao abrir/fechar
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
        installments: '1',
        installment_amount: '',
        status: 'pago',
        paymentDate: format(new Date(), 'yyyy-MM-dd'),
        paymentMethod: '',
        hasCardFee: false,
        cardFee: ''
      });
      setInstallmentsInput('1');
      setCustomInstallments([]);
    }
  }, [open, supplier]);

  React.useEffect(() => {
    setInstallmentsInput(String(formData.installments || '1'));
  }, [formData.installments]);

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
      toast.success('Categoria criada!');
    }
  });

  const createPurchaseMutation = useMutation({
    mutationFn: async (data) => {
      // SEGURANÇA: Garante valor limpo
      const rawTotal = parseCurrency(data.total_amount);

      const payload = {
        supplierId: supplier.id,
        purchaseDate: data.purchase_date,
        totalAmount: rawTotal, // Envia float
        status: data.status,
        description: data.description,
        categoryId: categories.find(c => c.name === data.category)?.id,
        paymentMethod: data.paymentMethod,
        installmentCount: parseInt(data.installments) || 1,
        hasCardFee: data.hasCardFee || false,
        cardFee: data.hasCardFee ? (parseFloat(data.cardFee) || 0) : 0,
        // SEGURANÇA: Limpa parcelas customizadas também
        customInstallments: data.customInstallments?.map(inst => ({
            ...inst,
            amount: parseCurrency(inst.amount)
        }))
      };

      return await apiRequest('POST', '/api/purchases', payload);
    },
    onSuccess: () => {
      // Invalida caches - React Query refaz automaticamente quando necessário
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/purchases'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cash-flow'] });

      toast.success('Compra registrada com sucesso!');
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao registrar compra');
    }
  });

  const handleInstallmentsChange = (value) => {
    setInstallmentsInput(value);
    const cleaned = String(value).replace(/[^0-9]/g, '');
    setFormData(prev => ({ ...prev, installments: cleaned }));

    if (!cleaned) {
      setCustomInstallments([]);
      return;
    }

    const numInstallments = Math.max(1, Math.min(60, parseInt(cleaned, 10) || 1));
    if (String(numInstallments) !== cleaned) {
      setFormData(prev => ({ ...prev, installments: String(numInstallments) }));
    }

    if (numInstallments > 1) {
      // CORREÇÃO: Usando a função helper segura
      const total = parseCurrency(formData.total_amount);

      const defaultAmount = parseFloat((total / numInstallments).toFixed(2));
      // Primeira parcela: SEMPRE +30 dias a partir de HOJE
      const baseDate = addDays(new Date(), 30);

      const newCustomInstallments = Array.from({ length: numInstallments }, (_, i) => ({
        amount: defaultAmount || '',
        due_date: format(addMonths(baseDate, i), 'yyyy-MM-dd')
      }));

      // Ajuste do centavo na última parcela
      const somaAtual = parseFloat((defaultAmount * numInstallments).toFixed(2));
      const diferenca = parseFloat((total - somaAtual).toFixed(2));

      if (diferenca !== 0) {
        newCustomInstallments[numInstallments - 1].amount = parseFloat(
          (newCustomInstallments[numInstallments - 1].amount + diferenca).toFixed(2)
        );
      }

      setCustomInstallments(newCustomInstallments);
    } else {
      setCustomInstallments([]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // CORREÇÃO: Usando parseCurrency para validar corretamente
    const totalValue = parseCurrency(formData.total_amount);

    if (!formData.description.trim()) return toast.error('Digite uma descrição');
    if (totalValue <= 0) return toast.error('Valor inválido');
    if (!formData.category) return toast.error('Selecione uma categoria');
    if (!formData.paymentMethod) return toast.error('Selecione a forma de pagamento');

    // Validação de soma das parcelas customizadas
    if (customInstallments.length > 0) {
      const totalCustom = customInstallments.reduce((sum, inst) => sum + parseCurrency(inst.amount), 0);

      if (Math.abs(totalCustom - totalValue) > 0.05) {
        return toast.error('A soma das parcelas não bate com o total');
      }
    }

    const instCount = ['Cartão de Crédito', 'Boleto', 'Crediário'].includes(formData.paymentMethod) 
      ? Number(formData.installments) 
      : 1;

    createPurchaseMutation.mutate({
      ...formData,
      total_amount: totalValue, // Envia o valor já tratado, mutation limpa de novo por segurança
      installments: instCount,
      hasCardFee: formData.hasCardFee,
      cardFee: formData.cardFee,
      customInstallments: customInstallments.length > 0 ? customInstallments : null
    });
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
                const isCardPayment = ['Cartão de Crédito', 'Cartão de Débito'].includes(v);
                setFormData(prev => ({
                  ...prev, 
                  paymentMethod: v,
                  status: ['Pix', 'Dinheiro', 'Cartão de Débito'].includes(v) ? 'pago' : prev.status,
                  installments: canInstall ? prev.installments : 1,
                  hasCardFee: isCardPayment ? prev.hasCardFee : false,
                  cardFee: isCardPayment ? prev.cardFee : ''
                }));
              }}
            >
              <SelectTrigger className="w-full">
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
                  setInstallmentsInput('1');
                  setCustomInstallments([]);
                }
              }}
              disabled={['Pix', 'Dinheiro', 'Cartão de Débito'].includes(formData.paymentMethod)}
            />
          </div>

          <div className="space-y-2">
            <Label>Valor Total</Label>
            <div className="flex items-center gap-2">
              <span className="text-slate-600 font-bold">R$</span>
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
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="1"
                value={installmentsInput}
                onChange={(e) => handleInstallmentsChange(e.target.value)}
                onBlur={() => {
                  const cleaned = String(installmentsInput).replace(/[^0-9]/g, '');
                  if (!cleaned || cleaned === '0') {
                    setInstallmentsInput('1');
                    handleInstallmentsChange('1');
                    return;
                  }
                  const parsed = Math.max(1, Math.min(60, parseInt(cleaned, 10) || 1));
                  setInstallmentsInput(String(parsed));
                }}
                className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <p className="text-xs text-muted-foreground">Digite o número de parcelas (use Delete/Backspace para apagar)</p>
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
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories
                      .filter(cat => cat.type === 'saida' || cat.type === 'expense')
                      .map((cat) => (
                        <SelectItem key={cat.id} value={cat.name}>
                          {cat.name}
                        </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" size="icon" variant="outline" onClick={() => setIsCreateCategoryModalOpen(true)}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <div className="px-3 py-2 rounded-md border border-slate-200 text-sm font-medium bg-rose-50 text-rose-700">
                - Despesa
              </div>
            </div>
          </div>

          {formData.status !== 'pago' && customInstallments.length > 1 && (
            <div className="space-y-3 mt-6 border-t pt-4">
              <Label className="text-sm font-bold">Detalhamento das Parcelas</Label>
              <div className="max-h-60 overflow-y-auto space-y-2 p-2 bg-slate-50 rounded-lg">
                {customInstallments.map((inst, idx) => (
                  <div key={idx} className="flex gap-2 items-center bg-white p-2 rounded border shadow-sm">
                    <span className="text-xs font-bold text-slate-400 w-6">{idx + 1}º</span>
                    <div className="flex-[2] flex items-center gap-1">
                      <span className="text-xs text-slate-400">R$</span>
                      <CurrencyInput
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
              </div>

              <div className="flex justify-between items-center px-2 py-1 bg-slate-100 rounded text-xs">
                <span>Soma das Parcelas:</span>
                <span className={`font-bold ${
                   Math.abs(customInstallments.reduce((sum, i) => sum + parseCurrency(i.amount), 0) - parseCurrency(formData.total_amount)) < 0.05
                   ? 'text-emerald-600' 
                   : 'text-rose-600'
                }`}>
                  R$ {formatCurrency(customInstallments.reduce((sum, i) => sum + parseCurrency(i.amount), 0))}
                </span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-primary" disabled={createPurchaseMutation.isPending}>
              {createPurchaseMutation.isPending ? 'Registrando...' : 'Registrar Compra'}
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