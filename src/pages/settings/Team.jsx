import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { usePermission } from '@/hooks/usePermission';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Plus, Mail, Copy, Trash2, Edit2, CheckCircle2, Clock, Copy as CopyIcon, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { queryClient } from '@/lib/queryClient';

const PERMISSIONS_LIST = [
  { id: 'view_dashboard', label: 'Ver Dashboard Financeiro', category: 'Dashboard' },
  { id: 'view_transactions', label: 'Ver Transações', category: 'Transações' },
  { id: 'create_transactions', label: 'Criar Transações', category: 'Transações' },
  { id: 'edit_transactions', label: 'Editar Transações', category: 'Transações' },
  { id: 'delete_transactions', label: 'Deletar Transações', category: 'Transações' },
  { id: 'import_bank', label: 'Importar Extrato Bancário', category: 'Transações' },
  { id: 'view_reports', label: 'Acessar Relatórios Avançados', category: 'Relatórios' },
  { id: 'manage_customers', label: 'Gerenciar Clientes e Fornecedores', category: 'Cadastros' },
  { id: 'pricing_calculator', label: 'Calculadora de Preços', category: 'Ferramentas' },
];

const ROLES = [
  { value: 'admin', label: 'Administrador', fullAccess: true },
  { value: 'operational', label: 'Operacional', fullAccess: false },
];

