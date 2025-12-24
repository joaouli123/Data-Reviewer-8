import { InvokeLLM, UploadFile, ExtractDataFromUploadedFile } from '@/api/integrations';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calculator, TrendingUp, DollarSign, Percent, Sparkles, Loader2 } from 'lucide-react';
import { CurrencyInput } from "@/components/ui/currency-input";
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
  const [results, setResults] = useState(null);
  const [aiSuggestion, setAiSuggestion] = useState(null);

  const calculatePrice = () => {
    if (!formData.productName.trim()) {
      toast.error('Nome do produto é obrigatório', { duration: 5000 });
      return;
    }
    const directCost = parseFloat(formData.directCost) || 0;
    const operationalCost = parseFloat(formData.operationalCost) || 0;
    const desiredMargin = parseFloat(formData.desiredMargin) || 0;
    
    if (directCost <= 0 && operationalCost <= 0) {
      toast.error('Informe ao menos um custo válido', { duration: 5000 });
      return;
    }

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
      toast.error('Preencha os dados e calcule o preço primeiro', { duration: 5000 });
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

      const response = await InvokeLLM(prompt, {
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
      });

      setAiSuggestion(response);
      toast.success('Análise concluída!', { duration: 5000 });
    } catch (error) {
      toast.error('Erro ao gerar sugestão', { duration: 5000 });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 sm:p-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-2 flex-wrap">
          <Calculator className="w-6 sm:w-8 h-6 sm:h-8 text-primary" />
          Calculadora de Preços
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Calcule o preço ideal para seus produtos com base em custos e margem desejada
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle>Dados do Produto</CardTitle>
            <CardDescription>Informe os custos e margem desejada</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Produto <span className="text-rose-600">*</span></Label>
              <Input
                placeholder="Ex: Produto X"
                value={formData.productName}
                onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Custo Direto (R$)</Label>
              <CurrencyInput
                placeholder="0,00"
                value={formData.directCost}
                onChange={(e) => setFormData({ ...formData, directCost: e.target.value })}
              />
              <p className="text-xs text-slate-500">
                Custos variáveis que mudam com a produção
              </p>
            </div>

            <div className="space-y-2">
              <Label>Custo Operacional (R$)</Label>
              <CurrencyInput
                placeholder="0,00"
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
              className="w-full"
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
              <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-primary">
                    <DollarSign className="w-5 h-5" />
                    Preço Sugerido
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <p className="text-3xl sm:text-5xl font-bold text-primary mb-2 break-words">
                      R$ {results.suggestedPrice.toFixed(2)}
                    </p>
                    <p className="text-xs sm:text-sm text-slate-600 mb-4">
                      Lucro: R$ {results.profitAmount.toFixed(2)} ({formData.desiredMargin}%)
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
                      <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                        <p className="text-slate-500">Custo Total</p>
                        <p className="font-semibold">R$ {results.totalCost.toFixed(2)}</p>
                      </div>
                      <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
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
                  <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Competitivo</p>
                      <p className="text-xs text-slate-500">Margem de 30%</p>
                    </div>
                    <p className="text-lg font-bold text-emerald-600">
                      R$ {results.alternatives.competitivePrice.toFixed(2)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Custo Plus</p>
                      <p className="text-xs text-slate-500">Margem de 50%</p>
                    </div>
                    <p className="text-lg font-bold text-primary">
                      R$ {results.alternatives.costPlus.toFixed(2)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Premium</p>
                      <p className="text-xs text-slate-500">Margem de 100%</p>
                    </div>
                    <p className="text-lg font-bold text-primary">
                      R$ {results.alternatives.premiumPrice.toFixed(2)}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {results.breakEvenUnits > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-primary" />
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

          <div className="grid grid-cols-1 gap-6">
            <PredictivePricingAnalysis 
              productData={formData}
              results={results}
            />
          </div>

      {/* AI Suggestion */}
      {aiSuggestion && (
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Sparkles className="w-5 h-5" />
              Recomendações de IA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Estratégia Recomendada</h4>
              <p className="text-sm text-slate-700 dark:text-slate-300">{aiSuggestion.recommended_strategy}</p>
            </div>

            {aiSuggestion.optimal_price_range && (
              <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Faixa de Preço Ideal</h4>
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Mínimo</p>
                    <p className="text-xl font-bold text-slate-900">
                      R$ {aiSuggestion.optimal_price_range.min.toFixed(2)}
                    </p>
                  </div>
                  <div className="flex-1 h-2 bg-gradient-to-r from-emerald-300 to-primary rounded-full" />
                  <div>
                    <p className="text-xs text-slate-500">Máximo</p>
                    <p className="text-xl font-bold text-slate-900">
                      R$ {aiSuggestion.optimal_price_range.max.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Posicionamento</h4>
              <p className="text-sm text-slate-700 dark:text-slate-300">{aiSuggestion.positioning}</p>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Insights de Mercado</h4>
              <p className="text-sm text-slate-700 dark:text-slate-300">{aiSuggestion.market_insights}</p>
            </div>

            {aiSuggestion.pricing_tactics?.length > 0 && (
              <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">Táticas de Precificação</h4>
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