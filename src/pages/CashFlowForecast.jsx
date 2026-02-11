import React, { useState } from 'react';
import { Transaction, Installment, PurchaseInstallment, Sale, Purchase } from '@/api/entities';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, TrendingUp, TrendingDown, Wallet, ChevronDown, ChevronRight } from 'lucide-react';
import { format, parseISO, isWithinInterval, startOfMonth, endOfMonth, eachMonthOfInterval, startOfDay, endOfDay, subDays, eachDayOfInterval, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import CashFlowPeriodFilter from '../components/dashboard/CashFlowPeriodFilter';
import Pagination from '../components/Pagination';

const parseLocalDate = (dateStr) => {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return dateStr;
  if (typeof dateStr === 'number') return new Date(dateStr);
  if (typeof dateStr === 'string') {
    const safe = dateStr.split('T')[0];
    const parts = safe.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
    }
  }
  const fallback = new Date(dateStr);
  return Number.isNaN(fallback.getTime()) ? new Date() : fallback;
};

// Safe date extractor for transactions
const getTxDate = (t) => {
  if (!t) return null;
  const status = String(t.status || '').toLowerCase();
  const isPaid = status === 'pago' || status === 'completed' || status === 'parcial';
  // Para parcial: usar date (vencimento) como referência principal, não paymentDate
  const candidate = (isPaid && status !== 'parcial')
    ? (t.paymentDate || t.date || t.createdAt || t.created_at)
    : (t.date || t.paymentDate || t.createdAt || t.created_at);
  if (!candidate) return null;
  try {
    const d = parseLocalDate(candidate);
    return isNaN(d.getTime()) ? null : d;
  } catch (e) {
    return null;
  }
};