export default function TeamPage() {
  const { user, company } = useAuth();
  const { hasPermission } = usePermission();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [inviteLink, setInviteLink] = useState('');
  const [activeTab, setActiveTab] = useState('direct');

  // Check permission to manage users
  const canManageUsers = hasPermission('manage_users') || hasPermission('invite_users');
  
  if (!canManageUsers) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12">
            <Shield className="w-16 h-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Acesso Negado</h2>
            <p className="text-muted-foreground text-center">
              Você não tem permissão para gerenciar usuários
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'operational',
    isAdmin: false,
  });
  const [permissions, setPermissions] = useState({});

  // Fetch team members
    const { data: teamMembers = [], isLoading } = useQuery({
      queryKey: ['/api/users'],
      queryFn: async () => {
        const token = JSON.parse(localStorage.getItem('auth') || '{}').token;
        logger.log("[DEBUG] Fetching team members for companyId:", company?.id);
        const res = await fetch('/api/users', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to fetch team');
        const data = await res.json();
        logger.log("[DEBUG] Team members received:", data);
        return data;
      },
      staleTime: 0,
      gcTime: 0,
      refetchOnWindowFocus: true
    });

  const createUserMutation = useMutation({
    mutationFn: async (data) => {
      const token = JSON.parse(localStorage.getItem('auth') || '{}').token;
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          name: data.name,
          role: data.role,
          permissions: data.role === 'admin' ? {} : permissions,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create user');
      }
      return res.json();
    },
    onSuccess: (data) => {
      logger.log("[DEBUG] Team page direct user creation SUCCESS:", data);
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      // Forçar limpeza total
      queryClient.removeQueries({ queryKey: ['/api/users'] });
      
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['/api/users'] });
      }, 800);
      
      toast.success('Membro adicionado com sucesso!');
      resetForm();
      setIsAddOpen(false);
    },
    onError: () => toast.error('Erro ao adicionar membro'),
  });

  // Generate invite link
  const generateInviteMutation = useMutation({
    mutationFn: async (email) => {
      const token = JSON.parse(localStorage.getItem('auth') || '{}').token;
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email,
          role: 'operational',
          permissions,
        }),
      });
      if (!res.ok) throw new Error('Failed to generate invite');
      return res.json();
    },
    onSuccess: (data) => {
      const fullLink = `${window.location.origin}/accept-invite?token=${data.token}`;
      setInviteLink(fullLink);
      toast.success('Link de convite gerado!');
    },
    onError: () => toast.error('Erro ao gerar link'),
  });

  // Update user permissions
  const updatePermissionsMutation = useMutation({
    mutationFn: async () => {
      const token = JSON.parse(localStorage.getItem('auth') || '{}').token;
      const res = await fetch(`/api/users/${editingUser.id}/permissions`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ permissions }),
      });
      if (!res.ok) throw new Error('Failed to update user');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast.success('Permissões atualizadas!');
      setIsEditOpen(false);
      setEditingUser(null);
    },
    onError: () => toast.error('Erro ao atualizar'),
  });

  // Delete user
  const deleteMutation = useMutation({
    mutationFn: async (userId) => {
      const token = JSON.parse(localStorage.getItem('auth') || '{}').token;
      const res = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to delete user');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast.success('Membro removido!');
    },
    onError: () => toast.error('Erro ao remover membro'),
  });

  const resetForm = () => {
    setFormData({ name: '', email: '', password: '', role: 'operational', isAdmin: false });
    setPermissions({});
    setInviteLink('');
    setActiveTab('direct');
  };

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePassword = (password) => password.length >= 6;

  const handleAddUser = (e) => {
    e.preventDefault();
    if (!formData.name?.trim() || !formData.email?.trim() || !formData.password?.trim()) {
      toast.error('Preencha todos os campos');
      return;
    }
    if (!validateEmail(formData.email)) {
      toast.error('Email inválido');
      return;
    }
    if (!validatePassword(formData.password)) {
      toast.error('Senha deve ter no mínimo 6 caracteres');
      return;
    }
    createUserMutation.mutate(formData);
  };

  const handleGenerateInvite = () => {
    if (!formData.email?.trim()) {
      toast.error('Digite um email');
      return;
    }
    if (!validateEmail(formData.email)) {
      toast.error('Email inválido');
      return;
    }
    generateInviteMutation.mutate(formData.email);
  };

  const handleEditUser = (member) => {
    setEditingUser(member);
    const userPerms = member.permissions
      ? typeof member.permissions === 'string'
        ? JSON.parse(member.permissions)
        : member.permissions
      : {};
    setPermissions(userPerms);
    setIsEditOpen(true);
  };

  const togglePermission = (permId) => {
    setPermissions((prev) => ({
      ...prev,
      [permId]: !prev[permId],
    }));
  };

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    toast.success('Link copiado!');
  };

  const sendEmail = () => {
    toast.info('Email enviado para: ' + formData.email);
    // Implement email sending if needed
  };

  const groupedPermissions = useMemo(() => {
    return PERMISSIONS_LIST.reduce((acc, perm) => {
      if (!acc[perm.category]) acc[perm.category] = [];
      acc[perm.category].push(perm);
      return acc;
    }, {});
  }, []);

  const getInitials = (name) => {
    return name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'US';
  };

  const getStatusBadge = (status) => {
    if (status === 'ativo') {
      return (
        <Badge className="bg-green-100 text-green-800">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Ativo
        </Badge>
      );
    }
    return (
      <Badge className="bg-yellow-100 text-yellow-800">
        <Clock className="w-3 h-3 mr-1" />
        Pendente
      </Badge>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestão de Equipe</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie membros da equipe e suas permissões
          </p>
        </div>
        <Button onClick={() => setIsAddOpen(true)} data-testid="button-add-member">
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Membro
        </Button>
      </div>

      {/* Team Members Table */}
      <Card>
        <CardHeader>
          <CardTitle>Membros da Equipe ({teamMembers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Carregando...</p>
          ) : teamMembers.length === 0 ? (
            <p className="text-muted-foreground">Nenhum membro na equipe</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold">Nome</th>
                    <th className="text-left py-3 px-4 font-semibold">Email</th>
                    <th className="text-left py-3 px-4 font-semibold">Cargo</th>
                    <th className="text-left py-3 px-4 font-semibold">Status</th>
                    <th className="text-right py-3 px-4 font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {teamMembers.map((member) => (
                    <tr
                      key={member.id}
                      className="border-b hover:bg-muted/50 transition-colors"
                      data-testid={`member-row-${member.id}`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback>{getInitials(member.name || member.username)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{member.name || member.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{member.email}</td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="capitalize">
                          {member.role}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(member.status || 'ativo')}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          {member.role !== 'admin' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditUser(member)}
                              data-testid={`button-edit-${member.id}`}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          )}
                          {user?.id !== member.id && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (confirm('Tem certeza que deseja remover este membro?')) {
                                  deleteMutation.mutate(member.id);
                                }
                              }}
                              data-testid={`button-delete-${member.id}`}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Member Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Adicionar Membro da Equipe</DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="direct">Cadastro Direto</TabsTrigger>
              <TabsTrigger value="invite">Enviar Convite</TabsTrigger>
            </TabsList>

            {/* Direct Registration Tab */}
            <TabsContent value="direct" className="space-y-4 mt-4">
              <div>
                <Label htmlFor="name">Nome Completo</Label>
                <Input
                  id="name"
                  placeholder="João Silva"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  data-testid="input-name"
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="joao@empresa.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  data-testid="input-email"
                />
              </div>

              <div>
                <Label htmlFor="password">Senha Provisória</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  data-testid="input-password"
                />
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                <Switch
                  id="isAdmin"
                  checked={formData.isAdmin}
                  onCheckedChange={(checked) => {
                    setFormData({ ...formData, isAdmin: checked, role: checked ? 'admin' : 'operational' });
                    if (checked) setPermissions({});
                  }}
                  data-testid="switch-admin"
                />
                <Label htmlFor="isAdmin" className="cursor-pointer">
                  Usuário é Administrador?
                </Label>
              </div>

              {!formData.isAdmin && (
                <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm font-semibold">Permissões Específicas</p>
                  {Object.entries(groupedPermissions).map(([category, perms]) => (
                    <div key={category}>
                      <p className="text-xs font-medium text-muted-foreground mb-2">{category}</p>
                      <div className="space-y-2">
                        {perms.map((perm) => (
                          <div key={perm.id} className="flex items-center gap-2">
                            <Checkbox
                              id={perm.id}
                              checked={permissions[perm.id] || false}
                              onCheckedChange={() => togglePermission(perm.id)}
                              data-testid={`checkbox-${perm.id}`}
                            />
                            <Label htmlFor={perm.id} className="text-sm cursor-pointer">
                              {perm.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddUser} disabled={createUserMutation.isPending} data-testid="button-create-user">
                  Criar Membro
                </Button>
              </DialogFooter>
            </TabsContent>

            {/* Invite Tab */}
            <TabsContent value="invite" className="space-y-4 mt-4">
              <div>
                <Label htmlFor="invite-email">Email do Funcionário</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="funcionario@empresa.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  data-testid="input-invite-email"
                />
              </div>

              <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                <p className="text-sm font-semibold">Permissões Padrão</p>
                {Object.entries(groupedPermissions).map(([category, perms]) => (
                  <div key={category}>
                    <p className="text-xs font-medium text-muted-foreground mb-2">{category}</p>
                    <div className="space-y-2">
                      {perms.map((perm) => (
                        <div key={perm.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`invite-${perm.id}`}
                            checked={permissions[perm.id] || false}
                            onCheckedChange={() => togglePermission(perm.id)}
                            data-testid={`checkbox-invite-${perm.id}`}
                          />
                          <Label htmlFor={`invite-${perm.id}`} className="text-sm cursor-pointer">
                            {perm.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {!inviteLink ? (
                <Button
                  onClick={handleGenerateInvite}
                  disabled={generateInviteMutation.isPending}
                  className="w-full"
                  data-testid="button-generate-invite"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Gerar Link de Convite
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input value={inviteLink} readOnly className="text-xs" data-testid="input-invite-link" />
                    <Button variant="outline" size="icon" onClick={copyLink} data-testid="button-copy-link">
                      <CopyIcon className="w-4 h-4" />
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={sendEmail}
                    data-testid="button-send-email"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Enviar por Email
                  </Button>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                  Fechar
                </Button>
              </DialogFooter>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Edit Permissions Dialog */}
      {editingUser && (
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Editar Permissões - {editingUser.name || editingUser.username}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {Object.entries(groupedPermissions).map(([category, perms]) => (
                <div key={category}>
                  <p className="text-sm font-semibold mb-3">{category}</p>
                  <div className="space-y-2">
                    {perms.map((perm) => (
                      <div key={perm.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`edit-${perm.id}`}
                          checked={permissions[perm.id] || false}
                          onCheckedChange={() => togglePermission(perm.id)}
                          data-testid={`checkbox-edit-${perm.id}`}
                        />
                        <Label htmlFor={`edit-${perm.id}`} className="text-sm cursor-pointer">
                          {perm.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => updatePermissionsMutation.mutate()}
                disabled={updatePermissionsMutation.isPending}
                data-testid="button-save-permissions"
              >
                Salvar Permissões
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
