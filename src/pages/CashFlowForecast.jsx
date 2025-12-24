import React, { useState } from 'react';
import { Transaction, Installment, PurchaseInstallment, Sale, Purchase } from '@/api/entities';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, TrendingUp, TrendingDown, Wallet, ChevronDown, ChevronRight } from 'lucide-react';
import { format, parseISO, isWithinInterval, startOfMonth, endOfMonth, eachMonthOfInterval, startOfDay, endOfDay, subDays, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import CashFlowPeriodFilter from '../components/dashboard/CashFlowPeriodFilter';
import Pagination from '../components/Pagination';

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
        <p className="text-sm font-semibold text-slate-900 mb-2">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }} className="text-sm font-medium">
            <span className="inline-block min-w-fit">{entry.name}:</span>
            <span className="ml-2">R$ {entry.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function CashFlowForecastPage() {
  const { company } = useAuth();
  const { data: transactions } = useQuery({
    queryKey: ['/api/transactions', company?.id],
    queryFn: () => Transaction.list(),
    initialData: [],
    enabled: !!company?.id
  });

  // Calculate min and max dates from all transactions
  const getDateRange = () => {
    const today = startOfDay(new Date());
    
    // If no transactions, show next 30 days only
    if (transactions.length === 0) {
      const thirtyDaysFromNow = new Date(today);
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      return { minDate: today, maxDate: thirtyDaysFromNow };
    }
    
    // Extract and validate date strings (YYYY-MM-DD format)
    const validDateStrings = transactions
      .map(t => {
        if (!t.date) return null;
        const dateStr = t.date.split('T')[0];
        // Validate format: should match YYYY-MM-DD
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
        return dateStr;
      })
      .filter(d => d !== null)
      .sort();
    
    if (validDateStrings.length === 0) {
      const thirtyDaysFromNow = new Date(today);
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      return { minDate: today, maxDate: thirtyDaysFromNow };
    }
    
    const minDateStr = validDateStrings[0];
    const maxDateStr = validDateStrings[validDateStrings.length - 1];
    
    // Create Date objects from the min/max date strings using parseISO for safety
    const minDate = parseISO(minDateStr);
    let maxDate = parseISO(maxDateStr);
    
    // Limit maxDate to 6 months in the future from today
    const sixMonthsFromToday = new Date(today);
    sixMonthsFromToday.setMonth(sixMonthsFromToday.getMonth() + 6);
    
    // Use whichever is earlier: the last transaction date or 6 months from today
    if (maxDate > sixMonthsFromToday) {
      maxDate = sixMonthsFromToday;
    }
    
    return { minDate, maxDate };
  };

  const { minDate, maxDate } = getDateRange();

  // Initialize with all time - will be set by CashFlowPeriodFilter
  const [dateRange, setDateRange] = useState({
    startDate: minDate,
    endDate: maxDate,
    label: 'Todo período'
  });
  const [expandedMonths, setExpandedMonths] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { data: saleInstallments } = useQuery({
    queryKey: ['/api/sale-installments', company?.id],
    queryFn: () => Installment.list(),
    initialData: [],
    enabled: !!company?.id
  });

  const { data: purchaseInstallments } = useQuery({
    queryKey: ['/api/purchase-installments', company?.id],
    queryFn: () => PurchaseInstallment.list(),
    initialData: [],
    enabled: !!company?.id
  });

  const { data: sales } = useQuery({
    queryKey: ['/api/sales', company?.id],
    queryFn: () => Sale.list(),
    initialData: [],
    enabled: !!company?.id
  });

  const { data: purchases } = useQuery({
    queryKey: ['/api/purchases', company?.id],
    queryFn: () => Purchase.list(),
    initialData: [],
    enabled: !!company?.id
  });

  const calculateCashFlow = () => {
    if (!dateRange.startDate || !dateRange.endDate) return [];

    const start = startOfDay(dateRange.startDate);
    const end = endOfDay(dateRange.endDate);
    
    // If range is <= 60 days, use daily granularity for smoother charts
    const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 60) {
      const days = eachDayOfInterval({ start, end });
      return days.map(day => {
        const dStart = startOfDay(day);
        const dEnd = endOfDay(day);
        const isHistorical = dEnd < new Date();

        let revenue = 0;
        let expense = 0;
        const revenueDetails = [];
        const expenseDetails = [];

        if (isHistorical) {
          // Historical data - only completed transactions
          transactions.forEach(t => {
            const tDateStr = t.date.split('T')[0];
            const tDate = parseISO(tDateStr);
            if (isWithinInterval(tDate, { start: dStart, end: dEnd })) {
              const amount = (parseFloat(t.amount) || 0) + (parseFloat(t.interest) || 0);
              if (t.type === 'venda' && amount >= 0) {
                revenue += amount;
                revenueDetails.push({ description: t.description, amount, date: t.date, category: t.type });
              } else if (t.type === 'compra' && amount >= 0) {
                expense += amount;
                expenseDetails.push({ description: t.description, amount, date: t.date, category: t.type });
              }
            }
          });
        } else {
          // Future data - pending transactions
          transactions.forEach(t => {
            const tDateStr = t.date.split('T')[0];
            const tDate = parseISO(tDateStr);
            if (isWithinInterval(tDate, { start: dStart, end: dEnd })) {
              const isPending = t.status === 'pendente' || t.status === 'agendado' || t.status === 'pending';
              if (isPending) {
                const amount = (parseFloat(t.amount) || 0) + (parseFloat(t.interest) || 0);
                if (t.type === 'venda' && amount >= 0) {
                  revenue += amount;
                  revenueDetails.push({ description: `${t.description} (Agendado)`, amount, date: t.date, category: t.type });
                } else if (t.type === 'compra' && amount >= 0) {
                  expense += amount;
                  expenseDetails.push({ description: `${t.description} (Agendado)`, amount, date: t.date, category: t.type });
                }
              }
            }
          });
        }

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
      const isHistorical = monthEnd < new Date();

      let revenue = 0;
      let expense = 0;
      const revenueDetails = [];
      const expenseDetails = [];

      if (isHistorical) {
        // Historical data from completed transactions
        transactions.forEach(t => {
          const tDateStr = t.date.split('T')[0];
          const tDate = parseISO(tDateStr);
          if (isWithinInterval(tDate, { start: monthStart, end: monthEnd })) {
            const amount = (parseFloat(t.amount) || 0) + (parseFloat(t.interest) || 0);
            if (t.type === 'venda' && amount >= 0) {
              revenue += amount;
              revenueDetails.push({
                description: t.description,
                amount: amount,
                date: t.date,
                category: t.type
              });
            } else if (t.type === 'compra' && amount >= 0) {
              expense += amount;
              expenseDetails.push({
                description: t.description,
                amount: amount,
                date: t.date,
                category: t.type
              });
            }
          }
        });
      } else {
        // Future projections from pending transactions and installments
        // First, add future transactions with pending/agendado status
        transactions.forEach(t => {
          const tDateStr = t.date.split('T')[0];
          const tDate = parseISO(tDateStr);
          if (isWithinInterval(tDate, { start: monthStart, end: monthEnd })) {
            const isPending = t.status === 'pendente' || t.status === 'agendado' || t.status === 'pending';
            if (isPending) {
              const amount = (parseFloat(t.amount) || 0) + (parseFloat(t.interest) || 0);
              if (t.type === 'venda' && amount >= 0) {
                revenue += amount;
                revenueDetails.push({
                  description: `${t.description} (Agendado)`,
                  amount: amount,
                  date: t.date,
                  category: t.type
                });
              } else if (t.type === 'compra' && amount >= 0) {
                expense += amount;
                expenseDetails.push({
                  description: `${t.description} (Agendado)`,
                  amount: amount,
                  date: t.date,
                  category: t.type
                });
              }
            }
          }
        });

        // Then, add pending installments from sales
        saleInstallments.forEach(inst => {
          if (!inst.paid) {
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
          }
        });

        // And pending installments from purchases
        purchaseInstallments.forEach(inst => {
          if (!inst.paid) {
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
          }
        });
      }

      return {
        month: format(month, 'MMM/yy', { locale: ptBR }),
        monthKey,
        receita: revenue,
        despesa: expense,
        saldo: revenue - expense,
        isHistorical,
        revenueDetails,
        expenseDetails
      };
    });
  };

  const cashFlowData = calculateCashFlow();
  
  // Filter chart data to show only periods with transactions
  const chartData = cashFlowData.filter(item => item.receita > 0 || item.despesa > 0);

  // Calculate opening balance (all transactions before start date)
  const openingBalance = transactions
    .filter(t => {
      const tDateStr = t.date.split('T')[0];
      const tDate = parseISO(tDateStr);
      return tDate < dateRange.startDate;
    })
    .reduce((acc, t) => {
      const amount = (parseFloat(t.amount) || 0) + (parseFloat(t.interest) || 0);
      return acc + (t.type === 'venda' ? amount : -amount);
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
  
  // Filter for balanced view (only show periods with transactions)
  const chartDataWithBalance = cashFlowWithBalance.filter(item => item.receita > 0 || item.despesa > 0);

  const totalRevenue = cashFlowData.reduce((acc, item) => acc + item.receita, 0);
  const totalExpense = cashFlowData.reduce((acc, item) => acc + item.despesa, 0);
  const netCashFlow = totalRevenue - totalExpense;
  const finalBalance = openingBalance + netCashFlow;

  // Filter out empty periods (only show periods with transactions)
  const filteredCashFlow = chartDataWithBalance;

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
                R$ {openingBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                + R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                - R$ {totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                R$ {finalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                        R$ {item.receita.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right text-rose-600 font-semibold">
                        R$ {item.despesa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className={`py-3 px-4 text-right font-bold ${item.saldo >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {item.saldo >= 0 ? '+' : ''} R$ {item.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className={`py-3 px-4 text-right font-bold ${item.saldoAcumulado >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                        R$ {item.saldoAcumulado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                                            {format(parseISO(detail.date), "dd/MM/yyyy")}
                                            {detail.category && ` • ${detail.category}`}
                                          </p>
                                        </div>
                                        <p className="text-sm font-bold text-emerald-600 ml-3">
                                          R$ {detail.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                                            {format(parseISO(detail.date), "dd/MM/yyyy")}
                                            {detail.category && ` • ${detail.category}`}
                                          </p>
                                        </div>
                                        <p className="text-sm font-bold text-rose-600 ml-3">
                                          R$ {detail.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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