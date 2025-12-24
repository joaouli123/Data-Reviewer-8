import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, TrendingUp, DollarSign, Calendar, Percent } from 'lucide-react';
import { subMonths } from 'date-fns';

export default function ExecutiveSummary({ summary, transactions, saleInstallments, purchaseInstallments }) {
  // Calculate KPIs
  const now = new Date();
  const lastMonth = subMonths(now, 1);
  const twoMonthsAgo = subMonths(now, 2);

  const currentMonthTrans = transactions.filter(t => new Date(t.date) >= lastMonth);
  const previousMonthTrans = transactions.filter(t => 
    new Date(t.date) >= twoMonthsAgo && new Date(t.date) < lastMonth
  );

  const currentRevenue = currentMonthTrans.filter(t => t.type === 'venda' || t.type === 'income').reduce((sum, t) => sum + Math.abs(parseFloat(t.amount || 0)), 0);
  const previousRevenue = previousMonthTrans.filter(t => t.type === 'venda' || t.type === 'income').reduce((sum, t) => sum + Math.abs(parseFloat(t.amount || 0)), 0);
  const revenueGrowth = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue * 100) : 0;

  const currentExpenses = currentMonthTrans.filter(t => {
    if (t.type === 'compra' || t.type === 'expense') return true;
    return false;
  }).reduce((sum, t) => sum + Math.abs(parseFloat(t.amount || 0)), 0);
  const netProfit = currentRevenue - currentExpenses;
  const profitMargin = currentRevenue > 0 ? (netProfit / currentRevenue * 100) : 0;

  const pendingReceivables = (saleInstallments || []).filter(i => 
    (!i.paid || i.status === 'pendente' || i.status === 'pending') && i.type === 'venda'
  ).reduce((sum, i) => sum + parseFloat(i.amount || 0), 0);

  const pendingPayables = (purchaseInstallments || []).filter(i => 
    (!i.paid || i.status === 'pendente' || i.status === 'pending') && i.type === 'compra'
  ).reduce((sum, i) => sum + parseFloat(i.amount || 0), 0);

  const pendingSalesCount = (saleInstallments || []).filter(i => 
    (!i.paid || i.status === 'pendente' || i.status === 'pending') && i.type === 'venda'
  ).length;

  const pendingPurchasesCount = (purchaseInstallments || []).filter(i => 
    (!i.paid || i.status === 'pendente' || i.status === 'pending') && i.type === 'compra'
  ).length;

  const kpis = [
    {
      title: 'Receita Mensal',
      value: `R$ ${currentRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      change: `${revenueGrowth > 0 ? '+' : ''}${revenueGrowth.toFixed(1)}%`,
      positive: revenueGrowth >= 0,
      icon: DollarSign
    },
    {
      title: 'Lucro Líquido',
      value: `R$ ${netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      change: `${profitMargin.toFixed(1)}% margem`,
      positive: netProfit >= 0,
      icon: TrendingUp
    },
    {
      title: 'Contas a Receber',
      value: `R$ ${pendingReceivables.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      change: `${pendingSalesCount} parcelas`,
      positive: true,
      icon: Calendar
    },
    {
      title: 'Contas a Pagar',
      value: `R$ ${pendingPayables.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      change: `${pendingPurchasesCount} parcelas`,
      positive: false,
      icon: Calendar
    }
  ];

  return (
    <div className="space-y-6">
      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <Card key={idx} className="border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-slate-500 font-medium">{kpi.title}</p>
                  <Icon className={`w-4 h-4 ${kpi.positive ? 'text-emerald-600' : 'text-rose-600'}`} />
                </div>
                <p className="text-2xl font-bold text-slate-900 mb-1">{kpi.value}</p>
                <p className={`text-xs font-medium ${kpi.positive ? 'text-emerald-600' : 'text-slate-500'}`}>
                  {kpi.change}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Executive Summary */}
      <Card className="bg-gradient-to-br from-white to-slate-50 border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl text-slate-800">
            <FileText className="w-5 h-5 text-primary" />
            Sumário Executivo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-700 leading-relaxed text-lg whitespace-pre-line">
            {summary}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}