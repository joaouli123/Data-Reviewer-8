import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { DollarSign, TrendingUp, Wallet, Users, Plus, ChevronRight, CheckCircle2, Clock, Check } from 'lucide-react';
import { subMonths, startOfMonth, format, isAfter, isBefore, subDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import KPIWidget from '../components/dashboard/KPIWidget';
import RevenueChart from '../components/dashboard/RevenueChart';
import QuickActionsFAB from '../components/dashboard/QuickActionsFAB';
import DateFilter from '../components/dashboard/DateFilter';
import TransactionForm from '../components/transactions/TransactionForm';
import { Transaction, Installment } from '@/api/entities';
import { PurchaseInstallment } from '@/api/entities';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function DashboardPage() {
  const [dateRange, setDateRange] = useState({
    startDate: startOfDay(subDays(new Date(), 29)),
    endDate: endOfDay(new Date()),
    label: 'Últimos 30 dias'
  });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data) => Transaction.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setIsFormOpen(false);
      toast.success('Transação criada com sucesso!');
    }
  });

  const handleSubmit = (data) => {
    createMutation.mutate(data);
  };

  const handleComplete = (id) => {
    updateMutation.mutate({ id, data: { status: 'concluído' } });
  };

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => Transaction.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Transação concluída!');
    }
  });

  // Fetch data
  const { data: transactions } = useQuery({
    queryKey: ['transactions', 'all'],
    queryFn: () => Transaction.list(),
    initialData: []
  });

  // Calculate metrics based on date range
  const calculateMetrics = () => {
    // Calculate opening balance (all transactions before start date)
    let openingBalance = 0;
    transactions.forEach(t => {
      const tDate = new Date(t.date);
      const amount = parseFloat(t.amount) || 0;
      const isPaid = (t.status === 'completed' || t.status === 'pago' || t.status === 'concluído');
      
      if (!isPaid) return;
      
      if (tDate < dateRange.startDate) {
        if (t.type === 'venda') openingBalance += amount;
        else openingBalance -= amount;
      }
    });

    const filteredTransactions = transactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate >= dateRange.startDate && tDate <= dateRange.endDate;
    });

    const totalRevenue = filteredTransactions
      .filter(t => t.type === 'venda' && (t.status === 'completed' || t.status === 'pago' || t.status === 'concluído'))
      .reduce((acc, curr) => acc + Math.abs(parseFloat(curr.amount || 0)), 0);
    
    const totalExpenses = filteredTransactions
      .filter(t => t.type === 'compra' && (t.status === 'completed' || t.status === 'pago' || t.status === 'concluído'))
      .reduce((acc, curr) => acc + Math.abs(parseFloat(curr.amount || 0)), 0);

    const netProfit = totalRevenue - totalExpenses;

    // Future Cash Flow (próximos 30 dias)
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    const futureRevenueTransactions = transactions.filter(t => {
      const tDate = new Date(t.date);
      tDate.setHours(0, 0, 0, 0);
      return t.type === 'venda' && tDate >= now && tDate <= next30Days;
    });
    
    const futureRevenue = futureRevenueTransactions.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount || 0)), 0);
    
    const futureExpensesTransactions = transactions.filter(t => {
      const tDate = new Date(t.date);
      tDate.setHours(0, 0, 0, 0);
      return t.type === 'compra' && tDate >= now && tDate <= next30Days;
    });
    
    const futureExpenses = futureExpensesTransactions.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount || 0)), 0);

    // Count pending installments (parcelas)
    const pendingSaleInstallments = transactions.filter(t => 
      t.type === 'venda' && t.installmentGroup && (t.status === 'pendente' || t.status === 'pending')
    ).length;
    
    const pendingPurchaseInstallments = transactions.filter(t => 
      t.type === 'compra' && t.installmentGroup && (t.status === 'pendente' || t.status === 'pending')
    ).length;

    // Chart data - últimos 6 meses
    const chartData = [];
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const monthKey = date.toISOString().slice(0, 7);
      const monthTrans = transactions.filter(t => {
        const tDate = typeof t.date === 'string' ? t.date : new Date(t.date).toISOString();
        return tDate.startsWith(monthKey);
      });
      
      const income = monthTrans.filter(t => t.type === 'venda').reduce((acc, t) => acc + Math.abs(parseFloat(t.amount || 0)), 0);
      const expense = monthTrans.filter(t => t.type === 'compra').reduce((acc, t) => acc + Math.abs(parseFloat(t.amount || 0)), 0);

      chartData.push({
        name: date.toLocaleString('pt-BR', { month: 'short' }).toUpperCase(),
        income,
        expense
      });
    }

    return {
      openingBalance,
      totalRevenue,
      totalExpenses,
      netProfit,
      futureRevenue,
      futureExpenses,
      futureRevenueCount: futureRevenueTransactions.length + pendingSaleInstallments,
      futureExpensesCount: futureExpensesTransactions.length + pendingPurchaseInstallments,
      chartData,
      filteredTransactions
    };
  };

  const metrics = calculateMetrics();

  return (
    <div className="space-y-6 p-4 sm:p-6 md:p-8">
      {/* Header com Filtro de Data */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Visão Geral</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Bem-vindo de volta ao seu painel financeiro.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <DateFilter onDateRangeChange={setDateRange} />
          <Button 
            onClick={() => setIsFormOpen(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            Nova Transação
          </Button>
        </div>
      </div>

      {/* KPI Cards - 4 Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPIWidget
          title="Saldo Inicial"
          value={`R$ ${metrics.openingBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={Wallet}
          trend={metrics.openingBalance >= 0 ? "up" : "down"}
          trendValue="Período anterior"
          className={metrics.openingBalance >= 0 ? "text-emerald-600" : "text-rose-600"}
        />
        
        <KPIWidget
          title="Receita Total"
          value={`R$ ${metrics.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={TrendingUp}
          trend="up"
          trendValue="Vendas"
          className="text-emerald-600"
        />
        
        <KPIWidget
          title="Despesa Total"
          value={`R$ ${metrics.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={DollarSign}
          trend="down"
          trendValue="Compras"
          className="text-rose-600"
        />

        <KPIWidget
          title="Contas a Receber"
          value={`R$ ${metrics.futureRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={Clock}
          trendValue={`${metrics.futureRevenueCount} parcelas`}
          trend="up"
          className="text-emerald-600"
        />

        <KPIWidget
          title="Contas a Pagar"
          value={`R$ ${metrics.futureExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={Clock}
          trendValue={`${metrics.futureExpensesCount} parcelas`}
          trend="down"
          className="text-rose-600"
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
        <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
          <h2 className="text-sm font-semibold text-foreground mb-3">Transações Recentes</h2>
          <div className="space-y-2 flex-1">
            {metrics.filteredTransactions.length > 0 ? (
              <>
                {metrics.filteredTransactions
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .slice(0, 5)
                  .map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            t.type === 'venda'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                              : 'bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400'
                          }`}
                        >
                          {t.type === 'venda' ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <DollarSign className="w-3 h-3" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-medium text-foreground truncate text-xs">{t.description}</p>
                            {(t.status === 'completed' || t.status === 'pago' || t.status === 'concluído') ? (
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Clock className="w-3 h-3 text-amber-500" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(t.date), 'dd MMM', { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!(t.status === 'completed' || t.status === 'pago' || t.status === 'concluído') && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" 
                            onClick={() => handleComplete(t.id)}
                            title="Concluir"
                          >
                            <Check className="w-3 h-3" />
                          </Button>
                        )}
                        <span
                          className={`font-semibold text-xs flex-shrink-0 whitespace-nowrap ${
                            t.type === 'venda' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {t.type === 'venda' ? '+' : '-'} R${' '}
                          {Math.abs(parseFloat(t.amount || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  ))}
                <a
                  href="/transactions"
                  className="text-primary hover:underline text-xs font-medium flex items-center justify-center mt-3 cursor-pointer"
                >
                  Ver tudo <ChevronRight className="w-3 h-3 ml-1" />
                </a>
              </>
            ) : (
              <p className="text-center text-muted-foreground text-xs py-4">
                Nenhuma transação
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions FAB */}
      <QuickActionsFAB />

      {/* Transaction Form */}
      <TransactionForm 
        open={isFormOpen} 
        onOpenChange={setIsFormOpen} 
        onSubmit={handleSubmit}
      />
    </div>
  );
}
