import React, { useState } from 'react';
import { Customer, Category } from '@/api/entities';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DialogTrigger } from "@/components/ui/dialog";
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Mail, Phone, User, MoreHorizontal, Trash2, TrendingUp, Eye, Edit } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import CustomerSalesDialog from '../components/customers/CustomerSalesDialog';
import NewSaleDialog from '../components/customers/NewSaleDialog';
import CustomerFormDialog from '../components/customers/CustomerFormDialog';
import Pagination from '../components/Pagination';
import { formatPhoneNumber } from '@/utils/masks';

export default function CustomersPage() {
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isNewSaleDialogOpen, setIsNewSaleDialogOpen] = useState(false);
  const [isSalesViewDialogOpen, setIsSalesViewDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  const { company } = useAuth();
  const queryClient = useQueryClient();

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['/api/customers', company?.id],
    queryFn: () => Customer.list(),
    enabled: !!company?.id,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchInterval: false,
    refetchOnReconnect: false,
    retry: 1
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['/api/categories', company?.id],
    queryFn: async () => {
      const data = await Category.list();
      return data || [];
    },
    enabled: !!company?.id,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchInterval: false,
    refetchOnReconnect: false,
    retry: 1
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (selectedCustomer) {
        return Customer.update(selectedCustomer.id, data);
      }
      return Customer.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers', company?.id] });
      setIsFormDialogOpen(false);
      setSelectedCustomer(null);
      toast.success(selectedCustomer ? 'Cliente atualizado!' : 'Cliente adicionado!', { duration: 5000 });
    },
    onError: (error) => {
      console.error('Customer save error:', error);
      const errorMsg = error?.message || 'Erro ao salvar cliente';
      // Se houver detalhes do Zod, mostrar de forma mais amigável
      const details = error?.details ? `: ${JSON.stringify(error.details)}` : '';
      toast.error(`${errorMsg}${details}`, { duration: 8000 });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => Customer.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers', company?.id] });
      toast.success('Cliente removido.', { duration: 5000 });
      setCustomerToDelete(null);
    },
    onError: (error) => {
      console.error('Delete error:', error);
      toast.error(error?.message || 'Erro ao deletar cliente', { duration: 5000 });
    }
  });

  const handleFormSubmit = (data) => {
    console.log('📝 Form submitted:', data);
    saveMutation.mutate(data);
  };

  const openFormDialog = (customer = null) => {
    setSelectedCustomer(customer);
    setIsFormDialogOpen(true);
  };

  const openNewSaleDialog = (customer) => {
    setSelectedCustomer(customer);
    setIsNewSaleDialogOpen(true);
  };

  const openSalesViewDialog = (customer) => {
    setSelectedCustomer(customer);
    setIsSalesViewDialogOpen(true);
  };

  // Get customer sales from the totalSales field calculated by the backend
  const getCustomerSales = (customer) => {
    return customer?.totalSales || 0;
  };

  const filteredCustomers = customers
    .filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.cnpj?.toLowerCase().includes(searchTerm.toLowerCase())
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
  const paginatedCustomers = filteredCustomers.slice(startIndex, endIndex);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Clientes</h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Gerencie sua base de clientes e contatos.
            </p>
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto flex-col sm:flex-row">
          <Button 
            className="bg-primary hover:bg-primary"
            onClick={() => openFormDialog()}
          >
            <Plus className="w-4 h-4 mr-2" /> Novo Cliente
          </Button>
        </div>
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
                        <TableHead className="text-left">CNPJ</TableHead>
                        <TableHead className="text-left">Email</TableHead>
                        <TableHead className="text-left">Telefone</TableHead>
                        <TableHead className="text-right">Total em Vendas</TableHead>
                        <TableHead className="text-right pr-6">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {paginatedCustomers.length > 0 ? (
                        paginatedCustomers.map((c) => (
                            <TableRow key={c.id} className="hover:bg-slate-50/50 group">
                                <TableCell className="pl-6 text-left">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                                            {c.name.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="font-medium text-slate-900">{c.name}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-left">
                                    {c.cnpj ? <span className="font-medium text-slate-700">{c.cnpj}</span> : <span className="text-slate-400">-</span>}
                                </TableCell>
                                <TableCell className="text-left">
                                    {c.email ? <div className="flex items-center gap-2 text-sm text-slate-700"><Mail className="w-3 h-3" /> {c.email}</div> : <span className="text-slate-400">-</span>}
                                </TableCell>
                                <TableCell className="text-left">
                                    {c.phone ? <div className="flex items-center gap-2 text-sm text-slate-700"><Phone className="w-3 h-3" /> {c.phone}</div> : <span className="text-slate-400">-</span>}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="font-semibold text-emerald-600">
                                        {`R$ ${getCustomerSales(c).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
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
                                                    onClick={() => openFormDialog(c)}
                                                >
                                                    <Edit className="w-4 h-4 mr-2" /> Editar Cliente
                                                </DropdownMenuItem>
                                                <DropdownMenuItem 
                                                    className="text-primary focus:text-primary focus:bg-primary/5 cursor-pointer"
                                                    onClick={() => openNewSaleDialog(c)}
                                                >
                                                    <TrendingUp className="w-4 h-4 mr-2" /> Nova Venda
                                                </DropdownMenuItem>
                                                <DropdownMenuItem 
                                                    className="cursor-pointer"
                                                    onClick={() => openSalesViewDialog(c)}
                                                >
                                                    <Eye className="w-4 h-4 mr-2" /> Ver Histórico
                                                </DropdownMenuItem>
                                                <DropdownMenuItem 
                                                    className="text-rose-600 focus:text-rose-700 focus:bg-rose-50 cursor-pointer"
                                                    onClick={() => setCustomerToDelete(c)}
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
                                Nenhum cliente encontrado.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
        <Pagination 
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={filteredCustomers.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
        />
      </div>

      <CustomerFormDialog
        open={isFormDialogOpen}
        onOpenChange={setIsFormDialogOpen}
        customer={selectedCustomer}
        onSubmit={handleFormSubmit}
        isLoading={saveMutation.isPending}
        categories={categories}
      />

      <NewSaleDialog 
        customer={selectedCustomer}
        open={isNewSaleDialogOpen}
        onOpenChange={setIsNewSaleDialogOpen}
      />

      <CustomerSalesDialog
        customer={selectedCustomer}
        open={isSalesViewDialogOpen}
        onOpenChange={setIsSalesViewDialogOpen}
      />

      <AlertDialog open={!!customerToDelete} onOpenChange={(open) => !open && setCustomerToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Cliente</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o cliente <strong>{customerToDelete?.name}</strong>? 
              <br /><br />
              <span className="text-rose-600 font-semibold">Aviso: Isso vai deletar todo o histórico de vendas e transações associadas a este cliente. Esta ação não pode ser desfeita.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (customerToDelete) {
                  deleteMutation.mutate(customerToDelete.id);
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