// Safe extractor: returns 'YYYY-MM-DD' or null
const extractDateStr = (d) => {
  if (!d) return null;
  try {
    if (typeof d === 'string') return d.split('T')[0];
    return d.toISOString().split('T')[0];
  } catch (e) {
    return null;
  }
};

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
        <p className="text-sm font-semibold text-slate-900 mb-2">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }} className="text-sm font-medium">
            <span className="inline-block min-w-fit">{entry.name}:</span>
            <span className="ml-2">R$ {entry.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function CashFlowForecastPage() {
  const { company } = useAuth();
  
  // Load all data first
  const { data: transactionsData } = useQuery({
    queryKey: ['/api/transactions', company?.id],
    queryFn: () => Transaction.list(),
    enabled: !!company?.id,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const { data: saleInstallments } = useQuery({
    queryKey: ['/api/sale-installments', company?.id],
    queryFn: () => Installment.list(),
    enabled: !!company?.id,
    staleTime: 0,
  });

  const { data: purchaseInstallments, isLoading: loadingPurchases } = useQuery({
    queryKey: ['/api/purchase-installments', company?.id],
    queryFn: () => PurchaseInstallment.list(),
    enabled: !!company?.id,
    staleTime: 0,
  });

  const { data: sales, isLoading: loadingSales } = useQuery({
    queryKey: ['/api/sales', company?.id],
    queryFn: () => Sale.list(),
    enabled: !!company?.id,
    staleTime: 0,
  });

  const { data: purchases, isLoading: loadingPurchasesList } = useQuery({
    queryKey: ['/api/purchases', company?.id],
    queryFn: () => Purchase.list(),
    enabled: !!company?.id,
    staleTime: 0,
  });

  const transactions = Array.isArray(transactionsData) ? transactionsData : (transactionsData?.data || []);

  const isLoading = !transactionsData || loadingPurchases || loadingSales || loadingPurchasesList;

  // Calculate min and max dates from all transactions and installments
  const getDateRange = () => {
    const today = startOfDay(new Date());
    
    // Always start from at least 6 months ago for better context
    let minDate = new Date(today);
    minDate.setMonth(minDate.getMonth() - 6);
    minDate = startOfDay(minDate);
    
    // Always end at least 6 months from now for forecasting
    let maxDate = new Date(today);
    maxDate.setMonth(maxDate.getMonth() + 6);
    maxDate = endOfDay(maxDate);
    
    // If we have transaction data, expand the range to include oldest and newest transactions
    if (transactions && transactions.length > 0) {
      let transactionDates = [];
      transactions.forEach(t => {
        const dateStr = extractDateStr(t?.date ?? t?.date);
        if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          transactionDates.push(dateStr);
        }
      });
      
      if (transactionDates.length > 0) {
        transactionDates.sort();
        const oldestTransaction = parseISO(transactionDates[0]);
        const newestTransaction = parseISO(transactionDates[transactionDates.length - 1]);
        
        // Expand min date if there are older transactions
        if (oldestTransaction < minDate) {
          minDate = oldestTransaction;
        }
        
        // Expand max date if there are newer transactions
        if (newestTransaction > maxDate) {
          maxDate = new Date(newestTransaction);
          maxDate = endOfDay(maxDate);
        }
      }
    }
    
    // Check pending installments for future dates
    if (saleInstallments && saleInstallments.length > 0) {
      saleInstallments.forEach(inst => {
        if (!inst.paid && inst.due_date) {
          try {
            const dueDate = parseISO(inst.due_date);
            if (dueDate > maxDate) {
              maxDate = dueDate;
            }
          } catch (e) {
            // Invalid date, skip
          }
        }
      });
    }
    
    if (purchaseInstallments && purchaseInstallments.length > 0) {
      purchaseInstallments.forEach(inst => {
        if (!inst.paid && inst.due_date) {
          try {
            const dueDate = parseISO(inst.due_date);
            if (dueDate > maxDate) {
              maxDate = dueDate;
            }
          } catch (e) {
            // Invalid date, skip
          }
        }
      });
    }
    
    return { minDate, maxDate };
  };

  const { minDate: calculatedMin, maxDate: calculatedMax } = getDateRange();

  const [dateRange, setDateRange] = useState({
    startDate: calculatedMin,
    endDate: calculatedMax,
    label: 'Todo período'
  });
  
  const minDate = calculatedMin;
  const maxDate = calculatedMax;

  const getGroupDateMap = () => {
    const map = new Map();
    const grouped = {};
    transactions.forEach(t => {
      if (!t.installmentGroup) return;
      if (!grouped[t.installmentGroup]) grouped[t.installmentGroup] = [];
      grouped[t.installmentGroup].push(t);
    });
    Object.entries(grouped).forEach(([groupId, list]) => {
      const dates = list
        .map(t => getTxDate(t))
        .filter(Boolean);
      if (dates.length === 0) return;
      const base = dates[0];
      const sameDay = dates.every(d => format(d, 'yyyy-MM-dd') === format(base, 'yyyy-MM-dd'));
      const singleMonth = dates.every(d => format(d, 'yyyy-MM') === format(base, 'yyyy-MM'));
      const forceOffset = sameDay || singleMonth;
      map.set(groupId, { baseDate: base, forceOffset });
    });
    return map;
  };

  const groupDateMap = getGroupDateMap();

  const getEffectiveTxDate = (t) => {
    const baseDate = getTxDate(t);
    if (!t?.installmentGroup || !t?.installmentNumber) return baseDate;
    const groupInfo = groupDateMap.get(t.installmentGroup);
    if (!groupInfo || !groupInfo.forceOffset || !groupInfo.baseDate) return baseDate;
    const offset = Math.max(0, (Number(t.installmentNumber) || 1) - 1);
    return addMonths(groupInfo.baseDate, offset);
  };

  // Update date range when data changes
  React.useEffect(() => {
    const { minDate, maxDate } = getDateRange();
    setDateRange({
      startDate: minDate,
      endDate: maxDate,
      label: 'Todo período'
    });
  }, [transactionsData, saleInstallments, purchaseInstallments]);
  const [expandedMonths, setExpandedMonths] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  if (isLoading || !company?.id) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  const formatTypeLabel = (value) => {
    if (!value) return '';
    const normalized = String(value).toLowerCase();
    if (['income', 'entrada', 'venda', 'venda_prazo', 'receita'].includes(normalized)) return 'Receita';
    if (['expense', 'saida', 'compra', 'compra_prazo', 'despesa'].includes(normalized)) return 'Despesa';
    return value;
  };

  const calculateCashFlow = () => {
    if (!dateRange || !dateRange.startDate || !dateRange.endDate) return [];
    const start = startOfDay(dateRange.startDate);
    const end = endOfDay(dateRange.endDate);
    
    // If range is <= 60 days, use daily granularity for smoother charts
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 60) {
      const days = eachDayOfInterval({ start, end });
      return days.map(day => {
        const dStart = startOfDay(day);
        const dEnd = endOfDay(day);
        const todayEnd = endOfDay(new Date());
        const isHistorical = dEnd < new Date();

        let revenue = 0;
        let expense = 0;
        const revenueDetails = [];
        const expenseDetails = [];
        // Mixed data by transaction date
        transactions.forEach(t => {
          const tDate = getEffectiveTxDate(t);
          if (!tDate) return;

          const isPaid = t.status === 'pago' || t.status === 'completed' || t.status === 'parcial';
          const isPending = t.status === 'pendente' || t.status === 'agendado' || t.status === 'pending';
          const isParcial = t.status === 'parcial';

          // Para pagamentos parciais: mostrar valor pago no histórico
          if (isParcial) {
            // Parte PAGA - usa paymentDate (parseLocalDate para evitar shift de timezone)
            const payDate = t.paymentDate ? parseLocalDate(t.paymentDate) : tDate;
            if (isWithinInterval(payDate, { start: dStart, end: dEnd }) && payDate <= todayEnd) {
              const paidBase = Math.abs(parseFloat(t.paidAmount) || 0);
              const paidAmount = paidBase + (parseFloat(t.interest) || 0);
              const cardFee = t.hasCardFee ? (Math.abs(paidBase) * (parseFloat(t.cardFee) || 0)) / 100 : 0;
              
              if (t.type === 'venda' || t.type === 'income' || t.type === 'entrada') {
                const netRevenue = paidAmount - cardFee;
                revenue += netRevenue;
                revenueDetails.push({
                  description: `${t.description} (Parcial)`,
                  amount: netRevenue,
                  date: payDate,
                  category: t.type,
                  cardFee: cardFee > 0 ? cardFee : undefined
                });
              } else if (t.type === 'compra' || t.type === 'expense' || t.type === 'saida') {
                expense += paidAmount;
                expenseDetails.push({
                  description: `${t.description} (Parcial)`,
                  amount: paidAmount,
                  date: payDate,
                  category: t.type
                });
              }
            }
            
            // Parte RESTANTE - usa data de vencimento (t.date) como obrigação futura
            const dueDate = t.date ? parseLocalDate(t.date) : null;
            const remainingBase = Math.abs(parseFloat(t.amount) || 0) - Math.abs(parseFloat(t.paidAmount) || 0);
            if (dueDate && remainingBase > 0 && isWithinInterval(dueDate, { start: dStart, end: dEnd })) {
              if (t.type === 'venda' || t.type === 'income' || t.type === 'entrada') {
                revenue += remainingBase;
                revenueDetails.push({
                  description: `${t.description} (Saldo a Receber)`,
                  amount: remainingBase,
                  date: dueDate,
                  category: t.type
                });
              } else if (t.type === 'compra' || t.type === 'expense' || t.type === 'saida') {
                expense += remainingBase;
                expenseDetails.push({
                  description: `${t.description} (Saldo a Pagar)`,
                  amount: remainingBase,
                  date: dueDate,
                  category: t.type
                });
              }
            }
            return; // Já processou parcial, não continuar
          }

          // Transações normais (pagas ou pendentes)
          if (!isWithinInterval(tDate, { start: dStart, end: dEnd })) return;
          if (tDate <= todayEnd ? !isPaid : !isPending) return;

          const baseAmount = parseFloat(t.amount) || 0;
          const amount = baseAmount + (parseFloat(t.interest) || 0);
          // Considerar taxa de cartão para receitas
          const cardFee = t.hasCardFee ? (Math.abs(baseAmount) * (parseFloat(t.cardFee) || 0)) / 100 : 0;
          
          if (t.type === 'venda' || t.type === 'income' || t.type === 'entrada') {
            const netRevenue = amount - cardFee;
            revenue += netRevenue;
            revenueDetails.push({
              description: tDate <= todayEnd ? t.description : `${t.description} (Agendado)`,
              amount: netRevenue,
              date: tDate,
              category: t.type,
              cardFee: cardFee > 0 ? cardFee : undefined
            });
          } else if (t.type === 'compra' || t.type === 'expense' || t.type === 'saida') {
            expense += amount;
            expenseDetails.push({
              description: tDate <= todayEnd ? t.description : `${t.description} (Agendado)`,
              amount,
              date: tDate,
              category: t.type
            });
          }
        });

        return {
          month: format(day, 'dd/MM', { locale: ptBR }),
          monthKey: format(day, 'yyyy-MM-dd'),
          receita: revenue,
          despesa: expense,
          saldo: revenue - expense,
          isHistorical,
          revenueDetails,
          expenseDetails
        };
      });
    }

    const months = eachMonthOfInterval({ start, end });
    
    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      const monthKey = format(month, 'yyyy-MM');
      const todayEnd = endOfDay(new Date());

      let revenue = 0;
      let expense = 0;
      const revenueDetails = [];
      const expenseDetails = [];

      // Mixed data by transaction date
      transactions.forEach(t => {
        const tDate = getEffectiveTxDate(t);
        if (!tDate) return;

        const isPaid = t.status === 'pago' || t.status === 'completed' || t.status === 'parcial';
        const isPending = t.status === 'pendente' || t.status === 'agendado' || t.status === 'pending';
        const isParcial = t.status === 'parcial';

        // Para pagamentos parciais: mostrar valor pago no histórico + saldo como pendente
        if (isParcial) {
          // Parte PAGA - usa paymentDate (parseLocalDate para evitar shift de timezone)
          const payDate = t.paymentDate ? parseLocalDate(t.paymentDate) : tDate;
          if (isWithinInterval(payDate, { start: monthStart, end: monthEnd }) && payDate <= todayEnd) {
            const paidBase = Math.abs(parseFloat(t.paidAmount) || 0);
            const paidAmount = paidBase + (parseFloat(t.interest) || 0);
            const cardFee = t.hasCardFee ? (Math.abs(paidBase) * (parseFloat(t.cardFee) || 0)) / 100 : 0;
            
            if (t.type === 'venda' || t.type === 'income' || t.type === 'entrada') {
              const netRevenue = paidAmount - cardFee;
              revenue += netRevenue;
              revenueDetails.push({
                description: `${t.description} (Parcial)`,
                amount: netRevenue,
                date: payDate,
                category: t.type,
                cardFee: cardFee > 0 ? cardFee : undefined
              });
            } else if (t.type === 'compra' || t.type === 'expense' || t.type === 'saida') {
              expense += paidAmount;
              expenseDetails.push({
                description: `${t.description} (Parcial)`,
                amount: paidAmount,
                date: payDate,
                category: t.type
              });
            }
          }
          
          // Parte RESTANTE - usa data de vencimento como obrigação futura
          const dueDate = t.date ? parseLocalDate(t.date) : null;
          const remainingBase = Math.abs(parseFloat(t.amount) || 0) - Math.abs(parseFloat(t.paidAmount) || 0);
          if (dueDate && remainingBase > 0 && isWithinInterval(dueDate, { start: monthStart, end: monthEnd })) {
            if (t.type === 'venda' || t.type === 'income' || t.type === 'entrada') {
              revenue += remainingBase;
              revenueDetails.push({
                description: `${t.description} (Saldo a Receber)`,
                amount: remainingBase,
                date: dueDate,
                category: t.type
              });
            } else if (t.type === 'compra' || t.type === 'expense' || t.type === 'saida') {
              expense += remainingBase;
              expenseDetails.push({
                description: `${t.description} (Saldo a Pagar)`,
                amount: remainingBase,
                date: dueDate,
                category: t.type
              });
            }
          }
          return; // Já processou parcial
        }

        // Transações normais (pagas ou pendentes)
        if (!isWithinInterval(tDate, { start: monthStart, end: monthEnd })) return;
        if (tDate <= todayEnd ? !isPaid : !isPending) return;

        const baseAmount = parseFloat(t.amount) || 0;
        const amount = baseAmount + (parseFloat(t.interest) || 0);
        // Considerar taxa de cartão para receitas
        const cardFee = t.hasCardFee ? (Math.abs(baseAmount) * (parseFloat(t.cardFee) || 0)) / 100 : 0;
        
        if (t.type === 'venda' || t.type === 'income' || t.type === 'entrada') {
          const netRevenue = amount - cardFee;
          revenue += netRevenue;
          revenueDetails.push({
            description: tDate <= todayEnd ? t.description : `${t.description} (Agendado)`,
            amount: netRevenue,
            date: tDate,
            category: t.type,
            cardFee: cardFee > 0 ? cardFee : undefined
          });
        } else if (t.type === 'compra' || t.type === 'expense' || t.type === 'saida') {
          expense += amount;
          expenseDetails.push({
            description: tDate <= todayEnd ? t.description : `${t.description} (Agendado)`,
            amount: amount,
            date: tDate,
            category: t.type
          });
        }
      });

      // Then, add pending installments from sales (future only)
        saleInstallments.forEach(inst => {
          if (!inst.paid && inst.due_date) {
            try {
              const dueDate = parseISO(inst.due_date);
              if (isWithinInterval(dueDate, { start: monthStart, end: monthEnd })) {
                revenue += inst.amount;
                const sale = sales.find(s => s.id === inst.sale_id);
                revenueDetails.push({
                  description: `${sale?.description || 'Venda'} - Parcela ${inst.installment_number}`,
                  amount: inst.amount,
                  date: inst.due_date,
                  category: sale?.category
                });
              }
            } catch (e) {
              // Skip invalid dates
            }
          }
        });

      // And pending installments from purchases (future only)
        purchaseInstallments.forEach(inst => {
          if (!inst.paid && inst.due_date) {
            try {
              const dueDate = parseISO(inst.due_date);
              if (isWithinInterval(dueDate, { start: monthStart, end: monthEnd })) {
                expense += inst.amount;
                const purchase = purchases.find(p => p.id === inst.purchase_id);
                expenseDetails.push({
                  description: `${purchase?.description || 'Compra'} - Parcela ${inst.installment_number}`,
                  amount: inst.amount,
                  date: inst.due_date,
                  category: purchase?.category
                });
              }
            } catch (e) {
              // Skip invalid dates
            }
          }
        });

      return {
        month: format(month, 'MMM/yy', { locale: ptBR }),
        monthKey,
        receita: revenue,
        despesa: expense,
        saldo: revenue - expense,
        isHistorical: monthEnd < new Date(),
        revenueDetails,
        expenseDetails
      };
    });
  };

  const cashFlowData = calculateCashFlow();
  
  // Show all periods in the range, even empty ones (for complete view)
  const chartData = cashFlowData;

  // Calculate opening balance (all transactions before start date)
  const openingBalance = transactions
    .filter(t => {
      const tDate = getEffectiveTxDate(t);
      if (!tDate) return false;
      return tDate < startOfDay(dateRange.startDate);
    })
    .reduce((acc, t) => {
      const isPaid = t.status === 'pago' || t.status === 'completed' || t.status === 'parcial';
      if (!isPaid) return acc;
      // Para parcial, usar apenas o valor efetivamente pago
      const isParcial = t.status === 'parcial';
      const baseAmount = isParcial ? (parseFloat(t.paidAmount) || 0) : (parseFloat(t.amount) || 0);
      const amount = baseAmount + (parseFloat(t.interest) || 0);
      // Considerar taxa de cartão para receitas
      const cardFee = t.hasCardFee && (t.type === 'venda' || t.type === 'income' || t.type === 'entrada') 
        ? (Math.abs(baseAmount) * (parseFloat(t.cardFee) || 0)) / 100 
        : 0;
      const netAmount = (t.type === 'venda' || t.type === 'income' || t.type === 'entrada') 
        ? amount - cardFee 
        : -amount;
      return acc + netAmount;
    }, 0);

  // Calculate cumulative balance
  let cumulativeBalance = openingBalance;
  const cashFlowWithBalance = cashFlowData.map(item => {
    cumulativeBalance += item.saldo;
    return {
      ...item,
      saldoAcumulado: cumulativeBalance
    };
  });
  
  // Show all periods in the range for complete cash flow view
  const chartDataWithBalance = cashFlowWithBalance;

  const totalRevenue = cashFlowData.reduce((acc, item) => acc + item.receita, 0);
  const totalExpense = cashFlowData.reduce((acc, item) => acc + item.despesa, 0);
  const netCashFlow = totalRevenue - totalExpense;
  const finalBalance = openingBalance + netCashFlow;

  // Show all periods for complete cash flow analysis
  const filteredCashFlow = cashFlowWithBalance;

  // Reset pagination when no results
  const validCurrentPage = filteredCashFlow.length === 0 ? 1 : currentPage;
  
  // Pagination on filtered data
  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedCashFlow = filteredCashFlow.slice(startIndex, endIndex);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Fluxo de Caixa Futuro</h1>
          <p className="text-xs sm:text-sm text-slate-500">Visualize receitas e despesas projetadas por período</p>
        </div>

        <CashFlowPeriodFilter 
          onPeriodChange={setDateRange}
          minDate={minDate}
          maxDate={maxDate}
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Saldo Inicial</p>
              <p className="text-2xl font-bold text-slate-700">
                R$ {openingBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <Wallet className="w-8 h-8 text-slate-400" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-emerald-600">Total Receitas</p>
              <p className="text-2xl font-bold text-emerald-600">
                + R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-emerald-400" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-rose-600">Total Despesas</p>
              <p className="text-2xl font-bold text-rose-600">
                - R$ {totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <TrendingDown className="w-8 h-8 text-rose-400" />
          </CardContent>
        </Card>

        <Card className={finalBalance >= 0 ? "bg-emerald-600 border-emerald-600" : "bg-rose-600 border-rose-600"}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-white/80">Saldo Final</p>
              <p className="text-2xl font-bold text-white">
                R$ {finalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <Wallet className={`w-8 h-8 ${finalBalance >= 0 ? 'text-emerald-200' : 'text-rose-200'}`} />
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Receitas vs Despesas</CardTitle>
            <CardDescription>Comparação mensal de entradas e saídas</CardDescription>
          </CardHeader>
          <CardContent>
            {chartDataWithBalance.length === 0 ? (
              <div className="h-[350px] flex items-center justify-center text-slate-500">
                Nenhum dado disponível para o período selecionado
              </div>
            ) : (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={chartDataWithBalance}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(value) => `R$${(value/1000).toFixed(0)}k`} />
                <Tooltip content={CustomTooltip} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                <Legend />
                <Bar dataKey="receita" fill="#10b981" name="Receita" radius={[8, 8, 0, 0]} />
                <Bar dataKey="despesa" fill="#dc2626" name="Despesa" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Saldo Acumulado</CardTitle>
            <CardDescription>Evolução do saldo ao longo do tempo</CardDescription>
          </CardHeader>
          <CardContent>
            {chartDataWithBalance.length === 0 ? (
              <div className="h-[350px] flex items-center justify-center text-slate-500">
                Nenhum dado disponível para o período selecionado
              </div>
            ) : (
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={chartDataWithBalance}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(value) => `R$${(value/1000).toFixed(0)}k`} />
                <Tooltip content={CustomTooltip} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                <Line 
                  type="monotone" 
                  dataKey="saldoAcumulado" 
                  stroke="#0065BA" 
                  strokeWidth={3}
                  name="Saldo Acumulado"
                  dot={{ fill: '#0065BA', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Details Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-semibold text-slate-900">Detalhamento Mensal</h3>
        </div>
        {paginatedCashFlow.length === 0 ? (
          <div className="p-6 text-center text-slate-500">
            Nenhum período com dados encontrado
          </div>
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-100">
                <th className="text-left py-3 pl-6 text-sm font-semibold text-slate-600">Mês</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">Receitas</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">Despesas</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">Saldo</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">Saldo Acumulado</th>
                <th className="text-center py-3 pr-6 text-sm font-semibold text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {paginatedCashFlow.map((item, idx) => {
                const isExpanded = expandedMonths[item.monthKey];
                const hasDetails = item.revenueDetails.length > 0 || item.expenseDetails.length > 0;
                
                return (
                  <React.Fragment key={idx}>
                    <tr className="border-b border-slate-100 hover:bg-slate-50/50 cursor-pointer group" onClick={() => hasDetails && setExpandedMonths(prev => ({ ...prev, [item.monthKey]: !prev[item.monthKey] }))}>
                      <td className="py-3 pl-6 font-medium text-slate-900">
                        <div className="flex items-center gap-2">
                          {hasDetails && (
                            isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />
                          )}
                          {item.month}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right text-emerald-600 font-semibold">
                        R$ {item.receita.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right text-rose-600 font-semibold">
                        R$ {item.despesa.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className={`py-3 px-4 text-right font-bold ${item.saldo >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {item.saldo >= 0 ? '+' : ''} R$ {item.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className={`py-3 px-4 text-right font-bold ${item.saldoAcumulado >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                        R$ {item.saldoAcumulado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 pr-6 text-center">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          item.isHistorical ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {item.isHistorical ? 'Realizado' : 'Projetado'}
                        </span>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <td colSpan={6} className="py-4 px-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* Receitas */}
                              <div>
                                <h4 className="font-semibold text-emerald-700 mb-3 flex items-center gap-2">
                                  <TrendingUp className="w-4 h-4" />
                                  Receitas ({item.revenueDetails.length})
                                </h4>
                                <div className="space-y-2">
                                  {item.revenueDetails.map((detail, dIdx) => (
                                    <div key={dIdx} className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-slate-200 dark:border-slate-700 shadow-sm">
                                      <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                          <p className="text-sm font-medium text-slate-900">{detail.description}</p>
                                          <p className="text-xs text-slate-500 mt-1">
                                            {format(parseLocalDate(detail.date), "dd/MM/yyyy")}
                                            {detail.category && ` • ${formatTypeLabel(detail.category)}`}
                                          </p>
                                        </div>
                                        <p className="text-sm font-bold text-emerald-600 ml-3">
                                          R$ {detail.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                  {item.revenueDetails.length === 0 && (
                                    <p className="text-xs text-slate-400 italic">Nenhuma receita neste mês</p>
                                  )}
                                </div>
                              </div>

                              {/* Despesas */}
                              <div>
                                <h4 className="font-semibold text-rose-700 mb-3 flex items-center gap-2">
                                  <TrendingDown className="w-4 h-4" />
                                  Despesas ({item.expenseDetails.length})
                                </h4>
                                <div className="space-y-2">
                                  {item.expenseDetails.map((detail, dIdx) => (
                                    <div key={dIdx} className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-slate-200 dark:border-slate-700 shadow-sm">
                                      <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                          <p className="text-sm font-medium text-slate-900">{detail.description}</p>
                                          <p className="text-xs text-slate-500 mt-1">
                                            {format(parseLocalDate(detail.date), "dd/MM/yyyy")}
                                            {detail.category && ` • ${formatTypeLabel(detail.category)}`}
                                          </p>
                                        </div>
                                        <p className="text-sm font-bold text-rose-600 ml-3">
                                          R$ {detail.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                  {item.expenseDetails.length === 0 && (
                                    <p className="text-xs text-slate-400 italic">Nenhuma despesa neste mês</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
            </tbody>
          </table>
        </div>
        )}
        <Pagination 
          currentPage={validCurrentPage}
          pageSize={pageSize}
          totalItems={filteredCashFlow.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
        />
      </div>
    </div>
  );
}