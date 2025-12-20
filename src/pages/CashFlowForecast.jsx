import React, { useState } from 'react';
import { Transaction, Installment, PurchaseInstallment, Sale, Purchase } from '@/api/entities';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, TrendingUp, TrendingDown, Wallet, ChevronDown, ChevronRight } from 'lucide-react';
import { format, parseISO, isWithinInterval, addMonths, startOfMonth, endOfMonth, eachMonthOfInterval, subDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import PeriodFilter from '../components/dashboard/PeriodFilter';

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-e2e8f0 rounded-lg shadow-lg">
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
  const [dateRange, setDateRange] = useState({
    startDate: startOfMonth(new Date()),
    endDate: endOfMonth(addMonths(new Date(), 5)),
    label: 'Próximos 6 meses'
  });
  const [expandedMonths, setExpandedMonths] = useState({});

  const { data: transactions } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => Transaction.list(),
    initialData: []
  });

  // Installments/Sales/Purchases queries removed - use transactions instead
  const saleInstallments = [];
  const purchaseInstallments = [];
  const sales = [];
  const purchases = [];

  const calculateCashFlow = () => {
    if (!dateRange.startDate || !dateRange.endDate) return [];

    const months = eachMonthOfInterval({ start: dateRange.startDate, end: dateRange.endDate });
    
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
          const tDate = parseISO(t.date);
          if (isWithinInterval(tDate, { start: monthStart, end: monthEnd })) {
            const amount = parseFloat(t.amount) || 0;
            if (t.type === 'venda') {
              revenue += amount;
              revenueDetails.push({
                description: t.description,
                amount: amount,
                date: t.date,
                category: t.type
              });
            } else if (t.type === 'compra') {
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
        // Future projections from pending installments
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

  // Calculate opening balance (all transactions before start date)
  const openingBalance = transactions
    .filter(t => parseISO(t.date) < dateRange.startDate)
    .reduce((acc, t) => {
      const amount = parseFloat(t.amount) || 0;
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

  const totalRevenue = cashFlowData.reduce((acc, item) => acc + item.receita, 0);
  const totalExpense = cashFlowData.reduce((acc, item) => acc + item.despesa, 0);
  const netCashFlow = totalRevenue - totalExpense;
  const finalBalance = openingBalance + netCashFlow;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Fluxo de Caixa Futuro</h1>
          <p className="text-slate-500">Visualize receitas e despesas projetadas por período</p>
        </div>

        <PeriodFilter 
          onPeriodChange={setDateRange}
          mode="months"
          defaultPeriod="last6Months"
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
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={cashFlowWithBalance}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(value) => `R$${(value/1000).toFixed(0)}k`} />
                <Tooltip content={CustomTooltip} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                <Legend />
                <Bar dataKey="receita" fill="#10b981" name="Receita" radius={[8, 8, 0, 0]} />
                <Bar dataKey="despesa" fill="#dc2626" name="Despesa" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Saldo Acumulado</CardTitle>
            <CardDescription>Evolução do saldo ao longo do tempo</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={cashFlowWithBalance}>
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
          </CardContent>
        </Card>
      </div>

      {/* Monthly Details Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detalhamento Mensal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Mês</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">Receitas</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">Despesas</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">Saldo</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">Saldo Acumulado</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {cashFlowWithBalance.map((item, idx) => {
                  const isExpanded = expandedMonths[item.monthKey];
                  const hasDetails = item.revenueDetails.length > 0 || item.expenseDetails.length > 0;
                  
                  return (
                    <React.Fragment key={idx}>
                      <tr className="border-b hover:bg-slate-50 cursor-pointer" onClick={() => hasDetails && setExpandedMonths(prev => ({ ...prev, [item.monthKey]: !prev[item.monthKey] }))}>
                        <td className="py-3 px-4 font-medium text-slate-900">
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
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            item.isHistorical ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {item.isHistorical ? 'Realizado' : 'Projetado'}
                          </span>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-slate-50">
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
        </CardContent>
      </Card>
    </div>
  );
}