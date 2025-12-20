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
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function TransactionForm({ open, onOpenChange, onSubmit, initialData = null }) {
  const queryClient = useQueryClient();
  const [isNewCategoryMode, setIsNewCategoryMode] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isSuggestingCategory, setIsSuggestingCategory] = useState(false);
  
  const [formData, setFormData] = React.useState({
    description: '',
    amount: '',
    type: 'venda',
    categoryId: '',
    date: new Date(),
    status: 'concluído'
  });

  // Fetch Categories
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => Category.list(),
    initialData: []
  });

  const createCategoryMutation = useMutation({
    mutationFn: (data) => Category.create(data),
    onSuccess: (newCat) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setFormData((prev) => ({ ...prev, categoryId: newCat.id }));
      setIsNewCategoryMode(false);
      setNewCategoryName('');
      toast.success('Categoria criada!');
    }
  });

  React.useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        date: new Date(initialData.date),
        amount: initialData.amount.toString()
      });
    } else {
      setFormData({
        description: '',
        amount: '',
        type: 'venda',
        categoryId: '',
        date: new Date(),
        status: 'concluído'
      });
    }
  }, [initialData, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.description.trim()) {
        toast.error('Digite uma descrição');
        return;
    }
    if (!formData.amount || Number(formData.amount) <= 0) {
        toast.error('Digite um valor válido');
        return;
    }
    if (!formData.categoryId) {
        toast.error('Selecione uma categoria');
        return;
    }
    const amount = Number(formData.amount).toFixed(2);
    onSubmit({
      ...formData,
      amount: amount,
      date: formData.date.toISOString(),
      shift: 'turno1'
    });
  };

  const handleCreateCategory = (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    createCategoryMutation.mutate({
        name: newCategoryName.toLowerCase(),
        type: formData.type === 'venda' ? 'entrada' : 'saida'
    });
  };

  const suggestCategory = async () => {
    if (!formData.description.trim() || categories.length === 0) {
      toast.error('Digite uma descrição primeiro');
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
        setFormData({ ...formData, category: matchingCategory.name });
        toast.success('Categoria sugerida aplicada!');
      } else {
        toast.error('Não foi possível sugerir uma categoria apropriada');
      }
    } catch (error) {
      toast.error('Erro ao sugerir categoria');
    } finally {
      setIsSuggestingCategory(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Editar Transação' : 'Nova Transação'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select 
                value={formData.type} 
                onValueChange={(v) => setFormData({...formData, type: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="venda">Receita</SelectItem>
                  <SelectItem value="compra">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input 
                type="number" 
                step="0.01" 
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
                required
              />
            </div>
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
              {!isNewCategoryMode ? (
                <div className="flex gap-2">
                    <Select 
                        value={formData.categoryId} 
                        onValueChange={(v) => setFormData({...formData, categoryId: v})}
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
                        onClick={() => setIsNewCategoryMode(true)}
                        title="Nova Categoria"
                    >
                        <Plus className="w-4 h-4" />
                    </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                    <Input 
                        placeholder="Nova categoria..." 
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        className="flex-1"
                    />
                    <Button 
                        type="button" 
                        size="sm" 
                        onClick={handleCreateCategory}
                        className="bg-green-600 hover:bg-green-700"
                    >
                        OK
                    </Button>
                    <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setIsNewCategoryMode(false)}
                    >
                        X
                    </Button>
                </div>
              )}
            </div>

            <div className="space-y-2 flex flex-col">
              <Label className="mb-2">Data</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full pl-3 text-left font-normal",
                      !formData.date && "text-muted-foreground"
                    )}
                  >
                    {formData.date ? (
                      format(formData.date, "dd/MM/yyyy")
                    ) : (
                      <span>Selecione uma data</span>
                    )}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.date}
                    onSelect={(d) => d && setFormData({...formData, date: d})}
                    initialFocus
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(v) => setFormData({...formData, status: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="concluído">Concluído</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary">
              {initialData ? 'Atualizar' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}