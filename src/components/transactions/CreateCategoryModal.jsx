import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from 'sonner';

export default function CreateCategoryModal({ open, onOpenChange, onSubmit, isLoading = false }) {
  const [categoryName, setCategoryName] = useState('');
  const [categoryType, setCategoryType] = useState('entrada');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!categoryName.trim()) {
      toast.error('Digite um nome para a categoria');
      return;
    }
    
    onSubmit({
      name: categoryName.toLowerCase(),
      type: categoryType
    });
    
    setCategoryName('');
    setCategoryType('entrada');
  };

  const handleOpenChange = (newOpen) => {
    if (!newOpen) {
      setCategoryName('');
      setCategoryType('entrada');
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Nova Categoria</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Nome da Categoria</Label>
            <Input 
              placeholder="Ex: Aluguel, Vendas, Salário..." 
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="space-y-3">
            <Label>Tipo</Label>
            <RadioGroup value={categoryType} onValueChange={setCategoryType}>
              <div className="flex items-center space-x-2 p-3 border border-emerald-200 rounded-md bg-emerald-50">
                <RadioGroupItem value="entrada" id="entrada" />
                <Label htmlFor="entrada" className="flex-1 cursor-pointer text-emerald-700 font-medium">
                  Entrada (Receita)
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border border-red-200 rounded-md bg-red-50">
                <RadioGroupItem value="saida" id="saida" />
                <Label htmlFor="saida" className="flex-1 cursor-pointer text-red-700 font-medium">
                  Saída (Despesa)
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button 
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Criando...' : 'Criar Categoria'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
