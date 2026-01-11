import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from 'lucide-react';
import CreateCategoryModal from '../transactions/CreateCategoryModal';
import { useQueryClient } from '@tanstack/react-query';
import { formatPhoneNumber, formatCNPJ, formatCPF } from '@/utils/masks';

export default function SupplierFormDialog({ open, onOpenChange, supplier = null, onSubmit, isLoading = false, categories = [] }) {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', cpf: '', cnpj: '' });
  const [documentType, setDocumentType] = useState('cnpj'); // 'cpf' or 'cnpj'
  const [isCreateCategoryModalOpen, setIsCreateCategoryModalOpen] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open && supplier) {
      // Determine document type based on which field has value
      const hasCPF = supplier.cpf && supplier.cpf.trim().length > 0;
      const hasCNPJ = supplier.cnpj && supplier.cnpj.trim().length > 0;
      
      setFormData({
        name: supplier.name || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        cpf: supplier.cpf || '',
        cnpj: supplier.cnpj || ''
      });
      
      // Set document type based on existing data
      if (hasCPF) {
        setDocumentType('cpf');
      } else if (hasCNPJ) {
        setDocumentType('cnpj');
      } else {
        setDocumentType('cnpj'); // Default to CNPJ for suppliers
      }
    } else if (open && !supplier) {
      setFormData({ name: '', email: '', phone: '', cpf: '', cnpj: '' });
      setDocumentType('cnpj'); // Default to CNPJ for new suppliers
    }
  }, [open, supplier]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Garantir que campos vazios sejam enviados como null para o backend
    const cleanCPF = formData.cpf?.trim();
    const cleanCNPJ = formData.cnpj?.trim();
    
    const payload = {
      name: formData.name.trim(),
      cpf: (documentType === 'cpf' && cleanCPF && cleanCPF.length > 0) ? cleanCPF : null,
      cnpj: (documentType === 'cnpj' && cleanCNPJ && cleanCNPJ.length > 0) ? cleanCNPJ : null,
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
              <Label>Tipo de Documento</Label>
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cpf">CPF</SelectItem>
                  <SelectItem value="cnpj">CNPJ</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {documentType === 'cpf' ? (
              <div className="space-y-2">
                <Label>CPF</Label>
                <Input 
                  value={formData.cpf} 
                  onChange={e => setFormData({...formData, cpf: formatCPF(e.target.value)})}
                  placeholder="000.000.000-00"
                  maxLength="14"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>CNPJ</Label>
                <Input 
                  value={formData.cnpj} 
                  onChange={e => setFormData({...formData, cnpj: formatCNPJ(e.target.value)})}
                  maxLength="18"
                  placeholder="XX.XXX.XXX/XXXX-XX"
                />
              </div>
            )}
            
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
