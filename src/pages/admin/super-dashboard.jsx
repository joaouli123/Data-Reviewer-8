import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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

function SuperDashboardContent() {
  // Fetch data
  const { data: companies = [] } = useQuery({
    queryKey: ['/api/admin/companies'],
    queryFn: () => apiRequest('/api/admin/companies'),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['/api/admin/users'],
    queryFn: () => apiRequest('/api/admin/users'),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['/api/admin/customers'],
    queryFn: () => apiRequest('/api/admin/customers'),
  });

  // Calculate metrics
  const activeCompanies = companies.filter(c => c.subscriptionStatus === 'active').length;
  const suspendedCompanies = companies.filter(c => c.subscriptionStatus === 'suspended').length;
  const activeUsers = users.filter(u => u.status === 'active').length;
  const inactiveUsers = users.filter(u => u.status === 'inactive').length;
  const suspendedUsers = users.filter(u => u.status === 'suspended').length;
  const activeCustomers = customers.filter(c => c.status === 'active').length;
  const churnRate = activeCompanies > 0 ? ((suspendedCompanies / activeCompanies) * 100).toFixed(1) : 0;
  const avgUsersPerCompany = activeCompanies > 0 ? (users.length / activeCompanies).toFixed(1) : 0;

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard Super Admin</h1>
        <p className="text-muted-foreground mt-1">Visão geral do sistema</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total de Empresas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{companies.length}</div>
            <p className="text-xs text-muted-foreground mt-1">{activeCompanies} ativas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Taxa de Cancelamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{churnRate}%</div>
            <p className={`text-xs mt-1 ${churnRate > 7 ? 'text-red-600' : 'text-green-600'}`}>
              {churnRate > 7 ? 'Acima do normal' : 'Saudável'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Usuários Totais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground mt-1">{activeUsers} ativos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Usuários por Empresa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgUsersPerCompany}</div>
            <p className="text-xs text-muted-foreground mt-1">média</p>
          </CardContent>
        </Card>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground uppercase tracking-wide font-semibold mb-4">Status das Empresas</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Ativas</span>
                <Badge variant="default" className="bg-green-600">{activeCompanies}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Suspensas</span>
                <Badge variant="destructive">{suspendedCompanies}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Outras</span>
                <Badge variant="secondary">{companies.length - activeCompanies - suspendedCompanies}</Badge>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground uppercase tracking-wide font-semibold mb-4">Status dos Usuários</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Ativos</span>
                <Badge variant="default" className="bg-green-600">{activeUsers}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Inativos</span>
                <Badge variant="secondary">{inactiveUsers}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Suspensos</span>
                <Badge variant="destructive">{suspendedUsers}</Badge>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground uppercase tracking-wide font-semibold mb-4">Informações Adicionais</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Total de Usuários</span>
                <span className="font-bold">{users.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Clientes Ativos</span>
                <span className="font-bold">{activeCustomers}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Total de Clientes</span>
                <span className="font-bold">{customers.length}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function SuperAdminDashboard() {
  return <SuperDashboardContent />;
}
