import { formatCurrencySimple } from '@/utils/formatters';
import { InvokeLLM, UploadFile, ExtractDataFromUploadedFile } from '@/api/integrations';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, TrendingDown, BarChart3, Sparkles, Loader2, Calendar } from 'lucide-react';

import { toast } from 'sonner';
import { addMonths, parseISO, differenceInMonths } from 'date-fns';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

export default function DebtAnalysis({ transactions, purchases, purchaseInstallments }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  const calculateDebtMetrics = () => {
    const now = new Date();
    const threeMonthsAgo = addMonths(now, -3);

    // Total outstanding debt
    const totalDebt = purchaseInstallments
      .filter(i => !i.paid)
      .reduce((sum, i) => sum + i.amount, 0);

    // Revenue (last 3 months)
    const revenue = transactions
      .filter(t => t.type === 'income' && new Date(t.date) >= threeMonthsAgo)
      .reduce((sum, t) => sum + t.amount, 0);

    // Average monthly revenue
    const avgMonthlyRevenue = revenue / 3;

    // Debt-to-Revenue ratio
    const debtToRevenueRatio = avgMonthlyRevenue > 0 ? (totalDebt / (avgMonthlyRevenue * 12)) * 100 : 0;

    // Short-term debt (due in next 3 months)
    const threeMonthsLater = addMonths(now, 3);
    const shortTermDebt = purchaseInstallments
      .filter(i => !i.paid && new Date(i.due_date) <= threeMonthsLater)
      .reduce((sum, i) => sum + i.amount, 0);

    // Long-term debt (due after 3 months)
    const longTermDebt = totalDebt - shortTermDebt;

    // Monthly debt payment
    const monthlyDebtPayment = purchaseInstallments
      .filter(i => !i.paid && new Date(i.due_date) <= addMonths(now, 1))
      .reduce((sum, i) => sum + i.amount, 0);

    // Debt service ratio (monthly payment / monthly revenue)
    const debtServiceRatio = avgMonthlyRevenue > 0 ? (monthlyDebtPayment / avgMonthlyRevenue) * 100 : 0;

    // Debt by category
    const debtByCategory = {};
    purchases.forEach(p => {
      const purchaseDebt = purchaseInstallments
        .filter(i => i.purchase_id === p.id && !i.paid)
        .reduce((sum, i) => sum + i.amount, 0);
      
      if (purchaseDebt > 0) {
        if (!debtByCategory[p.category || 'Outros']) {
          debtByCategory[p.category || 'Outros'] = 0;
        }
        debtByCategory[p.category || 'Outros'] += purchaseDebt;
      }
    });

    return {
      totalDebt,
      shortTermDebt,
      longTermDebt,
      avgMonthlyRevenue,
      debtToRevenueRatio,
      monthlyDebtPayment,
      debtServiceRatio,
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
      console.error(error);
      toast.error('Erro ao analisar endividamento');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const metrics = calculateDebtMetrics();

  const healthStatus = 
    metrics.debtServiceRatio <= 30 ? 'healthy' :
    metrics.debtServiceRatio <= 50 ? 'warning' : 'critical';

  const statusConfig = {
    healthy: { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Saudável' },
    warning: { color: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Atenção' },
    critical: { color: 'bg-rose-100 text-rose-700 border-rose-200', label: 'Crítico' }
  };

  const pieData = Object.entries(metrics.debtByCategory).map(([category, value]) => ({
    name: category,
    value: value
  }));

  const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#10b981', '#ec4899'];

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
              className="bg-blue-600 hover:bg-blue-700"
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
                  R$ {formatCurrencySimple(metrics.totalDebt}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Índice de Cobertura</p>
                <p className="text-3xl font-bold">
                  {metrics.debtServiceRatio.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-rose-50 rounded-lg border border-rose-200">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-rose-600" />
                <p className="text-sm font-medium text-rose-700">Curto Prazo (3m)</p>
              </div>
              <p className="text-2xl font-bold text-rose-700">
                R$ {formatCurrencySimple(metrics.shortTermDebt}
              </p>
            </div>

            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-amber-600" />
                <p className="text-sm font-medium text-amber-700">Longo Prazo</p>
              </div>
              <p className="text-2xl font-bold text-amber-700">
                R$ {formatCurrencySimple(metrics.longTermDebt}
              </p>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                <p className="text-sm font-medium text-blue-700">Pagamento Mensal</p>
              </div>
              <p className="text-2xl font-bold text-blue-700">
                R$ {formatCurrencySimple(metrics.monthlyDebtPayment}
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
                    <Tooltip formatter={(value) => `R$ ${value}`} />
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
                {metrics.debtToRevenueRatio.toFixed(1)}%
              </p>
              <p className="text-xs text-slate-500">
                {metrics.debtToRevenueRatio < 30 ? 'Excelente' :
                 metrics.debtToRevenueRatio < 50 ? 'Bom' :
                 metrics.debtToRevenueRatio < 70 ? 'Razoável' : 'Alto'}
              </p>
            </div>

            <div className="p-4 bg-white rounded-lg border">
              <p className="text-sm font-medium text-slate-600 mb-2">Índice de Cobertura de Dívida</p>
              <p className="text-3xl font-bold text-slate-900 mb-1">
                {metrics.debtServiceRatio.toFixed(1)}%
              </p>
              <p className="text-xs text-slate-500">
                {metrics.debtServiceRatio < 30 ? 'Saudável (< 30%)' :
                 metrics.debtServiceRatio < 50 ? 'Moderado (30-50%)' : 'Alto (> 50%)'}
              </p>
            </div>
          </div>

          {/* AI Analysis */}
          {analysis && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg border">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-slate-900">Avaliação Geral</h4>
                  <Badge 
                    variant={
                      analysis.health_score === 'excellent' || analysis.health_score === 'good' ? 'default' :
                      analysis.health_score === 'fair' ? 'secondary' : 'destructive'
                    }
                  >
                    {analysis.health_score === 'excellent' ? 'Excelente' :
                     analysis.health_score === 'good' ? 'Bom' :
                     analysis.health_score === 'fair' ? 'Razoável' :
                     analysis.health_score === 'poor' ? 'Ruim' : 'Crítico'}
                  </Badge>
                </div>
                <p className="text-sm text-slate-700">{analysis.overall_assessment}</p>
              </div>

              {analysis.key_concerns?.length > 0 && (
                <div className="p-4 bg-rose-50 rounded-lg border border-rose-200">
                  <h4 className="font-semibold text-rose-900 mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Principais Preocupações
                  </h4>
                  <ul className="space-y-1">
                    {analysis.key_concerns.map((concern, idx) => (
                      <li key={idx} className="text-sm text-rose-700 flex items-start gap-2">
                        <span className="text-rose-600 font-bold mt-0.5">•</span>
                        {concern}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}