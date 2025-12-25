import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, Sparkles } from 'lucide-react';

export default function CashFlowForecastChart({ forecast }) {
  if (!forecast || forecast.length === 0) {
    return (
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <TrendingUp className="w-5 h-5" />
            Previsão de Fluxo de Caixa
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <div className="bg-slate-50 p-4 rounded-full mb-4">
            <Sparkles className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-1">Dados Insuficientes para Previsão</h3>
          <p className="text-sm text-slate-500 max-w-xs">
            A IA precisa de pelo menos 3 a 6 meses de histórico de transações para gerar projeções precisas.
          </p>
        </CardContent>
      </Card>
    );
  }

  const chartData = forecast.map(item => ({
    name: item.month,
    receita: item.predicted_revenue,
    despesa: item.predicted_expense,
    lucro: item.predicted_revenue - item.predicted_expense
  }));

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
          <TrendingUp className="w-5 h-5" />
          Previsão de Fluxo de Caixa (3 Meses)
        </CardTitle>
        <CardDescription>Projeção baseada no histórico recente de transações</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={chartData}>
            <defs>
              <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#86efac" stopOpacity={0.6}/>
                <stop offset="95%" stopColor="#bbf7d0" stopOpacity={0.3}/>
              </linearGradient>
              <linearGradient id="colorDespesa" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#fca5a5" stopOpacity={0.6}/>
                <stop offset="95%" stopColor="#fecaca" stopOpacity={0.3}/>
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
              contentStyle={{ 
                backgroundColor: '#fff', 
                borderRadius: '8px', 
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
              }}
              formatter={(value) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, '']}
            />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              formatter={(value) => value.charAt(0).toUpperCase() + value.slice(1)}
            />
            <Bar dataKey="receita" fill="url(#colorReceita)" radius={[8, 8, 0, 0]} />
            <Bar dataKey="despesa" fill="url(#colorDespesa)" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>

        <div className="mt-6 space-y-3">
          {forecast.map((item, idx) => (
            <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-slate-700">{item.month}</span>
                <span className={`font-bold ${(item.predicted_revenue - item.predicted_expense) >= 0 ? 'text-teal-700' : 'text-red-600'}`}>
                  {(item.predicted_revenue - item.predicted_expense) >= 0 ? '+' : ''}
                  R$ {(item.predicted_revenue - item.predicted_expense).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <p className="text-xs text-slate-600 italic">{item.reasoning}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}