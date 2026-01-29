import React, { useState, useEffect } from 'react';
import { usePermission } from '@/hooks/usePermission';
import { ProtectedFeature } from '@/components/ProtectedFeature';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { DollarSign, TrendingUp, Wallet, Users, Plus, ChevronRight, CheckCircle2, Clock, Check } from 'lucide-react';
import { subMonths, startOfMonth, endOfMonth, format, isAfter, isBefore, subDays, startOfDay, endOfDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import KPIWidget from '../components/dashboard/KPIWidget';
import RevenueChart from '../components/dashboard/RevenueChart';
import DREComparison from '../components/dashboard/DREComparison';
import QuickActionsFAB from '../components/dashboard/QuickActionsFAB';
import PeriodFilter from '../components/dashboard/PeriodFilter';
import TransactionForm from '../components/transactions/TransactionForm';
import FutureTransactionsDialog from '../components/dashboard/FutureTransactionsDialog';
import { apiRequest } from '@/lib/queryClient';
import { Transaction, Installment } from '@/api/entities';
import { PurchaseInstallment } from '@/api/entities';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

const INCOME_TYPES = ['venda', 'venda_prazo', 'receita', 'income', 'entrada'];
const EXPENSE_TYPES = ['compra', 'compra_prazo', 'despesa', 'expense', 'saida'];

const isIncomeType = (type) => INCOME_TYPES.includes(type);
const isExpenseType = (type) => EXPENSE_TYPES.includes(type);

export default function DashboardPage() {
  // Initialize with UTC-normalized dates for São Paulo timezone
  const getInitialDateRange = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const thirtyDaysAgoStr = new Date(new Date().setDate(new Date().getDate() - 29)).toISOString().split('T')[0];
    return {
      startDate: new Date(thirtyDaysAgoStr + 'T00:00:00Z'),
      endDate: new Date(todayStr + 'T23:59:59Z'),
      label: 'Últimos 30 dias'
    };
  };

  const [dateRange, setDateRange] = useState(getInitialDateRange());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [showReceivablesDialog, setShowReceivablesDialog] = useState(false);
  const [showPayablesDialog, setShowPayablesDialog] = useState(false);
  const { company, user } = useAuth();
  const queryClient = useQueryClient();
  const { PERMISSIONS } = { PERMISSIONS: { CREATE_TRANSACTIONS: 'create_transactions' } }; // Simplified for now or import properly

  const hasPermission = (permission) => {
    if (user?.role === 'admin' || user?.isSuperAdmin) return true;
    return !!user?.permissions?.[permission];
  };
  useEffect(() => {
    // Confetti effect on first access after payment
    if (user && company?.paymentStatus === 'approved') {
      const hasCelebrated = localStorage.getItem(`celebrated_${user.id}`);
      if (!hasCelebrated) {
        const duration = 3 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 1000 };
        const randomInRange = (min, max) => Math.random() * (max - min) + min;

        const interval = setInterval(function() {
          const timeLeft = animationEnd - Date.now();
          if (timeLeft <= 0) return clearInterval(interval);

          const particleCount = 50 * (timeLeft / duration);
          confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
          confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
        }, 250);

        localStorage.setItem(`celebrated_${user.id}`, 'true');
      }
    }
  }, [user, company]);

  const createMutation = useMutation({
    mutationFn: (data) => Transaction.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions', company?.id] });
    },
    onError: (error) => {
    }
  });

  const handleSubmit = (data) => {
    
    if (Array.isArray(data)) {
      // Para parcelado: criar todas as parcelas sequencialmente
      Promise.all(
        data.map(item => {
          return apiRequest('POST', '/api/transactions', item);
        })
      ).then(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/transactions', company?.id] });
        setIsFormOpen(false);
        toast.success(`${data.length} parcel(as) criada(s) com sucesso!`);
      }).catch(error => {
        toast.error(error.message || 'Erro ao salvar parcelado. Tente novamente.');
      });
    } else {
      // Para transação única
      createMutation.mutate(data, {
        onSuccess: () => {
          setIsFormOpen(false);
          toast.success('Transação criada com sucesso!');
        },
        onError: (error) => {
          toast.error(error.message || 'Erro ao salvar transação. Tente novamente.');
        }
      });
    }
  };

  // Fetch ALL transactions to show only periods with actual data
  const { data: allTxData = [], isLoading } = useQuery({
    queryKey: ['/api/transactions', company?.id || user?.id],
    queryFn: () => Transaction.list(),
    staleTime: 0, // Invalida imediatamente para refletir novos dados
    refetchOnWindowFocus: true,
    enabled: !!user?.id
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-500 animate-pulse font-medium">Carregando dados financeiros...</p>
      </div>
    );
  }

  const allTransactions = Array.isArray(allTxData) ? allTxData : (allTxData?.data || []);
  
  const extractTxDate = (t) => {
    if (!t) return null;
    const candidate = t.paymentDate || t.date || t.createdAt || t.created_at;
    if (!candidate) return null;
    try {
      const d = new Date(candidate);
      return Number.isNaN(d.getTime()) ? null : d;
    } catch (e) {
      return null;
    }
  };

  // Calculate metrics based on date range
  const calculateMetrics = () => {
    const startDateStr = format(dateRange.startDate, 'yyyy-MM-dd');
    const endDateStr = format(dateRange.endDate, 'yyyy-MM-dd');
    const startDate = parseISO(startDateStr);
    const endDate = parseISO(endDateStr);
    
    // Filter transactions by date range
    const filteredTransactions = allTransactions.filter(t => {
      const tDate = extractTxDate(t);
      if (!tDate) return false;
      return tDate >= startDate && tDate <= endDate;
    });

    const totalRevenue = filteredTransactions
      .filter(t => isIncomeType(t.type))
      .reduce((acc, curr) => {
        const amount = parseFloat(curr.amount) || 0;
        const interest = parseFloat(curr.interest) || 0;
        // Calcular taxa de cartão se aplicável
        const cardFee = curr.hasCardFee ? (Math.abs(amount) * (parseFloat(curr.cardFee) || 0)) / 100 : 0;
        return acc + Math.abs(amount) + interest - cardFee;
      }, 0);
    
    const totalExpenses = filteredTransactions
      .filter(t => isExpenseType(t.type))
      .reduce((acc, curr) => {
        const amount = parseFloat(curr.amount) || 0;
        const interest = parseFloat(curr.interest) || 0;
        return acc + Math.abs(amount + interest);
      }, 0);

    const netProfit = totalRevenue - totalExpenses;

    // Future Cash Flow (próximos 30 dias) - APENAS transações PENDENTES
    // Usar data local (sem timezone UTC) para evitar problemas de comparação
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const thirtyDaysFromNow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30, 23, 59, 59, 999);
    
    // Helper para verificar se transação está pendente
    const isPendingStatus = (status) => {
      if (!status) return true; // Se não tem status, considera pendente
      const s = String(status).toLowerCase();
      return s === 'pendente' || s === 'agendado' || s === 'pending' || s === 'scheduled';
    };
    
    // Helper para extrair data de VENCIMENTO (normaliza para local date)
    const extractDueDate = (t) => {
      if (!t) return null;
      // Para transações pendentes, usar date (vencimento), não paymentDate
      const candidate = t.date || t.paymentDate;
      if (!candidate) return null;
      try {
        const d = new Date(candidate);
        if (Number.isNaN(d.getTime())) return null;
        // Normalizar para data local (ignorar timezone)
        return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
      } catch (e) {
        return null;
      }
    };
    
    const futureRevenueTransactions = allTransactions.filter(t => {
      const tDate = extractDueDate(t);
      if (!tDate) return false;
      // Filtra apenas receitas PENDENTES com vencimento nos próximos 30 dias
      const isIncome = isIncomeType(t.type);
      const isPending = isPendingStatus(t.status);
      const isInRange = tDate >= today && tDate <= thirtyDaysFromNow;
      
      return isIncome && isPending && isInRange;
    });

    const futureRevenue = futureRevenueTransactions.reduce((sum, t) => {
      const amount = Math.abs(parseFloat(t.amount || 0));
      const interest = parseFloat(t.interest || 0);
      const cardFee = t.hasCardFee ? (amount * (parseFloat(t.cardFee) || 0)) / 100 : 0;
      return sum + amount + interest - cardFee;
    }, 0);
    
    const futureExpensesTransactions = allTransactions.filter(t => {
      const tDate = extractDueDate(t);
      if (!tDate) return false;
      // Filtra apenas despesas PENDENTES com vencimento nos próximos 30 dias
      const isExpense = isExpenseType(t.type);
      const isPending = isPendingStatus(t.status);
      const isInRange = tDate >= today && tDate <= thirtyDaysFromNow;
      return isExpense && isPending && isInRange;
    });
    
    const futureExpenses = futureExpensesTransactions.reduce((sum, t) => sum + Math.abs((parseFloat(t.amount || 0) + parseFloat(t.interest || 0))), 0);

    // Count future transactions
    const futureSaleCount = futureRevenueTransactions.length;
    const futurePurchaseCount = futureExpensesTransactions.length;

    // Chart data - always last 6 months (fill zeros if no data)
    const monthsToShow = Array.from({ length: 6 }, (_, i) => startOfMonth(subMonths(new Date(), 5 - i)));
    const chartData = monthsToShow.map(monthStart => {
      const monthEnd = endOfMonth(monthStart);
      const monthTrans = allTransactions.filter(t => {
        const tDate = extractTxDate(t);
        if (!tDate) return false;
        return tDate >= monthStart && tDate <= monthEnd;
      });

      const income = monthTrans
        .filter(t => isIncomeType(t.type))
        .reduce((acc, t) => {
          const amount = Math.abs(parseFloat(t.amount || 0));
          const interest = parseFloat(t.interest || 0);
          const cardFee = t.hasCardFee ? (amount * (parseFloat(t.cardFee) || 0)) / 100 : 0;
          return acc + amount + interest - cardFee;
        }, 0);
      const expenseRaw = monthTrans
        .filter(t => isExpenseType(t.type))
        .reduce((acc, t) => acc + ((parseFloat(t.amount) || 0) + (parseFloat(t.interest) || 0)), 0);

      return {
        name: monthStart.toLocaleString('pt-BR', { month: 'short', year: '2-digit' }).toUpperCase(),
        income,
        expense: Math.abs(expenseRaw)
      };
    });

    return {
      openingBalance: 0, // Simplified - opening balance from recent transactions only
      totalRevenue,
      totalExpenses,
      netProfit,
      futureRevenue,
      futureExpenses,
      futureRevenueCount: futureSaleCount,
      futureExpensesCount: futurePurchaseCount,
      futureRevenueTransactions,
      futureExpensesTransactions,
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
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Bem vindo, {user?.name}!</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Visão Geral do seu painel financeiro.</p>
          {metrics.openingBalance !== 0 && (
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2">
              Saldo Inicial: <span className={metrics.openingBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'} style={{fontWeight: 'bold'}}>
                R$ {metrics.openingBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </p>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <PeriodFilter 
            onPeriodChange={setDateRange}
            mode="days"
            defaultPeriod="today"
          />
          {hasPermission('create_transactions') && (
            <Button 
              onClick={() => setIsFormOpen(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 w-full sm:w-auto"
            >
              <Plus className="w-4 h-4" />
              Nova Transação
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards - 4 Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPIWidget
          title="Receita total"
          value={`R$ ${metrics.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={TrendingUp}
          trend="up"
          trendValue="Vendas"
          className="text-emerald-600"
        />
        
        <KPIWidget
          title="Despesa total"
          value={`R$ ${metrics.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={DollarSign}
          trend="down"
          trendValue="Compras"
          className="text-rose-600"
        />

        <KPIWidget
          title="Contas a receber"
          value={`R$ ${metrics.futureRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={Clock}
          trendValue={`${metrics.futureRevenueCount} parcelas`}
          trend="up"
          className="text-emerald-600"
          onClick={() => setShowReceivablesDialog(true)}
        />

        <KPIWidget
          title="Contas a pagar"
          value={`R$ ${metrics.futureExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={Clock}
          trendValue={`${metrics.futureExpensesCount} parcelas`}
          trend="down"
          className="text-rose-600"
          onClick={() => setShowPayablesDialog(true)}
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
              R$ {metrics.futureRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-lg p-4">
            <p className="text-xs font-medium text-rose-700 dark:text-rose-400 mb-1">Despesas previstas</p>
            <p className="text-2xl font-bold text-rose-700 dark:text-rose-300">
              R$ {metrics.futureExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          <div className="bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 rounded-lg p-4">
            <p className="text-xs font-medium text-sky-700 dark:text-sky-400 mb-1">Saldo projetado</p>
            <p className={`text-2xl font-bold ${metrics.futureRevenue - metrics.futureExpenses >= 0 ? 'text-sky-700 dark:text-sky-300' : 'text-slate-700 dark:text-slate-300'}`}>
              {metrics.futureRevenue - metrics.futureExpenses >= 0 ? '+' : ''} R$ {(metrics.futureRevenue - metrics.futureExpenses).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {/* DRE Comparativo */}
      <DREComparison transactions={allTransactions} companyName={company?.name} />

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
                  .sort((a, b) => {
                    const dateCompare = new Date(b.date) - new Date(a.date);
                    if (dateCompare !== 0) return dateCompare;
                    return String(b.id).localeCompare(String(a.id));
                  })
                  .slice(0, 5)
                  .map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            ['venda', 'venda_prazo', 'receita', 'income'].includes(t.type)
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                              : 'bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400'
                          }`}
                        >
                          {['venda', 'venda_prazo', 'receita', 'income'].includes(t.type) ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <DollarSign className="w-3 h-3" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate text-xs">{t.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {(() => {
                              const d = extractTxDate(t);
                              return d ? format(d, 'dd MMM', { locale: ptBR }) : '---';
                            })()}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`font-semibold text-xs flex-shrink-0 whitespace-nowrap ${
                          ['venda', 'venda_prazo', 'receita', 'income'].includes(t.type) ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {['venda', 'venda_prazo', 'receita', 'income'].includes(t.type) ? '+' : '-'} R${' '}
                        {Math.abs(parseFloat(t.amount || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
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

      {/* Transaction Form */}
      <TransactionForm 
        open={isFormOpen} 
        onOpenChange={setIsFormOpen} 
        onSubmit={handleSubmit}
      />

      {/* Dialog de Contas a Receber */}
      <FutureTransactionsDialog
        open={showReceivablesDialog}
        onOpenChange={setShowReceivablesDialog}
        title="Contas a Receber (Próximos 30 dias)"
        transactions={metrics.futureRevenueTransactions || []}
        type="income"
      />

      {/* Dialog de Contas a Pagar */}
      <FutureTransactionsDialog
        open={showPayablesDialog}
        onOpenChange={setShowPayablesDialog}
        title="Contas a Pagar (Próximos 30 dias)"
        transactions={metrics.futureExpensesTransactions || []}
        type="expense"
      />
    </div>
  );
}
