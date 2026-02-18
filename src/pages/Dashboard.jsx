import React, { useState, useEffect } from 'react';
import { usePermission } from '@/hooks/usePermission';
import { ProtectedFeature } from '@/components/ProtectedFeature';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { DollarSign, TrendingUp, Wallet, Users, Plus, ChevronRight, CheckCircle2, Clock, Check } from 'lucide-react';
import { subMonths, startOfMonth, endOfMonth, format, isAfter, isBefore, subDays, startOfDay, endOfDay, parseISO, addDays } from 'date-fns';
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

// Converte datas comuns (yyyy-mm-dd, dd/mm/yyyy, dd-mm-yyyy, ISO) para data local sem shift de fuso
const parseLocalDateString = (raw) => {
  const str = String(raw || '').trim();

  const ymd = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymd) {
    const year = Number(ymd[1]);
    const month = Number(ymd[2]);
    const day = Number(ymd[3]);
    const d = new Date(year, month - 1, day, 12, 0, 0, 0);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const dmy = str.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    const year = Number(dmy[3]);
    const d = new Date(year, month - 1, day, 12, 0, 0, 0);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(str);
  return Number.isNaN(d.getTime()) ? null : d;
};

// Normaliza valores monetários sem multiplicar por 100 quando já vierem com ponto decimal
const parseMoney = (value) => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;

  const str = String(value).replace(/\s/g, '').replace('R$', '');
  const usesComma = str.includes(',');
  const normalized = usesComma ? str.replace(/\./g, '').replace(',', '.') : str;

  const parsed = parseFloat(normalized);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export default function DashboardPage() {
  // Initialize with local day bounds to avoid UTC shifts
  const getInitialDateRange = () => {
    const today = new Date();
    return {
      startDate: startOfDay(today),
      endDate: endOfDay(today),
      label: 'Hoje'
    };
  };

  const getInitialCashFlowDateRange = () => {
    const today = new Date();
    const nextThirtyDays = addDays(today, 30);
    return {
      startDate: startOfDay(today),
      endDate: endOfDay(nextThirtyDays),
      label: 'Próximos 30 dias'
    };
  };

  const [dateRange, setDateRange] = useState(getInitialDateRange());
  const [cashFlowDateRange] = useState(getInitialCashFlowDateRange());
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
      return Promise.all(
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
      return createMutation.mutateAsync(data)
        .then(() => {
          setIsFormOpen(false);
          toast.success('Transação criada com sucesso!');
        })
        .catch((error) => {
          toast.error(error.message || 'Erro ao salvar transação. Tente novamente.');
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
    const status = String(t.status || '').toLowerCase();
    const hasPaymentDate = !!(t.paymentDate || t.payment_date);
    const isPaid = ['pago', 'completed', 'parcial', 'paid', 'approved', 'aprovado'].includes(status) || hasPaymentDate;
    const candidate = isPaid
      ? (t.paymentDate || t.payment_date || t.date || t.createdAt || t.created_at)
      : (t.date || t.paymentDate || t.payment_date || t.createdAt || t.created_at);
    if (!candidate) return null;
    try {
      return parseLocalDateString(candidate);
    } catch (e) {
      return null;
    }
  };

  const extractBalanceDate = (t) => {
    if (!t) return null;
    const status = String(t.status || '').toLowerCase();
    const hasPaymentDate = !!(t.paymentDate || t.payment_date);
    const isPaid = ['pago', 'completed', 'parcial', 'paid', 'approved', 'aprovado'].includes(status) || hasPaymentDate;
    const candidate = isPaid
      ? (t.paymentDate || t.payment_date || t.date || t.createdAt || t.created_at)
      : (t.date || t.paymentDate || t.payment_date || t.createdAt || t.created_at);
    if (!candidate) return null;
    try {
      return parseLocalDateString(candidate);
    } catch (e) {
      return null;
    }
  };

  // Calculate metrics based on date range
  const calculateMetrics = () => {
    const startTime = startOfDay(dateRange.startDate).getTime();
    const endTime = endOfDay(dateRange.endDate).getTime();

    const isPaid = (t) => {
      const status = String(t?.status || '').toLowerCase();
      const hasPaymentDate = !!(t?.paymentDate || t?.payment_date);
      return ['pago', 'completed', 'parcial', 'paid', 'approved', 'aprovado'].includes(status) || hasPaymentDate;
    };

    const paidTransactions = allTransactions.filter((t) => isPaid(t));

    const filteredTransactions = paidTransactions.filter(t => {
      const tDate = extractTxDate(t);
      if (!tDate) return false;
      const tTime = startOfDay(tDate).getTime();
      return tTime >= startTime && tTime <= endTime;
    });

    let totalRevenue = 0;
    let totalExpenses = 0;

    filteredTransactions.forEach((t) => {
      const statusVal = String(t.status || '').toLowerCase();
      const baseAmount = statusVal === 'parcial'
        ? parseMoney(t.paidAmount || 0)
        : parseMoney(t.amount);
      const amount = baseAmount + parseMoney(t.interest);
      const cardFee = t.hasCardFee && isIncomeType(t.type)
        ? (Math.abs(baseAmount) * (parseMoney(t.cardFee) || 0)) / 100
        : 0;
      const netAmount = isIncomeType(t.type) ? amount - cardFee : amount;
      if (isIncomeType(t.type)) totalRevenue += netAmount;
      else if (isExpenseType(t.type)) totalExpenses += Math.abs(amount);
    });

    const netProfit = totalRevenue - totalExpenses;

    // Período selecionado (filtro de cima) - sempre respeitado pelos KPIs
    const selectedPeriodStart = new Date(dateRange.startDate.getFullYear(), dateRange.startDate.getMonth(), dateRange.startDate.getDate(), 0, 0, 0, 0);
    const selectedPeriodEnd = new Date(dateRange.endDate.getFullYear(), dateRange.endDate.getMonth(), dateRange.endDate.getDate(), 23, 59, 59, 999);

    // Fluxo de caixa futuro - período próprio (fixo em próximos 30 dias), NÃO depende do filtro de cima
    const cashFlowPeriodStart = new Date(cashFlowDateRange.startDate.getFullYear(), cashFlowDateRange.startDate.getMonth(), cashFlowDateRange.startDate.getDate(), 0, 0, 0, 0);
    const cashFlowPeriodEnd = new Date(cashFlowDateRange.endDate.getFullYear(), cashFlowDateRange.endDate.getMonth(), cashFlowDateRange.endDate.getDate(), 23, 59, 59, 999);
    
    // Helper para verificar se transação está pendente (inclui parcial com saldo restante)
    const isPendingTransaction = (t) => {
      const s = String(t?.status || '').toLowerCase();
      if (['pendente', 'agendado', 'pending', 'scheduled'].includes(s)) return true;
      // Parcial: tem saldo restante a pagar/receber, então é pendente parcialmente
      if (s === 'parcial') {
        const remaining = Math.abs(parseMoney(t.amount)) - Math.abs(parseMoney(t.paidAmount || 0));
        return remaining > 0.01; // Considera pendente se ainda tem saldo
      }
      if (['pago', 'completed', 'paid', 'approved', 'aprovado'].includes(s)) return false;
      return !t?.paymentDate; // fallback: sem status, considera pendente apenas se não tem pagamento
    };
    
    // Helper para extrair data de VENCIMENTO (sempre usar t.date para parcelas)
    const extractDueDate = (t) => {
      if (!t) return null;
      const candidate = t.date;
      if (!candidate) return null;
      try {
        if (candidate instanceof Date) {
          if (Number.isNaN(candidate.getTime())) return null;
          return new Date(candidate.getFullYear(), candidate.getMonth(), candidate.getDate(), 12, 0, 0, 0);
        }
        const raw = String(candidate).trim();
        const ymdMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (ymdMatch) {
          const year = Number(ymdMatch[1]);
          const month = Number(ymdMatch[2]);
          const day = Number(ymdMatch[3]);
          const d = new Date(year, month - 1, day, 12, 0, 0, 0);
          return Number.isNaN(d.getTime()) ? null : d;
        }
        const d = parseLocalDateString(raw);
        if (!d || Number.isNaN(d.getTime())) return null;
        return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
      } catch (e) {
        return null;
      }
    };

    // Detecta grupos de parcelas com datas idênticas (erro de cadastro) e espalha por meses
    const installmentGroupInfo = new Map();
    allTransactions.forEach((t) => {
      if (!t?.installmentGroup || !t?.installmentTotal || Number(t.installmentTotal) < 2) return;
      const tDate = extractDueDate(t);
      if (!tDate) return;
      const key = t.installmentGroup;
      const entry = installmentGroupInfo.get(key) || { dates: [], baseDate: null, spread: false };
      entry.dates.push(tDate);
      if (!entry.baseDate || tDate < entry.baseDate) entry.baseDate = tDate;
      installmentGroupInfo.set(key, entry);
    });

    installmentGroupInfo.forEach((entry, key) => {
      if (entry.dates.length < 2 || !entry.baseDate) return;
      const first = entry.dates[0];
      const sameDay = entry.dates.every(
        (d) => d.getFullYear() === first.getFullYear()
          && d.getMonth() === first.getMonth()
          && d.getDate() === first.getDate()
      );
      entry.spread = sameDay;
      installmentGroupInfo.set(key, entry);
    });

    const getEffectiveDueDate = (t) => {
      const baseDate = extractDueDate(t);
      if (!baseDate) return null;
      const groupKey = t?.installmentGroup;
      const entry = groupKey ? installmentGroupInfo.get(groupKey) : null;
      const installmentNumber = Number(t?.installmentNumber || 0);
      if (!entry || !entry.spread || !entry.baseDate || installmentNumber < 1) return baseDate;
      return new Date(
        entry.baseDate.getFullYear(),
        entry.baseDate.getMonth() + (installmentNumber - 1),
        entry.baseDate.getDate(),
        12,
        0,
        0,
        0
      );
    };

    const buildPendingByRange = (rangeStart, rangeEnd) => {
      const pendingIncomeTransactions = allTransactions
        .map((t) => ({ ...t, effectiveDate: getEffectiveDueDate(t) }))
        .filter((t) => {
          const tDate = t.effectiveDate;
          if (!tDate) return false;
          const isIncome = isIncomeType(t.type);
          const isPending = isPendingTransaction(t);
          const isInRange = tDate >= rangeStart && tDate <= rangeEnd;
          return isIncome && isPending && isInRange;
        });

      const pendingIncomeAmount = pendingIncomeTransactions.reduce((sum, t) => {
        const statusVal = String(t.status || '').toLowerCase();
        const isParcial = statusVal === 'parcial';
        const amount = isParcial
          ? Math.abs(parseFloat(t.amount || 0)) - Math.abs(parseFloat(t.paidAmount || 0))
          : Math.abs(parseFloat(t.amount || 0));
        const interest = isParcial ? 0 : parseFloat(t.interest || 0);
        const cardFee = t.hasCardFee ? (amount * (parseFloat(t.cardFee) || 0)) / 100 : 0;
        return sum + amount + interest - cardFee;
      }, 0);

      const pendingExpenseTransactions = allTransactions
        .map((t) => ({ ...t, effectiveDate: getEffectiveDueDate(t) }))
        .filter((t) => {
          const tDate = t.effectiveDate;
          if (!tDate) return false;
          const isExpense = isExpenseType(t.type);
          const isPending = isPendingTransaction(t);
          const isInRange = tDate >= rangeStart && tDate <= rangeEnd;
          return isExpense && isPending && isInRange;
        });

      const pendingExpenseAmount = pendingExpenseTransactions.reduce((sum, t) => {
        const statusVal = String(t.status || '').toLowerCase();
        const isParcial = statusVal === 'parcial';
        const amount = isParcial
          ? Math.abs(parseFloat(t.amount || 0)) - Math.abs(parseFloat(t.paidAmount || 0))
          : Math.abs(parseFloat(t.amount || 0));
        const interest = isParcial ? 0 : parseFloat(t.interest || 0);
        return sum + amount + interest;
      }, 0);

      return {
        pendingIncomeTransactions,
        pendingExpenseTransactions,
        pendingIncomeAmount,
        pendingExpenseAmount,
      };
    };
    
    // Contas a receber/pagar (KPIs) - respeita o período selecionado
    const selectedPending = buildPendingByRange(selectedPeriodStart, selectedPeriodEnd);
    const receivablesAmount = selectedPending.pendingIncomeAmount;
    const payablesAmount = selectedPending.pendingExpenseAmount;
    const receivablesCount = selectedPending.pendingIncomeTransactions.length;
    const payablesCount = selectedPending.pendingExpenseTransactions.length;

    // Fluxo de caixa futuro - próximos 30 dias (fixo)
    const cashFlowPending = buildPendingByRange(cashFlowPeriodStart, cashFlowPeriodEnd);
    const cashFlowFutureRevenue = cashFlowPending.pendingIncomeAmount;
    const cashFlowFutureExpenses = cashFlowPending.pendingExpenseAmount;
    const cashFlowFutureRevenueTransactions = cashFlowPending.pendingIncomeTransactions;
    const cashFlowFutureExpensesTransactions = cashFlowPending.pendingExpenseTransactions;
    const cashFlowFutureRevenueCount = cashFlowFutureRevenueTransactions.length;
    const cashFlowFutureExpensesCount = cashFlowFutureExpensesTransactions.length;

    // Chart data - always last 6 months (fill zeros if no data)
    const monthsToShow = Array.from({ length: 6 }, (_, i) => startOfMonth(subMonths(new Date(), 5 - i)));
    const chartData = monthsToShow.map(monthStart => {
      const monthEnd = endOfMonth(monthStart);
      const monthTrans = paidTransactions.filter(t => {
        const tDate = extractTxDate(t);
        if (!tDate) return false;
        return tDate >= monthStart && tDate <= monthEnd;
      });

      const income = monthTrans
        .filter(t => isIncomeType(t.type))
        .reduce((acc, t) => {
          const statusVal = String(t.status || '').toLowerCase();
          const baseAmount = statusVal === 'parcial'
            ? Math.abs(parseFloat(t.paidAmount || 0))
            : Math.abs(parseFloat(t.amount || 0));
          const interest = parseFloat(t.interest || 0);
          const cardFee = t.hasCardFee ? (baseAmount * (parseFloat(t.cardFee) || 0)) / 100 : 0;
          return acc + baseAmount + interest - cardFee;
        }, 0);
      const expenseRaw = monthTrans
        .filter(t => isExpenseType(t.type))
        .reduce((acc, t) => {
          const statusVal = String(t.status || '').toLowerCase();
          const baseAmount = statusVal === 'parcial'
            ? parseFloat(t.paidAmount || 0)
            : parseFloat(t.amount || 0);
          return acc + baseAmount + (parseFloat(t.interest) || 0);
        }, 0);

      return {
        name: monthStart.toLocaleString('pt-BR', { month: 'short', year: '2-digit' }).toUpperCase(),
        income,
        expense: Math.abs(expenseRaw)
      };
    });

    // Saldo inicial: todas as transações pagas anteriores ao início
    let openingBalance = 0;
    paidTransactions.forEach((t) => {
      const d = extractBalanceDate(t);
      if (!d) return;
      const tTime = startOfDay(d).getTime();
      if (tTime < startTime) {
        const statusVal = String(t.status || '').toLowerCase();
        const baseAmount = statusVal === 'parcial'
          ? parseMoney(t.paidAmount || 0)
          : parseMoney(t.amount);
        const amount = baseAmount + parseMoney(t.interest);
        const cardFee = t.hasCardFee && isIncomeType(t.type)
          ? (Math.abs(baseAmount) * (parseMoney(t.cardFee) || 0)) / 100
          : 0;
        const netAmount = isIncomeType(t.type) ? amount - cardFee : amount;
        if (isIncomeType(t.type)) openingBalance += netAmount;
        else if (isExpenseType(t.type)) openingBalance -= Math.abs(amount);
      }
    });

    return {
      openingBalance,
      totalRevenue,
      totalExpenses,
      netProfit,
      receivablesAmount,
      payablesAmount,
      receivablesCount,
      payablesCount,
      receivablesTransactions: selectedPending.pendingIncomeTransactions,
      payablesTransactions: selectedPending.pendingExpenseTransactions,
      cashFlowFutureRevenue,
      cashFlowFutureExpenses,
      cashFlowFutureRevenueCount,
      cashFlowFutureExpensesCount,
      cashFlowFutureRevenueTransactions,
      cashFlowFutureExpensesTransactions,
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
          value={`R$ ${metrics.receivablesAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={Clock}
          trendValue={`${metrics.receivablesCount} parcelas`}
          trend="up"
          className="text-emerald-600"
          onClick={() => setShowReceivablesDialog(true)}
        />

        <KPIWidget
          title="Contas a pagar"
          value={`R$ ${metrics.payablesAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={Clock}
          trendValue={`${metrics.payablesCount} parcelas`}
          trend="down"
          className="text-rose-600"
          onClick={() => setShowPayablesDialog(true)}
        />
      </div>

      {/* Fluxo de Caixa Futuro */}
      <div className="bg-white dark:bg-slate-900 rounded-lg p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Wallet className="w-4 h-4 text-primary" />
          Fluxo de Caixa Futuro ({cashFlowDateRange.label || `${format(cashFlowDateRange.startDate, 'dd/MM')} - ${format(cashFlowDateRange.endDate, 'dd/MM')}`})
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1">Receitas previstas</p>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
              R$ {metrics.cashFlowFutureRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-lg p-4">
            <p className="text-xs font-medium text-rose-700 dark:text-rose-400 mb-1">Despesas previstas</p>
            <p className="text-2xl font-bold text-rose-700 dark:text-rose-300">
              R$ {metrics.cashFlowFutureExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          <div className="bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 rounded-lg p-4">
            <p className="text-xs font-medium text-sky-700 dark:text-sky-400 mb-1">Saldo projetado</p>
            <p className={`text-2xl font-bold ${metrics.cashFlowFutureRevenue - metrics.cashFlowFutureExpenses >= 0 ? 'text-sky-700 dark:text-sky-300' : 'text-slate-700 dark:text-slate-300'}`}>
              {metrics.cashFlowFutureRevenue - metrics.cashFlowFutureExpenses >= 0 ? '+' : ''} R$ {(metrics.cashFlowFutureRevenue - metrics.cashFlowFutureExpenses).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
        title={`Contas a Receber (${dateRange.label || format(dateRange.startDate, 'dd/MM') + ' - ' + format(dateRange.endDate, 'dd/MM')})`}
        transactions={metrics.receivablesTransactions || []}
        type="income"
        periodLabel={dateRange.label || `${format(dateRange.startDate, 'dd/MM/yyyy')} - ${format(dateRange.endDate, 'dd/MM/yyyy')}`}
      />

      {/* Dialog de Contas a Pagar */}
      <FutureTransactionsDialog
        open={showPayablesDialog}
        onOpenChange={setShowPayablesDialog}
        title={`Contas a Pagar (${dateRange.label || format(dateRange.startDate, 'dd/MM') + ' - ' + format(dateRange.endDate, 'dd/MM')})`}
        transactions={metrics.payablesTransactions || []}
        type="expense"
        periodLabel={dateRange.label || `${format(dateRange.startDate, 'dd/MM/yyyy')} - ${format(dateRange.endDate, 'dd/MM/yyyy')}`}
      />
    </div>
  );
}
