import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line, ComposedChart } from 'recharts';
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Download, FileText } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth, isSameMonth, getYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from "@/lib/utils";

const INCOME_TYPES = ['venda', 'venda_prazo', 'receita', 'income', 'entrada'];
const EXPENSE_TYPES = ['compra', 'compra_prazo', 'despesa', 'expense', 'saida'];

const isIncomeType = (type) => INCOME_TYPES.includes(type);
const isExpenseType = (type) => EXPENSE_TYPES.includes(type);

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

const formatCurrencyFull = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

const VariationBadge = ({ current, previous }) => {
  if (!previous || previous === 0) return null;
  
  const variation = ((current - previous) / Math.abs(previous)) * 100;
  const isPositive = variation > 0;
  const isNegative = variation < 0;
  
  return (
    <span className={cn(
      "text-xs font-medium flex items-center gap-0.5",
      isPositive ? "text-emerald-600" : isNegative ? "text-rose-600" : "text-slate-500"
    )}>
      {isPositive ? <TrendingUp className="w-3 h-3" /> : isNegative ? <TrendingDown className="w-3 h-3" /> : null}
      {isPositive ? '+' : ''}{variation.toFixed(1)}%
    </span>
  );
};

export default function DREComparison({ transactions = [], companyName = "" }) {
  const [monthsToShow, setMonthsToShow] = useState(12);
  const [scrollOffset, setScrollOffset] = useState(0);
  
  // Calculate DRE data for each month
  const dreData = useMemo(() => {
    const months = [];
    const today = new Date();
    
    for (let i = monthsToShow - 1; i >= 0; i--) {
      const monthDate = subMonths(today, i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      
      const monthTransactions = transactions.filter(t => {
        const tDate = new Date(t.paymentDate || t.date);
        return tDate >= monthStart && tDate <= monthEnd;
      });
      
      // Calcular receita (considerando taxa de cartão)
      const revenue = monthTransactions
        .filter(t => isIncomeType(t.type))
        .reduce((acc, t) => {
          const amount = Math.abs(parseFloat(t.amount) || 0);
          const interest = parseFloat(t.interest) || 0;
          const cardFee = t.hasCardFee ? (amount * (parseFloat(t.cardFee) || 0)) / 100 : 0;
          return acc + amount + interest - cardFee;
        }, 0);
      
      // Calcular despesas
      const expenses = monthTransactions
        .filter(t => isExpenseType(t.type))
        .reduce((acc, t) => {
          const amount = Math.abs(parseFloat(t.amount) || 0);
          const interest = parseFloat(t.interest) || 0;
          return acc + amount + interest;
        }, 0);
      
      const profit = revenue - expenses;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
      
      months.push({
        monthDate,
        monthLabel: format(monthDate, "MMM/yy", { locale: ptBR }).toUpperCase(),
        monthFull: format(monthDate, "MMMM 'de' yyyy", { locale: ptBR }),
        revenue,
        expenses,
        profit,
        margin
      });
    }
    
    return months;
  }, [transactions, monthsToShow]);
  
  // Calculate chart data
  const chartData = useMemo(() => {
    return dreData.map(d => ({
      name: d.monthLabel,
      Receita: d.revenue,
      Despesa: d.expenses,
      'Lucro Líquido': d.profit
    }));
  }, [dreData]);
  
  // Calculate averages
  const averages = useMemo(() => {
    const totalRevenue = dreData.reduce((acc, d) => acc + d.revenue, 0);
    const totalExpenses = dreData.reduce((acc, d) => acc + d.expenses, 0);
    const totalProfit = dreData.reduce((acc, d) => acc + d.profit, 0);
    const profitableMonths = dreData.filter(d => d.profit > 0).length;
    
    return {
      avgRevenue: totalRevenue / dreData.length,
      avgExpenses: totalExpenses / dreData.length,
      avgProfit: totalProfit / dreData.length,
      avgMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
      profitableMonthsPercent: (profitableMonths / dreData.length) * 100
    };
  }, [dreData]);

  // Visible months based on scroll
  const visibleMonths = useMemo(() => {
    const maxVisible = 6;
    const start = Math.min(scrollOffset, Math.max(0, dreData.length - maxVisible));
    return dreData.slice(start, start + maxVisible);
  }, [dreData, scrollOffset]);

  const canScrollLeft = scrollOffset > 0;
  const canScrollRight = scrollOffset < dreData.length - 6;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Análise Financeira</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Receitas, despesas e indicadores</p>
          </div>
        </div>
        
        <div className="flex gap-2 flex-wrap">
          <Select value={monthsToShow.toString()} onValueChange={(v) => { setMonthsToShow(parseInt(v)); setScrollOffset(0); }}>
            <SelectTrigger className="w-[160px]">
              <CalendarIcon className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Últimos 3 meses</SelectItem>
              <SelectItem value="6">Últimos 6 meses</SelectItem>
              <SelectItem value="12">Últimos 12 meses</SelectItem>
              <SelectItem value="24">Últimos 24 meses</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Comparison Table */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Comparação Detalhada</CardTitle>
          <CardDescription>Métricas financeiras por período</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="relative">
            {/* Navigation Arrows */}
            {dreData.length > 6 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "absolute left-0 top-1/2 -translate-y-1/2 z-10 h-full rounded-none bg-gradient-to-r from-white to-transparent dark:from-slate-900",
                    !canScrollLeft && "opacity-50 cursor-not-allowed"
                  )}
                  onClick={() => setScrollOffset(Math.max(0, scrollOffset - 1))}
                  disabled={!canScrollLeft}
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "absolute right-0 top-1/2 -translate-y-1/2 z-10 h-full rounded-none bg-gradient-to-l from-white to-transparent dark:from-slate-900",
                    !canScrollRight && "opacity-50 cursor-not-allowed"
                  )}
                  onClick={() => setScrollOffset(Math.min(dreData.length - 6, scrollOffset + 1))}
                  disabled={!canScrollRight}
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </>
            )}
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-400 sticky left-0 bg-white dark:bg-slate-900 z-10 min-w-[100px]">
                      Métrica
                    </th>
                    {visibleMonths.map((month, idx) => (
                      <th 
                        key={month.monthLabel} 
                        className={cn(
                          "text-center py-3 px-3 font-medium min-w-[110px]",
                          idx % 2 === 0 ? "bg-slate-50 dark:bg-slate-800/50" : ""
                        )}
                      >
                        <div className="text-slate-900 dark:text-slate-100">{month.monthLabel}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{companyName || "Sua Empresa"}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Receita Total */}
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300 sticky left-0 bg-white dark:bg-slate-900 z-10">
                      Receita Total
                    </td>
                    {visibleMonths.map((month, idx) => {
                      const prevMonth = idx > 0 ? visibleMonths[idx - 1] : null;
                      return (
                        <td 
                          key={month.monthLabel} 
                          className={cn(
                            "text-center py-3 px-3",
                            idx % 2 === 0 ? "bg-slate-50 dark:bg-slate-800/50" : ""
                          )}
                        >
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {formatCurrencyFull(month.revenue)}
                          </div>
                          {prevMonth && <VariationBadge current={month.revenue} previous={prevMonth.revenue} />}
                        </td>
                      );
                    })}
                  </tr>
                  
                  {/* Despesas Totais */}
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300 sticky left-0 bg-white dark:bg-slate-900 z-10">
                      Despesas Totais
                    </td>
                    {visibleMonths.map((month, idx) => {
                      const prevMonth = idx > 0 ? visibleMonths[idx - 1] : null;
                      return (
                        <td 
                          key={month.monthLabel} 
                          className={cn(
                            "text-center py-3 px-3",
                            idx % 2 === 0 ? "bg-slate-50 dark:bg-slate-800/50" : ""
                          )}
                        >
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {formatCurrencyFull(month.expenses)}
                          </div>
                          {prevMonth && (
                            <span className={cn(
                              "text-xs font-medium flex items-center justify-center gap-0.5",
                              month.expenses < prevMonth.expenses ? "text-emerald-600" : month.expenses > prevMonth.expenses ? "text-rose-600" : "text-slate-500"
                            )}>
                              {month.expenses < prevMonth.expenses ? <TrendingDown className="w-3 h-3" /> : month.expenses > prevMonth.expenses ? <TrendingUp className="w-3 h-3" /> : null}
                              {month.expenses !== prevMonth.expenses ? (month.expenses > prevMonth.expenses ? '+' : '') + (((month.expenses - prevMonth.expenses) / Math.abs(prevMonth.expenses)) * 100).toFixed(1) + '%' : ''}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                  
                  {/* Lucro Líquido */}
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-blue-50/50 dark:bg-blue-900/20">
                    <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300 sticky left-0 bg-blue-50/50 dark:bg-blue-900/20 z-10">
                      Lucro Líquido
                    </td>
                    {visibleMonths.map((month, idx) => {
                      const prevMonth = idx > 0 ? visibleMonths[idx - 1] : null;
                      return (
                        <td 
                          key={month.monthLabel} 
                          className={cn(
                            "text-center py-3 px-3",
                            idx % 2 === 0 ? "bg-slate-50/50 dark:bg-slate-800/30" : ""
                          )}
                        >
                          <div className={cn(
                            "font-bold",
                            month.profit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                          )}>
                            {formatCurrencyFull(month.profit)}
                          </div>
                          {prevMonth && prevMonth.profit !== 0 && (
                            <VariationBadge current={month.profit} previous={prevMonth.profit} />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                  
                  {/* Margem de Lucro */}
                  <tr>
                    <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300 sticky left-0 bg-white dark:bg-slate-900 z-10">
                      Margem de Lucro (%)
                    </td>
                    {visibleMonths.map((month, idx) => {
                      const prevMonth = idx > 0 ? visibleMonths[idx - 1] : null;
                      return (
                        <td 
                          key={month.monthLabel} 
                          className={cn(
                            "text-center py-3 px-3",
                            idx % 2 === 0 ? "bg-slate-50 dark:bg-slate-800/50" : ""
                          )}
                        >
                          <div className={cn(
                            "font-semibold",
                            month.margin >= 0 ? "text-slate-900 dark:text-slate-100" : "text-rose-600 dark:text-rose-400"
                          )}>
                            {month.margin.toFixed(1)}%
                          </div>
                          {prevMonth && (
                            <span className={cn(
                              "text-xs font-medium flex items-center justify-center gap-0.5",
                              month.margin > prevMonth.margin ? "text-emerald-600" : month.margin < prevMonth.margin ? "text-rose-600" : "text-slate-500"
                            )}>
                              {month.margin > prevMonth.margin ? <TrendingUp className="w-3 h-3" /> : month.margin < prevMonth.margin ? <TrendingDown className="w-3 h-3" /> : null}
                              {month.margin !== prevMonth.margin ? (month.margin > prevMonth.margin ? '+' : '') + (month.margin - prevMonth.margin).toFixed(1) + '%' : ''}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chart */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-500" />
              <CardTitle className="text-base">Lucro Líquido ao Longo do Tempo</CardTitle>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-emerald-600">
                {formatCurrency(averages.avgProfit)}
              </div>
              <div className="text-xs text-slate-500">
                Lucro Médio • {averages.profitableMonthsPercent.toFixed(0)}% meses lucrativos
              </div>
            </div>
          </div>
          <CardDescription>Receitas vs Despesas vs Lucro</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}K`}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <Tooltip 
                  formatter={(value, name) => [formatCurrencyFull(value), name]}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  formatter={(value) => <span className="text-sm text-slate-600">{value}</span>}
                />
                <Bar 
                  dataKey="Receita" 
                  fill="#22c55e" 
                  radius={[4, 4, 0, 0]}
                  maxBarSize={50}
                />
                <Bar 
                  dataKey="Despesa" 
                  fill="#ef4444" 
                  radius={[4, 4, 0, 0]}
                  maxBarSize={50}
                />
                <Line 
                  type="monotone" 
                  dataKey="Lucro Líquido" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 2 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
