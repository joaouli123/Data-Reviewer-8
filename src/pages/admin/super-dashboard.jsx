import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, TrendingUp, AlertTriangle, Activity } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

function KPICard({ title, value, icon: Icon, trend, trendValue }) {
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">{title}</p>
          <p className="text-4xl font-bold text-foreground">{value}</p>
          {trend && (
            <div className={`text-xs mt-2 flex items-center gap-1 ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
              <span>{trend === 'up' ? '↑' : '↓'}</span>
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        <Icon className="h-8 w-8 text-primary opacity-30" />
      </div>
    </Card>
  );
}

function SuperDashboardContent() {
  const { toast } = useToast();

  // Fetch stats
  const { data: stats = {} } = useQuery({
    queryKey: ['/api/admin/stats'],
    queryFn: () => apiRequest('/api/admin/stats'),
  });

  // Fetch companies
  const { data: companies = [] } = useQuery({
    queryKey: ['/api/admin/companies'],
    queryFn: () => apiRequest('/api/admin/companies'),
  });

  // Fetch users
  const { data: users = [] } = useQuery({
    queryKey: ['/api/admin/users'],
    queryFn: () => apiRequest('/api/admin/users'),
  });

  // Fetch customers
  const { data: customers = [] } = useQuery({
    queryKey: ['/api/admin/customers'],
    queryFn: () => apiRequest('/api/admin/customers'),
  });

  // Calculate statistics
  const activeCompanies = companies.filter(c => c.subscriptionStatus === 'active').length;
  const suspendedCompanies = companies.filter(c => c.subscriptionStatus === 'suspended').length;
  const activeUsers = users.filter(u => u.status === 'active').length;
  const activeCustomers = customers.filter(c => c.status === 'ativo').length;
  
  // Calculate advanced KPIs
  const churnRate = activeCompanies > 0 ? ((suspendedCompanies / activeCompanies) * 100).toFixed(1) : 0;
  const totalUsers = users.length;
  const avgUsersPerCompany = activeCompanies > 0 ? (totalUsers / activeCompanies).toFixed(1) : 0;
  const lastMonthCompanies = companies.filter(c => {
    const createdDate = new Date(c.createdAt);
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    return createdDate >= monthAgo;
  }).length;

  return (
    <div className="space-y-8 p-4 md:p-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-foreground">Dashboard Super Admin</h1>
        <p className="text-muted-foreground mt-2">Piloto do negócio - Métricas financeiras e crescimento</p>
      </div>

      {/* Executive KPIs - Row 1: Financeiro */}
      <div>
        <h2 className="text-xl font-bold mb-4">Métricas Financeiras (O Oxigênio)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard 
            title="Total de Empresas" 
            value={companies.length}
            icon={Building2}
            trend={activeCompanies > suspendedCompanies ? 'up' : 'down'}
            trendValue={`${activeCompanies} ativas`}
            data-testid="kpi-companies"
          />
          <KPICard 
            title="Taxa de Cancelamento" 
            value={`${churnRate}%`}
            icon={TrendingUp}
            trend={churnRate > 7 ? 'down' : 'up'}
            trendValue={churnRate > 7 ? 'Acima do normal' : 'Saudável'}
            data-testid="kpi-churn"
          />
          <KPICard 
            title="Receita Mensal Recorrente" 
            value="R$ 0,00"
            icon={TrendingUp}
            data-testid="kpi-mrr"
          />
          <KPICard 
            title="Ticket Médio" 
            value="R$ 0,00"
            icon={Activity}
            data-testid="kpi-arpu"
          />
        </div>
      </div>

      {/* Row 2: Crescimento */}
      <div>
        <h2 className="text-xl font-bold mb-4">Métricas de Crescimento (O Motor)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard 
            title="Novas Empresas (30d)" 
            value={lastMonthCompanies}
            icon={Building2}
            trend={lastMonthCompanies > 0 ? 'up' : 'down'}
            trendValue={`Crescimento ${lastMonthCompanies > 0 ? 'positivo' : 'estagnado'}`}
            data-testid="kpi-new-companies"
          />
          <KPICard 
            title="Taxa de Conversão" 
            value="0%"
            icon={TrendingUp}
            data-testid="kpi-conversion"
          />
          <KPICard 
            title="CAC (Custo Aquisição)" 
            value="R$ 0,00"
            icon={Activity}
            data-testid="kpi-cac"
          />
          <KPICard 
            title="LTV (Lifetime Value)" 
            value="R$ 0,00"
            icon={Activity}
            data-testid="kpi-ltv"
          />
        </div>
      </div>

      {/* Row 3: Engajamento */}
      <div>
        <h2 className="text-xl font-bold mb-4">Métricas de Engajamento (A Retenção)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard 
            title="Empresas Ativas (MAU)" 
            value={activeCompanies}
            icon={Building2}
            data-testid="kpi-active-companies"
          />
          <KPICard 
            title="Usuários Ativos" 
            value={activeUsers}
            icon={Users}
            data-testid="kpi-active-users"
          />
          <KPICard 
            title="Usuários por Empresa" 
            value={avgUsersPerCompany}
            icon={Users}
            data-testid="kpi-users-per-company"
          />
          <KPICard 
            title="Clientes Cadastrados" 
            value={activeCustomers}
            icon={Activity}
            data-testid="kpi-customers"
          />
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground uppercase tracking-wide">Status das Empresas</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Ativas</span>
                <Badge variant="default" className="bg-green-600" data-testid="badge-active-companies">{activeCompanies}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Suspensas</span>
                <Badge variant="destructive" data-testid="badge-suspended-companies">{suspendedCompanies}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Outras</span>
                <Badge variant="secondary" data-testid="badge-other-companies">{companies.length - activeCompanies - suspendedCompanies}</Badge>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground uppercase tracking-wide">Status dos Usuários</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Ativos</span>
                <Badge variant="default" className="bg-green-600" data-testid="badge-active-users">{users.filter(u => u.status === 'active').length}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Inativos</span>
                <Badge variant="secondary" data-testid="badge-inactive-users">{users.filter(u => u.status === 'inactive').length}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Suspensos</span>
                <Badge variant="destructive" data-testid="badge-suspended-users">{users.filter(u => u.status === 'suspended').length}</Badge>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground uppercase tracking-wide">Informações Adicionais</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Total de Usuários</span>
                <span className="font-bold" data-testid="text-total-users">{users.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Clientes Ativos</span>
                <span className="font-bold" data-testid="text-active-customers">{customers.filter(c => c.status === 'active').length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Taxa de Crescimento</span>
                <span className="font-bold text-green-600">+12%</span>
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
