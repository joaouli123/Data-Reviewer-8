import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, Save } from 'lucide-react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import { queryClient } from '@/lib/queryClient';

const PERMISSIONS_LIST = [
  { id: 'view_transactions', label: 'Ver Transações', category: 'Transações' },
  { id: 'create_transactions', label: 'Criar Transações', category: 'Transações' },
  { id: 'edit_transactions', label: 'Editar Transações', category: 'Transações' },
  { id: 'delete_transactions', label: 'Deletar Transações', category: 'Transações' },
  { id: 'import_bank', label: 'Importar do Banco', category: 'Transações' },
  { id: 'view_reports', label: 'Ver Relatórios', category: 'Relatórios' },
  { id: 'view_profit', label: 'Ver Lucro', category: 'Relatórios' },
  { id: 'export_reports', label: 'Exportar Relatórios', category: 'Relatórios' },
  { id: 'view_customers', label: 'Ver Clientes', category: 'Clientes' },
  { id: 'manage_customers', label: 'Gerenciar Clientes', category: 'Clientes' },
  { id: 'view_suppliers', label: 'Ver Fornecedores', category: 'Fornecedores' },
  { id: 'manage_suppliers', label: 'Gerenciar Fornecedores', category: 'Fornecedores' },
  { id: 'manage_users', label: 'Gerenciar Usuários', category: 'Usuários' },
  { id: 'invite_users', label: 'Convidar Usuários', category: 'Usuários' },
  { id: 'view_settings', label: 'Ver Configurações', category: 'Configurações' },
  { id: 'manage_settings', label: 'Gerenciar Configurações', category: 'Configurações' },
];

const DEFAULT_PERMISSIONS = {
  admin: {
    view_transactions: true,
    create_transactions: true,
    edit_transactions: true,
    delete_transactions: true,
    import_bank: true,
    view_reports: true,
    view_profit: true,
    export_reports: true,
    view_customers: true,
    manage_customers: true,
    view_suppliers: true,
    manage_suppliers: true,
    manage_users: true,
    invite_users: true,
    view_settings: true,
    manage_settings: true,
  },
  operational: {
    view_transactions: true,
    create_transactions: true,
    edit_transactions: true,
    import_bank: true,
    view_customers: true,
    view_suppliers: true,
  },
};

export default function UserPermissionsPage() {
  const [, setLocation] = useLocation();
  const { company } = useAuth();
  const [userId, setUserId] = useState(new URLSearchParams(window.location.search).get('userId') || '');
  const [selectedUser, setSelectedUser] = useState(null);
  const [permissions, setPermissions] = useState({});

  const { data: users = [] } = useQuery({
    queryKey: ['/api/users', company?.id],
    queryFn: async () => {
      const token = JSON.parse(localStorage.getItem('auth') || '{}').token;
      const res = await fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    },
    enabled: !!company?.id
  });

  const updatePermissionsMutation = useMutation({
    mutationFn: async () => {
      const token = JSON.parse(localStorage.getItem('auth') || '{}').token;
      const res = await fetch(`/api/users/${selectedUser.id}/permissions`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ permissions })
      });
      if (!res.ok) throw new Error('Failed to update permissions');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users', company?.id] });
      toast.success('Permissões atualizadas!');
    }
  });

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    let userPerms = {};
    
    if (user.permissions) {
      try {
        userPerms = typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions;
      } catch (e) {
        logger.error("Error parsing user permissions", e);
        userPerms = DEFAULT_PERMISSIONS[user.role] || {};
      }
    } else {
      // Use default permissions based on user role
      userPerms = DEFAULT_PERMISSIONS[user.role] || {};
    }
    
    setPermissions(userPerms || {});
  };

  const togglePermission = (permId) => {
    setPermissions(prev => {
      const currentPerms = typeof prev === 'string' ? JSON.parse(prev) : (prev || {});
      return {
        ...currentPerms,
        [permId]: !currentPerms[permId]
      };
    });
  };

  const groupedPermissions = PERMISSIONS_LIST.reduce((acc, perm) => {
    if (!acc[perm.category]) acc[perm.category] = [];
    acc[perm.category].push(perm);
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => setLocation('/users')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-3xl font-bold">Gerenciar Permissões</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Usuários</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {users.map(user => (
              <Button
                key={user.id}
                variant={selectedUser?.id === user.id ? 'default' : 'outline'}
                className="w-full justify-start"
                onClick={() => handleSelectUser(user)}
                data-testid={`button-select-user-${user.id}`}
              >
                {user.name || user.username}
              </Button>
            ))}
          </CardContent>
        </Card>

        {selectedUser && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>{selectedUser.name || selectedUser.username}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(groupedPermissions).map(([category, perms]) => (
                <div key={category}>
                  <h3 className="font-semibold text-sm mb-3">{category}</h3>
                  <div className="space-y-2">
                    {perms.map(perm => (
                      <div key={perm.id} className="flex items-center gap-2">
                        <Checkbox
                          id={perm.id}
                          checked={permissions[perm.id] || false}
                          onCheckedChange={() => togglePermission(perm.id)}
                          data-testid={`checkbox-perm-${perm.id}`}
                        />
                        <label htmlFor={perm.id} className="text-sm cursor-pointer">
                          {perm.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <Button
                onClick={() => updatePermissionsMutation.mutate()}
                disabled={updatePermissionsMutation.isPending}
                className="w-full"
                data-testid="button-save-permissions"
              >
                <Save className="w-4 h-4 mr-2" />
                Salvar Permissões
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
