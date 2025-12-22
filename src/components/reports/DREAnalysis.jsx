import { InvokeLLM, UploadFile, ExtractDataFromUploadedFile } from '@/api/integrations';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Sparkles, Loader2, TrendingUp, TrendingDown } from 'lucide-react';

import { toast } from 'sonner';
import { subMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function DREAnalysis({ transactions, period = 'currentYear' }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [forecast, setForecast] = useState(null);

  const calculateDRE = () => {
    // Group by category
    const revenues = {};
    const expenses = {};
    
    transactions.forEach(t => {
      const category = (!t.categoryId ? 'Sem Categoria' : (t.categoryId || 'Sem Categoria')).toString().trim();
      
      // For revenues: use paidAmount if partial, full amount if paid or pending
      if (t.type === 'venda' || t.type === 'income') {
        let amount = 0;
        if (t.status === 'pago' || t.status === 'completed') {
          // Fully paid: count full amount + interest
          amount = parseFloat(t.amount || 0) + parseFloat(t.interest || 0);
        } else if (t.status === 'parcial') {
          // Partially paid: count only what was paid + interest
          amount = parseFloat(t.paidAmount || 0) + parseFloat(t.interest || 0);
        }
        // If pending (status === 'pendente'): don't count anything (amount = 0)
        revenues[category] = (revenues[category] || 0) + amount;
      } else if (t.type === 'compra' || t.type === 'expense') {
        let amount = 0;
        if (t.status === 'pago' || t.status === 'completed') {
          // Fully paid: count full amount + interest
          amount = parseFloat(t.amount || 0) + parseFloat(t.interest || 0);
        } else if (t.status === 'parcial') {
          // Partially paid: count only what was paid + interest
          amount = parseFloat(t.paidAmount || 0) + parseFloat(t.interest || 0);
        }
        // If pending: don't count anything
        expenses[category] = (expenses[category] || 0) + amount;
      }
    });

    const receitaBruta = Object.values(revenues).reduce((sum, v) => sum + v, 0);
    const custosDiretos = expenses['Custos'] || expenses['custos'] || 0;
    const receitaLiquida = receitaBruta - custosDiretos;
    
    const despesasOperacionais = Object.entries(expenses)
      .filter(([cat]) => cat !== 'Custos' && cat !== 'custos')
      .reduce((sum, [, val]) => sum + val, 0);
    
    const lucroOperacional = receitaLiquida - despesasOperacionais;
    const margemLiquida = receitaBruta > 0 ? (lucroOperacional / receitaBruta) * 100 : 0;

    return {
      receitaBruta,
      custosDiretos,
      receitaLiquida,
      despesasOperacionais: {
        total: despesasOperacionais,
        breakdown: Object.entries(expenses)
          .filter(([cat]) => cat !== 'Custos' && cat !== 'custos')
          .map(([cat, val]) => [cat || 'Sem Categoria', val || 0])
      },
      lucroOperacional,
      margemLiquida,
      revenues,
      expenses
    };
  };

  const dre = calculateDRE();

  const generateForecast = async () => {
    setIsAnalyzing(true);
    try {
      // Historical data for last 6 months
      const historicalData = [];
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const monthKey = format(date, 'yyyy-MM');
        const monthTrans = transactions.filter(t => t.date.startsWith(monthKey));
        
        const monthRevenue = monthTrans.filter(t => t.type === 'venda' || t.type === 'income').reduce((sum, t) => sum + Math.abs(parseFloat(t.amount || 0)), 0);
        const monthExpense = monthTrans.filter(t => t.type === 'compra' || t.type === 'expense').reduce((sum, t) => sum + Math.abs(parseFloat(t.amount || 0)), 0);
        
        historicalData.push({
          month: format(date, 'MMM/yy', { locale: ptBR }),
          revenue: monthRevenue,
          expense: monthExpense,
          profit: monthRevenue - monthExpense
        });
      }

      const prompt = `Analise a DRE histórica e gere previsões detalhadas:

DRE Atual:
- Receita Bruta: R$ ${dre.receitaBruta.toFixed(2)}
- Custos Diretos: R$ ${dre.custosDiretos.toFixed(2)}
- Receita Líquida: R$ ${dre.receitaLiquida.toFixed(2)}
- Despesas Operacionais: R$ ${dre.despesasOperacionais.total.toFixed(2)}
- Lucro Operacional: R$ ${dre.lucroOperacional.toFixed(2)}
- Margem Líquida: ${dre.margemLiquida.toFixed(1)}%

Histórico (últimos 6 meses): ${JSON.stringify(historicalData)}

Gere previsões para os próximos 3 meses com análise de tendências.`;

      const response = await InvokeLLM(prompt, {
        properties: {
          forecast_months: {
            type: "array",
            items: {
              type: "object",
              properties: {
                month: { type: "string" },
                receita_bruta: { type: "number" },
                custos_diretos: { type: "number" },
                despesas_operacionais: { type: "number" },
                lucro_previsto: { type: "number" },
                margem_prevista: { type: "number" },
                confidence: { type: "string", enum: ["high", "medium", "low"] }
              }
            }
          },
          trend_analysis: { type: "string" },
          growth_opportunities: {
            type: "array",
            items: { type: "string" }
          },
          risk_factors: {
            type: "array",
            items: {
              type: "object",
              properties: {
                factor: { type: "string" },
                impact: { type: "string", enum: ["high", "medium", "low"] }
              }
            }
          },
          recommendations: {
            type: "array",
            items: { type: "string" }
          }
        }
      });

      setForecast(response);
      toast.success('Previsão gerada com sucesso!');
    } catch (error) {
      toast.error('Erro ao gerar previsão');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              DRE - Demonstração do Resultado do Exercício
            </CardTitle>
            <CardDescription>Análise detalhada do desempenho financeiro</CardDescription>
          </div>
          <Button
            onClick={generateForecast}
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
                Gerar Previsão
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* DRE Table */}
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg border border-emerald-200">
            <span className="font-semibold text-emerald-900">Receita Bruta</span>
            <span className="text-lg font-bold text-emerald-700">
              R$ {dre.receitaBruta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex justify-between items-center p-3 bg-white rounded-lg border pl-8">
            <span className="text-slate-700">(-) Custos Diretos</span>
            <span className="text-slate-900 font-semibold">
              R$ {dre.custosDiretos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
            <span className="font-semibold text-blue-900">= Receita Líquida</span>
            <span className="text-lg font-bold text-blue-700">
              R$ {dre.receitaLiquida.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="pl-4 space-y-2 border-l-2 border-slate-200 ml-4">
            <p className="text-sm font-medium text-slate-600">(-) Despesas Operacionais:</p>
            {dre.despesasOperacionais.breakdown.map(([cat, val]) => (
              <div key={cat} className="flex justify-between items-center p-2 bg-white rounded border text-sm">
                <span className="text-slate-600 capitalize">{cat}</span>
                <span className="text-slate-900">
                  R$ {val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}
            <div className="flex justify-between items-center p-2 bg-slate-50 rounded border font-medium">
              <span className="text-slate-700">Total Despesas Operacionais</span>
              <span className="text-slate-900">
                R$ {dre.despesasOperacionais.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="flex justify-between items-center p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
            <div>
              <span className="font-bold text-indigo-900 text-lg">= Lucro Operacional</span>
              <p className="text-xs text-primary mt-1">Margem Líquida: {dre.margemLiquida.toFixed(1)}%</p>
            </div>
            <span className={`text-2xl font-bold ${dre.lucroOperacional >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {dre.lucroOperacional >= 0 ? '+' : ''} R$ {dre.lucroOperacional.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Forecast Section */}
        {forecast && (
          <div className="space-y-6 pt-6 border-t">
            <h4 className="font-semibold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Previsões Futuras (Próximos 3 Meses)
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {forecast.forecast_months.map((month, idx) => (
                <div key={idx} className="p-4 bg-white rounded-lg border">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="font-semibold text-slate-900">{month.month}</h5>
                    <Badge variant={
                      month.confidence === 'high' ? 'default' :
                      month.confidence === 'medium' ? 'secondary' : 'outline'
                    }>
                      {month.confidence === 'high' ? 'Alta' : month.confidence === 'medium' ? 'Média' : 'Baixa'} Confiança
                    </Badge>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Receita Bruta</span>
                      <span className="font-medium text-emerald-600">
                        R$ {month.receita_bruta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Custos/Despesas</span>
                      <span className="font-medium text-rose-600">
                        R$ {(month.custos_diretos + month.despesas_operacionais).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <span className="font-semibold text-slate-900">Lucro Previsto</span>
                      <span className={`font-bold ${month.lucro_previsto >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        R$ {month.lucro_previsto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">
                      Margem: {month.margem_prevista.toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Trend Analysis */}
            <div className="p-4 bg-indigo-50 rounded-lg border border-blue-200">
              <h5 className="font-semibold text-indigo-900 mb-2">Análise de Tendências</h5>
              <p className="text-sm text-primary">{forecast.trend_analysis}</p>
            </div>

            {/* Growth Opportunities */}
            {forecast.growth_opportunities?.length > 0 && (
              <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                <h5 className="font-semibold text-emerald-900 mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Oportunidades de Crescimento
                </h5>
                <ul className="space-y-1">
                  {forecast.growth_opportunities.map((opp, idx) => (
                    <li key={idx} className="text-sm text-emerald-700 flex items-start gap-2">
                      <span className="text-emerald-600 font-bold mt-0.5">•</span>
                      {opp}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Risk Factors */}
            {forecast.risk_factors?.length > 0 && (
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <h5 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                  <TrendingDown className="w-4 h-4" />
                  Fatores de Risco
                </h5>
                <div className="space-y-2">
                  {forecast.risk_factors.map((risk, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <Badge variant={
                        risk.impact === 'high' ? 'destructive' :
                        risk.impact === 'medium' ? 'default' : 'secondary'
                      } className="mt-0.5">
                        {risk.impact === 'high' ? 'Alto' : risk.impact === 'medium' ? 'Médio' : 'Baixo'}
                      </Badge>
                      <span className="text-sm text-amber-700">{risk.factor}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {forecast.recommendations?.length > 0 && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h5 className="font-semibold text-blue-900 mb-2">Recomendações Estratégicas</h5>
                <ul className="space-y-1">
                  {forecast.recommendations.map((rec, idx) => (
                    <li key={idx} className="text-sm text-blue-700 flex items-start gap-2">
                      <span className="text-blue-600 font-bold mt-0.5">•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}