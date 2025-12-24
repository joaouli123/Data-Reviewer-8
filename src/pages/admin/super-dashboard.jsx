import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Building2, Users, TrendingUp, AlertTriangle, Plus, MoreVertical, Eye, Lock, Trash2, LogOut, User } from 'lucide-react';
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

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
};

export default function SuperAdminDashboard() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(null);

  const auth = JSON.parse(localStorage.getItem('auth') || '{}');

  // Fetch stats
  const { data: stats = {} } = useQuery({
    queryKey: ['/api/admin/stats'],
    queryFn: () => apiRequest('/api/admin/stats'),
  });

  // Fetch companies
  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['/api/admin/companies'],
    queryFn: () => apiRequest('/api/admin/companies'),
  });

  // Filter companies
  const filteredCompanies = companies.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         c.document.includes(searchTerm) ||
                         c.ownerEmail.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.subscriptionStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Create company mutation
  const createCompanyMutation = useMutation({
    mutationFn: (data) => apiRequest('/api/admin/companies', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/companies'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      toast({ title: 'Sucesso', description: 'Empresa criada com sucesso' });
      setCreateDialogOpen(false);
    },
    onError: (error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => apiRequest(`/api/admin/companies/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/companies'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      toast({ title: 'Sucesso', description: 'Status da empresa atualizado' });
    },
    onError: (error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  // Delete company mutation
  const deleteCompanyMutation = useMutation({
    mutationFn: (id) => apiRequest(`/api/admin/companies/${id}`, {
      method: 'DELETE',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/companies'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      toast({ title: 'Sucesso', description: 'Empresa deletada com sucesso' });
      setDeleteConfirm(null);
    },
    onError: (error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  // Impersonate mutation
  const impersonateMutation = useMutation({
    mutationFn: (id) => apiRequest(`/api/admin/companies/${id}/impersonate`, {
      method: 'POST',
    }),
    onSuccess: (data) => {
      localStorage.setItem('auth', JSON.stringify({
        token: data.token,
        user: data.user,
        company: data.company,
      }));
      toast({ title: 'Sucesso', description: 'Acessando dashboard da empresa' });
      setTimeout(() => window.location.href = '/', 1000);
    },
    onError: (error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  const handleLogout = () => {
    localStorage.removeItem('auth');
    setLocation('/login');
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-foreground">Admin</h1>
          <p className="text-sm text-muted-foreground">Sistema de Gestão</p>
        </div>

        <nav className="px-4 space-y-2">
          <div className="py-2 px-4 bg-primary/10 border-l-2 border-primary rounded">
            <p className="text-sm font-medium text-foreground">Dashboard</p>
          </div>
        </nav>

        {/* Profile Section at Bottom */}
        <div className="absolute bottom-0 left-0 right-0 w-64 border-t border-border p-4 space-y-4">
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
              <User className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{auth.user?.username || 'Super Admin'}</p>
              <p className="text-xs text-muted-foreground truncate">{auth.user?.email}</p>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={handleLogout}
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4" />
            Deslogar
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="border-b border-border bg-card px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Super Admin Dashboard</h1>
            <p className="text-muted-foreground">Gerencie todas as empresas e assinaturas</p>
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Total de Empresas</p>
                    <p className="text-3xl font-bold text-foreground">{stats.totalCompanies || 0}</p>
                  </div>
                  <Building2 className="h-8 w-8 text-primary opacity-50" />
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Assinaturas Ativas</p>
                    <p className="text-3xl font-bold text-foreground">{stats.activeSubscriptions || 0}</p>
                  </div>
                  <Users className="h-8 w-8 text-primary opacity-50" />
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Receita Mensal</p>
                    <p className="text-3xl font-bold text-foreground">{formatCurrency(stats.monthlyRevenue)}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-500 opacity-50" />
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Alertas</p>
                    <p className="text-3xl font-bold text-foreground">{stats.alerts || 0}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-destructive opacity-50" />
                </div>
              </Card>
            </div>

            {/* Companies Table */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Gestão de Empresas</h2>
                <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2" data-testid="button-new-company">
                      <Plus className="h-4 w-4" />
                      Nova Empresa
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Criar Nova Empresa</DialogTitle>
                      <DialogDescription>Adicione uma nova empresa e seu usuário admin</DialogDescription>
                    </DialogHeader>
                    <CreateCompanyForm 
                      onSuccess={() => setCreateDialogOpen(false)}
                      isPending={createCompanyMutation.isPending}
                      onSubmit={(data) => createCompanyMutation.mutate(data)}
                    />
                  </DialogContent>
                </Dialog>
              </div>

              {/* Filters */}
              <div className="flex gap-4 mb-6">
                <Input
                  placeholder="Buscar por nome, documento ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1"
                  data-testid="input-search-companies"
                />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos Status</SelectItem>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="suspended">Suspenso</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Dono</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Usuários</TableHead>
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
                    ) : filteredCompanies.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan="7" className="text-center py-8 text-muted-foreground">
                          Nenhuma empresa encontrada
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredCompanies.map((company) => (
                        <TableRow key={company.id} data-testid={`row-company-${company.id}`}>
                          <TableCell className="font-medium">{company.name}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{company.ownerName}</p>
                              <p className="text-xs text-muted-foreground">{company.ownerEmail}</p>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{company.document}</TableCell>
                          <TableCell className="capitalize">{company.subscription?.plan || 'basic'}</TableCell>
                          <TableCell>
                            <Badge
                              variant={company.subscriptionStatus === 'active' ? 'default' : 'destructive'}
                              className="capitalize"
                              data-testid={`badge-status-${company.id}`}
                            >
                              {company.subscriptionStatus === 'active' ? 'Ativo' : 'Suspenso'}
                            </Badge>
                          </TableCell>
                          <TableCell>{company.userCount}</TableCell>
                          <TableCell className="text-right">
                            <CompanyActionsMenu
                              company={company}
                              onImpersonate={() => impersonateMutation.mutate(company.id)}
                              onBlock={() => updateStatusMutation.mutate({ 
                                id: company.id, 
                                status: company.subscriptionStatus === 'active' ? 'suspended' : 'active' 
                              })}
                              onDelete={() => setDeleteConfirm(company)}
                              onDetails={() => setDetailsDialogOpen(company)}
                              isBlockLoading={updateStatusMutation.isPending}
                              isImpersonateLoading={impersonateMutation.isPending}
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>

            {/* Details Dialog */}
            {detailsDialogOpen && (
              <Dialog open={!!detailsDialogOpen} onOpenChange={() => setDetailsDialogOpen(null)}>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>{detailsDialogOpen.name}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Documento</p>
                      <p className="text-lg font-medium">{detailsDialogOpen.document}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Dono</p>
                      <p className="text-lg font-medium">{detailsDialogOpen.ownerName}</p>
                      <p className="text-sm">{detailsDialogOpen.ownerEmail}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Plano</p>
                      <p className="text-lg font-medium capitalize">{detailsDialogOpen.subscription?.plan}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge className="capitalize mt-2">{detailsDialogOpen.subscriptionStatus}</Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Usuários</p>
                      <p className="text-lg font-medium">{detailsDialogOpen.userCount}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Criada em</p>
                      <p className="text-sm">{new Date(detailsDialogOpen.createdAt).toLocaleDateString('pt-BR')}</p>
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
                    <AlertDialogTitle>Deletar Empresa?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja deletar <strong>{deleteConfirm.name}</strong>? Esta ação não pode ser desfeita e vai deletar todos os dados associados.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="bg-destructive/10 border border-destructive/20 rounded p-4 mb-4">
                    <p className="text-sm text-destructive font-medium">Aviso: Isso vai deletar permanentemente todos os dados da empresa.</p>
                  </div>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteCompanyMutation.mutate(deleteConfirm.id)}
                    disabled={deleteCompanyMutation.isPending}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    data-testid="button-confirm-delete"
                  >
                    {deleteCompanyMutation.isPending ? 'Deletando...' : 'Deletar Empresa'}
                  </AlertDialogAction>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CompanyActionsMenu({ company, onImpersonate, onBlock, onDelete, onDetails, isBlockLoading, isImpersonateLoading }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" data-testid={`button-actions-${company.id}`}>
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onDetails} data-testid={`action-details-${company.id}`}>
          <Eye className="h-4 w-4 mr-2" />
          Ver Detalhes
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={onImpersonate}
          disabled={isImpersonateLoading}
          data-testid={`action-impersonate-${company.id}`}
        >
          <Eye className="h-4 w-4 mr-2" />
          {isImpersonateLoading ? 'Acessando...' : 'Acessar como Admin'}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={onBlock}
          disabled={isBlockLoading}
          className={company.subscriptionStatus === 'suspended' ? 'text-green-600' : 'text-orange-600'}
          data-testid={`action-block-${company.id}`}
        >
          <Lock className="h-4 w-4 mr-2" />
          {isBlockLoading ? 'Processando...' : (company.subscriptionStatus === 'suspended' ? 'Desbloquear' : 'Bloquear')}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={onDelete}
          className="text-destructive"
          data-testid={`action-delete-${company.id}`}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Deletar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CreateCompanyForm({ onSuccess, isPending, onSubmit }) {
  const { toast } = useToast();
  const form = useForm({
    defaultValues: {
      companyName: '',
      companyDocument: '',
      adminName: '',
      adminEmail: '',
      adminPassword: '',
      plan: 'pro',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="companyName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome da Empresa</FormLabel>
              <FormControl>
                <Input placeholder="Acme Corp" {...field} data-testid="input-company-name" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="companyDocument"
          render={({ field }) => (
            <FormItem>
              <FormLabel>CNPJ</FormLabel>
              <FormControl>
                <Input placeholder="00.000.000/0000-00" {...field} data-testid="input-company-document" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="adminName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Admin</FormLabel>
              <FormControl>
                <Input placeholder="João Silva" {...field} data-testid="input-admin-name" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="adminEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email do Admin</FormLabel>
              <FormControl>
                <Input type="email" placeholder="admin@empresa.com" {...field} data-testid="input-admin-email" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="adminPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Senha Inicial</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} data-testid="input-admin-password" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="plan"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Plano</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger data-testid="select-plan">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic (Gratuito)</SelectItem>
                  <SelectItem value="pro">Pro (R$ 99/mês)</SelectItem>
                  <SelectItem value="enterprise">Enterprise (R$ 299/mês)</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isPending} data-testid="button-create-company">
          {isPending ? 'Criando...' : 'Criar Empresa'}
        </Button>
      </form>
    </Form>
  );
}
