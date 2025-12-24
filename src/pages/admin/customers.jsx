import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Download, MoreVertical, Trash2, Eye } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const apiRequest = async (url, options = {}) => {
  const token = JSON.parse(localStorage.getItem('auth') || '{}').token;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Request failed');
  }
  
  return response.json();
};

const exportToExcel = (data) => {
  const csv = [
    ['Data Criação', 'Nome', 'Empresa', 'Email', 'Telefone', 'CPF/CNPJ', 'Status'],
    ...data.map(c => [
      new Date(c.createdAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
      c.name || '',
      c.companyName || '',
      c.email || '',
      c.phone || '',
      c.contact || '',
      c.status || '',
    ])
  ].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `clientes-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
};

function CustomerListContent() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['/api/admin/customers'],
    queryFn: () => apiRequest('/api/admin/customers'),
  });

  const updateMutation = useMutation({
    mutationFn: (data) => apiRequest(`/api/admin/customers/${data.id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/customers'] });
      toast({ title: 'Sucesso', description: 'Cliente atualizado' });
      setSelectedCustomer(null);
    },
    onError: (error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => apiRequest(`/api/admin/customers/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/customers'] });
      toast({ title: 'Sucesso', description: 'Cliente deletado' });
      setDeleteConfirm(null);
    },
    onError: (error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.companyName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 p-4 sm:p-6 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Clientes do Sistema</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Gerencie todos os clientes de todas as empresas</p>
        </div>
        <Button onClick={() => exportToExcel(customers)} className="gap-2 w-full sm:w-auto">
          <Download className="h-4 w-4" />
          Exportar Excel
        </Button>
      </div>

      {/* Filtro */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Buscar por nome, email ou empresa..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
          data-testid="input-search-customers"
        />
      </div>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>CPF/CNPJ</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan="7" className="text-center py-8 text-muted-foreground">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan="7" className="text-center py-8 text-muted-foreground">
                      Nenhum cliente encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((c) => (
                    <TableRow key={c.id} data-testid={`row-customer-${c.id}`}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>{c.companyName}</TableCell>
                      <TableCell>{c.email || '-'}</TableCell>
                      <TableCell>{c.phone || '-'}</TableCell>
                      <TableCell>{c.contact || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={c.status === 'ativo' ? 'default' : 'destructive'}>
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`button-actions-${c.id}`}>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedCustomer(c)} data-testid={`action-edit-${c.id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver/Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDeleteConfirm(c)} className="text-destructive" data-testid={`action-delete-${c.id}`}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Deletar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {selectedCustomer && (
        <Dialog open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Editar Cliente</DialogTitle>
              <DialogDescription>Altere as informações do cliente abaixo</DialogDescription>
            </DialogHeader>
            <EditCustomerForm customer={selectedCustomer} onSave={(data) => updateMutation.mutate(data)} />
          </DialogContent>
        </Dialog>
      )}

      {deleteConfirm && (
        <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Deletar Cliente?</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja deletar <strong>{deleteConfirm.name}</strong>? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteMutation.mutate(deleteConfirm.id)} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Deletar
            </AlertDialogAction>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

function EditCustomerForm({ customer, onSave }) {
  const form = useForm({
    defaultValues: {
      id: customer.id,
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone || '',
      contact: customer.contact || '',
      status: customer.status,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSave)} className="space-y-4">
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem>
            <FormLabel>Nome</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="email" render={({ field }) => (
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl><Input type="email" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="phone" render={({ field }) => (
          <FormItem>
            <FormLabel>Telefone</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="contact" render={({ field }) => (
          <FormItem>
            <FormLabel>CPF/CNPJ</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <Button type="submit" className="w-full">Salvar Alterações</Button>
      </form>
    </Form>
  );
}

export default function AdminCustomers() {
  return (
    <Layout>
      <CustomerListContent />
    </Layout>
  );
}
