import React, { useState } from 'react';
import { Supplier, Purchase } from '@/api/entities';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Mail, Phone, Building2, MoreHorizontal, Trash2, ShoppingCart, Eye } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import NewPurchaseDialog from '../components/suppliers/NewPurchaseDialog';
import SupplierPurchasesDialog from '../components/suppliers/SupplierPurchasesDialog';
import Pagination from '../components/Pagination';
import { formatPhoneNumber, formatCNPJ } from '@/utils/masks';

export default function SuppliersPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isNewPurchaseDialogOpen, setIsNewPurchaseDialogOpen] = useState(false);
  const [isPurchasesViewDialogOpen, setIsPurchasesViewDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newSupplier, setNewSupplier] = useState({ name: '', email: '', phone: '', cnpj: '', status: 'active' });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  const queryClient = useQueryClient();

  const { data: suppliers, isLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => Supplier.list(),
    initialData: []
  });

  // purchases query removed
  const purchases = [];

  const createMutation = useMutation({
    mutationFn: (data) => Supplier.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setIsDialogOpen(false);
      setNewSupplier({ name: '', email: '', phone: '', cnpj: '', status: 'active' });
      toast.success('Fornecedor adicionado!');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => Supplier.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Fornecedor removido.');
    }
  });

  const handleCreate = (e) => {
    e.preventDefault();
    createMutation.mutate(newSupplier);
  };

  const openNewPurchaseDialog = (supplier) => {
    setSelectedSupplier(supplier);
    setIsNewPurchaseDialogOpen(true);
  };

  const openPurchasesViewDialog = (supplier) => {
    setSelectedSupplier(supplier);
    setIsPurchasesViewDialogOpen(true);
  };

  const getSupplierPurchases = (supplierId) => {
    return purchases
      .filter(p => p.supplier_id === supplierId)
      .reduce((acc, p) => acc + (p.total_amount || 0), 0);
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedSuppliers = filteredSuppliers.slice(startIndex, endIndex);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Fornecedores</h1>
          <p className="text-slate-500">Gerencie seus fornecedores e compras.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary">
              <Plus className="w-4 h-4 mr-2" /> Novo Fornecedor
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Fornecedor</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Nome/Razão Social</Label>
                <Input 
                  value={newSupplier.name} 
                  onChange={e => setNewSupplier({...newSupplier, name: e.target.value})} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label>CNPJ</Label>
                <Input 
                  value={newSupplier.cnpj} 
                  onChange={e => setNewSupplier({...newSupplier, cnpj: formatCNPJ(e.target.value)})}
                  maxLength="18"
                  placeholder="XX.XXX.XXX/XXXX-XX"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input 
                  type="email" 
                  value={newSupplier.email} 
                  onChange={e => setNewSupplier({...newSupplier, email: e.target.value})} 
                  placeholder="exemplo@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input 
                  value={newSupplier.phone} 
                  onChange={e => setNewSupplier({...newSupplier, phone: formatPhoneNumber(e.target.value)})}
                  maxLength="15"
                  placeholder="(XX) XXXXX-XXXX"
                />
              </div>
              <div className="flex justify-end pt-4">
                <Button type="submit" className="bg-primary">Salvar Fornecedor</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Buscar por nome ou email..." 
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total em Compras</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedSuppliers.length > 0 ? (
                paginatedSuppliers.map((s) => (
                  <TableRow key={s.id} className="hover:bg-slate-50/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-primary600 flex items-center justify-center font-semibold">
                          {s.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-medium text-slate-900 block">{s.name}</span>
                          {s.cnpj && <span className="text-xs text-slate-500">{s.cnpj}</span>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-sm text-slate-500 gap-1">
                        {s.email && <div className="flex items-center gap-2"><Mail className="w-3 h-3" /> {s.email}</div>}
                        {s.phone && <div className="flex items-center gap-2"><Phone className="w-3 h-3" /> {s.phone}</div>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={
                        s.status === 'active' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-600'
                      }>
                        {s.status === 'active' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-primary600 font-semibold">
                        <Building2 className="w-4 h-4" />
                        R$ {getSupplierPurchases(s.id).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 text-primary600 hover:text-primary700 hover:bg-blue-50"
                          onClick={() => openNewPurchaseDialog(s)}
                        >
                          <ShoppingCart className="w-4 h-4 mr-1" /> Compra
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 text-slate-600 hover:text-slate-700 hover:bg-slate-50"
                          onClick={() => openPurchasesViewDialog(s)}
                        >
                          <Eye className="w-4 h-4 mr-1" /> Ver
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="w-4 h-4 text-slate-400" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="text-rose-600" onClick={() => deleteMutation.mutate(s.id)}>
                              <Trash2 className="w-4 h-4 mr-2" /> Remover
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-slate-500">
                    Nenhum fornecedor encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <Pagination 
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={filteredSuppliers.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
        />
      </div>

      <NewPurchaseDialog 
        supplier={selectedSupplier}
        open={isNewPurchaseDialogOpen}
        onOpenChange={setIsNewPurchaseDialogOpen}
      />

      <SupplierPurchasesDialog
        supplier={selectedSupplier}
        open={isPurchasesViewDialogOpen}
        onOpenChange={setIsPurchasesViewDialogOpen}
      />
    </div>
  );
}