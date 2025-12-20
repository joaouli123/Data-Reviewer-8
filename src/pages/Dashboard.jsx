import React, { useState } from 'react';
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

  // Calculate metrics based on date range
  const calculateMetrics = () => {
    const filteredTransactions = transactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate >= dateRange.startDate && tDate <= dateRange.endDate;
    });

    const totalRevenue = filteredTransactions
      .filter(t => t.type === 'venda')
      .reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0);
    
    const totalExpenses = filteredTransactions
      .filter(t => t.type === 'compra')
      .reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0);

    const netProfit = totalRevenue - totalExpenses;

    // Future Cash Flow (próximos 30 dias)
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    const futureRevenue = transactions
      .filter(t => {
        const tDate = new Date(t.date);
        tDate.setHours(0, 0, 0, 0);
        return t.type === 'venda' && tDate >= now && tDate <= next30Days;
      })
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    
    const futureExpenses = transactions
      .filter(t => {
        const tDate = new Date(t.date);
        tDate.setHours(0, 0, 0, 0);
        return t.type === 'compra' && tDate >= now && tDate <= next30Days;
      })
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

    // Chart data - últimos 6 meses
    const chartData = [];
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const monthKey = date.toISOString().slice(0, 7);
      const monthTrans = transactions.filter(t => {
        const tDate = typeof t.date === 'string' ? t.date : new Date(t.date).toISOString();
        return tDate.startsWith(monthKey);
      });
      
      const income = monthTrans.filter(t => t.type === 'venda').reduce((acc, t) => acc + parseFloat(t.amount || 0), 0);
      const expense = monthTrans.filter(t => t.type === 'compra').reduce((acc, t) => acc + parseFloat(t.amount || 0), 0);

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
          value={`R$ ${metrics.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={TrendingUp}
          trend="up"
          trendValue="+12% vs período anterior"
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
          value={new Set(transactions.filter(t => t.type === 'venda' && t.customerId).map(t => t.customerId)).size.toString()}
          icon={Users}
          trend="up"
          trendValue="+2 vs período anterior"
        />
      </div>

      {/* Fluxo de Caixa Futuro */}
      <div className="bg-white dark:bg-slate-900 rounded-lg p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Wallet className="w-4 h-4 text-primary" />
          Fluxo de Caixa Futuro (Próximos 30 dias)
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1">Receitas previstas</p>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
              R$ {metrics.futureRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-lg p-4">
            <p className="text-xs font-medium text-rose-700 dark:text-rose-400 mb-1">Despesas previstas</p>
            <p className="text-2xl font-bold text-rose-700 dark:text-rose-300">
              R$ {metrics.futureExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 rounded-lg p-4">
            <p className="text-xs font-medium text-sky-700 dark:text-sky-400 mb-1">Saldo projetado</p>
            <p className={`text-2xl font-bold ${metrics.futureRevenue - metrics.futureExpenses >= 0 ? 'text-sky-700 dark:text-sky-300' : 'text-slate-700 dark:text-slate-300'}`}>
              {metrics.futureRevenue - metrics.futureExpenses >= 0 ? '+' : ''} R$ {(metrics.futureRevenue - metrics.futureExpenses).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {/* Gráfico de Receita e Transações Recentes - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de Receita */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-lg p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground mb-6">Evolução de Receitas e Despesas (Últimos 6 meses)</h2>
          <RevenueChart data={metrics.chartData} />
        </div>

        {/* Transações Recentes */}
        <div className="bg-white dark:bg-slate-900 rounded-lg p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
          <h2 className="text-sm font-semibold text-foreground mb-4">Transações Recentes</h2>
          <div className="space-y-3 flex-1 overflow-y-auto">
            {metrics.filteredTransactions.length > 0 ? (
              metrics.filteredTransactions
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 10)
                .map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                          t.type === 'venda'
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                            : 'bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400'
                        }`}
                      >
                        {t.type === 'venda' ? (
                          <TrendingUp className="w-5 h-5" />
                        ) : (
                          <DollarSign className="w-5 h-5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground truncate text-sm">{t.description}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(t.date).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'short'
                          }).replace('.', '')}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`font-bold text-sm flex-shrink-0 ml-2 whitespace-nowrap ${
                        t.type === 'venda' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {t.type === 'venda' ? '+' : '-'} R${' '}
                      {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
      </div>

      {/* Quick Actions FAB */}
      <QuickActionsFAB />
    </div>
  );
}
