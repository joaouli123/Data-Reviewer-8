import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Lightbulb, TrendingUp, Users, DollarSign, Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, subMonths, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function RevenueGrowthReport({ strategies, transactions, customers }) {
  // Filter only revenue transactions from the already-filtered data
  const revenueTransactions = Array.isArray(transactions) 
    ? transactions.filter(t => t.type === 'venda' || t.type === 'income')
    : [];

  // Calculate revenue trend (last 6 months)
  const revenueByMonth = [];
  for (let i = 5; i >= 0; i--) {
    const date = subMonths(new Date(), i);
    const monthKey = format(date, 'yyyy-MM');
    const monthLabel = format(date, 'MMM', { locale: ptBR }).toUpperCase();
    
    const monthRevenue = revenueTransactions
      .filter(t => {
        if (!t.date) return false;
        const txnDate = new Date(t.date);
        const txnMonthKey = format(txnDate, 'yyyy-MM');
        return txnMonthKey === monthKey;
      })
      .reduce((acc, t) => acc + Math.abs(parseFloat(t.amount || 0)), 0);
    
    revenueByMonth.push({ name: monthLabel, receita: monthRevenue });
  }

  // Calculate KPIs
  const totalRevenue = revenueTransactions
    .reduce((acc, t) => acc + Math.abs(parseFloat(t.amount || 0)), 0);

  const last3MonthsRevenue = revenueByMonth.slice(-3).reduce((acc, m) => acc + m.receita, 0);
  const previous3MonthsRevenue = revenueByMonth.slice(0, 3).reduce((acc, m) => acc + m.receita, 0);
  const growthRate = previous3MonthsRevenue > 0 
    ? ((last3MonthsRevenue - previous3MonthsRevenue) / previous3MonthsRevenue) * 100 
    : 0;

  const revenueTransactionCount = revenueTransactions.length;
  const avgTicket = revenueTransactionCount > 0 ? totalRevenue / revenueTransactionCount : 0;
  const activeCustomers = Array.isArray(customers) ? customers.filter(c => c.status === 'active').length : 0;

  // Customer segmentation
  const customerRevenue = revenueTransactions
    .filter(t => t.customer_id)
    .reduce((acc, t) => {
      acc[t.customer_id] = (acc[t.customer_id] || 0) + Math.abs(parseFloat(t.amount || 0));
      return acc;
    }, {});

  const topCustomers = Object.entries(customerRevenue)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-emerald-600">
          <TrendingUp className="w-5 h-5" />
          Análise de Crescimento de Receita
        </CardTitle>
        <CardDescription>KPIs importantes e estratégias de crescimento</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-emerald-600 font-medium">Receita Total</span>
            </div>
            <p className="text-xl font-bold text-emerald-700">
              R$ {totalRevenue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
            </p>
          </div>

          <div className="p-4 bg-indigo-50 rounded-lg border border-blue-100">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-xs text-primary font-medium">Crescimento</span>
            </div>
            <p className={`text-xl font-bold ${growthRate >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {growthRate >= 0 ? '+' : ''}{growthRate.toFixed(1)}%
            </p>
          </div>

          <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4 text-primary600" />
              <span className="text-xs text-primary600 font-medium">Ticket Médio</span>
            </div>
            <p className="text-xl font-bold text-primary700">
              R$ {avgTicket.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
            </p>
          </div>

          <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-amber-600" />
              <span className="text-xs text-amber-600 font-medium">Clientes Ativos</span>
            </div>
            <p className="text-xl font-bold text-amber-700">{activeCustomers}</p>
          </div>
        </div>

        {/* Revenue Trend Chart */}
        <div>
          <h4 className="text-sm font-semibold text-slate-700 mb-3">Tendência de Receita (6 Meses)</h4>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={revenueByMonth}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: '#64748b', fontSize: 12}} 
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: '#64748b', fontSize: 12}}
                tickFormatter={(value) => `R$${(value/1000).toFixed(0)}k`}
              />
              <Tooltip 
                formatter={(value) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Receita']}
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  borderRadius: '8px', 
                  border: '1px solid #e2e8f0' 
                }}
              />
              <Area 
                type="monotone" 
                dataKey="receita" 
                stroke="#10b981" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorRevenue)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top Customers */}
        <div>
          <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Top 5 Clientes por Receita
          </h4>
          <div className="space-y-2">
            {topCustomers.map(([customerId, revenue], idx) => {
              const customer = customers.find(c => c.id === customerId);
              return (
                <div key={customerId} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-primary flex items-center justify-center font-bold text-sm">
                      {idx + 1}
                    </div>
                    <span className="font-medium text-slate-900">{customer?.name || 'Cliente'}</span>
                  </div>
                  <span className="font-bold text-emerald-600">
                    R$ {revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Growth Strategies */}
        {strategies && strategies.length > 0 ? (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="w-5 h-5 text-emerald-600" />
            <h4 className="font-semibold text-slate-900">Estratégias de Crescimento</h4>
          </div>
          
          <div className="space-y-4">
            {strategies.map((strategy, idx) => (
              <div key={idx} className="p-4 rounded-lg bg-emerald-50 border border-emerald-100">
                <h5 className="font-semibold text-emerald-900 mb-2">{strategy.strategy || strategy.acao || strategy.estrategia || "Estratégia sugerida"}</h5>
                <p className="text-sm text-emerald-800 mb-3 leading-relaxed">{strategy.rationale || strategy.justificativa || strategy.impacto || strategy.descricao || "Aguardando análise detalhada..."}</p>
                <Badge variant="outline" className="bg-white text-emerald-700 border-emerald-200">
                  Alvo: {strategy.target_customer_segment || strategy.segmento_alvo || strategy.alvo || 'Geral'}
                </Badge>
              </div>
            ))}
          </div>
        </div>
        ) : (
          <div className="p-8 text-center border-2 border-dashed rounded-xl bg-slate-50 border-slate-200">
            <Lightbulb className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Nenhuma estratégia de crescimento gerada para este período.</p>
            <p className="text-slate-400 text-xs mt-1">Clique em "Filtro Avançado" e "Iniciar Análise IA" para gerar insights.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}