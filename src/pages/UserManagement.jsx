import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Trash2, 
  Plus, 
  ShieldCheck, 
  Mail, 
  Loader2, 
  UserCircle,
  MoreHorizontal
} from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { queryClient } from '@/lib/queryClient';
import InviteUserModal from '@/components/users/InviteUserModal';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { PERMISSIONS } from '../../shared/schema';

export default function UserManagementPage() {
  const { company } = useAuth();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);

  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const auth = JSON.parse(localStorage.getItem('auth') || '{}');
      const token = auth.token;
      const res = await fetch('/api/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to fetch users');
      }
      return res.json();
    }
  });

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setIsInviteOpen(false);
      toast.success('Convite enviado!');
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

  const updatePermissionsMutation = useMutation({
    mutationFn: async ({ userId, permissions }) => {
      const token = JSON.parse(localStorage.getItem('auth') || '{}').token;
      const res = await fetch(`/api/users/${userId}/permissions`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ permissions })
      });
      if (!res.ok) throw new Error('Failed to update permissions');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setIsPermissionsOpen(false);
      toast.success('Permissões atualizadas!');
    }
  });

  if (isLoading) {
    return (
      <div className="p-8 flex flex-col justify-center items-center h-64 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-slate-500 font-medium">Carregando usuários...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center bg-red-50 rounded-lg border border-red-100 mx-6 mt-6">
        <p className="text-red-600 font-medium">Erro ao carregar usuários</p>
        <p className="text-red-500 text-sm mt-1">{error.message}</p>
        <Button variant="outline" className="mt-4" onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/users'] })}>
          Tentar Novamente
        </Button>
      </div>
    );
  }

  const handleOpenPermissions = (user) => {
    setSelectedUser({
      ...user,
      permissions: user.permissions || {}
    });
    setIsPermissionsOpen(true);
  };

  const togglePermission = (key) => {
    setSelectedUser(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: !prev.permissions[key]
      }
    }));
  };

  const handleSavePermissions = () => {
    updatePermissionsMutation.mutate({
      userId: selectedUser.id,
      permissions: selectedUser.permissions
    });
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Gestão de Usuários</h1>
          <p className="text-sm text-slate-500 mt-2">Administre os membros da sua equipe e suas permissões de acesso.</p>
        </div>
        <Button onClick={() => setIsInviteOpen(true)} className="bg-[#E7AA1C] hover:bg-[#d49918] text-black font-semibold shadow-sm" data-testid="button-invite-user">
          <Plus className="w-4 h-4 mr-2" />
          Convidar Usuário
        </Button>
      </div>

      <Card className="border-border/40 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/30">
              <TableRow>
                <TableHead className="font-semibold text-slate-900 pl-6">Usuário</TableHead>
                <TableHead className="font-semibold text-slate-900">Email</TableHead>
                <TableHead className="font-semibold text-slate-900 text-center">Cargo</TableHead>
                <TableHead className="font-semibold text-slate-900 text-center">Status</TableHead>
                <TableHead className="font-semibold text-slate-900 text-right pr-6">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-48 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Mail className="w-10 h-10 text-slate-300 mb-2" />
                      <p className="font-medium">Nenhum usuário cadastrado</p>
                      <p className="text-xs">Inicie convidando novos membros para sua empresa.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                users.map(user => (
                  <TableRow key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                    <TableCell className="font-medium text-slate-900 pl-6">
                      {user.name || user.username}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {user.email}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="capitalize font-normal border-slate-200">
                        {user.role === 'admin' ? 'Administrador' : user.role === 'manager' ? 'Gerente' : user.role === 'operational' ? 'Operacional' : 'Usuário'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 font-normal hover:bg-emerald-50">Ativo</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex justify-end items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 text-slate-600 hover:text-primary hover:bg-slate-100"
                          onClick={() => handleOpenPermissions(user)}
                          title="Permissões"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          <span className="ml-2 hidden sm:inline">Permissões</span>
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              className="text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer"
                              onClick={() => {
                                if (confirm(`Deseja realmente remover o acesso de ${user.name || user.username}?`)) {
                                  deleteUserMutation.mutate(user.id);
                                }
                              }}
                              disabled={deleteUserMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Remover Usuário
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <InviteUserModal 
        open={isInviteOpen} 
        onOpenChange={setIsInviteOpen}
        onInvite={(data) => inviteMutation.mutateAsync(data)}
      />

      {/* Permissions Modal */}
      <Dialog open={isPermissionsOpen} onOpenChange={setIsPermissionsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 border-b bg-slate-50/50">
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <ShieldCheck className="w-6 h-6 text-[#E7AA1C]" />
              Permissões: {selectedUser?.name || selectedUser?.username}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {Object.entries({
              "Transações": [PERMISSIONS.VIEW_TRANSACTIONS, PERMISSIONS.CREATE_TRANSACTIONS, PERMISSIONS.EDIT_TRANSACTIONS, PERMISSIONS.DELETE_TRANSACTIONS, PERMISSIONS.IMPORT_BANK],
              "Relatórios": [PERMISSIONS.VIEW_REPORTS, PERMISSIONS.VIEW_PROFIT, PERMISSIONS.EXPORT_REPORTS],
              "Entidades": [PERMISSIONS.VIEW_CUSTOMERS, PERMISSIONS.MANAGE_CUSTOMERS, PERMISSIONS.VIEW_SUPPLIERS, PERMISSIONS.MANAGE_SUPPLIERS],
              "Sistema": [PERMISSIONS.MANAGE_USERS, PERMISSIONS.INVITE_USERS, PERMISSIONS.VIEW_SETTINGS, PERMISSIONS.MANAGE_SETTINGS]
            }).map(([group, perms]) => (
              <div key={group} className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{group}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {perms.map(perm => (
                    <div 
                      key={perm} 
                      className="flex items-center space-x-3 p-3 rounded-md border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => togglePermission(perm)}
                    >
                      <Checkbox 
                        id={perm} 
                        checked={!!selectedUser?.permissions?.[perm]} 
                        onCheckedChange={() => togglePermission(perm)}
                        className="data-[state=checked]:bg-[#E7AA1C] data-[state=checked]:border-[#E7AA1C]"
                      />
                      <label 
                        htmlFor={perm} 
                        className="text-sm font-medium leading-none cursor-pointer select-none text-slate-700"
                      >
                        {perm.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="p-6 border-t bg-slate-50/50 gap-3">
            <Button variant="outline" onClick={() => setIsPermissionsOpen(false)} className="px-6">Cancelar</Button>
            <Button 
              onClick={handleSavePermissions} 
              className="bg-[#E7AA1C] hover:bg-[#d49918] text-black font-semibold px-8"
              disabled={updatePermissionsMutation.isPending}
            >
              {updatePermissionsMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
