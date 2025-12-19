import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Mail, Phone, User, MoreHorizontal, Trash2, DollarSign, TrendingUp, Eye } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import CustomerSalesDialog from '../components/customers/CustomerSalesDialog';
import NewSaleDialog from '../components/customers/NewSaleDialog';

export default function CustomersPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isNewSaleDialogOpen, setIsNewSaleDialogOpen] = useState(false);
  const [isSalesViewDialogOpen, setIsSalesViewDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newCustomer, setNewCustomer] = useState({ name: '', email: '', phone: '', status: 'active' });
  
  const queryClient = useQueryClient();

  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list(),
    initialData: []
  });

  const { data: sales } = useQuery({
    queryKey: ['sales'],
    queryFn: () => base44.entities.Sale.list(),
    initialData: []
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Customer.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setIsDialogOpen(false);
      setNewCustomer({ name: '', email: '', phone: '', status: 'active' });
      toast.success('Cliente adicionado!');
    }
  });



  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Customer.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Cliente removido.');
    }
  });

  const handleCreate = (e) => {
    e.preventDefault();
    createMutation.mutate({
        ...newCustomer,
        join_date: format(new Date(), 'yyyy-MM-dd'),
        ltv: 0
    });
  };

  const openNewSaleDialog = (customer) => {
    setSelectedCustomer(customer);
    setIsNewSaleDialogOpen(true);
  };

  const openSalesViewDialog = (customer) => {
    setSelectedCustomer(customer);
    setIsSalesViewDialogOpen(true);
  };

  // Calculate customer sales
  const getCustomerSales = (customerId) => {
    return sales
      .filter(s => s.customer_id === customerId)
      .reduce((acc, s) => acc + (s.total_amount || 0), 0);
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold text-slate-900">Clientes</h1>
            <p className="text-slate-500">Gerencie sua base de clientes e contatos.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
                <Button className="bg-indigo-600 hover:bg-indigo-700">
                    <Plus className="w-4 h-4 mr-2" /> Novo Cliente
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Adicionar Cliente</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <Label>Nome Completo</Label>
                        <Input 
                            value={newCustomer.name} 
                            onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} 
                            required 
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Email</Label>
                        <Input 
                            type="email" 
                            value={newCustomer.email} 
                            onChange={e => setNewCustomer({...newCustomer, email: e.target.value})} 
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Telefone</Label>
                        <Input 
                            value={newCustomer.phone} 
                            onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} 
                        />
                    </div>
                    <div className="flex justify-end pt-4">
                        <Button type="submit" className="bg-indigo-600">Salvar Cliente</Button>
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
                        <TableHead>Total em Vendas</TableHead>
                        <TableHead>Desde</TableHead>
                        <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredCustomers.length > 0 ? (
                        filteredCustomers.map((c) => (
                            <TableRow key={c.id} className="hover:bg-slate-50/50">
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-semibold">
                                            {c.name.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="font-medium text-slate-900">{c.name}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col text-sm text-slate-500 gap-1">
                                        {c.email && <div className="flex items-center gap-2"><Mail className="w-3 h-3" /> {c.email}</div>}
                                        {c.phone && <div className="flex items-center gap-2"><Phone className="w-3 h-3" /> {c.phone}</div>}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="secondary" className={
                                        c.status === 'active' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-600'
                                    }>
                                        {c.status === 'active' ? 'Ativo' : 'Inativo'}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2 text-emerald-600 font-semibold">
                                        <DollarSign className="w-4 h-4" />
                                        R$ {getCustomerSales(c.id).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </div>
                                </TableCell>
                                <TableCell className="text-slate-500 text-sm">
                                    {c.join_date ? format(parseISO(c.join_date), "MMM yyyy", { locale: ptBR }) : '-'}
                                </TableCell>
                                <TableCell>
                                    <div className="flex gap-1">
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="h-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                                            onClick={() => openNewSaleDialog(c)}
                                        >
                                            <TrendingUp className="w-4 h-4 mr-1" /> Venda
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="h-8 text-slate-600 hover:text-slate-700 hover:bg-slate-50"
                                            onClick={() => openSalesViewDialog(c)}
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
                                                <DropdownMenuItem className="text-rose-600" onClick={() => deleteMutation.mutate(c.id)}>
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
      </div>

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
    </div>
  );
}