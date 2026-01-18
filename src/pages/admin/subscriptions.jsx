import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Download, MoreVertical, Trash2, Eye, Mail, CheckCircle, XCircle, Send, Loader2, Sparkles } from 'lucide-react';
import { SubscriptionEditModal } from '@/components/admin/SubscriptionEditModal';
import { formatDateWithTimezone } from '@/utils/dateFormatter';
import { formatCurrency } from '@/utils/formatters';

const apiRequest = async (method, url, body = null) => {
  const token = JSON.parse(localStorage.getItem('auth') || '{}').token;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  };
  
  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(url, options);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Request failed');
  }
  
  return response.json();
};

const planLabels = {
  monthly: 'Mensal',
  basic: 'Básico',
  pro: 'Pro',
  enterprise: 'Enterprise',
};

const getPlanLabel = (plan) => planLabels[plan] || (plan ? plan.toUpperCase() : 'N/A');

const exportToExcel = (data) => {
  const csv = [
    ['Data Assinatura', 'Nome Empresa', 'Comprador', 'Plano', 'Valor', 'Forma Pagamento', 'Vencimento', 'Status Pagamento', 'Status Conta'],
    ...data.map(s => [
      formatDateWithTimezone(s.createdAt),
      s.companyName || '',
      s.subscriberName || '',
      getPlanLabel(s.plan),
      s.amount ? `R$ ${parseFloat(s.amount).toFixed(2)}` : 'N/A',
      s.paymentMethod || '',
      s.isLifetime ? 'Vitalício' : (s.expiresAt ? formatDateWithTimezone(s.expiresAt) : 'N/A'),
      s.companyPaymentStatus === 'approved' ? 'Pago' : s.companyPaymentStatus === 'rejected' ? 'Recusado' : 'Pendente',
      s.companySubscriptionStatus === 'active' ? 'Ativa' : s.companySubscriptionStatus === 'suspended' ? 'Suspensa' : 'Inativa',
    ])
  ].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `assinaturas-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
};

function SubscriptionListContent() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [mailSub, setMailSub] = useState(null);
  const [dueDate, setDueDate] = useState('');

  const { data: subscriptions = [], isLoading } = useQuery({
    queryKey: ['/api/admin/subscriptions'],
    queryFn: () => apiRequest('GET', '/api/admin/subscriptions'),
  });

  const updateMutation = useMutation({
    mutationFn: (data) => apiRequest('PATCH', `/api/admin/subscriptions/${data.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/subscriptions'] });
      toast.success('Sucesso: Assinatura atualizada com sucesso');
      setSelectedSubscription(null);
    },
    onError: (error) => {
      toast.error('Erro: ' + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => apiRequest('DELETE', `/api/admin/subscriptions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/subscriptions'] });
      toast.success('Sucesso: Assinatura deletada com sucesso');
      setDeleteConfirm(null);
    },
    onError: (error) => {
      toast.error('Erro: ' + error.message);
    },
  });

  const toggleCompanyStatus = useMutation({
    mutationFn: ({ companyId, subscriptionStatus, paymentStatus }) => 
      apiRequest('PATCH', `/api/admin/companies/${companyId}`, { 
        subscriptionStatus, 
        paymentStatus 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/subscriptions'] });
      toast.success('Status da empresa atualizado');
    },
    onError: (err) => toast.error(err.message),
  });

  const resendBoleto = useMutation({
    mutationFn: ({ id, dueDate }) => apiRequest('POST', `/api/admin/subscriptions/${id}/resend-boleto`, { dueDate }),
    onSuccess: (data) => {
      toast.success(data.message || 'Boleto enviado com sucesso');
      setMailSub(null);
      setDueDate('');
    },
    onError: (err) => toast.error(err.message),
  });

  const resendWelcome = useMutation({
    mutationFn: (id) => apiRequest('POST', `/api/admin/subscriptions/${id}/resend-welcome`),
    onSuccess: (data) => {
      toast.success(data.message || 'E-mail reenviado com sucesso');
    },
    onError: (err) => toast.error(err.message),
  });

  const normalized = useMemo(() => {
    const byCompany = new Map();
    subscriptions.forEach((s) => {
      const key = s.companyId || s.id;
      const existing = byCompany.get(key);
      if (!existing) {
        byCompany.set(key, s);
        return;
      }
      const existingDate = new Date(existing.createdAt || 0).getTime();
      const nextDate = new Date(s.createdAt || 0).getTime();
      if (nextDate >= existingDate) {
        byCompany.set(key, s);
      }
    });
    return Array.from(byCompany.values());
  }, [subscriptions]);

  const filtered = useMemo(() => {
    return normalized.filter(s =>
      (s.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.subscriberName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.paymentMethod?.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [normalized, searchTerm]);

  const getStatusBadge = (subscription) => {
    const now = new Date();
    const isExpired = !!subscription.expiresAt && new Date(subscription.expiresAt) <= now && !subscription.isLifetime;
    const isBlocked = subscription.status === 'blocked' || subscription.companySubscriptionStatus === 'suspended';

    if (subscription.status === 'pending') {
      return { variant: 'secondary', label: 'Pendente' };
    }

    if (isBlocked) {
      return { variant: 'destructive', label: 'Bloqueada' };
    }

    if (subscription.companyPaymentStatus === 'approved') {
      return { variant: 'default', label: 'Pago' };
    }

    if (isExpired) {
      return { variant: 'destructive', label: 'Vencido' };
    }

    return { variant: 'secondary', label: 'Pendente' };
  };

  return (
    <div className="space-y-8 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold text-foreground">Assinaturas e Pagamentos</h1>
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
          placeholder="Buscar por empresa, comprador ou forma de pagamento..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 bg-background border border-input"
          data-testid="input-search-subscriptions"
        />
      </div>

      {/* Table */}
      <Card className="border-border/40">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Data da Assinatura</TableHead>
                  <TableHead>Próximo Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan="7" className="text-center py-8 text-muted-foreground">
                      Carregando assinaturas...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan="7" className="text-center py-8 text-muted-foreground">
                      Nenhuma assinatura encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((s) => (
                    <TableRow key={s.id} data-testid={`row-subscription-${s.id}`}>
                      <TableCell>
                        <div className="font-medium">{s.companyName}</div>
                        <div className="text-xs text-muted-foreground font-mono">{s.companyDocument}</div>
                      </TableCell>
                      <TableCell><Badge variant="outline">{getPlanLabel(s.plan)}</Badge></TableCell>
                      <TableCell>{formatCurrency(s.amount)}</TableCell>
                      <TableCell className="text-sm">
                        {formatDateWithTimezone(s.createdAt)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {s.isLifetime ? (
                          <Badge variant="secondary">Vitalício</Badge>
                        ) : s.expiresAt ? (
                          formatDateWithTimezone(s.expiresAt)
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={getStatusBadge(s).variant}
                          data-testid={`badge-status-${s.id}`}
                        >
                          {getStatusBadge(s).label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <SubscriptionActionsMenu
                          subscription={s}
                          onView={() => setSelectedSubscription(s)}
                          onResendBoleto={() => setMailSub(s)}
                          onResendWelcome={() => resendWelcome.mutate(s.id)}
                          onToggleCompanyStatus={(payload) => toggleCompanyStatus.mutate({ companyId: s.companyId, ...payload })}
                          onDelete={() => setDeleteConfirm(s)}
                          isPending={toggleCompanyStatus.isPending || resendBoleto.isPending || resendWelcome.isPending}
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

      {/* Send Email Dialog */}
      <Dialog open={!!mailSub} onOpenChange={() => setMailSub(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar Boleto por E-mail</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Data de Vencimento do Boleto</Label>
              <Input 
                type="date" 
                value={dueDate} 
                onChange={(e) => setDueDate(e.target.value)} 
              />
            </div>
            {mailSub && (
              <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                Enviando boleto de <strong>R$ {parseFloat(mailSub.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> para a empresa <strong>{mailSub.companyName}</strong>.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setMailSub(null)}>Cancelar</Button>
            <Button 
              onClick={() => resendBoleto.mutate({ id: mailSub.id, dueDate })}
              disabled={!dueDate || resendBoleto.isPending}
            >
              {resendBoleto.isPending ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Send className="w-4 h-4 mr-2" />}
              Confirmar e Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subscription Edit Modal */}
      {selectedSubscription && (
        <SubscriptionEditModal
          subscription={selectedSubscription}
          open={!!selectedSubscription}
          onOpenChange={() => setSelectedSubscription(null)}
          onSave={updateMutation.mutateAsync}
          isPending={updateMutation.isPending}
        />
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

function SubscriptionActionsMenu({ subscription, onView, onResendBoleto, onResendWelcome, onToggleCompanyStatus, onDelete, isPending }) {
  const isPaid = subscription.companyPaymentStatus === 'approved' && subscription.status === 'active';
  const isCompanyActive = subscription.companySubscriptionStatus === 'active';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          disabled={isPending}
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
        <DropdownMenuItem onClick={onResendBoleto} data-testid={`action-resend-${subscription.id}`}>
          <Mail className="h-4 w-4 mr-2" />
          Enviar E-mail
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onResendWelcome} data-testid={`action-resend-welcome-${subscription.id}`}>
          <Sparkles className="h-4 w-4 mr-2" />
          Reenviar Boas-vindas
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() =>
            onToggleCompanyStatus(
              isPaid
                ? { subscriptionStatus: 'suspended', paymentStatus: 'pending' }
                : { subscriptionStatus: 'active', paymentStatus: 'approved' }
            )
          }
          className={isPaid ? 'text-destructive' : 'text-green-600'}
          data-testid={`action-toggle-status-${subscription.id}`}
        >
          {isPaid ? (
            <><XCircle className="h-4 w-4 mr-2" /> Suspender Conta</>
          ) : (
            <><CheckCircle className="h-4 w-4 mr-2" /> Ativar Conta (confirmar pagamento)</>
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
