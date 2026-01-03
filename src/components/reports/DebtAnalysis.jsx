import { InvokeLLM, UploadFile, ExtractDataFromUploadedFile } from '@/api/integrations';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, TrendingDown, BarChart3, Sparkles, Loader2, Calendar } from 'lucide-react';

import { toast } from 'sonner';
import { addMonths, parseISO, differenceInMonths } from 'date-fns';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

export default function DebtAnalysis({ transactions, purchases, purchaseInstallments, dateRange, categories = [] }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  const calculateDebtMetrics = () => {
    // Create a map of categoryId to category name
    const categoryMap = {};
    categories.forEach(cat => {
      categoryMap[cat.id] = cat.name || 'Sem Categoria';
    });

    // Use ONLY filtered transactions
    const compras = Array.isArray(transactions) 
      ? transactions.filter(t => t.type === 'compra' || t.type === 'expense')
      : [];

    // Real income from transactions
    const income = Array.isArray(transactions)
      ? transactions.filter(t => t.type === 'venda' || t.type === 'income')
      : [];
    
    const revenue = income.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount || 0)), 0);

    // Total debt from filtered transactions
    let totalDebt = compras.reduce((sum, t) => {
      const amount = Math.abs(parseFloat(t.amount || 0));
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);

    // Short-term vs Long-term from installments
    const today = new Date();
    const threeMonthsFromNow = addMonths(today, 3);
    
    let shortTermDebt = 0;
    let longTermDebt = 0;

    if (Array.isArray(purchaseInstallments)) {
      purchaseInstallments.forEach(inst => {
        const dueDate = parseISO(inst.dueDate);
        const amount = parseFloat(inst.amount || 0);
        if (dueDate <= threeMonthsFromNow) {
          shortTermDebt += amount;
        } else {
          longTermDebt += amount;
        }
      });
    } else {
      // Fallback if no installments data
      shortTermDebt = totalDebt * 0.5;
      longTermDebt = totalDebt * 0.5;
    }

    const avgMonthlyRevenue = revenue / 3;
    const debtToRevenueRatio = avgMonthlyRevenue > 0 ? (totalDebt / (avgMonthlyRevenue * 12)) * 100 : 0;
    const monthlyDebtPayment = shortTermDebt / 3;
    const debtServiceRatio = avgMonthlyRevenue > 0 ? (monthlyDebtPayment / avgMonthlyRevenue) * 100 : 0;

    // Debt by category
    const debtByCategory = {};
    compras.forEach(t => {
      let categoryName = 'Sem Categoria';
      if (t.categoryId && categoryMap[t.categoryId]) {
        categoryName = categoryMap[t.categoryId];
      } else if (t.category) {
        categoryName = t.category;
      }
      const amount = Math.abs(parseFloat(t.amount || 0));
      debtByCategory[categoryName] = (debtByCategory[categoryName] || 0) + amount;
    });

    return {
      totalDebt: Math.max(0, totalDebt),
      shortTermDebt: Math.max(0, shortTermDebt),
      longTermDebt: Math.max(0, longTermDebt),
      avgMonthlyRevenue: Math.max(0, avgMonthlyRevenue),
      debtToRevenueRatio: isNaN(debtToRevenueRatio) ? 0 : debtToRevenueRatio,
      monthlyDebtPayment: Math.max(0, monthlyDebtPayment),
      debtServiceRatio: isNaN(debtServiceRatio) ? 0 : debtServiceRatio,
      debtByCategory
    };
  };

  const analyzeWithAI = async () => {
    setIsAnalyzing(true);
    try {
      const metrics = calculateDebtMetrics();
      
      const prompt = `Analise a situação de endividamento:
- Dívida Total: R$ ${metrics.totalDebt.toFixed(2)}
- Dívida Curto Prazo (3 meses): R$ ${metrics.shortTermDebt.toFixed(2)}
- Dívida Longo Prazo: R$ ${metrics.longTermDebt.toFixed(2)}
- Receita Mensal Média: R$ ${metrics.avgMonthlyRevenue.toFixed(2)}
- Índice Dívida/Receita: ${metrics.debtToRevenueRatio.toFixed(1)}%
- Pagamento Mensal de Dívidas: R$ ${metrics.monthlyDebtPayment.toFixed(2)}
- Índice de Cobertura de Dívida: ${metrics.debtServiceRatio.toFixed(1)}%

Forneça uma análise detalhada e recomendações para gestão de endividamento.`;

      const response = await InvokeLLM(prompt, {
        properties: {
          overall_assessment: { type: "string" },
          health_score: { type: "string", enum: ["excellent", "good", "fair", "poor", "critical"] },
          key_concerns: {
            type: "array",
            items: { type: "string" }
          },
          recommendations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                strategy: { type: "string" },
                timeline: { type: "string" },
                expected_impact: { type: "string" }
              }
            }
          }
        }
      });

      setAnalysis(response);
      toast.success('Análise concluída!');
    } catch (error) {
      toast.error('Erro ao analisar endividamento');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const metrics = calculateDebtMetrics();

  const debtServiceRatioActual = metrics.debtServiceRatio;
  const debtToRevenueRatioActual = metrics.debtToRevenueRatio;

  const healthStatus = 
    (debtServiceRatioActual <= 30 && debtToRevenueRatioActual <= 30) ? 'healthy' :
    (debtServiceRatioActual <= 50 && debtToRevenueRatioActual <= 100) ? 'warning' : 'critical';

  const statusConfig = {
    healthy: { color: 'bg-green-50 text-teal-700 border-green-200', label: 'Saudável' },
    warning: { color: 'bg-yellow-50 text-amber-700 border-yellow-200', label: 'Atenção' },
    critical: { color: 'bg-pink-50 text-red-600 border-pink-200', label: 'Crítico' }
  };

  const pieData = Object.entries(metrics.debtByCategory).map(([category, value]) => ({
    name: category,
    value: value
  }));

  const COLORS = ['#fca5a5', '#fcd34d', '#93c5fd', '#60a5fa', '#86efac', '#f0abfc'];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-600" />
                Análise de Endividamento
              </CardTitle>
              <CardDescription>
                Visão completa das suas obrigações financeiras
              </CardDescription>
            </div>
            <Button
              onClick={analyzeWithAI}
              disabled={isAnalyzing}
              className="bg-primary hover:bg-primary"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analisando...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Analisar com IA
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status Card */}
          <div className={`p-6 rounded-lg border-2 ${statusConfig[healthStatus].color}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Status do Endividamento</h3>
              <Badge className={statusConfig[healthStatus].color}>
                {statusConfig[healthStatus].label}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium mb-1">Dívida Total</p>
                <p className="text-3xl font-bold">
                  R$ {isNaN(metrics.totalDebt) ? '0,00' : metrics.totalDebt.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Índice Dívida/Rec.</p>
                <p className="text-3xl font-bold">
                  {isNaN(metrics.debtToRevenueRatio) ? '0,0' : metrics.debtToRevenueRatio.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-pink-50 rounded-lg border border-pink-200">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-red-600" />
                <p className="text-sm font-medium text-red-600">Curto Prazo (3m)</p>
              </div>
              <p className="text-2xl font-bold text-red-600">
                R$ {isNaN(metrics.shortTermDebt) ? '0,00' : metrics.shortTermDebt.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>

            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-amber-700" />
                <p className="text-sm font-medium text-amber-700">Longo Prazo</p>
              </div>
              <p className="text-2xl font-bold text-amber-700">
                R$ {isNaN(metrics.longTermDebt) ? '0,00' : metrics.longTermDebt.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-blue-700" />
                <p className="text-sm font-medium text-blue-700">Pagamento Mensal</p>
              </div>
              <p className="text-2xl font-bold text-blue-700">
                R$ {isNaN(metrics.monthlyDebtPayment) ? '0,00' : metrics.monthlyDebtPayment.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Debt by Category */}
          {pieData.length > 0 && (
            <Card className="bg-slate-50">
              <CardHeader>
                <CardTitle className="text-base">Composição da Dívida por Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Ratios */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-white rounded-lg border">
              <p className="text-sm font-medium text-slate-600 mb-2">Índice Dívida/Receita Anual</p>
              <p className="text-3xl font-bold text-slate-900 mb-1">
                {isNaN(metrics.debtToRevenueRatio) ? '0,0' : metrics.debtToRevenueRatio.toFixed(1)}%
              </p>
              <p className="text-xs text-slate-500">
                {isNaN(metrics.debtToRevenueRatio) ? 'Excelente' :
                 metrics.debtToRevenueRatio < 30 ? 'Excelente' :
                 metrics.debtToRevenueRatio < 50 ? 'Bom' :
                 metrics.debtToRevenueRatio < 70 ? 'Razoável' : 'Alto'}
              </p>
            </div>

            <div className="p-4 bg-white rounded-lg border">
              <p className="text-sm font-medium text-slate-600 mb-2">Índice de Cobertura de Dívida</p>
              <p className="text-3xl font-bold text-slate-900 mb-1">
                {isNaN(metrics.debtServiceRatio) ? '0,0' : metrics.debtServiceRatio.toFixed(1)}%
              </p>
              <p className="text-xs text-slate-500">
                {isNaN(metrics.debtServiceRatio) ? 'Saudável (< 30%)' :
                 metrics.debtServiceRatio < 30 ? 'Saudável (< 30%)' :
                 metrics.debtServiceRatio < 50 ? 'Moderado (30-50%)' : 'Alto (> 50%)'}
              </p>
            </div>
          </div>

          {/* AI Analysis */}
          {analysis && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-lg border">
                  <h4 className="font-semibold text-slate-900 mb-2">Avaliação Geral</h4>
                  <p className="text-sm text-slate-700">
                    {typeof analysis.overall_assessment === 'string' ? analysis.overall_assessment : 'Análise concluída'}
                  </p>
                </div>
                
                <div className="p-4 bg-slate-50 rounded-lg border">
                  <h4 className="font-semibold text-slate-900 mb-2">Pontuação de Saúde</h4>
                  <div className="flex items-center gap-2">
                    <Badge variant={analysis.health_score === 'poor' ? 'destructive' : analysis.health_score === 'fair' ? 'default' : 'secondary'}>
                      {analysis.health_score === 'poor' ? 'Crítica' : analysis.health_score === 'fair' ? 'Regular' : 'Saudável'}
                    </Badge>
                  </div>
                </div>
              </div>

              {analysis.key_concerns?.length > 0 && (
                <div className="p-4 bg-pink-50 rounded-lg border border-pink-200">
                  <h4 className="font-semibold text-red-700 mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Principais Preocupações
                  </h4>
                  <ul className="space-y-1">
                    {analysis.key_concerns.map((concern, idx) => (
                      <li key={idx} className="text-sm text-red-600 flex items-start gap-2">
                        <span className="text-red-600 font-bold mt-0.5">•</span>
                        {concern}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {Array.isArray(analysis.recommendations) && (
              <div>
                <h4 className="font-semibold text-slate-900 mb-3">Estratégias de Gestão</h4>
                <div className="space-y-3">
                  {analysis.recommendations.map((rec, idx) => (
                    <div key={idx} className="p-3 bg-white rounded-lg border">
                      <p className="font-medium text-slate-900 mb-2">{rec.strategy}</p>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <Badge variant="outline">
                          <Calendar className="w-3 h-3 mr-1" />
                          {rec.timeline}
                        </Badge>
                        <span className="text-slate-600">{rec.expected_impact}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}