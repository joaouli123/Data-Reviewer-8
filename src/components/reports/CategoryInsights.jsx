import { InvokeLLM, UploadFile, ExtractDataFromUploadedFile } from '@/api/integrations';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { AlertTriangle, TrendingUp, TrendingDown, Sparkles, Loader2, Target } from 'lucide-react';
import { toast } from 'sonner';
import { format, subMonths } from 'date-fns';

export default function CategoryInsights({ transactions, categories }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [insights, setInsights] = useState(null);

  const analyzeCategories = async () => {
    if (transactions.length === 0) {
      toast.error('Não há transações para analisar');
      return;
    }

    setIsAnalyzing(true);
    try {
      // Prepare data for last 3 months
      const threeMonthsAgo = subMonths(new Date(), 3);
      const recentTransactions = transactions
        .filter(t => new Date(t.date) >= threeMonthsAgo)
        .map(t => ({
          description: t.description,
          amount: t.amount,
          type: t.type,
          category: t.category,
          date: t.date
        }));

      // Group by category
      const categoryStats = {};
      recentTransactions.forEach(t => {
        if (!categoryStats[t.category]) {
          categoryStats[t.category] = {
            total: 0,
            count: 0,
            type: t.type,
            transactions: []
          };
        }
        categoryStats[t.category].total += t.amount;
        categoryStats[t.category].count += 1;
        categoryStats[t.category].transactions.push({
          description: t.description,
          amount: t.amount,
          date: t.date
        });
      });

      const prompt = `Analise os seguintes dados de transações dos últimos 3 meses agrupadas por categoria:

${Object.entries(categoryStats).map(([cat, data]) => 
  `Categoria: ${cat} (${data.type === 'expense' ? 'Despesa' : 'Receita'})
  Total: R$ ${data.total.toFixed(2)}
  Número de transações: ${data.count}
  Média por transação: R$ ${(data.total / data.count).toFixed(2)}`
).join('\n\n')}

Identifique:
1. Anomalias (gastos ou receitas muito acima da média, padrões estranhos)
2. Tendências preocupantes (categorias com crescimento expressivo de gastos)
3. Oportunidades de otimização (onde há potencial de redução ou melhoria)
4. Regras de categorização inteligentes (padrões nas descrições que podem ajudar a categorizar automaticamente futuras transações)`;

      const response = await InvokeLLM({
        prompt: prompt,
        
          type: "object",
          properties: {
            anomalies: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  category: { type: "string" },
                  severity: { type: "string", enum: ["high", "medium", "low"] },
                  description: { type: "string" },
                  recommendation: { type: "string" }
                }
              }
            },
            trends: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  category: { type: "string" },
                  trend_type: { type: "string", enum: ["positive", "negative", "neutral"] },
                  description: { type: "string" },
                  impact: { type: "string" }
                }
              }
            },
            optimization_opportunities: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  category: { type: "string" },
                  opportunity: { type: "string" },
                  potential_savings: { type: "string" },
                  action_items: { type: "array", items: { type: "string" } }
                }
              }
            },
            categorization_rules: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  pattern: { type: "string" },
                  suggested_category: { type: "string" },
                  confidence: { type: "string", enum: ["high", "medium", "low"] },
                  examples: { type: "array", items: { type: "string" } }
                }
              }
            }
          }
        }
      });

      setInsights(response);
      toast.success('Análise concluída!');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao analisar categorias');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const severityColors = {
    high: { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200' },
    medium: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
    low: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' }
  };

  const trendColors = {
    positive: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: TrendingUp },
    negative: { bg: 'bg-rose-100', text: 'text-rose-700', icon: TrendingDown },
    neutral: { bg: 'bg-slate-100', text: 'text-slate-700', icon: TrendingUp }
  };

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-indigo-600">
              <Sparkles className="w-5 h-5" />
              Insights Inteligentes por Categoria
            </CardTitle>
            <CardDescription>
              Análise automática de anomalias, tendências e oportunidades de otimização
            </CardDescription>
          </div>
          <Button
            onClick={analyzeCategories}
            disabled={isAnalyzing}
            className="bg-indigo-600 hover:bg-indigo-700"
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

      {insights && (
        <CardContent className="space-y-6">
          {/* Anomalies */}
          {insights.anomalies?.length > 0 && (
            <div>
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2 text-rose-600">
                <AlertTriangle className="w-5 h-5" />
                Anomalias Detectadas
              </h3>
              <div className="space-y-3">
                {insights.anomalies.map((anomaly, idx) => {
                  const colors = severityColors[anomaly.severity] || severityColors.medium;
                  return (
                    <div key={idx} className={`p-4 rounded-lg border ${colors.border} ${colors.bg}`}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <Badge variant="outline" className={`${colors.text} border-current mb-2`}>
                            {anomaly.category}
                          </Badge>
                          <p className="font-medium text-slate-900">{anomaly.description}</p>
                        </div>
                        <Badge className={colors.bg}>
                          {anomaly.severity === 'high' ? 'Alta' : anomaly.severity === 'medium' ? 'Média' : 'Baixa'}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-700 mt-2">
                        <strong>Recomendação:</strong> {anomaly.recommendation}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Trends */}
          {insights.trends?.length > 0 && (
            <div>
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2 text-indigo-600">
                <TrendingUp className="w-5 h-5" />
                Tendências Identificadas
              </h3>
              <div className="space-y-3">
                {insights.trends.map((trend, idx) => {
                  const colors = trendColors[trend.trend_type] || trendColors.neutral;
                  const Icon = colors.icon;
                  return (
                    <div key={idx} className={`p-4 rounded-lg border ${colors.bg}`}>
                      <div className="flex items-start gap-3">
                        <Icon className={`w-5 h-5 mt-0.5 ${colors.text}`} />
                        <div className="flex-1">
                          <Badge variant="outline" className="mb-2">
                            {trend.category}
                          </Badge>
                          <p className="font-medium text-slate-900">{trend.description}</p>
                          <p className="text-sm text-slate-600 mt-2">{trend.impact}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Optimization Opportunities */}
          {insights.optimization_opportunities?.length > 0 && (
            <div>
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2 text-emerald-600">
                <Target className="w-5 h-5" />
                Oportunidades de Otimização
              </h3>
              <div className="space-y-3">
                {insights.optimization_opportunities.map((opp, idx) => (
                  <div key={idx} className="p-4 rounded-lg border bg-emerald-50 border-emerald-200">
                    <div className="flex items-start justify-between mb-2">
                      <Badge variant="outline" className="text-emerald-700 border-emerald-300">
                        {opp.category}
                      </Badge>
                      <Badge className="bg-emerald-600 text-white">
                        {opp.potential_savings}
                      </Badge>
                    </div>
                    <p className="font-medium text-slate-900 mb-3">{opp.opportunity}</p>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-slate-600 uppercase">Ações Sugeridas:</p>
                      <ul className="space-y-1">
                        {opp.action_items.map((action, aIdx) => (
                          <li key={aIdx} className="text-sm text-slate-700 flex items-start gap-2">
                            <span className="text-emerald-600 font-bold">•</span>
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Categorization Rules */}
          {insights.categorization_rules?.length > 0 && (
            <div>
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2 text-indigo-600">
                <Sparkles className="w-5 h-5" />
                Regras Inteligentes de Categorização
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                Padrões detectados que podem ajudar a categorizar transações futuras automaticamente:
              </p>
              <div className="space-y-3">
                {insights.categorization_rules.map((rule, idx) => (
                  <div key={idx} className="p-4 rounded-lg border bg-indigo-50 border-indigo-200">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-medium text-slate-900 mb-1">
                          <span className="text-indigo-600">Padrão:</span> {rule.pattern}
                        </p>
                        <p className="text-sm text-slate-700 mb-2">
                          <span className="font-semibold">→ Categoria Sugerida:</span>{' '}
                          <Badge variant="outline" className="ml-1">
                            {rule.suggested_category}
                          </Badge>
                        </p>
                      </div>
                      <Badge className={
                        rule.confidence === 'high' ? 'bg-emerald-600' :
                        rule.confidence === 'medium' ? 'bg-amber-500' :
                        'bg-slate-400'
                      }>
                        {rule.confidence === 'high' ? 'Alta Confiança' :
                         rule.confidence === 'medium' ? 'Média Confiança' :
                         'Baixa Confiança'}
                      </Badge>
                    </div>
                    {rule.examples?.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-indigo-200">
                        <p className="text-xs font-semibold text-slate-600 mb-1">Exemplos:</p>
                        <div className="flex flex-wrap gap-1">
                          {rule.examples.map((ex, eIdx) => (
                            <Badge key={eIdx} variant="secondary" className="text-xs">
                              {ex}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      )}

      {!insights && (
        <CardContent>
          <div className="text-center py-8 text-slate-500">
            <Sparkles className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>Clique no botão acima para gerar insights inteligentes</p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}