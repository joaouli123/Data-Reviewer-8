import { InvokeLLM } from '@/api/integrations';
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Sparkles, Loader2, TrendingUp, TrendingDown, Wallet, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

export default function DREAnalysis({ transactions = [], categories = [], period = 'currentYear' }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [forecast, setForecast] = useState(null);
  const [expandedSections, setExpandedSections] = useState({ 
    revenue: false, 
    deductions: false,
    cogs: false,
    expenses: false,
    paymentMethods: false 
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Memoize DRE calculation
  const dre = useMemo(() => {
    try {
      const revenues = {};
      const expenses = {};
      const paymentMethodStats = {};
      let totalDeductions = 0;

      // Ensure transactions is safe array
      const txArray = Array.isArray(transactions) ? transactions : [];
      if (txArray.length === 0) {
        return {
          vendaBruta: 0,
          deducoes: 0,
          vendaLiquida: 0,
          custosDiretos: 0,
          lucrosBruto: 0,
          margemBruta: 0,
          despesasVendas: 0,
          despesasAdministrativas: 0,
          outrasOperar: 0,
          totalDespesasOperacionais: 0,
          resultadoOperacional: 0,
          margemOperacional: 0,
          impostos: 0,
          resultadoLiquido: 0,
          margemLiquida: 0,
          revenues: {},
          expenses: {},
          paymentMethodStats: {}
        };
      }

      txArray.forEach(t => {
        if (!t) return;
        
        let categoryName = 'Sem Categoria';
        const catId = t.categoryId || t.category;
        
        if (catId) {
          const catObj = categories.find(c => c.id === catId || c.name === catId);
          categoryName = catObj ? String(catObj.name || 'Sem Categoria') : String(t.category || 'Sem Categoria');
        } else {
          categoryName = String(t.category || 'Sem Categoria');
        }

        const amount = Math.abs(parseFloat(t.amount || 0));
        const interest = parseFloat(t.interest || 0);
        const totalAmount = amount + interest;

        const method = (t.paymentMethod && t.paymentMethod !== '-') ? String(t.paymentMethod) : 'Outros';
        if (!paymentMethodStats[method]) {
          paymentMethodStats[method] = { income: 0, expense: 0, count: 0 };
        }

        if (t.type === 'venda' || t.type === 'income') {
          revenues[categoryName] = (revenues[categoryName] || 0) + totalAmount;
          paymentMethodStats[method].income += totalAmount;
          paymentMethodStats[method].count++;
          
          if (categoryName.toLowerCase() !== 'serviços') {
            totalDeductions += totalAmount * 0.08;
          }
        } else if (t.type === 'compra' || t.type === 'expense') {
          expenses[categoryName] = (expenses[categoryName] || 0) + totalAmount;
          paymentMethodStats[method].expense += totalAmount;
          paymentMethodStats[method].count++;
        }
      });

      const vendaBruta = Object.values(revenues).reduce((sum, v) => sum + v, 0);
      const deducoes = Math.min(totalDeductions, vendaBruta * 0.15);
      const vendaLiquida = vendaBruta - deducoes;

      const custosDiretos = Object.entries(expenses)
        .filter(([cat]) => {
          const lower = cat.toLowerCase();
          return lower.includes('custo') || lower.includes('compra') || lower.includes('fornecedor') || lower.includes('mercadoria') || lower.includes('cogs');
        })
        .reduce((sum, [, val]) => sum + val, 0);

      const lucrosBruto = vendaLiquida - custosDiretos;
      const margemBruta = vendaLiquida > 0 ? (lucrosBruto / vendaLiquida) * 100 : 0;

      const despesasVendas = Object.entries(expenses)
        .filter(([cat]) => {
          const lower = cat.toLowerCase();
          return lower.includes('venda') || lower.includes('comissão') || lower.includes('publicidade') || lower.includes('marketing');
        })
        .reduce((sum, [, val]) => sum + val, 0);

      const despesasAdministrativas = Object.entries(expenses)
        .filter(([cat]) => {
          const lower = cat.toLowerCase();
          return lower.includes('admin') || lower.includes('salário') || lower.includes('folha') || lower.includes('aluguel') || lower.includes('telefone') || lower.includes('internet') || lower.includes('energia');
        })
        .reduce((sum, [, val]) => sum + val, 0);

      const outrasOperar = Object.entries(expenses)
        .filter(([cat]) => {
          const lower = cat.toLowerCase();
          const excludes = ['custo', 'compra', 'fornecedor', 'mercadoria', 'cogs', 'venda', 'comissão', 'publicidade', 'marketing', 'admin', 'salário', 'folha', 'aluguel', 'telefone', 'internet', 'energia'];
          return !excludes.some(exc => lower.includes(exc));
        })
        .reduce((sum, [, val]) => sum + val, 0);

      const totalDespesasOperacionais = despesasVendas + despesasAdministrativas + outrasOperar;
      const resultadoOperacional = lucrosBruto - totalDespesasOperacionais;
      const margemOperacional = vendaLiquida > 0 ? (resultadoOperacional / vendaLiquida) * 100 : 0;
      const impostos = resultadoOperacional > 0 ? resultadoOperacional * 0.27 : 0;
      const resultadoLiquido = resultadoOperacional - impostos;
      const margemLiquida = vendaLiquida > 0 ? (resultadoLiquido / vendaLiquida) * 100 : 0;

      return {
        vendaBruta,
        deducoes,
        vendaLiquida,
        custosDiretos,
        lucrosBruto,
        margemBruta,
        despesasVendas,
        despesasAdministrativas,
        outrasOperar,
        totalDespesasOperacionais,
        resultadoOperacional,
        margemOperacional,
        impostos,
        resultadoLiquido,
        margemLiquida,
        revenues,
        expenses,
        paymentMethodStats
      };
    } catch (error) {
      console.error('Erro ao calcular DRE:', error);
      return {
        vendaBruta: 0,
        deducoes: 0,
        vendaLiquida: 0,
        custosDiretos: 0,
        lucrosBruto: 0,
        margemBruta: 0,
        despesasVendas: 0,
        despesasAdministrativas: 0,
        outrasOperar: 0,
        totalDespesasOperacionais: 0,
        resultadoOperacional: 0,
        margemOperacional: 0,
        impostos: 0,
        resultadoLiquido: 0,
        margemLiquida: 0,
        revenues: {},
        expenses: {},
        paymentMethodStats: {}
      };
    }
  }, [transactions, categories]);

  const generateForecast = async () => {
    setIsAnalyzing(true);
    try {
      const prompt = `Você é analista financeiro. Analise esta DRE:
      
      Venda Bruta: R$ ${dre.vendaBruta.toFixed(2)}
      Venda Líquida: R$ ${dre.vendaLiquida.toFixed(2)}
      Lucro Bruto: R$ ${dre.lucrosBruto.toFixed(2)} (${dre.margemBruta.toFixed(1)}%)
      Resultado Operacional: R$ ${dre.resultadoOperacional.toFixed(2)}
      Resultado Líquido: R$ ${dre.resultadoLiquido.toFixed(2)} (${dre.margemLiquida.toFixed(1)}%)
      
      Gere um JSON simples com:
      1. forecast_months: array com 3 meses (month, lucro_liquido_estimado, margem)
      2. trend_analysis: string curta sobre tendência
      3. recommendations: array com 2-3 recomendações`;

      const response = await InvokeLLM(prompt, {
        properties: {
          forecast_months: {
            type: "array",
            items: {
              type: "object",
              properties: {
                month: { type: "string" },
                lucro_liquido_estimado: { type: "number" },
                margem: { type: "number" }
              }
            }
          },
          trend_analysis: { type: "string" },
          recommendations: { type: "array", items: { type: "string" } }
        }
      });

      setForecast(response);
      toast.success('Previsão gerada!');
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao gerar previsão');
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!dre || dre.vendaBruta === undefined) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-slate-500">
          Carregando DRE...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              DRE
            </CardTitle>
            <CardDescription>Demonstração de Resultado</CardDescription>
          </div>
          <Button onClick={generateForecast} disabled={isAnalyzing} size="sm">
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
      <CardContent className="space-y-4">
        {/* Receita Bruta */}
        <div>
          <button 
            onClick={() => toggleSection('revenue')}
            className="w-full flex justify-between items-center p-2 bg-emerald-50 rounded border border-emerald-200 hover:bg-emerald-100 transition-colors font-semibold text-sm"
          >
            <div className="flex items-center gap-2">
              {expandedSections.revenue ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <span>Venda Bruta</span>
            </div>
            <span className="text-emerald-700">R$ {dre.vendaBruta.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
          </button>
          {expandedSections.revenue && dre.paymentMethodStats && (
            <div className="pl-4 mt-2 space-y-1">
              {Object.entries(dre.paymentMethodStats)
                .filter(([, stats]) => stats && stats.income > 0)
                .map(([method, stats]) => (
                  <div key={method} className="text-xs flex justify-between">
                    <span>{method}</span>
                    <span>R$ {stats.income.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Deduções */}
        {dre.deducoes > 0 && (
          <div className="flex justify-between items-center p-2 bg-amber-50 rounded border border-amber-200 text-sm">
            <span>Deduções (ICMS/PIS/COFINS)</span>
            <span className="text-amber-700">-R$ {dre.deducoes.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
          </div>
        )}

        {/* Venda Líquida */}
        <div className="flex justify-between items-center p-2 bg-blue-50 rounded border border-blue-200 font-bold text-sm">
          <span>= Venda Líquida</span>
          <span className="text-blue-700">R$ {dre.vendaLiquida.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
        </div>

        {/* CMV */}
        {dre.custosDiretos > 0 && (
          <div className="flex justify-between items-center p-2 bg-slate-50 rounded border text-sm">
            <span>CMV</span>
            <span>-R$ {dre.custosDiretos.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
          </div>
        )}

        {/* Lucro Bruto */}
        <div className="flex justify-between items-center p-2 bg-emerald-100 rounded border border-emerald-300 font-bold text-sm">
          <span>= Lucro Bruto</span>
          <div className="text-right">
            <div className="text-emerald-800">R$ {dre.lucrosBruto.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</div>
            <div className="text-xs text-emerald-700">{dre.margemBruta.toFixed(1)}%</div>
          </div>
        </div>

        {/* Despesas */}
        {dre.totalDespesasOperacionais > 0 && (
          <div className="flex justify-between items-center p-2 bg-slate-50 rounded border text-sm">
            <span>Despesas Operacionais</span>
            <span>-R$ {dre.totalDespesasOperacionais.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
          </div>
        )}

        {/* Resultado Operacional */}
        <div className="flex justify-between items-center p-2 bg-blue-100 rounded border border-blue-300 font-bold text-sm">
          <span>= Resultado Operacional</span>
          <div className="text-right">
            <div className={dre.resultadoOperacional >= 0 ? 'text-blue-800' : 'text-rose-700'}>R$ {dre.resultadoOperacional.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</div>
            <div className="text-xs text-slate-600">{dre.margemOperacional.toFixed(1)}%</div>
          </div>
        </div>

        {/* Impostos */}
        {dre.impostos > 0 && (
          <div className="flex justify-between items-center p-2 bg-orange-50 rounded border border-orange-200 text-sm">
            <span>Impostos (27%)</span>
            <span className="text-orange-700">-R$ {dre.impostos.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
          </div>
        )}

        {/* Resultado Líquido */}
        <div className={`flex justify-between items-center p-3 rounded border-2 font-bold text-sm ${dre.resultadoLiquido >= 0 ? 'bg-emerald-50 border-emerald-400' : 'bg-rose-50 border-rose-400'}`}>
          <span className={dre.resultadoLiquido >= 0 ? 'text-emerald-900' : 'text-rose-900'}>= Resultado Líquido</span>
          <div className="text-right">
            <div className={`text-lg ${dre.resultadoLiquido >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>R$ {dre.resultadoLiquido.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</div>
            <div className={`text-xs ${dre.resultadoLiquido >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{dre.margemLiquida.toFixed(1)}%</div>
          </div>
        </div>

        {/* Forecast */}
        {forecast && forecast.forecast_months && Array.isArray(forecast.forecast_months) && (
          <div className="pt-4 border-t space-y-2">
            <h4 className="font-semibold text-sm">Previsão (3 meses)</h4>
            {forecast.forecast_months.map((month, idx) => (
              <div key={idx} className="text-xs p-2 bg-slate-50 rounded">
                <div className="flex justify-between">
                  <span>{month.month}</span>
                  <span className="font-medium">R$ {(month.lucro_liquido_estimado || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
                </div>
              </div>
            ))}
            {forecast.trend_analysis && (
              <p className="text-xs text-slate-600 italic pt-2">{forecast.trend_analysis}</p>
            )}
          </div>
        )}

        {isAnalyzing && (
          <div className="text-center py-4">
            <div className="inline-block animate-spin">
              <Loader2 className="w-5 h-5" />
            </div>
            <p className="text-sm text-slate-500 mt-2">Gerando análise...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
