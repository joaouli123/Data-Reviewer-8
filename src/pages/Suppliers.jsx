import React, { useState } from 'react';
import { Supplier, Category } from '@/api/entities'; // Removi Transaction e Purchase não usados diretamente
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Mail, Phone, MoreHorizontal, Trash2, ShoppingCart, Eye, Edit, RefreshCw, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import NewPurchaseDialog from '../components/suppliers/NewPurchaseDialog';
import SupplierPurchasesDialog from '../components/suppliers/SupplierPurchasesDialog';
import SupplierFormDialog from '../components/suppliers/SupplierFormDialog';
import Pagination from '../components/Pagination';
import { formatPhoneNumber, formatCNPJ, formatCPF } from '@/utils/masks'; // Importante usar estes
import { useAuth } from '@/contexts/AuthContext';

export default function SuppliersPage() {
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isNewPurchaseDialogOpen, setIsNewPurchaseDialogOpen] = useState(false);
  const [isPurchasesViewDialogOpen, setIsPurchasesViewDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [supplierToDelete, setSupplierToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { company, user } = useAuth();
  const queryClient = useQueryClient();

  const hasPermission = (permission) => {
    if (user?.role === 'admin' || user?.isSuperAdmin) return true;
    return !!user?.permissions?.[permission];
  };

  if (!hasPermission('view_suppliers')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-4">
        <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mb-4">
          <Building2 className="w-8 h-8 text-rose-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Acesso Negado</h2>
        <p className="text-slate-500 max-w-md">
          Você não tem permissão para visualizar fornecedores. Entre em contato com o administrador da sua empresa.
        </p>
      </div>
    );
  }

  // 1. Query Principal
  const { 
    data: suppliersData, 
    isLoading, 
    refetch, 
    isRefetching 
  } = useQuery({
    queryKey: ['/api/suppliers', company?.id],
    queryFn: () => Supplier.list(),
    enabled: !!company?.id,
  });

  const suppliers = Array.isArray(suppliersData) ? suppliersData : (suppliersData?.data || []);

  // 2. Categorias para o formulário
  const { data: expenseCategories = [] } = useQuery({
    queryKey: ['/api/categories', company?.id],
    queryFn: async () => {
      const data = await Category.list();
      return Array.isArray(data) ? data : (data?.data || []);
    },
    enabled: !!company?.id,
    staleTime: 1000 * 60 * 30, 
  });

  // NOTA: Removi as queries de transactions e purchases pois elas não estavam sendo usadas na renderização da lista.
  // O valor total já vem calculado do backend no campo 'totalPurchases'.

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
      toast.success(selectedSupplier ? 'Fornecedor atualizado!' : 'Fornecedor adicionado!');
    },
    onError: (error) => {
      toast.error(error?.message || 'Erro ao salvar fornecedor');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => Supplier.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers', company?.id] });
      // Também invalida transações pois deletar fornecedor afeta o histórico
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      toast.success('Fornecedor removido.');
      setSupplierToDelete(null);
    },
    onError: (error) => {
      toast.error(error?.message || 'Erro ao deletar fornecedor');
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

  // 3. Filtragem e Ordenação Otimizada
  const filteredSuppliers = (suppliers || [])
    .filter(s => {
      const search = searchTerm.toLowerCase();
      const cleanSearch = search.replace(/\D/g, '');
      // Adicionado verificação segura de null/undefined
      return (
        (s.name?.toLowerCase() || '').includes(search) || 
        (s.email?.toLowerCase() || '').includes(search) ||
        (s.cpf?.replace(/\D/g, '') || '').includes(cleanSearch) || // Busca ignorando pontuação
        (s.cnpj?.replace(/\D/g, '') || '').includes(cleanSearch) // Busca ignorando pontuação
      );
    })
    .sort((a, b) => Number(b.id) - Number(a.id)); // Ordenação simplificada assumindo ID numérico ou string numérica

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedSuppliers = filteredSuppliers.slice(startIndex, endIndex);

  // Função auxiliar para formatar moeda
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Fornecedores</h1>
          <p className="text-xs sm:text-sm text-slate-500">Gerencie seus fornecedores e compras.</p>
        </div>

        <div className="flex gap-2 w-full sm:w-auto flex-col sm:flex-row">
          <Button 
            variant="outline"
            onClick={() => {
                // 4. CORREÇÃO: Atualizar a lista de fornecedores E transações para garantir totais atualizados
                refetch();
                queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
            }}
            disabled={isRefetching}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
            {isRefetching ? 'Atualizando...' : 'Atualizar'}
          </Button>
          {hasPermission('manage_suppliers') && (
            <Button 
              className="bg-primary hover:bg-primary gap-2"
              onClick={() => openFormDialog()}
            >
              <Plus className="w-4 h-4" /> Novo Fornecedor
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Buscar por nome, email ou CNPJ..." 
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
                <TableHead className="text-left">CPF/CNPJ</TableHead>
                <TableHead className="text-left">Email</TableHead>
                <TableHead className="text-left">Telefone</TableHead>
                <TableHead className="text-right">Total em Compras</TableHead>
                <TableHead className="text-right pr-6">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                 <TableRow>
                   <TableCell colSpan={6} className="h-24 text-center">Carregando...</TableCell>
                 </TableRow>
              ) : paginatedSuppliers.length > 0 ? (
                paginatedSuppliers.map((s) => (
                  <TableRow key={s.id} className="hover:bg-slate-50/50 group">
                    <TableCell className="pl-6 text-left">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                          {s.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-slate-900">{s.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-left">
                      {/* 5. CORREÇÃO: Aplicando máscara de CPF/CNPJ */}
                      {s.cpf ? (
                        <span className="font-medium text-slate-700">{formatCPF(s.cpf)}</span>
                      ) : s.cnpj ? (
                        <span className="font-medium text-slate-700">{formatCNPJ(s.cnpj)}</span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-left">
                      {s.email ? <div className="flex items-center gap-2 text-sm text-slate-700"><Mail className="w-3 h-3" /> {s.email}</div> : <span className="text-slate-400">-</span>}
                    </TableCell>
                    <TableCell className="text-left">
                      {/* 5. CORREÇÃO: Aplicando máscara de Telefone */}
                      {s.phone ? <div className="flex items-center gap-2 text-sm text-slate-700"><Phone className="w-3 h-3" /> {formatPhoneNumber(s.phone)}</div> : <span className="text-slate-400">-</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="text-primary font-semibold">
                        {formatCurrency(s.totalPurchases)}
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
                              onClick={() => setSupplierToDelete(s)}
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
                  <TableCell colSpan={6} className="text-center py-10 text-slate-500">
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

      <AlertDialog open={!!supplierToDelete} onOpenChange={(open) => !open && setSupplierToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Fornecedor</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o fornecedor <strong>{supplierToDelete?.name}</strong>? 
              <br /><br />
              <span className="text-rose-600 font-semibold">Aviso: Isso vai deletar todo o histórico de compras e transações associadas a este fornecedor. Esta ação não pode ser desfeita.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (supplierToDelete) {
                  deleteMutation.mutate(supplierToDelete.id);
                }
              }}
              disabled={deleteMutation.isPending}
              className="bg-rose-600 hover:bg-rose-700"
            >
              {deleteMutation.isPending ? 'Removendo...' : 'Sim, remover tudo'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}