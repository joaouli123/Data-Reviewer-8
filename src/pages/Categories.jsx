import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Category } from '@/api/entities';
import Pagination from '../components/Pagination';

export default function CategoriesPage() {
  const { company } = useAuth();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({ name: '', type: 'entrada' });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { data: categories } = useQuery({
    queryKey: ['/api/categories', company?.id],
    queryFn: () => Category.list(),
    initialData: [],
    enabled: !!company?.id
  });

  const createMutation = useMutation({
    mutationFn: (data) => Category.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories', company?.id] });
      setIsFormOpen(false);
      setFormData({ name: '', type: 'entrada' });
      toast.success('Categoria criada com sucesso!', { duration: 5000 });
    },
    onError: (error) => {
      const message = error.message || 'Erro desconhecido';
      toast.error(message.includes('HTTP') ? 'Erro ao criar categoria' : message, { duration: 5000 });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => Category.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories', company?.id] });
      setIsFormOpen(false);
      setEditingCategory(null);
      setFormData({ name: '' });
      toast.success('Categoria atualizada!', { duration: 5000 });
    },
    onError: () => toast.error('Erro ao atualizar categoria', { duration: 5000 })
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => Category.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories', company?.id] });
      toast.success('Categoria removida!', { duration: 5000 });
    },
    onError: () => toast.error('Erro ao remover categoria', { duration: 5000 })
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Nome da categoria é obrigatório', { duration: 5000 });
      return;
    }

    const payload = { 
      name: formData.name.trim(), 
      type: formData.type 
    };

    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({ name: category.name, type: category.type || 'entrada' });
    setIsFormOpen(true);
  };

  const handleClose = () => {
    setIsFormOpen(false);
    setEditingCategory(null);
    setFormData({ name: '', type: 'entrada' });
  };

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedCategories = categories.slice(startIndex, endIndex);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Categorias</h1>
          <p className="text-xs sm:text-sm text-slate-500">Gerencie as categorias de transações.</p>
        </div>
        <Button onClick={() => setIsFormOpen(true)} className="bg-primary hover:bg-primary w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" /> Nova Categoria
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="pl-6 text-left">Nome</TableHead>
                <TableHead className="text-left">Tipo</TableHead>
                <TableHead className="text-right pr-6">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedCategories.length > 0 ? (
                paginatedCategories.map((cat) => (
                  <TableRow key={cat.id} className="hover:bg-slate-50/50 group">
                    <TableCell className="font-medium text-slate-900 pl-6 text-left">
                      {cat.name.charAt(0).toUpperCase() + cat.name.slice(1)}
                    </TableCell>
                    <TableCell className="text-left">
                      <Badge className={cat.type === 'entrada' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}>
                        {cat.type === 'entrada' ? '+ Entrada' : '- Saída'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleEdit(cat)}
                          className="h-8 w-8 text-slate-400 hover:text-primary"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => deleteMutation.mutate(cat.id)}
                          className="h-8 w-8 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-10 text-slate-500">
                    Nenhuma categoria encontrada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <Pagination 
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={categories.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
        />
      </div>

      <Dialog open={isFormOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Nome da Categoria</Label>
              <Input 
                placeholder="Ex: Venda, Compra, Devolução..." 
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-3">
              <Label>Tipo</Label>
              <RadioGroup value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
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
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary">
                {editingCategory ? 'Atualizar' : 'Criar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
