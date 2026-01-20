import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, Users, CreditCard, TrendingUp, 
  DollarSign, AlertTriangle, CheckCircle, XCircle,
  Crown, UserCheck, UserX
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const apiRequest = async (url) => {
  const token = JSON.parse(localStorage.getItem('auth') || '{}').token;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
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
    currency: 'BRL'
  }).format(value || 0);
};

function MetricCard({ title, value, subtitle, icon: Icon, color = 'blue', trend }) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
    green: 'bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400',
    red: 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400',
    yellow: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-950 dark:text-yellow-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400',
  };

  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
        {trend && (
          <div className={`text-xs mt-1 ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend >= 0 ? '+' : ''}{trend}% vs mês anterior
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatusCard({ title, items }) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {item.icon && <item.icon className={`h-4 w-4 ${item.iconColor || 'text-muted-foreground'}`} />}
              <span className="text-sm">{item.label}</span>
            </div>
            <Badge variant={item.variant || 'secondary'} className={item.badgeClass}>
              {item.value}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function SuperAdminDashboard() {
  const { data: metrics, isLoading, error } = useQuery({
    queryKey: ['/api/admin/metrics'],
    queryFn: () => apiRequest('/api/admin/metrics'),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando metricas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-destructive">Erro ao carregar metricas</p>
          <p className="text-sm text-muted-foreground mt-2">{error.message}</p>
        </div>
      </div>
    );
  }

  const { companies, subscriptions, revenue, users, kpis } = metrics || {};

  const companyStatusData = [
    { name: 'Ativas', value: companies?.active || 0 },
    { name: 'Suspensas', value: companies?.suspended || 0 },
    { name: 'Canceladas', value: companies?.cancelled || 0 },
  ];

  const subscriptionStatusData = [
    { name: 'Ativas', value: subscriptions?.active || 0 },
    { name: 'Expiradas', value: subscriptions?.expired || 0 },
    { name: 'Bloqueadas', value: subscriptions?.blocked || 0 },
  ];

  const pieColors = ['#16a34a', '#f59e0b', '#ef4444'];

  return (
    <div className="space-y-8 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground flex items-center gap-3">
            <Crown className="h-8 w-8 text-yellow-500" />
            Dashboard Super Admin
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Visao geral completa do SaaS HUACONTROL
          </p>
        </div>
      </div>

      {/* Main KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Receita Mensal (MRR)"
          value={formatCurrency(revenue?.mrr)}
          subtitle="Receita recorrente mensal"
          icon={DollarSign}
          color="green"
        />
        <MetricCard
          title="Receita Anual (ARR)"
          value={formatCurrency(revenue?.arr)}
          subtitle="Projecao anual"
          icon={TrendingUp}
          color="purple"
        />
        <MetricCard
          title="Assinaturas Ativas"
          value={subscriptions?.active || 0}
          subtitle={`de ${subscriptions?.total || 0} total`}
          icon={CreditCard}
          color="blue"
        />
        <MetricCard
          title="Taxa de Churn"
          value={`${kpis?.churnRate || 0}%`}
          subtitle={kpis?.churnRate > 7 ? 'Atenção necessária' : 'Saudável'}
          icon={kpis?.churnRate > 7 ? AlertTriangle : CheckCircle}
          color={kpis?.churnRate > 7 ? 'red' : 'green'}
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Empresas Ativas"
          value={companies?.active || 0}
          subtitle={`${companies?.suspended || 0} suspensas, ${companies?.cancelled || 0} canceladas`}
          icon={Building2}
          color="blue"
        />
        <MetricCard
          title="Usuarios Totais"
          value={users?.total || 0}
          subtitle={`${users?.active || 0} ativos`}
          icon={Users}
          color="purple"
        />
        <MetricCard
          title="Admins"
          value={users?.admins || 0}
          subtitle="Administradores de empresas"
          icon={UserCheck}
          color="yellow"
        />
        <MetricCard
          title="Media Usuarios/Empresa"
          value={kpis?.avgUsersPerCompany || 0}
          subtitle="Usuarios por empresa ativa"
          icon={Users}
          color="blue"
        />
      </div>

      {/* Detailed Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatusCard
          title="Status das Empresas"
          items={[
            { 
              label: 'Ativas', 
              value: companies?.active || 0, 
              icon: CheckCircle, 
              iconColor: 'text-green-600',
              variant: 'default',
              badgeClass: 'bg-green-600'
            },
            { 
              label: 'Suspensas', 
              value: companies?.suspended || 0, 
              icon: AlertTriangle, 
              iconColor: 'text-yellow-600',
              variant: 'outline'
            },
            { 
              label: 'Canceladas', 
              value: companies?.cancelled || 0, 
              icon: XCircle, 
              iconColor: 'text-red-600',
              variant: 'destructive'
            },
          ]}
        />

        <StatusCard
          title="Status das Assinaturas"
          items={[
            { 
              label: 'Ativas', 
              value: subscriptions?.active || 0, 
              icon: CheckCircle, 
              iconColor: 'text-green-600',
              variant: 'default',
              badgeClass: 'bg-green-600'
            },
            { 
              label: 'Expiradas', 
              value: subscriptions?.expired || 0, 
              icon: AlertTriangle, 
              iconColor: 'text-yellow-600',
              variant: 'secondary'
            },
            { 
              label: 'Bloqueadas', 
              value: subscriptions?.blocked || 0, 
              icon: XCircle, 
              iconColor: 'text-red-600',
              variant: 'destructive'
            },
          ]}
        />

        <StatusCard
          title="Status dos Usuarios"
          items={[
            { 
              label: 'Ativos', 
              value: users?.active || 0, 
              icon: UserCheck, 
              iconColor: 'text-green-600',
              variant: 'default',
              badgeClass: 'bg-green-600'
            },
            { 
              label: 'Inativos', 
              value: users?.inactive || 0, 
              icon: Users, 
              iconColor: 'text-gray-500',
              variant: 'secondary'
            },
            { 
              label: 'Suspensos', 
              value: users?.suspended || 0, 
              icon: UserX, 
              iconColor: 'text-red-600',
              variant: 'destructive'
            },
          ]}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Status das Empresas
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={companyStatusData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
                  {companyStatusData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [value, 'Empresas']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Status das Assinaturas
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subscriptionStatusData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip formatter={(value) => [value, 'Assinaturas']} />
                <Bar dataKey="value" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
