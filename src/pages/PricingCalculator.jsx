import { InvokeLLM, UploadFile, ExtractDataFromUploadedFile } from '@/api/integrations';
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePermission } from '@/hooks/usePermission';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calculator, TrendingUp, DollarSign, Percent, Sparkles, Loader2, Shield, Users, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { CurrencyInput } from "@/components/ui/currency-input";
import { toast } from 'sonner';
import PredictivePricingAnalysis from '../components/pricing/PredictivePricingAnalysis';
import { formatCurrency } from '@/utils/formatters';

export default function PricingCalculatorPage() {
  const { user } = useAuth();
  const { hasPermission } = usePermission();
  
  // Check permission for price calculator
  if (!hasPermission('price_calc')) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12">
            <Shield className="w-16 h-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Acesso Negado</h2>
            <p className="text-muted-foreground text-center">
              Você não tem permissão para acessar a Calculadora de Preços
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

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

  // Função para parsear concorrentes do texto
  const parseCompetitors = (text) => {
    if (!text || !text.trim()) return [];
    
    const competitors = [];
    // Padrões: "Nome 150" ou "Nome: R$ 150" ou "Nome R$150" ou "Nome: 150"
    const patterns = [
      /([a-zA-ZÀ-ÿ\s]+?)\s*[:\-]?\s*R?\$?\s*(\d+(?:[.,]\d+)?)/gi,
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const name = match[1].trim();
        const price = parseFloat(match[2].replace(',', '.'));
        if (name && !isNaN(price) && price > 0) {
          competitors.push({ name, price });
        }
      }
    }
    
    return competitors;
  };

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
      breakEvenUnits: operationalCost > 0 ? (suggestedPrice - directCost > 0 ? Math.ceil(operationalCost / (suggestedPrice - directCost)) : 0) : 0,
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
      const hasMarketComparison = formData.marketComparison && formData.marketComparison.trim().length > 0;
      
      const prompt = `Você é um especialista em precificação e estratégia de mercado. Analise os dados abaixo e forneça recomendações estratégicas.

DADOS DO PRODUTO:
- Nome: ${formData.productName}
- Custo Total: R$ ${results.totalCost.toFixed(2)}
- Preço Sugerido (baseado na margem): R$ ${results.suggestedPrice.toFixed(2)}
- Margem Desejada: ${formData.desiredMargin}%
- Lucro por Unidade: R$ ${results.profitAmount.toFixed(2)}
${hasMarketComparison ? `
ANÁLISE COMPETITIVA (PREÇOS DOS CONCORRENTES):
${formData.marketComparison}

