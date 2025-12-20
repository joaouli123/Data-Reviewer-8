import { formatCurrencySimple } from '@/utils/formatters';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { AlertTriangle, TrendingDown, Scissors } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const COLORS = ['#ef4444', '#f59e0b', '#f97316', '#ec4899', '#8b5cf6', '#6366f1', '#3b82f6'];

export default function ExpensesBreakdown({ opportunities, transactions }) {
  if (!opportunities || opportunities.length === 0) return null;

  // Calculate expenses by category
  const expensesByCategory = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});

  const chartData = Object.entries(expensesByCategory).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value
  })).sort((a, b) => b.value - a.value);

  const totalExpenses = chartData.reduce((acc, item) => acc + item.value, 0);

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-rose-600">
          <AlertTriangle className="w-5 h-5" />
          Análise de Despesas por Categoria
        </CardTitle>
        <CardDescription>Identificação de oportunidades de redução de custos</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <div className="flex flex-col">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => `R$ ${value}`}
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    borderRadius: '8px', 
                    border: '1px solid #e2e8f0' 
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Category List */}
            <div className="space-y-2 mt-4">
              {chartData.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                    />
                    <span className="text-slate-700">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-slate-900">
                      R$ {formatCurrencySimple(item.value}
                    </span>
                    <span className="text-xs text-slate-500 ml-2">
                      ({((item.value / totalExpenses) * 100).toFixed(1)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Opportunities */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Scissors className="w-5 h-5 text-rose-600" />
              <h4 className="font-semibold text-slate-900">Onde Cortar Custos</h4>
            </div>
            
            {opportunities.map((opp, idx) => (
              <div key={idx} className="p-4 rounded-lg bg-rose-50 border border-rose-100 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <Badge variant="outline" className="bg-white text-rose-700 border-rose-200 font-medium">
                    {opp.category.charAt(0).toUpperCase() + opp.category.slice(1)}
                  </Badge>
                  <div className="flex items-center gap-1 text-rose-600 font-bold text-sm bg-white px-2 py-1 rounded border border-rose-200">
                    <TrendingDown className="w-3 h-3" />
                    {opp.potential_savings}
                  </div>
                </div>
                <p className="text-sm text-rose-900 leading-relaxed">{opp.suggestion}</p>
              </div>
            ))}

            {opportunities.length === 0 && (
              <p className="text-slate-500 italic text-sm">
                Nenhuma oportunidade clara de redução identificada. Suas despesas parecem otimizadas.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}