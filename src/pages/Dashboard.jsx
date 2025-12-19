import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { DollarSign, TrendingUp, Wallet, AlertCircle, Users } from 'lucide-react';
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

    // Working Capital
    const receivables = saleInstallments
      .filter(i => !i.paid)
      .reduce((sum, i) => sum + i.amount, 0);
    
    const payables = purchaseInstallments
      .filter(i => !i.paid)
      .reduce((sum, i) => sum + i.amount, 0);

    const workingCapital = receivables - payables;

    // Debt
    const totalDebt = purchaseInstallments
      .filter(i => !i.paid)
      .reduce((sum, i) => sum + i.amount, 0);

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
      workingCapital,
      totalDebt,
      futureRevenue,
      futureExpenses,
      chartData
    };
  };

  const metrics = calculateMetrics();

  return (
    <div className="bg-slate-50 dark:bg-slate-950 min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Visão Geral</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">Bem-vindo de volta ao seu painel financeiro.</p>
          </div>
          <Button className="bg-primary hover:bg-primary/90 text-white">Nova Transação</Button>
        </div>

        {/* KPI Cards - 4 Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KPIWidget
            title="Receita Total"
            value={`R$ ${metrics.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            icon={TrendingUp}
            color="primary"
            trend="up"
            trendValue="+12% vs mês anterior"
          />
          
          <KPIWidget
            title="Despesas"
            value={`R$ ${metrics.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            icon={AlertCircle}
            color="secondary"
            trend="down"
            trendValue="-4% vs mês anterior"
          />

          <KPIWidget
            title="Lucro Líquido"
            value={`R$ ${metrics.netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            icon={DollarSign}
            color="primary"
          />

          <KPIWidget
            title="Clientes Ativos"
            value={saleInstallments.filter(i => !i.paid).length.toString()}
            icon={Users}
            color="primary"
            trend="up"
            trendValue="+2 vs mês anterior"
          />
        </div>

        {/* Fluxo de Caixa Futuro */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            Fluxo de Caixa Futuro (Próximos 30 dias)
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Receitas Previstas</p>
              </div>
              <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">
                R$ {metrics.futureRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                <p className="text-sm font-medium text-rose-700 dark:text-rose-400">Despesas Previstas</p>
              </div>
              <p className="text-3xl font-bold text-rose-700 dark:text-rose-400">
                R$ {metrics.futureExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <p className="text-sm font-medium text-blue-700 dark:text-blue-400">Saldo Projetado</p>
              </div>
              <p className={`text-3xl font-bold ${metrics.futureRevenue - metrics.futureExpenses >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-rose-700 dark:text-rose-400'}`}>
                {metrics.futureRevenue - metrics.futureExpenses >= 0 ? '+' : ''} R$ {(metrics.futureRevenue - metrics.futureExpenses).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        {/* Gráfico de Receita */}
        <div className="bg-white dark:bg-slate-900 rounded-lg p-6 border border-slate-200 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Evolução de Receitas e Despesas</h2>
          <RevenueChart data={metrics.chartData} />
        </div>
      </div>
    </div>
  );
}
