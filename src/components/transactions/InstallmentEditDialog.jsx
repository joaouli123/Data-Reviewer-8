import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CurrencyInput, parseCurrency } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from 'sonner';
import { AlertCircle, Calendar, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

/**
 * Modal simplificado para editar parcela (valor e data de vencimento)
 * Diferente do PaymentEditDialog que é para confirmar recebimento/pagamento
 */
export default function InstallmentEditDialog({ 
  isOpen, 
  onClose, 
  installment, 
  onConfirm, 
  isLoading,
  title = "Editar Parcela"
}) {
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');

  const originalAmount = Math.abs(parseFloat((installment?.originalAmount ?? installment?.amount) || 0));
  const paidAmount = Math.abs(parseFloat(installment?.paidAmount || 0));
  const saldoDevedor = Math.max(originalAmount - paidAmount, 0);
  const baseAmount = paidAmount > 0 ? saldoDevedor : originalAmount;

  // Reset values when installment changes or dialog opens
  useEffect(() => {
    if (installment && isOpen) {
      const rawAmount = Math.abs(parseFloat(baseAmount || 0));
      setAmount(rawAmount);
      
      // Parse date from installment
      const txDate = installment.date || installment.due_date;
      if (txDate) {
        try {
          const dateStr = typeof txDate === 'string' ? txDate.split('T')[0] : format(new Date(txDate), 'yyyy-MM-dd');
          setDueDate(dateStr);
        } catch {
          setDueDate(format(new Date(), 'yyyy-MM-dd'));
        }
      } else {
        setDueDate(format(new Date(), 'yyyy-MM-dd'));
      }
    }
  }, [installment, isOpen, baseAmount]);

  const currentAmount = parseCurrency(amount);
  const difference = currentAmount - baseAmount;

  const handleConfirm = () => {
    if (currentAmount <= 0) {
      toast.error('Valor deve ser maior que zero');
      return;
    }
    if (!dueDate) {
      toast.error('Data de vencimento é obrigatória');
      return;
    }
    
    onConfirm({
      amount: currentAmount.toFixed(2),
      dueDate: dueDate
    });
  };

  const handleCancel = () => {
    onClose();
  };

  if (!installment) return null;

  const installmentInfo = installment.installmentNumber && installment.installmentTotal
    ? `Parcela ${installment.installmentNumber}/${installment.installmentTotal}`
    : 'Parcela';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-blue-600" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Info da parcela */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <div>
                <p className="text-sm text-blue-800 font-medium">{installmentInfo}</p>
                <p className="text-xs text-blue-600">
                  Valor Original: R$ {originalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                {paidAmount > 0 && (
                  <p className="text-xs text-emerald-600">
                    Pago: R$ {paidAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                )}
                {paidAmount > 0 && saldoDevedor > 0 && (
                  <p className="text-xs text-rose-600 font-medium">
                    Saldo: R$ {saldoDevedor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Valor da Parcela */}
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-sm font-medium">
              {paidAmount > 0 ? 'Saldo a Pagar' : 'Valor da Parcela'}
            </Label>
            <div className="flex items-center gap-2">
              <span className="text-slate-600 font-medium">R$</span>
              <CurrencyInput
                id="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
                className="flex-1"
                data-testid="input-installment-amount"
              />
            </div>
            {difference !== 0 && (
              <p className={`text-xs ${difference > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {difference > 0 ? '+' : ''}R$ {difference.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                {paidAmount > 0 ? ' (ajuste do saldo)' : (difference > 0 ? ' (aumento)' : ' (ajuste)')}
              </p>
            )}
          </div>

          {/* Data de Vencimento */}
          <div className="space-y-2">
            <Label htmlFor="dueDate" className="text-sm font-medium flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              Data de Vencimento
            </Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full"
              data-testid="input-installment-due-date"
            />
          </div>

          {/* Resumo */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">{paidAmount > 0 ? 'Novo Saldo:' : 'Novo Valor:'}</span>
              <span className="font-bold text-slate-900">
                R$ {currentAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-slate-600">Vencimento:</span>
              <span className="font-medium text-slate-700">
                {dueDate ? format(new Date(dueDate + 'T12:00:00'), 'dd/MM/yyyy') : '-'}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={handleCancel} disabled={isLoading} data-testid="button-cancel-installment-edit">
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700" data-testid="button-confirm-installment-edit">
            {isLoading ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
