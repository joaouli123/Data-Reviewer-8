import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export function PaymentDetails({ formData, setFormData, setCustomInstallments }) {
  return (
    <>
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
    </>
  );
}
