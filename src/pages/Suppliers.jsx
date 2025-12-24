import React, { useState } from 'react';
import { Supplier, Purchase, Category } from '@/api/entities';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DialogTrigger } from "@/components/ui/dialog";
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Mail, Phone, Building2, MoreHorizontal, Trash2, ShoppingCart, Eye, Edit } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import NewPurchaseDialog from '../components/suppliers/NewPurchaseDialog';
import SupplierPurchasesDialog from '../components/suppliers/SupplierPurchasesDialog';
import SupplierFormDialog from '../components/suppliers/SupplierFormDialog';
import Pagination from '../components/Pagination';
import { formatPhoneNumber, formatCNPJ } from '@/utils/masks';

export default function SuppliersPage() {
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isNewPurchaseDialogOpen, setIsNewPurchaseDialogOpen] = useState(false);
  const [isPurchasesViewDialogOpen, setIsPurchasesViewDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  const { company } = useAuth();
  const queryClient = useQueryClient();

  const { data: suppliers, isLoading } = useQuery({
    queryKey: ['/api/suppliers', company?.id],
    queryFn: () => Supplier.list(),
    initialData: [],
    enabled: !!company?.id
  });

  const { data: expenseCategories = [] } = useQuery({
    queryKey: ['/api/categories', company?.id],
    queryFn: () => Category.list(),
    initialData: [],
    enabled: !!company?.id
  });

  const { data: transactionsData = [] } = useQuery({
    queryKey: ['/api/transactions', company?.id],
    queryFn: () => {
      // Direct API call with proper error handling
      return fetch('/api/transactions', {
        method: 'GET',
        credentials: 'include'
      }).then(res => {
        if (!res.ok) throw new Error('Failed to fetch transactions');
        return res.json();
      });
    },
    initialData: [],
    enabled: !!company?.id,
    staleTime: 5000,
    refetchOnMount: true,
    refetchOnWindowFocus: false
  });

  const transactions = Array.isArray(transactionsData) ? transactionsData : (transactionsData?.data || []);

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (selectedSupplier) {
        return Supplier.update(selectedSupplier.id, data);
      }
      return Supplier.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers', company?.id] });
      setIsFormDialogOpen(false);
      setSelectedSupplier(null);
      toast.success(selectedSupplier ? 'Fornecedor atualizado!' : 'Fornecedor adicionado!', { duration: 5000 });
    },
    onError: (error) => {
      console.error('Supplier save error:', error);
      const errorMsg = error?.message || 'Erro ao salvar fornecedor';
      toast.error(errorMsg, { duration: 5000 });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => Supplier.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers', company?.id] });
      toast.success('Fornecedor removido.', { duration: 5000 });
    }
  });

  const handleFormSubmit = (data) => {
    saveMutation.mutate(data);
  };

  const openFormDialog = (supplier = null) => {
    setSelectedSupplier(supplier);
    setIsFormDialogOpen(true);
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
    return transactions
      .filter(t => t.supplierId === supplierId && t.type === 'compra')
      .reduce((acc, t) => acc + (parseFloat(t.amount || 0) + parseFloat(t.interest || 0)), 0);
  };

  const getSupplierJoinDate = (supplier) => {
    if (supplier.join_date) {
      return format(parseISO(supplier.join_date), "MMM yyyy", { locale: ptBR });
    }
    
    const supplierTransactions = transactions.filter(t => t.supplierId === supplier.id);
    if (supplierTransactions.length > 0) {
      const earliestDate = new Date(Math.min(...supplierTransactions.map(t => new Date(t.date))));
      return format(earliestDate, "MMM yyyy", { locale: ptBR });
    }
    
    return '-';
  };

  const filteredSuppliers = suppliers
    .filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    // Sort by ID descending to show newest first
    .sort((a, b) => {
      if (typeof a.id === 'string' && typeof b.id === 'string') {
        return b.id.localeCompare(a.id);
      }
      return (b.id || 0) - (a.id || 0);
    });

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedSuppliers = filteredSuppliers.slice(startIndex, endIndex);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Fornecedores</h1>
          <p className="text-xs sm:text-sm text-slate-500">Gerencie seus fornecedores e compras.</p>
        </div>
        
        <Button 
          className="bg-primary hover:bg-primary w-full sm:w-auto"
          onClick={() => openFormDialog()}
        >
          <Plus className="w-4 h-4 mr-2" /> Novo Fornecedor
        </Button>
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
                <TableHead className="pl-6 text-left">Nome</TableHead>
                <TableHead className="text-left">Contato</TableHead>
                <TableHead className="text-left">Desde</TableHead>
                <TableHead className="text-right">Total em Compras</TableHead>
                <TableHead className="text-right pr-6">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedSuppliers.length > 0 ? (
                paginatedSuppliers.map((s) => (
                  <TableRow key={s.id} className="hover:bg-slate-50/50 group">
                    <TableCell className="pl-6 text-left">
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
                    <TableCell className="text-left">
                      <div className="flex flex-col text-sm text-slate-500 gap-1">
                        {s.email && <div className="flex items-center gap-2"><Mail className="w-3 h-3" /> {s.email}</div>}
                        {s.phone && <div className="flex items-center gap-2"><Phone className="w-3 h-3" /> {s.phone}</div>}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm text-left">
                      {getSupplierJoinDate(s)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="text-primary600 font-semibold">
                        R$ {getSupplierPurchases(s.id).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100">
                              <MoreHorizontal className="w-4 h-4 text-slate-500" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem 
                              className="cursor-pointer"
                              onClick={() => openFormDialog(s)}
                            >
                              <Edit className="w-4 h-4 mr-2" /> Editar Fornecedor
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-primary focus:text-primary focus:bg-blue-50 cursor-pointer"
                              onClick={() => openNewPurchaseDialog(s)}
                            >
                              <ShoppingCart className="w-4 h-4 mr-2" /> Nova Compra
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="cursor-pointer"
                              onClick={() => openPurchasesViewDialog(s)}
                            >
                              <Eye className="w-4 h-4 mr-2" /> Ver Histórico
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-rose-600 focus:text-rose-700 focus:bg-rose-50 cursor-pointer"
                              onClick={() => deleteMutation.mutate(s.id)}
                            >
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

      <SupplierFormDialog
        open={isFormDialogOpen}
        onOpenChange={setIsFormDialogOpen}
        supplier={selectedSupplier}
        onSubmit={handleFormSubmit}
        isLoading={saveMutation.isPending}
        categories={expenseCategories}
      />

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