import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function EntitySelection({ formData, setFormData, customers, suppliers }) {
  return (
    <>
      <div className="space-y-2">
        <Label>Cliente ou Fornecedor</Label>
        <Select 
          value={formData.entityType} 
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
            value={formData.customerId} 
            onValueChange={(v) => setFormData({...formData, customerId: v})}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione um cliente..." />
            </SelectTrigger>
            <SelectContent>
              {customers.map((cust) => (
                <SelectItem key={cust.id} value={cust.id}>
                  {cust.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {formData.entityType === 'supplier' && (
        <div className="space-y-2">
          <Label>Fornecedor</Label>
          <Select 
            value={formData.supplierId} 
            onValueChange={(v) => setFormData({...formData, supplierId: v})}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione um fornecedor..." />
            </SelectTrigger>
            <SelectContent>
              {suppliers.map((supp) => (
                <SelectItem key={supp.id} value={supp.id}>
                  {supp.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </>
  );
}
