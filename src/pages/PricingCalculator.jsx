import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calculator, TrendingUp, DollarSign, Percent, Sparkles, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import PredictivePricingAnalysis from '../components/pricing/PredictivePricingAnalysis';

export default function PricingCalculatorPage() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [formData, setFormData] = useState({
    productName: '',
    directCost: '',
    operationalCost: '',
    desiredMargin: '30',
    marketComparison: ''
  });
  const [results, setResults] = useState(null);
  const [aiSuggestion, setAiSuggestion] = useState(null);

  const calculatePrice = () => {
    const directCost = parseFloat(formData.directCost) || 0;
    const operationalCost = parseFloat(formData.operationalCost) || 0;
    const desiredMargin = parseFloat(formData.desiredMargin) || 0;

    const totalCost = directCost + operationalCost;
    const markupMultiplier = 1 / (1 - (desiredMargin / 100));
    const suggestedPrice = totalCost * markupMultiplier;

    // Alternative pricing strategies
    const costPlus = totalCost * 1.5; // 50% markup
    const premiumPrice = totalCost * 2.0; // 100% markup
    const competitivePrice = totalCost * 1.3; // 30% markup

    setResults({
      totalCost,
      suggestedPrice,
      markupMultiplier,
      profitAmount: suggestedPrice - totalCost,
      breakEvenUnits: operationalCost > 0 ? Math.ceil(operationalCost / (suggestedPrice - directCost)) : 0,
      alternatives: {
        costPlus,
        premiumPrice,
        competitivePrice
      }
    });
  };

  const getAISuggestion = async () => {
    if (!formData.productName || !results) {
      toast.error('Preencha os dados e calcule o preço primeiro');
      return;
    }

    setIsAnalyzing(true);
    try {
      const prompt = `Como especialista em precificação, analise:
Produto: ${formData.productName}
Custo Total: R$ ${results.totalCost.toFixed(2)}
Preço Sugerido: R$ ${results.suggestedPrice.toFixed(2)}
Margem Desejada: ${formData.desiredMargin}%
${formData.marketComparison ? `Preços de Mercado: ${formData.marketComparison}` : ''}

Forneça recomendações estratégicas de precificação.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        response_json_schema: {
          type: "object",
          properties: {
            recommended_strategy: { type: "string" },
            optimal_price_range: {
              type: "object",
              properties: {
                min: { type: "number" },
                max: { type: "number" }
              }
            },
            positioning: { type: "string" },
            market_insights: { type: "string" },
            pricing_tactics: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      setAiSuggestion(response);
      toast.success('Análise concluída!');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao gerar sugestão');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
          <Calculator className="w-8 h-8 text-indigo-600" />
          Calculadora de Preços
        </h1>
        <p className="text-slate-500 mt-1">
          Calcule o preço ideal para seus produtos com base em custos e margem desejada
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle>Dados do Produto</CardTitle>
            <CardDescription>Informe os custos e margem desejada</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Produto</Label>
              <Input
                placeholder="Ex: Produto X"
                value={formData.productName}
                onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Custo Direto (R$)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="Matéria-prima, mão de obra direta"
                value={formData.directCost}
                onChange={(e) => setFormData({ ...formData, directCost: e.target.value })}
              />
              <p className="text-xs text-slate-500">
                Custos variáveis que mudam com a produção
              </p>
            </div>

            <div className="space-y-2">
              <Label>Custo Operacional (R$)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="Aluguel, energia, marketing, etc"
                value={formData.operationalCost}
                onChange={(e) => setFormData({ ...formData, operationalCost: e.target.value })}
              />
              <p className="text-xs text-slate-500">
                Custos fixos rateados por unidade
              </p>
            </div>

            <div className="space-y-2">
              <Label>Margem de Lucro Desejada (%)</Label>
              <Input
                type="number"
                step="0.1"
                placeholder="30"
                value={formData.desiredMargin}
                onChange={(e) => setFormData({ ...formData, desiredMargin: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Comparação de Mercado (opcional)</Label>
              <Input
                placeholder="Ex: Concorrente A: R$ 150, B: R$ 180"
                value={formData.marketComparison}
                onChange={(e) => setFormData({ ...formData, marketComparison: e.target.value })}
              />
            </div>

            <Button
              onClick={calculatePrice}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
            >
              <Calculator className="w-4 h-4 mr-2" />
              Calcular Preço
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="space-y-6">
          {results && (
            <>
              <Card className="bg-gradient-to-br from-indigo-50 to-white border-indigo-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-indigo-700">
                    <DollarSign className="w-5 h-5" />
                    Preço Sugerido
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <p className="text-5xl font-bold text-indigo-600 mb-2">
                      R$ {results.suggestedPrice.toFixed(2)}
                    </p>
                    <p className="text-sm text-slate-600 mb-4">
                      Lucro: R$ {results.profitAmount.toFixed(2)} ({formData.desiredMargin}%)
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="p-2 bg-white rounded border">
                        <p className="text-slate-500">Custo Total</p>
                        <p className="font-semibold">R$ {results.totalCost.toFixed(2)}</p>
                      </div>
                      <div className="p-2 bg-white rounded border">
                        <p className="text-slate-500">Markup</p>
                        <p className="font-semibold">{results.markupMultiplier.toFixed(2)}x</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Estratégias Alternativas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                    <div>
                      <p className="text-sm font-medium text-slate-900">Competitivo</p>
                      <p className="text-xs text-slate-500">Margem de 30%</p>
                    </div>
                    <p className="text-lg font-bold text-emerald-700">
                      R$ {results.alternatives.competitivePrice.toFixed(2)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div>
                      <p className="text-sm font-medium text-slate-900">Custo Plus</p>
                      <p className="text-xs text-slate-500">Margem de 50%</p>
                    </div>
                    <p className="text-lg font-bold text-blue-700">
                      R$ {results.alternatives.costPlus.toFixed(2)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <div>
                      <p className="text-sm font-medium text-slate-900">Premium</p>
                      <p className="text-xs text-slate-500">Margem de 100%</p>
                    </div>
                    <p className="text-lg font-bold text-purple-700">
                      R$ {results.alternatives.premiumPrice.toFixed(2)}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {results.breakEvenUnits > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-indigo-600" />
                      Ponto de Equilíbrio
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-slate-900 mb-1">
                      {results.breakEvenUnits} unidades
                    </p>
                    <p className="text-sm text-slate-600">
                      Vendas necessárias para cobrir custos operacionais
                    </p>
                  </CardContent>
                </Card>
              )}

              <Button
                onClick={getAISuggestion}
                disabled={isAnalyzing}
                className="w-full bg-indigo-600 hover:bg-indigo-700"
                variant="outline"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analisando...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Obter Sugestão com IA
                  </>
                )}
              </Button>
            </>
          )}

          {!results && (
            <Card className="bg-slate-50 border-dashed border-2">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Calculator className="w-12 h-12 text-slate-300 mb-3" />
                <p className="text-slate-500">
                  Preencha os dados e clique em "Calcular Preço" para ver os resultados
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Predictive Analysis */}
      {results && (
        <PredictivePricingAnalysis 
          productData={formData}
          results={results}
        />
      )}

      {/* AI Suggestion */}
      {aiSuggestion && (
        <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-indigo-700">
              <Sparkles className="w-5 h-5" />
              Recomendações de IA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-white rounded-lg border">
              <h4 className="font-semibold text-slate-900 mb-2">Estratégia Recomendada</h4>
              <p className="text-sm text-slate-700">{aiSuggestion.recommended_strategy}</p>
            </div>

            {aiSuggestion.optimal_price_range && (
              <div className="p-4 bg-white rounded-lg border">
                <h4 className="font-semibold text-slate-900 mb-2">Faixa de Preço Ideal</h4>
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Mínimo</p>
                    <p className="text-xl font-bold text-slate-900">
                      R$ {aiSuggestion.optimal_price_range.min.toFixed(2)}
                    </p>
                  </div>
                  <div className="flex-1 h-2 bg-gradient-to-r from-emerald-300 to-indigo-500 rounded-full" />
                  <div>
                    <p className="text-xs text-slate-500">Máximo</p>
                    <p className="text-xl font-bold text-slate-900">
                      R$ {aiSuggestion.optimal_price_range.max.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="p-4 bg-white rounded-lg border">
              <h4 className="font-semibold text-slate-900 mb-2">Posicionamento</h4>
              <p className="text-sm text-slate-700">{aiSuggestion.positioning}</p>
            </div>

            <div className="p-4 bg-white rounded-lg border">
              <h4 className="font-semibold text-slate-900 mb-2">Insights de Mercado</h4>
              <p className="text-sm text-slate-700">{aiSuggestion.market_insights}</p>
            </div>

            {aiSuggestion.pricing_tactics?.length > 0 && (
              <div className="p-4 bg-white rounded-lg border">
                <h4 className="font-semibold text-slate-900 mb-3">Táticas de Precificação</h4>
                <ul className="space-y-2">
                  {aiSuggestion.pricing_tactics.map((tactic, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                      <Badge variant="outline" className="mt-0.5">{idx + 1}</Badge>
                      {tactic}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}