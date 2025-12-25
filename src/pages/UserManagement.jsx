import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Plus, Settings, Mail } from 'lucide-react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import { queryClient } from '@/lib/queryClient';
import InviteUserModal from '@/components/users/InviteUserModal';

export default function UserManagementPage() {
  const { company } = useAuth();
  const [, setLocation] = useLocation();
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const token = JSON.parse(localStorage.getItem('auth') || '{}').token;
      console.log('[DEBUG] Fetching users from /api/users...');
      const res = await fetch('/api/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to fetch users');
      }
      const data = await res.json();
      console.log('[DEBUG] Received users:', data);
      return data;
    }
  });

  // ... (no changes to inviteMutation and deleteUserMutation)

  if (isLoading) {
    return (
      <div className="p-6 flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2 text-slate-500">Carregando usuários...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-500">
        <p>Erro ao carregar usuários: {error.message}</p>
      </div>
    );
  }
  const inviteMutation = useMutation({
    mutationFn: async (data) => {
      const token = JSON.parse(localStorage.getItem('auth') || '{}').token;
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to create invitation');
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setIsInviteOpen(false);
      toast.success('Convite enviado!');
      return data;
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId) => {
      const token = JSON.parse(localStorage.getItem('auth') || '{}').token;
      const res = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete user');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast.success('Usuário removido!');
    }
  });

  const handleInvite = async (data) => {
    return inviteMutation.mutateAsync(data);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestão de Usuários</h1>
          <p className="text-sm text-slate-500 mt-1">Gerenciar e convidar usuários da empresa</p>
        </div>
        <Button onClick={() => setIsInviteOpen(true)} data-testid="button-invite-user" className="gap-2">
          <Plus className="w-4 h-4" />
          Adicionar Usuário
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Usuários da Empresa
          </CardTitle>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Nenhum usuário cadastrado</p>
              <p className="text-xs text-slate-400 mt-2">Clique em "Adicionar Usuário" para convidar o primeiro usuário</p>
            </div>
          ) : (
            <div className="space-y-3">
              {users.map(user => (
                <div key={user.id} className="flex justify-between items-center p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors" data-testid={`user-row-${user.id}`}>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{user.name || user.username}</p>
                    <p className="text-sm text-slate-500">{user.email}</p>
                    <div className="mt-2 flex gap-2">
                      <span className="inline-block px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-md capitalize">
                        {user.role === 'admin' ? 'Admin' : user.role === 'manager' ? 'Gerente' : user.role === 'operational' ? 'Operacional' : 'Usuário'}
                      </span>
                      <span className="inline-block px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-md">Ativo</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLocation(`/permissions?userId=${user.id}`)}
                      title="Gerenciar permissões"
                      data-testid={`button-manage-permissions-${user.id}`}
                      className="gap-2"
                    >
                      <Settings className="w-4 h-4" />
                      Permissões
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm('Tem certeza que deseja remover este usuário?')) {
                          deleteUserMutation.mutate(user.id);
                        }
                      }}
                      disabled={deleteUserMutation.isPending}
                      data-testid={`button-delete-user-${user.id}`}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <InviteUserModal 
        open={isInviteOpen} 
        onOpenChange={setIsInviteOpen}
        onInvite={handleInvite}
      />
    </div>
  );
}
