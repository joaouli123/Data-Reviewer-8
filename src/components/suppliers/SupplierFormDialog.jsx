import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from 'lucide-react';
import CreateCategoryModal from '../transactions/CreateCategoryModal';
import { useQueryClient } from '@tanstack/react-query';
import { formatPhoneNumber, formatCNPJ } from '@/utils/masks';

export default function SupplierFormDialog({ open, onOpenChange, supplier = null, onSubmit, isLoading = false, categories = [] }) {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', cnpj: '' });
  const [isCreateCategoryModalOpen, setIsCreateCategoryModalOpen] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open && supplier) {
      setFormData({
        name: supplier.name || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        cnpj: supplier.cnpj || ''
      });
    } else if (open && !supplier) {
      setFormData({ name: '', email: '', phone: '', cnpj: '' });
    }
  }, [open, supplier]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Garantir que campos vazios sejam enviados como null para o backend
    const cleanCNPJ = formData.cnpj?.trim();
    const payload = {
      name: formData.name.trim(),
      cnpj: cleanCNPJ && cleanCNPJ.length > 0 ? cleanCNPJ : null,
      email: formData.email?.trim() || null,
      phone: formData.phone?.trim() || null,
      status: 'ativo'
    };

    onSubmit(payload);
  };

  const isEditing = !!supplier;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Editar Fornecedor' : 'Adicionar Fornecedor'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Nome/Razão Social</Label>
              <Input 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label>CNPJ</Label>
              <Input 
                value={formData.cnpj} 
                onChange={e => setFormData({...formData, cnpj: formatCNPJ(e.target.value)})}
                maxLength="18"
                placeholder="XX.XXX.XXX/XXXX-XX"
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

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" className="bg-primary" disabled={isLoading}>
                {isEditing ? 'Atualizar' : 'Salvar'} Fornecedor
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
