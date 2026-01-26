import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CurrencyInput, formatCurrency, parseCurrency } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from 'sonner';
import { AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function PaymentEditDialog({ isOpen, onClose, transaction, onConfirm, isLoading, title = "Editar Pagamento", amountLabel = "Valor Pago" }) {
  const [paidAmount, setPaidAmount] = useState(0);
  const [interest, setInterest] = useState(0);
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [paymentMethod, setPaymentMethod] = useState('');
  const [hasCardFee, setHasCardFee] = useState(false);
  const [cardFee, setCardFee] = useState('');

  // Reset values when transaction changes or dialog opens
  useEffect(() => {
    if (transaction) {
      setPaidAmount(transaction.paidAmount ? parseFloat(transaction.paidAmount) : parseFloat(transaction.amount || 0));
      setInterest(transaction.interest ? parseFloat(transaction.interest) : 0);
      setPaymentDate(transaction.paymentDate ? format(new Date(transaction.paymentDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
      setPaymentMethod(transaction.paymentMethod || '');
      setHasCardFee(transaction.hasCardFee || false);
      setCardFee(transaction.cardFee ? transaction.cardFee.toString() : '');
    }
  }, [transaction]);

  const originalAmount = parseFloat(transaction?.amount || 0);
  const cardFeeAmount = hasCardFee && cardFee ? (paidAmount * parseFloat(cardFee)) / 100 : 0;
  const total = paidAmount + interest;
  const netAmount = paidAmount - cardFeeAmount;
  const difference = total - originalAmount;

  const handleConfirm = () => {
    if (paidAmount <= 0) {
      toast.error('Valor pago deve ser maior que zero');
      return;
    }
    if (!paymentDate) {
      toast.error('Data de pagamento é obrigatória');
      return;
    }
    if (!paymentMethod) {
      toast.error('Forma de pagamento é obrigatória');
      return;
    }
    onConfirm({
      paidAmount: paidAmount.toString(),
      interest: interest.toString(),
      paymentDate: paymentDate,
      paymentMethod: paymentMethod,
      hasCardFee: hasCardFee,
      cardFee: hasCardFee ? cardFee : '0'
    });
  };

  const handleCancel = () => {
    setPaidAmount(parseFloat(transaction?.paidAmount || transaction?.amount || 0));
    setInterest(parseFloat(transaction?.interest || 0));
    setHasCardFee(false);
    setCardFee('');
    onClose();
  };

  const isCardPayment = ['Cartão de Crédito', 'Cartão de Débito', 'Cartão Crédito', 'Cartão Débito'].includes(paymentMethod);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg">{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <p className="text-sm text-blue-800 font-medium">
              Valor Original: R$ {originalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="paidAmount" className="text-xs">{amountLabel}</Label>
              <div className="flex items-center gap-1">
                <span className="text-slate-600 text-sm">R$</span>
                <CurrencyInput
                  id="paidAmount"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  placeholder="0,00"
                  className="flex-1 h-9"
                  data-testid="input-paid-amount"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="interest" className="text-xs">Juros/Adicional</Label>
              <div className="flex items-center gap-1">
                <span className="text-slate-600 text-sm">R$</span>
                <CurrencyInput
                  id="interest"
                  value={interest}
                  onChange={(e) => setInterest(e.target.value)}
                  placeholder="0,00"
                  className="flex-1 h-9"
                  data-testid="input-interest"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="paymentDate" className="text-xs">Data Pagamento</Label>
              <Input
                id="paymentDate"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full h-9"
                data-testid="input-payment-date"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Forma Pagamento</Label>
              <Select 
                value={paymentMethod} 
                onValueChange={(v) => {
                  setPaymentMethod(v);
                  const isCard = ['Cartão de Crédito', 'Cartão de Débito', 'Cartão Crédito', 'Cartão Débito'].includes(v);
                  if (!isCard) {
                    setHasCardFee(false);
                    setCardFee('');
                  }
                }}
              >
                <SelectTrigger className="w-full h-9">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="Pix">Pix</SelectItem>
                  <SelectItem value="Cartão de Crédito">Cartão Crédito</SelectItem>
                  <SelectItem value="Cartão de Débito">Cartão Débito</SelectItem>
                  <SelectItem value="Boleto">Boleto</SelectItem>
                  <SelectItem value="Crediário">Crediário</SelectItem>
                  <SelectItem value="Transferência">Transferência</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Campo de Taxa de Cartão */}
          {isCardPayment && (
            <div className="space-y-2 p-2 rounded-lg bg-amber-50 border border-amber-200">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-amber-800">Taxa de Cartão?</Label>
                <input 
                  type="checkbox"
                  checked={hasCardFee}
                  onChange={(e) => {
                    setHasCardFee(e.target.checked);
                    if (!e.target.checked) setCardFee('');
                  }}
                  className="h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                />
              </div>
              {hasCardFee && (
                <div className="space-y-1">
                  <div className="flex gap-2 items-center">
                    <Input 
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      placeholder="0.00"
                      value={cardFee}
                      onChange={(e) => setCardFee(e.target.value)}
                      className="flex-1 h-8 text-sm"
                    />
                    <span className="text-xs font-medium text-amber-700">%</span>
                  </div>
                  {cardFee && paidAmount > 0 && (
                    <div className="text-xs text-amber-600">
                      <p>Taxa: R$ {cardFeeAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      <p>Líquido: R$ {netAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex justify-between text-xs">
              <span className="text-slate-600">Valor Pago:</span>
              <span className="font-medium">R$ {paidAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span className="text-slate-600">Juros:</span>
              <span className="font-medium">R$ {interest.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="border-t border-slate-200 pt-1 mt-1 flex justify-between text-sm font-bold">
              <span>Total:</span>
              <span className={difference !== 0 ? 'text-amber-600' : 'text-slate-900'}>
                R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            {difference > 0 && (
              <p className="text-xs text-amber-600 mt-1">
                +R$ {difference.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} acréscimo
              </p>
            )}
            {difference < 0 && (
              <p className="text-xs text-red-600 mt-1">
                -R$ {Math.abs(difference).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} falta
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={handleCancel} disabled={isLoading} data-testid="button-cancel-payment-edit">
            Cancelar
          </Button>
          <Button size="sm" onClick={handleConfirm} disabled={isLoading} className="bg-emerald-600 hover:bg-emerald-700" data-testid="button-confirm-payment-edit">
            {isLoading ? 'Processando...' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
