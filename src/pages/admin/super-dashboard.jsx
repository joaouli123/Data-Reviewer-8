import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest as queryApiRequest } from '@/lib/queryClient';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, Send, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, Users, CreditCard, TrendingUp, 
  DollarSign, AlertTriangle, CheckCircle, XCircle,
  Crown, UserCheck, UserX
} from 'lucide-react';

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
  const [testEmail, setTestEmail] = useState('');
  
  const testEmailMutation = useMutation({
    mutationFn: (email) => queryApiRequest('POST', '/api/admin/test-email', { email }),
    onSuccess: () => {
      toast.success('E-mail de teste enviado com sucesso!');
      setTestEmail('');
    },
    onError: (err) => toast.error('Erro ao enviar e-mail: ' + err.message),
  });

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

  const { companies, subscriptions, revenue, plans, paymentMethods, users, kpis } = metrics || {};

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

        <Card className="w-full md:w-96 shadow-sm border-primary/20">
          <CardHeader className="pb-2 py-3 px-4">
            <CardTitle className="text-xs font-semibold flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
              <Mail className="w-3.5 h-3.5" /> Testar E-mail de Boas-vindas
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="flex gap-2">
              <Input 
                placeholder="seu@email.com" 
                value={testEmail} 
                onChange={(e) => setTestEmail(e.target.value)}
                className="h-9 text-sm"
              />
              <Button 
                size="sm" 
                onClick={() => testEmailMutation.mutate(testEmail)}
                disabled={!testEmail || testEmailMutation.isPending}
                className="shrink-0 h-9"
              >
                {testEmailMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
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
              label: 'Vitalicias', 
              value: subscriptions?.lifetime || 0, 
              icon: Crown, 
              iconColor: 'text-yellow-500',
              variant: 'outline'
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

      {/* Distribution Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Distribuicao por Plano
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-400" />
                  <span className="text-sm">Basic</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{plans?.basic || 0}</span>
                  <Badge variant="secondary" className="text-xs">
                    {subscriptions?.total > 0 
                      ? ((plans?.basic || 0) / subscriptions.total * 100).toFixed(0) 
                      : 0}%
                  </Badge>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-sm">Pro</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{plans?.pro || 0}</span>
                  <Badge variant="default" className="text-xs bg-blue-600">
                    {subscriptions?.total > 0 
                      ? ((plans?.pro || 0) / subscriptions.total * 100).toFixed(0) 
                      : 0}%
                  </Badge>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500" />
                  <span className="text-sm">Enterprise</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{plans?.enterprise || 0}</span>
                  <Badge className="text-xs bg-purple-600">
                    {subscriptions?.total > 0 
                      ? ((plans?.enterprise || 0) / subscriptions.total * 100).toFixed(0) 
                      : 0}%
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Formas de Pagamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {paymentMethods && Object.entries(paymentMethods).length > 0 ? (
              Object.entries(paymentMethods)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([method, count]) => (
                  <div key={method} className="flex items-center justify-between">
                    <span className="text-sm capitalize">{method.replace('_', ' ')}</span>
                    <Badge variant="outline">{count}</Badge>
                  </div>
                ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum dado de pagamento disponivel
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
