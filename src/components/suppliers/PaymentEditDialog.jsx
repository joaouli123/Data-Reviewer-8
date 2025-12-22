import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CurrencyInput, formatCurrency, parseCurrency } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
import { AlertCircle } from 'lucide-react';

export default function PaymentEditDialog({ isOpen, onClose, transaction, onConfirm, isLoading, title = "Editar Pagamento", amountLabel = "Valor Pago" }) {
  const [paidAmount, setPaidAmount] = useState(0);
  const [interest, setInterest] = useState(0);

  // Reset values when transaction changes or dialog opens
  useEffect(() => {
    if (transaction) {
      setPaidAmount(transaction.paidAmount ? parseFloat(transaction.paidAmount) : parseFloat(transaction.amount || 0));
      setInterest(transaction.interest ? parseFloat(transaction.interest) : 0);
    }
  }, [transaction]);

  const originalAmount = parseFloat(transaction?.amount || 0);
  const total = paidAmount + interest;
  const difference = total - originalAmount;

  const handleConfirm = () => {
    if (paidAmount <= 0) {
      toast.error('Valor pago deve ser maior que zero');
      return;
    }
    onConfirm({
      paidAmount: paidAmount.toString(),
      interest: interest.toString()
    });
  };

  const handleCancel = () => {
    setPaidAmount(parseFloat(transaction?.paidAmount || transaction?.amount || 0));
    setInterest(parseFloat(transaction?.interest || 0));
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">Valor Original: R$ {originalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paidAmount">{amountLabel}</Label>
            <div className="flex items-center gap-2">
              <span className="text-slate-600">R$</span>
              <CurrencyInput
                id="paidAmount"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                placeholder="0,00"
                className="flex-1"
                data-testid="input-paid-amount"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="interest">Juros / Adicional</Label>
            <div className="flex items-center gap-2">
              <span className="text-slate-600">R$</span>
              <CurrencyInput
                id="interest"
                value={interest}
                onChange={(e) => setInterest(e.target.value)}
                placeholder="0,00"
                className="flex-1"
                data-testid="input-interest"
              />
            </div>
            <p className="text-xs text-slate-500">Juros, multa ou outros custos adicionais</p>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg space-y-2 border border-slate-200">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Valor Pago:</span>
              <span className="font-medium">R$ {paidAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Juros/Adicional:</span>
              <span className="font-medium">R$ {interest.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-bold">
              <span>Total:</span>
              <span className={difference !== 0 ? 'text-amber-600' : 'text-slate-900'}>
                R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            {difference > 0 && (
              <p className="text-xs text-amber-600 pt-1">
                Acréscimo de R$ {difference.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            )}
            {difference < 0 && (
              <p className="text-xs text-red-600 pt-1">
                Falta R$ {Math.abs(difference).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleCancel} disabled={isLoading} data-testid="button-cancel-payment-edit">
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading} className="bg-emerald-600 hover:bg-emerald-700" data-testid="button-confirm-payment-edit">
            {isLoading ? 'Processando...' : 'Confirmar Pagamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
