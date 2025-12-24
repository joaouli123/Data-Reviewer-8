import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, TrendingUp, AlertTriangle, Activity, DollarSign, Zap, Heart, Target, User, BarChart3 } from 'lucide-react';
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

function KPICard({ title, value, icon: Icon, trend, trendValue, category = 'default' }) {
  const categoryColors = {
    financial: 'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800',
    growth: 'bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800',
    engagement: 'bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 border-emerald-200 dark:border-emerald-800',
    default: 'bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800',
  };

  const iconColors = {
    financial: 'text-blue-600 dark:text-blue-400',
    growth: 'text-purple-600 dark:text-purple-400',
    engagement: 'text-emerald-600 dark:text-emerald-400',
    default: 'text-primary',
  };

  return (
    <Card className={`p-6 border-l-4 hover-elevate transition-all ${categoryColors[category]}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-3">{title}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-5xl font-black text-foreground">{value}</p>
          </div>
          {trend && (
            <div className={`text-xs mt-3 flex items-center gap-1.5 font-semibold ${trend === 'up' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              <span className="text-lg">{trend === 'up' ? '↗' : '↘'}</span>
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg bg-white dark:bg-slate-800 shadow-sm`}>
          <Icon className={`h-6 w-6 ${iconColors[category]}`} />
        </div>
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="space-y-10 p-4 md:p-10">
        {/* Hero Header */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-5xl font-black text-foreground">Piloto do Negócio</h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl">Monitore a saúde do SaaS em tempo real. Aqui você vê se o negócio é sustentável, está crescendo e está seguro.</p>
        </div>

        {/* Executive KPIs - Row 1: Financeiro */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-1 w-8 rounded-full bg-gradient-to-r from-blue-500 to-blue-600"></div>
            <h2 className="text-2xl font-bold text-foreground">Métricas Financeiras</h2>
            <Badge variant="outline" className="ml-auto">O Oxigênio</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <KPICard 
              title="Total de Empresas" 
              value={companies.length}
              icon={Building2}
              trend={activeCompanies > suspendedCompanies ? 'up' : 'down'}
              trendValue={`${activeCompanies} ativas`}
              category="financial"
              data-testid="kpi-companies"
            />
            <KPICard 
              title="Taxa de Cancelamento" 
              value={`${churnRate}%`}
              icon={AlertTriangle}
              trend={churnRate > 7 ? 'down' : 'up'}
              trendValue={churnRate > 7 ? 'Acima do normal (>7%)' : 'Saudável (<7%)'}
              category="financial"
              data-testid="kpi-churn"
            />
            <KPICard 
              title="Receita Mensal Recorrente" 
              value="R$ 0,00"
              icon={DollarSign}
              category="financial"
              data-testid="kpi-mrr"
            />
            <KPICard 
              title="Ticket Médio" 
              value="R$ 0,00"
              icon={BarChart3}
              category="financial"
              data-testid="kpi-arpu"
            />
          </div>
        </div>

        {/* Row 2: Crescimento */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-1 w-8 rounded-full bg-gradient-to-r from-purple-500 to-purple-600"></div>
            <h2 className="text-2xl font-bold text-foreground">Métricas de Crescimento</h2>
            <Badge variant="outline" className="ml-auto">O Motor</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <KPICard 
              title="Novas Empresas (30d)" 
              value={lastMonthCompanies}
              icon={Building2}
              trend={lastMonthCompanies > 0 ? 'up' : 'down'}
              trendValue={`Crescimento ${lastMonthCompanies > 0 ? 'positivo' : 'estagnado'}`}
              category="growth"
              data-testid="kpi-new-companies"
            />
            <KPICard 
              title="Taxa de Conversão" 
              value="0%"
              icon={Target}
              category="growth"
              data-testid="kpi-conversion"
            />
            <KPICard 
              title="CAC (Custo Aquisição)" 
              value="R$ 0,00"
              icon={TrendingUp}
              category="growth"
              data-testid="kpi-cac"
            />
            <KPICard 
              title="LTV (Lifetime Value)" 
              value="R$ 0,00"
              icon={Activity}
              category="growth"
              data-testid="kpi-ltv"
            />
          </div>
        </div>

        {/* Row 3: Engajamento */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-1 w-8 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600"></div>
            <h2 className="text-2xl font-bold text-foreground">Métricas de Engajamento</h2>
            <Badge variant="outline" className="ml-auto">A Retenção</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <KPICard 
              title="Empresas Ativas (MAU)" 
              value={activeCompanies}
              icon={Building2}
              category="engagement"
              data-testid="kpi-active-companies"
            />
            <KPICard 
              title="Usuários Ativos" 
              value={activeUsers}
              icon={Users}
              category="engagement"
              data-testid="kpi-active-users"
            />
            <KPICard 
              title="Usuários por Empresa" 
              value={avgUsersPerCompany}
              icon={User}
              category="engagement"
              data-testid="kpi-users-per-company"
            />
            <KPICard 
              title="Clientes Cadastrados" 
              value={activeCustomers}
              icon={Heart}
              category="engagement"
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
    </div>
  );
}

export default function SuperAdminDashboard() {
  return <SuperDashboardContent />;
}
