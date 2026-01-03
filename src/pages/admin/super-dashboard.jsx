import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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

function getDateRange(period) {
  const now = new Date();
  const start = new Date();
  
  switch (period) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      break;
    case '7days':
      start.setDate(start.getDate() - 7);
      break;
    case '30days':
      start.setDate(start.getDate() - 30);
      break;
    case '90days':
      start.setDate(start.getDate() - 90);
      break;
    case 'all':
    default:
      return null;
  }
  
  return { start, end: now };
}

function filterByPeriod(items, period) {
  if (period === 'all') return items;
  
  const range = getDateRange(period);
  if (!range) return items;
  
  return items.filter(item => {
    // Support both camelCase (createdAt) and snake_case (created_at)
    const dateStr = item.createdAt || item.created_at;
    const createdDate = new Date(dateStr);
    return createdDate >= range.start && createdDate <= range.end;
  });
}

function SuperDashboardContent() {
  const [period, setPeriod] = useState('all');

  // Fetch data
  const { data: companies = [] } = useQuery({
    queryKey: ['/api/admin/companies'],
    queryFn: () => apiRequest('GET', '/api/admin/companies'),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['/api/admin/users'],
    queryFn: () => apiRequest('GET', '/api/admin/users'),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['/api/admin/customers'],
    queryFn: () => apiRequest('GET', '/api/admin/customers'),
  });

  // Filter by period
  const filteredCompanies = filterByPeriod(companies, period);
  const filteredUsers = filterByPeriod(users, period);
  const filteredCustomers = filterByPeriod(customers, period);

  // Calculate metrics
  const activeCompanies = filteredCompanies.filter(c => c.subscriptionStatus === 'active').length;
  const suspendedCompanies = filteredCompanies.filter(c => c.subscriptionStatus === 'suspended').length;
  const activeUsers = filteredUsers.filter(u => u.status === 'active').length;
  const inactiveUsers = filteredUsers.filter(u => u.status === 'inactive').length;
  const suspendedUsers = filteredUsers.filter(u => u.status === 'suspended').length;
  const activeCustomers = filteredCustomers.filter(c => c.status === 'active').length;
  const churnRate = activeCompanies > 0 ? ((suspendedCompanies / activeCompanies) * 100).toFixed(1) : 0;
  const avgUsersPerCompany = activeCompanies > 0 ? (filteredUsers.length / activeCompanies).toFixed(1) : 0;

  return (
    <div className="space-y-8 p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-foreground">Dashboard Super Admin</h1>
          <p className="text-sm text-muted-foreground mt-2">Visão geral do sistema</p>
        </div>
      </div>

      {/* Period Filter */}
      <div className="flex flex-wrap gap-2">
        <Button 
          variant={period === 'today' ? 'default' : 'outline'} 
          onClick={() => setPeriod('today')}
          size="sm"
          data-testid="button-filter-today"
        >
          Hoje
        </Button>
        <Button 
          variant={period === '7days' ? 'default' : 'outline'} 
          onClick={() => setPeriod('7days')}
          size="sm"
          data-testid="button-filter-7days"
        >
          Últimos 7 dias
        </Button>
        <Button 
          variant={period === '30days' ? 'default' : 'outline'} 
          onClick={() => setPeriod('30days')}
          size="sm"
          data-testid="button-filter-30days"
        >
          Últimos 30 dias
        </Button>
        <Button 
          variant={period === '90days' ? 'default' : 'outline'} 
          onClick={() => setPeriod('90days')}
          size="sm"
          data-testid="button-filter-90days"
        >
          Últimos 90 dias
        </Button>
        <Button 
          variant={period === 'all' ? 'default' : 'outline'} 
          onClick={() => setPeriod('all')}
          size="sm"
          data-testid="button-filter-all"
        >
          Tudo
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total de Empresas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredCompanies.length}</div>
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
            <div className="text-2xl font-bold">{filteredUsers.length}</div>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                <Badge variant="secondary">{filteredCompanies.length - activeCompanies - suspendedCompanies}</Badge>
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
