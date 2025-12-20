import { InvokeLLM, UploadFile, ExtractDataFromUploadedFile } from '@/api/integrations';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, Target, Loader2 } from 'lucide-react';

import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function PredictivePricingAnalysis({ productData, results }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [predictions, setPredictions] = useState(null);

  const runPredictiveAnalysis = async () => {
    if (!productData.productName || !results) {
      toast.error('Calcule o preço primeiro');
      return;
    }

    setIsAnalyzing(true);
    try {
      const prompt = `Como especialista em precificação preditiva, analise:

Produto: ${productData.productName}
Custo Total: R$ ${results.totalCost.toFixed(2)}
Preço Sugerido: R$ ${results.suggestedPrice.toFixed(2)}
Margem Desejada: ${productData.desiredMargin}%
${productData.marketComparison ? `Comparação de Mercado: ${productData.marketComparison}` : ''}

Crie uma análise preditiva incluindo:
1. Previsão de demanda em diferentes faixas de preço
2. Elasticidade de preço estimada
3. Cenários de volume x margem
4. Ponto ótimo de precificação
5. Risco de cada estratégia`;

      const response = await InvokeLLM(prompt, {
        properties: {
          optimal_price_point: {
            type: "object",
            properties: {
              price: { type: "number" },
              expected_volume: { type: "string" },
              expected_revenue: { type: "number" },
              reasoning: { type: "string" }
            }
          },
          demand_forecast: {
            type: "array",
            items: {
              type: "object",
              properties: {
                price_point: { type: "number" },
                estimated_demand: { type: "string" },
                total_revenue: { type: "number" },
                profit_margin: { type: "number" }
              }
            }
          },
          price_elasticity: {
            type: "object",
            properties: {
              classification: { type: "string", enum: ["elastic", "inelastic", "unitary"] },
              sensitivity: { type: "string" },
              recommendations: { type: "string" }
            }
          },
          pricing_strategies: {
            type: "array",
            items: {
              type: "object",
              properties: {
                strategy: { type: "string" },
                price: { type: "number" },
                expected_outcome: { type: "string" },
                risk_level: { type: "string", enum: ["low", "medium", "high"] }
              }
            }
          },
          market_positioning: { type: "string" }
        }
      });

      setPredictions(response);
      toast.success('Análise preditiva concluída!');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao gerar análise preditiva');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Sparkles className="w-5 h-5" />
              Análise Preditiva de Preços
            </CardTitle>
            <CardDescription>
              Previsão de demanda e otimização de precificação com IA
            </CardDescription>
          </div>
          <Button
            onClick={runPredictiveAnalysis}
            disabled={isAnalyzing || !results}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analisando...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Analisar
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {predictions && (
          <>
            {/* Optimal Price Point */}
            <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-200">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-emerald-700">
                  <Target className="w-5 h-5" />
                  Ponto Ótimo de Precificação
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-4">
                  <p className="text-4xl font-bold text-emerald-600 mb-2">
                    R$ {predictions.optimal_price_point.price.toFixed(2)}
                  </p>
                  <p className="text-sm text-slate-600 mb-1">
                    Volume Esperado: {predictions.optimal_price_point.expected_volume}
                  </p>
                  <p className="text-sm font-semibold text-emerald-700">
                    Receita Projetada: R$ {predictions.optimal_price_point.expected_revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-3 bg-white rounded border">
                  <p className="text-sm text-slate-700">{predictions.optimal_price_point.reasoning}</p>
                </div>
              </CardContent>
            </Card>

            {/* Demand Forecast Chart */}
            {predictions.demand_forecast?.length > 0 && (
              <Card className="bg-slate-50">
                <CardHeader>
                  <CardTitle className="text-base">Previsão de Demanda por Faixa de Preço</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={predictions.demand_forecast}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="price_point" 
                        tickFormatter={(value) => `R$${value}`}
                      />
                      <YAxis />
                      <Tooltip 
                        formatter={(value, name) => {
                          if (name === 'total_revenue') return `R$ ${value.toLocaleString('pt-BR')}`;
                          if (name === 'profit_margin') return `${value}%`;
                          return value;
                        }}
                      />
                      <Legend />
                      <Bar dataKey="total_revenue" fill="#0065BA" name="Receita Total" />
                      <Bar dataKey="profit_margin" fill="#10b981" name="Margem %" />
                    </BarChart>
                  </ResponsiveContainer>
                  
                  <div className="mt-4 space-y-2">
                    {predictions.demand_forecast.map((forecast, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-white rounded border text-sm">
                        <span className="font-medium">R$ {forecast.price_point.toFixed(2)}</span>
                        <span className="text-slate-600">{forecast.estimated_demand}</span>
                        <Badge variant="outline">
                          {forecast.profit_margin.toFixed(1)}% margem
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Price Elasticity */}
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-base text-primary">Elasticidade de Preço</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <Badge className="bg-primary">
                    {predictions.price_elasticity.classification === 'elastic' ? 'Elástico' :
                     predictions.price_elasticity.classification === 'inelastic' ? 'Inelástico' : 'Unitário'}
                  </Badge>
                  <p className="text-sm text-blue-800">{predictions.price_elasticity.sensitivity}</p>
                </div>
                <div className="p-3 bg-white rounded border">
                  <p className="text-sm text-slate-700">{predictions.price_elasticity.recommendations}</p>
                </div>
              </CardContent>
            </Card>

            {/* Pricing Strategies */}
            {predictions.pricing_strategies?.length > 0 && (
              <div>
                <h4 className="font-semibold text-slate-900 mb-3">Estratégias de Precificação</h4>
                <div className="space-y-3">
                  {predictions.pricing_strategies.map((strategy, idx) => {
                    const riskColors = {
                      low: 'bg-emerald-100 text-emerald-700 border-emerald-200',
                      medium: 'bg-amber-100 text-amber-700 border-amber-200',
                      high: 'bg-rose-100 text-rose-700 border-rose-200'
                    };
                    
                    return (
                      <div key={idx} className="p-4 bg-white rounded-lg border hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-2">
                          <h5 className="font-semibold text-slate-900">{strategy.strategy}</h5>
                          <Badge className={riskColors[strategy.risk_level]}>
                            Risco {strategy.risk_level === 'low' ? 'Baixo' : strategy.risk_level === 'medium' ? 'Médio' : 'Alto'}
                          </Badge>
                        </div>
                        <p className="text-2xl font-bold text-primary mb-2">
                          R$ {strategy.price.toFixed(2)}
                        </p>
                        <p className="text-sm text-slate-700">{strategy.expected_outcome}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Market Positioning */}
            <div className="p-4 bg-indigo-50 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-indigo-900 mb-2">Posicionamento de Mercado</h4>
              <p className="text-sm text-primary">{predictions.market_positioning}</p>
            </div>
          </>
        )}

        {!predictions && !isAnalyzing && (
          <div className="text-center py-8 text-slate-500">
            <Sparkles className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-sm">Execute a análise para ver previsões de demanda e recomendações de precificação</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}