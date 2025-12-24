import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Download, MoreVertical, Trash2, Eye, Lock, Unlock, Building2 } from 'lucide-react';
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
    ['Data Assinatura', 'Nome Empresa', 'Comprador', 'Plano', 'Valor', 'Forma Pagamento', 'Vencimento', 'Status'],
    ...data.map(s => [
      formatDateWithTimezone(s.createdAt),
      s.companyName || '',
      s.subscriberName || '',
      s.plan || '',
      s.amount ? `R$ ${parseFloat(s.amount).toFixed(2)}` : 'N/A',
      s.paymentMethod || '',
      s.isLifetime ? 'Vitalício' : (s.expiresAt ? formatDateWithTimezone(s.expiresAt) : 'N/A'),
      s.status === 'active' ? 'Ativa' : s.status === 'blocked' ? 'Bloqueada' : 'Inativa',
    ])
  ].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `assinaturas-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
};

function SubscriptionListContent() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const { data: subscriptions = [], isLoading } = useQuery({
    queryKey: ['/api/admin/subscriptions'],
    queryFn: () => apiRequest('/api/admin/subscriptions'),
  });

  const updateMutation = useMutation({
    mutationFn: (data) => apiRequest(`/api/admin/subscriptions/${data.id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/subscriptions'] });
      toast({ title: 'Sucesso', description: 'Assinatura atualizada com sucesso' });
      setSelectedSubscription(null);
    },
    onError: (error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => apiRequest(`/api/admin/subscriptions/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/subscriptions'] });
      toast({ title: 'Sucesso', description: 'Assinatura deletada com sucesso' });
      setDeleteConfirm(null);
    },
    onError: (error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (subscription) => apiRequest(`/api/admin/subscriptions/${subscription.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ 
        status: subscription.status === 'active' ? 'blocked' : 'active' 
      }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/subscriptions'] });
      toast({ title: 'Sucesso', description: 'Status da assinatura atualizado' });
    },
    onError: (error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  const filtered = subscriptions.filter(s =>
    (s.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.subscriberName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.plan?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const isActive = (subscription) => {
    if (subscription.status === 'blocked') return false;
    if (subscription.isLifetime) return true;
    if (subscription.expiresAt) {
      return new Date(subscription.expiresAt) > new Date();
    }
    return subscription.status === 'active';
  };

  return (
    <div className="space-y-6 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-foreground">Assinaturas</h1>
          <p className="text-sm text-muted-foreground mt-2">Gerencie todas as assinaturas das empresas</p>
        </div>
        <Button 
          onClick={() => exportToExcel(subscriptions)} 
          className="gap-2 w-full md:w-auto"
          data-testid="button-export-subscriptions"
        >
          <Download className="h-4 w-4" />
          Exportar Excel
        </Button>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <Input
          placeholder="Buscar por empresa, comprador ou plano..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
          data-testid="input-search-subscriptions"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data Assinatura</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Comprador</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Forma Pagamento</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan="9" className="text-center py-8 text-muted-foreground">
                      Carregando assinaturas...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan="9" className="text-center py-8 text-muted-foreground">
                      Nenhuma assinatura encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((s) => (
                    <TableRow key={s.id} data-testid={`row-subscription-${s.id}`}>
                      <TableCell className="text-sm" data-testid={`text-created-${s.id}`}>
                        {formatDateWithTimezone(s.createdAt)}
                      </TableCell>
                      <TableCell className="font-medium">{s.companyName || 'N/A'}</TableCell>
                      <TableCell>{s.subscriberName || '-'}</TableCell>
                      <TableCell className="capitalize">{s.plan}</TableCell>
                      <TableCell className="font-mono">
                        {s.amount ? `R$ ${parseFloat(s.amount).toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell className="text-sm">{s.paymentMethod || '-'}</TableCell>
                      <TableCell className="text-sm">
                        {s.isLifetime ? (
                          <Badge variant="outline">Vitalício</Badge>
                        ) : s.expiresAt ? (
                          <div>
                            {formatDateWithTimezone(s.expiresAt)}
                            {isActive(s) ? '' : <span className="text-destructive"> (Expirada)</span>}
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={isActive(s) ? 'default' : s.status === 'blocked' ? 'destructive' : 'secondary'}
                          data-testid={`badge-status-${s.id}`}
                        >
                          {isActive(s) ? 'Ativa' : s.status === 'blocked' ? 'Bloqueada' : 'Inativa'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <SubscriptionActionsMenu
                          subscription={s}
                          onView={() => setSelectedSubscription(s)}
                          onToggleStatus={() => toggleStatusMutation.mutate(s)}
                          onDelete={() => setDeleteConfirm(s)}
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

      {/* Subscription Details Modal */}
      {selectedSubscription && (
        <Dialog open={!!selectedSubscription} onOpenChange={() => setSelectedSubscription(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Detalhes da Assinatura</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Empresa</p>
                  <p className="font-medium">{selectedSubscription.companyName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Comprador</p>
                  <p className="font-medium">{selectedSubscription.subscriberName || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Plano</p>
                  <p className="font-medium capitalize">{selectedSubscription.plan}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor</p>
                  <p className="font-medium">{selectedSubscription.amount ? `R$ ${parseFloat(selectedSubscription.amount).toFixed(2)}` : '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Forma de Pagamento</p>
                  <p className="font-medium">{selectedSubscription.paymentMethod || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data de Assinatura</p>
                  <p className="font-medium">{formatDateWithTimezone(selectedSubscription.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Vencimento</p>
                  <p className="font-medium">
                    {selectedSubscription.isLifetime ? 'Vitalício' : (selectedSubscription.expiresAt ? formatDateWithTimezone(selectedSubscription.expiresAt) : '-')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={selectedSubscription.status === 'active' ? 'default' : 'destructive'}>
                    {selectedSubscription.status === 'active' ? 'Ativa' : 'Bloqueada'}
                  </Badge>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Deletar Assinatura?</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja deletar a assinatura de <strong>{deleteConfirm.companyName}</strong>? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="bg-destructive/10 border border-destructive/20 rounded p-4 mb-4">
              <p className="text-sm text-destructive font-medium">
                Aviso: Isso vai deletar permanentemente a assinatura.
              </p>
            </div>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deleteConfirm.id)}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? 'Deletando...' : 'Deletar Assinatura'}
            </AlertDialogAction>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

function SubscriptionActionsMenu({ subscription, onView, onToggleStatus, onDelete, isStatusLoading }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          data-testid={`button-actions-${subscription.id}`}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onView} data-testid={`action-view-${subscription.id}`}>
          <Eye className="h-4 w-4 mr-2" />
          Ver Detalhes
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={onToggleStatus}
          disabled={isStatusLoading}
          className={subscription.status === 'blocked' ? 'text-green-600' : 'text-orange-600'}
          data-testid={`action-toggle-status-${subscription.id}`}
        >
          {subscription.status === 'blocked' ? (
            <>
              <Unlock className="h-4 w-4 mr-2" />
              Desbloquear
            </>
          ) : (
            <>
              <Lock className="h-4 w-4 mr-2" />
              Bloquear
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={onDelete}
          className="text-destructive"
          data-testid={`action-delete-${subscription.id}`}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Deletar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function AdminSubscriptions() {
  return <SubscriptionListContent />;
}
