import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input as FormInput } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { Download, MoreVertical, Trash2, Eye, Lock, Power, RotateCcw } from 'lucide-react';
import { UserEditModal } from '@/components/admin/UserEditModal';
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
    ['Data Criação', 'Nome', 'Usuário', 'Empresa', 'Email', 'Telefone', 'Função', 'Status'],
    ...data.map(u => [
      formatDateWithTimezone(u.createdAt),
      u.name || '',
      u.username || '',
      u.companyName || '',
      u.email || '',
      u.phone || '',
      u.role || '',
      u.status === 'active' ? 'Ativo' : u.status === 'suspended' ? 'Suspenso' : 'Inativo',
    ])
  ].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `usuarios-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
};

function UserListContent() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [resetPassword, setResetPassword] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['/api/admin/users'],
    queryFn: () => apiRequest('GET', '/api/admin/users'),
  });

  const users = usersData || [];

  const updateMutation = useMutation({
    mutationFn: (data) => apiRequest('PATCH', `/api/admin/users/${data.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({ title: 'Sucesso', description: 'Usuário atualizado' });
      setSelectedUser(null);
    },
    onError: (error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ userId, newPassword: pwd }) => apiRequest('POST', `/api/admin/users/${userId}/reset-password`, { newPassword: pwd }),
    onSuccess: () => {
      toast({ title: 'Sucesso', description: 'Senha redefinida com sucesso' });
      setResetPassword(null);
      setNewPassword('');
    },
    onError: (error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => apiRequest('DELETE', `/api/admin/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({ title: 'Sucesso', description: 'Usuário deletado' });
      setDeleteConfirm(null);
    },
    onError: (error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (user) => apiRequest('PATCH', `/api/admin/users/${user.id}`, { status: user.status === 'active' ? 'suspended' : 'active' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({ title: 'Sucesso', description: 'Status do usuário atualizado' });
    },
    onError: (error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  const filtered = useMemo(() => {
    return users.filter(u =>
      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.companyName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  return (
    <div className="space-y-8 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold text-foreground">Usuários do Sistema</h1>
          <p className="text-sm text-muted-foreground mt-2">Gerencie todos os usuários de todas as empresas</p>
        </div>
        <Button 
          onClick={() => exportToExcel(users)} 
          className="gap-2 w-full md:w-auto"
          data-testid="button-export-users"
        >
          <Download className="h-4 w-4" />
          Exportar Excel
        </Button>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <Input
          placeholder="Buscar por nome, usuário, email ou empresa..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 bg-background border border-input"
          data-testid="input-search-users"
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
                  <TableHead>Usuário</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan="9" className="text-center py-8 text-muted-foreground">
                      Carregando usuários...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan="9" className="text-center py-8 text-muted-foreground">
                      Nenhum usuário encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((u) => (
                    <TableRow key={u.id} data-testid={`row-user-${u.id}`}>
                      <TableCell className="text-sm" data-testid={`text-created-${u.id}`}>
                        {formatDateWithTimezone(u.createdAt)}
                      </TableCell>
                      <TableCell className="font-medium">{u.name || 'N/A'}</TableCell>
                      <TableCell>{u.username}</TableCell>
                      <TableCell>{u.companyName || 'N/A'}</TableCell>
                      <TableCell>{u.email || '-'}</TableCell>
                      <TableCell>{u.phone || '-'}</TableCell>
                      <TableCell className="capitalize">{u.role}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={u.status === 'active' ? 'default' : u.status === 'suspended' ? 'destructive' : 'secondary'}
                          data-testid={`badge-status-${u.id}`}
                        >
                          {u.status === 'active' ? 'Ativo' : u.status === 'suspended' ? 'Suspenso' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <UserActionsMenu
                          user={u}
                          onView={() => setSelectedUser(u)}
                          onToggleStatus={() => toggleStatusMutation.mutate(u)}
                          onResetPassword={() => setResetPassword(u)}
                          onDelete={() => setDeleteConfirm(u)}
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

      {/* User Edit Modal */}
      <UserEditModal
        user={selectedUser}
        open={!!selectedUser}
        onOpenChange={() => setSelectedUser(null)}
        onSave={updateMutation.mutate}
        isPending={updateMutation.isPending}
      />

      {/* Reset Password Dialog */}
      {resetPassword && (
        <Dialog open={!!resetPassword} onOpenChange={() => setResetPassword(null)}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Redefinir Senha</DialogTitle>
              <DialogDescription>
                Defina uma nova senha para {resetPassword.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-muted/50 p-3 rounded text-sm">
                Usuário: <span className="font-medium">{resetPassword.username}</span>
              </div>
              <FormInput
                type="password"
                placeholder="Nova senha"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                data-testid="input-new-password"
              />
              <p className="text-xs text-muted-foreground">
                A senha deve ter pelo menos 6 caracteres
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={() => resetPasswordMutation.mutate({ userId: resetPassword.id, newPassword })}
                  className="flex-1"
                  disabled={!newPassword || newPassword.length < 6 || resetPasswordMutation.isPending}
                  data-testid="button-confirm-reset-password"
                >
                  {resetPasswordMutation.isPending ? 'Alterando...' : 'Confirmar'}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setResetPassword(null)}
                  data-testid="button-cancel-reset"
                >
                  Cancelar
                </Button>
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
              <AlertDialogTitle>Deletar Usuário?</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja deletar <strong>{deleteConfirm.name}</strong>? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="bg-destructive/10 border border-destructive/20 rounded p-4 mb-4">
              <p className="text-sm text-destructive font-medium">
                Aviso: Isso vai deletar permanentemente o usuário e todos os seus dados.
              </p>
            </div>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deleteConfirm.id)}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? 'Deletando...' : 'Deletar Usuário'}
            </AlertDialogAction>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

function UserActionsMenu({ user, onView, onToggleStatus, onResetPassword, onDelete, isStatusLoading }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          data-testid={`button-actions-${user.id}`}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onView} data-testid={`action-view-${user.id}`}>
          <Eye className="h-4 w-4 mr-2" />
          Ver/Editar
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={onToggleStatus}
          disabled={isStatusLoading}
          className={user.status === 'suspended' ? 'text-green-600' : 'text-orange-600'}
          data-testid={`action-toggle-status-${user.id}`}
        >
          <Power className="h-4 w-4 mr-2" />
          {user.status === 'active' ? 'Bloquear' : 'Ativar'}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={onResetPassword}
          data-testid={`action-reset-password-${user.id}`}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Redefinir Senha
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={onDelete}
          className="text-destructive"
          data-testid={`action-delete-${user.id}`}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Deletar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function AdminUsers() {
  return <UserListContent />;
}
