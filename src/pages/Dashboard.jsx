import React, { useState } from 'react';
import { formatCurrencySimple } from '@/utils/formatters';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { DollarSign, TrendingUp, Wallet, Users, Plus } from 'lucide-react';
import { subMonths, startOfMonth, format, isAfter, isBefore } from 'date-fns';
import KPIWidget from '../components/dashboard/KPIWidget';
import RevenueChart from '../components/dashboard/RevenueChart';
import QuickActionsFAB from '../components/dashboard/QuickActionsFAB';
import DateFilter from '../components/dashboard/DateFilter';
import { Transaction, Installment } from '@/api/entities';
import { PurchaseInstallment } from '@/api/entities';

export default function DashboardPage() {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(),
    endDate: new Date(),
    label: 'Hoje'
  });

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

  // Calculate metrics based on date range
  const calculateMetrics = () => {
    const filteredTransactions = transactions.filter(t => {
      const tDate = new Date(t.date);
      return isAfter(tDate, dateRange.startDate) && isBefore(tDate, dateRange.endDate);
    });

    const totalRevenue = filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((acc, curr) => acc + (curr.amount || 0), 0);
    
    const totalExpenses = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((acc, curr) => acc + (curr.amount || 0), 0);

    const netProfit = totalRevenue - totalExpenses;

    // Future Cash Flow (próximos 30 dias)
    const now = new Date();
    const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const futureRevenue = saleInstallments
      .filter(i => !i.paid && new Date(i.due_date) >= now && new Date(i.due_date) <= next30Days)
      .reduce((sum, i) => sum + i.amount, 0);
    
    const futureExpenses = purchaseInstallments
      .filter(i => !i.paid && new Date(i.due_date) >= now && new Date(i.due_date) <= next30Days)
      .reduce((sum, i) => sum + i.amount, 0);

    // Chart data - últimos 6 meses
    const chartData = [];
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const monthKey = date.toISOString().slice(0, 7);
      const monthTrans = transactions.filter(t => t.date.startsWith(monthKey));
      
      const income = monthTrans.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
      const expense = monthTrans.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);

      chartData.push({
        name: date.toUpperCase(),
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
      chartData,
      filteredTransactions
    };
  };

  const metrics = calculateMetrics();

  return (
    <div className="space-y-6 p-8">
      {/* Header com Filtro de Data */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Visão Geral</h1>
          <p className="text-sm text-muted-foreground mt-1">Bem-vindo de volta ao seu painel financeiro.</p>
        </div>
        <div className="flex items-center gap-3">
          <DateFilter onDateRangeChange={setDateRange} />
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
            <Plus className="w-4 h-4" />
            Nova Transação
          </Button>
        </div>
      </div>

      {/* KPI Cards - 4 Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPIWidget
          title="Receita Total"
          value={`R$ ${metrics.totalRevenue}`}
          icon={TrendingUp}
          trend="up"
          trendValue="+12% vs período anterior"
        />
        
        <KPIWidget
          title="Despesas"
          value={`R$ ${metrics.totalExpenses}`}
          icon={DollarSign}
        />

        <KPIWidget
          title="Lucro Líquido"
          value={`R$ ${metrics.netProfit}`}
          icon={Wallet}
        />

        <KPIWidget
          title="Clientes Ativos"
          value={saleInstallments.filter(i => !i.paid).length.toString()}
          icon={Users}
          trend="up"
          trendValue="+2 vs período anterior"
        />
      </div>

      {/* Fluxo de Caixa Futuro */}
      <div className="bg-white dark:bg-slate-900 rounded-lg p-6 border border-border">
        <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Wallet className="w-4 h-4 text-primary" />
          Fluxo de Caixa Futuro (Próximos 30 dias)
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1 uppercase">Receitas Previstas</p>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
              R$ {formatCurrencySimple(metrics.futureRevenue}
            </p>
          </div>

          <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-lg p-4">
            <p className="text-xs font-medium text-rose-700 dark:text-rose-400 mb-1 uppercase">Despesas Previstas</p>
            <p className="text-2xl font-bold text-rose-700 dark:text-rose-300">
              R$ {formatCurrencySimple(metrics.futureExpenses}
            </p>
          </div>

          <div className="bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 rounded-lg p-4">
            <p className="text-xs font-medium text-sky-700 dark:text-sky-400 mb-1 uppercase">Saldo Projetado</p>
            <p className={`text-2xl font-bold ${metrics.futureRevenue - metrics.futureExpenses >= 0 ? 'text-sky-700 dark:text-sky-300' : 'text-slate-700 dark:text-slate-300'}`}>
              {metrics.futureRevenue - metrics.futureExpenses >= 0 ? '+' : ''} R$ {formatCurrencySimple((metrics.futureRevenue - metrics.futureExpenses)}
            </p>
          </div>
        </div>
      </div>

      {/* Gráfico de Receita */}
      <div className="bg-white dark:bg-slate-900 rounded-lg p-6 border border-border">
        <h2 className="text-sm font-semibold text-foreground mb-6">Evolução de Receitas e Despesas (Últimos 6 meses)</h2>
        <RevenueChart data={metrics.chartData} />
      </div>

      {/* Transações Recentes */}
      <div className="bg-white dark:bg-slate-900 rounded-lg p-6 border border-border">
        <h2 className="text-sm font-semibold text-foreground mb-4">Transações Recentes</h2>
        <div className="space-y-2">
          {metrics.filteredTransactions.length > 0 ? (
            metrics.filteredTransactions
              .sort((a, b) => new Date(b.date) - new Date(a.date))
              .slice(0, 10)
              .map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-3 hover:bg-muted/50 dark:hover:bg-muted/20 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        t.type === 'income'
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted/50 text-muted-foreground'
                      }`}
                    >
                      {t.type === 'income' ? (
                        <TrendingUp className="w-5 h-5" />
                      ) : (
                        <DollarSign className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{t.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(t.date).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`font-semibold text-sm ${
                      t.type === 'income' ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  >
                    {t.type === 'income' ? '+' : '-'} R${' '}
                    {t.amount}
                  </span>
                </div>
              ))
          ) : (
            <p className="text-center text-muted-foreground text-sm py-8">
              Nenhuma transação no período selecionado
            </p>
          )}
        </div>
      </div>

      {/* Quick Actions FAB */}
      <QuickActionsFAB />
    </div>
  );
}
