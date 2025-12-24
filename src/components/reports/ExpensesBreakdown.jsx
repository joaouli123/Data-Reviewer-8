import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { AlertTriangle, TrendingDown, Scissors } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const COLORS = ['#ef4444', '#f59e0b', '#f97316', '#ec4899', '#0065BA', '#0065BA', '#3b82f6'];

export default function ExpensesBreakdown({ opportunities, transactions, categories = [] }) {
  // Create a map of categoryId to category name for quick lookup
  const categoryMap = {};
  categories.forEach(cat => {
    categoryMap[cat.id] = cat.name || 'Sem Categoria';

  // Debug: Log transactions being filtered
  const expenseTransactions = transactions.filter(t => {
    if (t.type === 'compra' || t.type === 'expense') return true;
    const catId = t.categoryId;
    const cat = categories.find(c => c.id === catId);
    return cat && cat.type === 'saida';

  // Calculate expenses by category
  const expensesByCategory = expenseTransactions
    .reduce((acc, t) => {
      let categoryName = 'Sem Categoria';
      
      // Try to map by categoryId first
      if (t.categoryId && categoryMap[t.categoryId]) {
        categoryName = categoryMap[t.categoryId];
      }
      // Fallback to category string if available
      else if (t.category) {
        categoryName = t.category;
      }
      
      acc[categoryName] = (acc[categoryName] || 0) + Math.abs((parseFloat(t.amount || 0) + parseFloat(t.interest || 0)));
      return acc;
    }, {});

  const chartData = Object.entries(expensesByCategory).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value
  })).sort((a, b) => b.value - a.value);

  const totalExpenses = chartData.reduce((acc, item) => acc + item.value, 0);

  // Renderize mesmo sem opportunities
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
        {chartData.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <p>Nenhuma despesa encontrada no período</p>
          </div>
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <div className="flex flex-col">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
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
                      R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
      )}
      </CardContent>
    </Card>
  );
}