Compare o preço sugerido com os concorrentes informados e analise:
1. Como o produto se posiciona em relação à concorrência
2. Se há oportunidade de cobrar mais ou necessidade de reduzir
3. Estratégias específicas para competir nesse mercado` : ''}

REQUISITOS DA RESPOSTA (JSON em português):
1. recommended_strategy: Estratégia principal recomendada (texto detalhado de 2-3 frases)
2. optimal_price_range: Faixa de preço ideal com min e max (números)
3. positioning: Como o produto deve se posicionar no mercado ${hasMarketComparison ? '(considerando os concorrentes)' : ''}
4. market_insights: Insights sobre o mercado e precificação ${hasMarketComparison ? '(análise comparativa com concorrentes)' : ''}
5. pricing_tactics: Array com 3-5 táticas de precificação específicas${hasMarketComparison ? ' para competir' : ''}

Responda APENAS com JSON válido.`;

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

      if (!response || Object.keys(response).length === 0) {
        throw new Error('Resposta da IA vazia');
      }

      // Normalizar resposta (pode vir em português ou inglês)
      const normalized = {
        recommended_strategy: response.recommended_strategy || response.estrategia_recomendada || '',
        optimal_price_range: response.optimal_price_range || response.faixa_preco_ideal || { min: results.suggestedPrice * 0.9, max: results.suggestedPrice * 1.1 },
        positioning: response.positioning || response.posicionamento || '',
        market_insights: response.market_insights || response.insights_mercado || response.analise_mercado || '',
        pricing_tactics: response.pricing_tactics || response.taticas_precificacao || response.taticas || []
      };

      setAiSuggestion(normalized);
      toast.success('Análise concluída!', { duration: 5000 });
    } catch (error) {
      console.error('Erro na análise de IA:', error);
      toast.error('Erro ao gerar sugestão: ' + (error.message || 'Tente novamente'), { duration: 5000 });
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!hasPermission('price_calc')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-4">
        <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mb-4">
          <DollarSign className="w-8 h-8 text-rose-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Acesso Negado</h2>
        <p className="text-slate-500 max-w-md">
          Você não tem permissão para acessar a Calculadora de Preços.
        </p>
      </div>
    );
  }

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
              <p className="text-xs text-slate-500">
                Informe preços de concorrentes para análise comparativa
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                onClick={calculatePrice}
                className="w-full"
              >
                <Calculator className="w-4 h-4 mr-2" />
                Calcular Preço
              </Button>
              
              {results && (
                <Button
                  onClick={getAISuggestion}
                  variant="outline"
                  className="w-full border-blue-200 text-blue-700 hover:bg-blue-50"
                  disabled={isAnalyzing}
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
                      {formData.marketComparison && ' (com concorrentes)'}
                    </>
                  )}
                </Button>
              )}
            </div>
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
                      {formatCurrency(results.suggestedPrice)}
                    </p>
                    <p className="text-xs sm:text-sm text-slate-600 mb-4">
                      Lucro: {formatCurrency(results.profitAmount)} ({formData.desiredMargin}%)
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
                      <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                        <p className="text-slate-500">Custo Total</p>
                        <p className="font-semibold">{formatCurrency(results.totalCost)}</p>
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
                      {formatCurrency(results.alternatives.competitivePrice)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Custo Plus</p>
                      <p className="text-xs text-slate-500">Margem de 50%</p>
                    </div>
                    <p className="text-lg font-bold text-primary">
                      {formatCurrency(results.alternatives.costPlus)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Premium</p>
                      <p className="text-xs text-slate-500">Margem de 100%</p>
                    </div>
                    <p className="text-lg font-bold text-primary">
                      {formatCurrency(results.alternatives.premiumPrice)}
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

              {/* Comparação com Concorrentes */}
              {formData.marketComparison && parseCompetitors(formData.marketComparison).length > 0 && (
                <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2 text-amber-700">
                      <Users className="w-4 h-4" />
                      Comparação com Concorrentes
                    </CardTitle>
                    <CardDescription>
                      Seu preço vs. concorrentes informados
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Seu preço destacado */}
                    <div className="p-3 bg-primary/10 rounded-lg border-2 border-primary">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-primary">SEU PREÇO</p>
                          <p className="text-xs text-slate-500">{formData.productName}</p>
                        </div>
                        <p className="text-xl font-bold text-primary">
                          {formatCurrency(results.suggestedPrice)}
                        </p>
                      </div>
                    </div>

                    {/* Lista de concorrentes */}
                    {parseCompetitors(formData.marketComparison)
                      .sort((a, b) => a.price - b.price)
                      .map((competitor, idx) => {
                        const diff = results.suggestedPrice - competitor.price;
                        const diffPercent = ((diff / competitor.price) * 100).toFixed(0);
                        const isHigher = diff > 0;
                        const isEqual = Math.abs(diff) < 1;
                        
                        return (
                          <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                                isEqual ? 'bg-slate-400' : isHigher ? 'bg-rose-500' : 'bg-emerald-500'
                              }`}>
                                {isEqual ? <Minus className="w-4 h-4" /> : isHigher ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-900">{competitor.name}</p>
                                <p className={`text-xs ${isEqual ? 'text-slate-500' : isHigher ? 'text-rose-600' : 'text-emerald-600'}`}>
                                  {isEqual ? 'Mesmo preço' : isHigher ? `Você está ${Math.abs(diffPercent)}% mais caro` : `Você está ${Math.abs(diffPercent)}% mais barato`}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-slate-700">
                                {formatCurrency(competitor.price)}
                              </p>
                              {!isEqual && (
                                <p className={`text-xs font-medium ${isHigher ? 'text-rose-600' : 'text-emerald-600'}`}>
                                  {isHigher ? '+' : ''}{formatCurrency(diff)}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}

                    {/* Resumo */}
                    {(() => {
                      const competitors = parseCompetitors(formData.marketComparison);
                      const avgPrice = competitors.reduce((sum, c) => sum + c.price, 0) / competitors.length;
                      const minPrice = Math.min(...competitors.map(c => c.price));
                      const maxPrice = Math.max(...competitors.map(c => c.price));
                      
                      return (
                        <div className="mt-4 p-3 bg-slate-100 rounded-lg">
                          <p className="text-xs text-slate-600 mb-2">Resumo do mercado:</p>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div>
                              <p className="text-xs text-slate-500">Menor</p>
                              <p className="text-sm font-bold text-emerald-600">{formatCurrency(minPrice)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500">Média</p>
                              <p className="text-sm font-bold text-amber-600">{formatCurrency(avgPrice)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500">Maior</p>
                              <p className="text-sm font-bold text-rose-600">{formatCurrency(maxPrice)}</p>
                            </div>
                          </div>
                          <div className="mt-2 pt-2 border-t border-slate-200">
                            <p className="text-xs text-center text-slate-600">
                              {results.suggestedPrice < avgPrice 
                                ? `✅ Seu preço está ${((avgPrice - results.suggestedPrice) / avgPrice * 100).toFixed(0)}% abaixo da média`
                                : results.suggestedPrice > avgPrice
                                ? `⚠️ Seu preço está ${((results.suggestedPrice - avgPrice) / avgPrice * 100).toFixed(0)}% acima da média`
                                : '✅ Seu preço está na média do mercado'}
                            </p>
                          </div>
                        </div>
                      );
                    })()}
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
                      {formatCurrency(aiSuggestion.optimal_price_range.min)}
                    </p>
                  </div>
                  <div className="flex-1 h-2 bg-gradient-to-r from-emerald-300 to-primary rounded-full" />
                  <div>
                    <p className="text-xs text-slate-500">Máximo</p>
                    <p className="text-xl font-bold text-slate-900">
                      {formatCurrency(aiSuggestion.optimal_price_range.max)}
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