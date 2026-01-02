import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Download, MoreVertical, Trash2, Eye, Power } from 'lucide-react';
import { CustomerEditModal } from '@/components/admin/CustomerEditModal';
import { formatDateWithTimezone } from '@/utils/dateFormatter';

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
      formatDateWithTimezone(c.createdAt),
      c.name || '',
      c.companyName || '',
      c.email || '',
      c.phone || '',
      c.document || '',
      c.status === 'active' ? 'Ativo' : c.status === 'blocked' ? 'Bloqueado' : 'Inativo',
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
      toast({ title: 'Sucesso', description: 'Cliente atualizado com sucesso' });
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
      toast({ title: 'Sucesso', description: 'Cliente deletado com sucesso' });
      setDeleteConfirm(null);
    },
    onError: (error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (customer) => apiRequest(`/api/admin/customers/${customer.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: customer.status === 'active' ? 'blocked' : 'active' }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/customers'] });
      toast({ title: 'Sucesso', description: 'Status do cliente atualizado' });
    },
    onError: (error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  const filtered = useMemo(() => {
    return customers.filter(c =>
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.companyName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [customers, searchTerm]);

  return (
    <div className="space-y-8 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold text-foreground">Clientes do Sistema</h1>
          <p className="text-sm text-muted-foreground mt-2">Gerencie todos os clientes de todas as empresas</p>
        </div>
        <Button 
          onClick={() => exportToExcel(customers)} 
          className="gap-2 w-full md:w-auto"
          data-testid="button-export-customers"
        >
          <Download className="h-4 w-4" />
          Exportar Excel
        </Button>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <Input
          placeholder="Buscar por nome, email ou empresa..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 bg-background border border-input"
          data-testid="input-search-customers"
        />
      </div>

      {/* Table */}
      <Card className="border-border/40">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data Criação</TableHead>
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
                    <TableCell colSpan="8" className="text-center py-8 text-muted-foreground">
                      Carregando clientes...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan="8" className="text-center py-8 text-muted-foreground">
                      Nenhum cliente encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((c) => (
                    <TableRow key={c.id} data-testid={`row-customer-${c.id}`}>
                      <TableCell className="text-sm" data-testid={`text-created-${c.id}`}>
                        {formatDateWithTimezone(c.createdAt)}
                      </TableCell>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>{c.companyName || 'N/A'}</TableCell>
                      <TableCell>{c.email || '-'}</TableCell>
                      <TableCell>{c.phone || '-'}</TableCell>
                      <TableCell className="font-mono text-sm">{c.document || '-'}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={c.status === 'active' ? 'default' : c.status === 'blocked' ? 'destructive' : 'secondary'}
                          data-testid={`badge-status-${c.id}`}
                        >
                          {c.status === 'active' ? 'Ativo' : c.status === 'blocked' ? 'Bloqueado' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <CustomerActionsMenu
                          customer={c}
                          onView={() => setSelectedCustomer(c)}
                          onToggleStatus={() => toggleStatusMutation.mutate(c)}
                          onDelete={() => setDeleteConfirm(c)}
                          isStatusLoading={toggleStatusMutation.isPending}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Customer Edit Modal */}
      <CustomerEditModal
        customer={selectedCustomer}
        open={!!selectedCustomer}
        onOpenChange={() => setSelectedCustomer(null)}
        onSave={updateMutation.mutate}
        isPending={updateMutation.isPending}
      />

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Deletar Cliente?</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja deletar <strong>{deleteConfirm.name}</strong>? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="bg-destructive/10 border border-destructive/20 rounded p-4 mb-4">
              <p className="text-sm text-destructive font-medium">
                Aviso: Isso vai deletar permanentemente o cliente e todos os seus dados.
              </p>
            </div>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deleteConfirm.id)}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? 'Deletando...' : 'Deletar Cliente'}
            </AlertDialogAction>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

function CustomerActionsMenu({ customer, onView, onToggleStatus, onDelete, isStatusLoading }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          data-testid={`button-actions-${customer.id}`}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onView} data-testid={`action-view-${customer.id}`}>
          <Eye className="h-4 w-4 mr-2" />
          Ver/Editar
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={onToggleStatus}
          disabled={isStatusLoading}
          className={customer.status === 'blocked' ? 'text-green-600' : 'text-orange-600'}
          data-testid={`action-toggle-status-${customer.id}`}
        >
          <Power className="h-4 w-4 mr-2" />
          {customer.status === 'active' ? 'Bloquear' : 'Desbloquear'}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={onDelete}
          className="text-destructive"
          data-testid={`action-delete-${customer.id}`}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Deletar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function AdminCustomers() {
  return <CustomerListContent />;
}
