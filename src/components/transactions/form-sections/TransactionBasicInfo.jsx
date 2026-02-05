import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function TransactionBasicInfo({ formData, setFormData, categories: categoriesProp, onNewCategory }) {
  const categories = Array.isArray(categoriesProp) ? categoriesProp : [];
  
  return (
    <>
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
                onClick={onNewCategory}
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
    </>
  );
}
