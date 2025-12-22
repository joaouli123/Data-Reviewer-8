import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from 'lucide-react';
import CreateCategoryModal from '../transactions/CreateCategoryModal';
import { useQueryClient } from '@tanstack/react-query';
import { formatPhoneNumber } from '@/utils/masks';

export default function CustomerFormDialog({ open, onOpenChange, customer = null, onSubmit, isLoading = false, categories = [] }) {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', category: '' });
  const [isCreateCategoryModalOpen, setIsCreateCategoryModalOpen] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open && customer) {
      setFormData({
        name: customer.name || '',
        email: customer.email || '',
        phone: customer.phone || '',
        category: customer.category || ''
      });
    } else if (open && !customer) {
      setFormData({ name: '', email: '', phone: '', category: '' });
    }
  }, [open, customer]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const isEditing = !!customer;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Editar Cliente' : 'Adicionar Cliente'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Nome Completo</Label>
              <Input 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input 
                type="email" 
                value={formData.email} 
                onChange={e => setFormData({...formData, email: e.target.value})}
                placeholder="exemplo@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input 
                value={formData.phone} 
                onChange={e => setFormData({...formData, phone: formatPhoneNumber(e.target.value)})}
                maxLength="15"
                placeholder="(XX) XXXXX-XXXX"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <div className="flex gap-2">
                  <Select 
                    value={formData.category} 
                    onValueChange={(v) => setFormData({...formData, category: v})}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.name}>
                          {cat.name.charAt(0).toUpperCase() + cat.name.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    type="button" 
                    size="icon" 
                    variant="outline" 
                    onClick={() => setIsCreateCategoryModalOpen(true)}
                    title="Nova Categoria"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tipo</Label>
                <div className={`px-3 py-2 rounded-md border border-slate-200 text-sm font-medium flex items-center bg-emerald-50 text-emerald-700`}>
                  + Receita
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" className="bg-primary" disabled={isLoading}>
                {isEditing ? 'Atualizar' : 'Salvar'} Cliente
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <CreateCategoryModal
        open={isCreateCategoryModalOpen}
        onOpenChange={setIsCreateCategoryModalOpen}
        onSubmit={() => queryClient.invalidateQueries({ queryKey: ['categories'] })}
      />
    </>
  );
}
