import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { DollarSign, TrendingUp, Wallet, Users, Plus } from 'lucide-react';
import { subMonths, startOfMonth } from 'date-fns';
import KPIWidget from '../components/dashboard/KPIWidget';
import RevenueChart from '../components/dashboard/RevenueChart';
import { Transaction, Installment } from '@/api/entities';
import { PurchaseInstallment } from '@/api/entities';

export default function DashboardPage() {
  // Fetch data
  const { data: transactions } = useQuery({
    queryKey: ['transactions', 'all'],
    queryFn: () => Transaction.list(),
    initialData: []
  });

  const { data: saleInstallments } = useQuery({
    queryKey: ['installments'],
    queryFn: () => Installment.list(),
    initialData: []
  });

  const { data: purchaseInstallments } = useQuery({
    queryKey: ['purchaseInstallments'],
    queryFn: () => PurchaseInstallment.list(),
    initialData: []
  });

  // Calculate metrics
  const calculateMetrics = () => {
    const now = new Date();
    const threeMonthsAgo = subMonths(startOfMonth(now), 2);
    const recentTransactions = transactions.filter(t => new Date(t.date) >= threeMonthsAgo);

    const totalRevenue = recentTransactions
      .filter(t => t.type === 'income')
      .reduce((acc, curr) => acc + (curr.amount || 0), 0);
    
    const totalExpenses = recentTransactions
      .filter(t => t.type === 'expense')
      .reduce((acc, curr) => acc + (curr.amount || 0), 0);

    const netProfit = totalRevenue - totalExpenses;

    // Future Cash Flow
    const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const futureRevenue = saleInstallments
      .filter(i => !i.paid && new Date(i.due_date) >= now && new Date(i.due_date) <= next30Days)
      .reduce((sum, i) => sum + i.amount, 0);
    
    const futureExpenses = purchaseInstallments
      .filter(i => !i.paid && new Date(i.due_date) >= now && new Date(i.due_date) <= next30Days)
      .reduce((sum, i) => sum + i.amount, 0);

    // Chart data
    const chartData = [];
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const monthKey = date.toISOString().slice(0, 7);
      const monthTrans = transactions.filter(t => t.date.startsWith(monthKey));
      
      const income = monthTrans.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
      const expense = monthTrans.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);

      chartData.push({
        name: date.toLocaleString('pt-BR', { month: 'short' }).toUpperCase(),
        income,
        expense
      });
    }

    return {
      totalRevenue,
      totalExpenses,
      netProfit,
      futureRevenue,
      futureExpenses,
      chartData
    };
  };

  const metrics = calculateMetrics();

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Visão Geral</h1>
          <p className="text-sm text-muted-foreground mt-1">Bem-vindo de volta ao seu painel financeiro.</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
          <Plus className="w-4 h-4" />
          Nova Transação
        </Button>
      </div>

      {/* KPI Cards - 4 Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPIWidget
          title="Receita Total"
          value={`R$ ${metrics.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={TrendingUp}
          trend="up"
          trendValue="+12% vs mês anterior"
        />
        
        <KPIWidget
          title="Despesas"
          value={`R$ ${metrics.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={DollarSign}
        />

        <KPIWidget
          title="Lucro Líquido"
          value={`R$ ${metrics.netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={Wallet}
        />

        <KPIWidget
          title="Clientes Ativos"
          value={saleInstallments.filter(i => !i.paid).length.toString()}
          icon={Users}
          trend="up"
          trendValue="+2 vs mês anterior"
        />
      </div>

      {/* Fluxo de Caixa Futuro */}
      <div className="bg-white dark:bg-slate-900 rounded-lg p-6 border border-border">
        <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Wallet className="w-4 h-4 text-primary" />
          Fluxo de Caixa Futuro (Próximos 30 dias)
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-primary/10 dark:bg-primary/20 border border-primary/30 rounded-lg p-4">
            <p className="text-xs font-medium text-primary mb-1 uppercase">Receitas Previstas</p>
            <p className="text-2xl font-bold text-primary">
              R$ {metrics.futureRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="bg-muted/50 dark:bg-muted/20 border border-border rounded-lg p-4">
            <p className="text-xs font-medium text-muted-foreground mb-1 uppercase">Despesas Previstas</p>
            <p className="text-2xl font-bold text-foreground">
              R$ {metrics.futureExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="bg-secondary/10 dark:bg-secondary/20 border border-secondary/30 rounded-lg p-4">
            <p className="text-xs font-medium text-secondary mb-1 uppercase">Saldo Projetado</p>
            <p className={`text-2xl font-bold ${metrics.futureRevenue - metrics.futureExpenses >= 0 ? 'text-primary' : 'text-muted-foreground'}`}>
              {metrics.futureRevenue - metrics.futureExpenses >= 0 ? '+' : ''} R$ {(metrics.futureRevenue - metrics.futureExpenses).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {/* Gráfico de Receita */}
      <div className="bg-white dark:bg-slate-900 rounded-lg p-6 border border-border">
        <h2 className="text-sm font-semibold text-foreground mb-6">Evolução de Receitas e Despesas</h2>
        <RevenueChart data={metrics.chartData} />
      </div>
    </div>
  );
}
