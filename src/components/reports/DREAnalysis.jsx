import { InvokeLLM } from '@/api/integrations';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Sparkles, Loader2, TrendingUp, TrendingDown, Wallet, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { subMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function DREAnalysis({ transactions, categories = [], period = 'currentYear' }) {
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

  const calculateDRE = () => {
    // Initialize all tracking objects
    const revenues = {};
    const expenses = {};
    const paymentMethodStats = {};
    let totalDeductions = 0;
    let totalTaxes = 0;

    // Process all transactions
    transactions.forEach(t => {
      // Get category name
      let categoryName = 'Sem Categoria';
      const catId = t.categoryId || t.category;
      
      if (catId) {
        const catObj = categories.find(c => c.id === catId || c.name === catId);
        categoryName = catObj ? catObj.name : (t.category || 'Sem Categoria');
      } else {
        categoryName = t.category || 'Sem Categoria';
      }
      categoryName = categoryName.toString().trim();

      const amount = Math.abs(parseFloat(t.amount || 0));
      const interest = parseFloat(t.interest || 0);
      const totalAmount = amount + interest;

      // Group by payment method
      const method = t.paymentMethod && t.paymentMethod !== '-' ? t.paymentMethod : 'Outros';
      if (!paymentMethodStats[method]) {
        paymentMethodStats[method] = { income: 0, expense: 0, count: 0 };
      }

      if (t.type === 'venda' || t.type === 'income') {
        revenues[categoryName] = (revenues[categoryName] || 0) + totalAmount;
        paymentMethodStats[method].income += totalAmount;
        paymentMethodStats[method].count++;
        
        // Calculate estimated deductions (5% ICMS + PIS + COFINS estimate)
        if (categoryName.toLowerCase() !== 'serviços') {
          totalDeductions += totalAmount * 0.08; // 8% deductions estimate
        }
      } else if (t.type === 'compra' || t.type === 'expense') {
        expenses[categoryName] = (expenses[categoryName] || 0) + totalAmount;
        paymentMethodStats[method].expense += totalAmount;
        paymentMethodStats[method].count++;
      }
    });

    // CONTABILIDADE COMPLETA - DRE STRUCTURE
    const vendaaBruta = Object.values(revenues).reduce((sum, v) => sum + v, 0);
    const deducoes = Math.min(totalDeductions, vendaaBruta * 0.15); // Cap at 15%
    const vendaLiquida = vendaaBruta - deducoes;

    // COGS - Custo das Mercadorias Vendidas
    const custosDiretos = Object.entries(expenses)
      .filter(([cat]) => 
        cat.toLowerCase().includes('custo') || 
        cat.toLowerCase().includes('compra') ||
        cat.toLowerCase().includes('fornecedor') ||
        cat.toLowerCase().includes('mercadoria') ||
        cat.toLowerCase().includes('cogs') ||
        cat.toLowerCase().includes('matéria-prima') ||
        cat.toLowerCase().includes('materia prima')
      )
      .reduce((sum, [, val]) => sum + val, 0);

    const lucrosBruto = vendaLiquida - custosDiretos;
    const margemBruta = vendaLiquida > 0 ? (lucrosBruto / vendaLiquida) * 100 : 0;

    // Despesas Operacionais - categorized
    const despesasVendas = Object.entries(expenses)
      .filter(([cat]) => 
        cat.toLowerCase().includes('venda') || 
        cat.toLowerCase().includes('comissão') ||
        cat.toLowerCase().includes('publicidade') ||
        cat.toLowerCase().includes('marketing') ||
        cat.toLowerCase().includes('propaganda')
      )
      .reduce((sum, [, val]) => sum + val, 0);

    const despesasAdministrativas = Object.entries(expenses)
      .filter(([cat]) => 
        cat.toLowerCase().includes('admin') ||
        cat.toLowerCase().includes('salário') ||
        cat.toLowerCase().includes('folha') ||
        cat.toLowerCase().includes('aluguel') ||
        cat.toLowerCase().includes('utilitário') ||
        cat.toLowerCase().includes('escritório') ||
        cat.toLowerCase().includes('telefone') ||
        cat.toLowerCase().includes('internet') ||
        cat.toLowerCase().includes('água') ||
        cat.toLowerCase().includes('luz') ||
        cat.toLowerCase().includes('energia')
      )
      .reduce((sum, [, val]) => sum + val, 0);

    const outrasOperar = Object.entries(expenses)
      .filter(([cat]) => {
        const lower = cat.toLowerCase();
        return !lower.includes('custo') && 
               !lower.includes('compra') &&
               !lower.includes('fornecedor') &&
               !lower.includes('mercadoria') &&
               !lower.includes('cogs') &&
               !lower.includes('venda') &&
               !lower.includes('comissão') &&
               !lower.includes('publicidade') &&
               !lower.includes('marketing') &&
               !lower.includes('propaganda') &&
               !lower.includes('admin') &&
               !lower.includes('salário') &&
               !lower.includes('folha') &&
               !lower.includes('aluguel') &&
               !lower.includes('utilitário') &&
               !lower.includes('escritório') &&
               !lower.includes('telefone') &&
               !lower.includes('internet') &&
               !lower.includes('água') &&
               !lower.includes('luz') &&
               !lower.includes('energia');
      })
      .reduce((sum, [, val]) => sum + val, 0);

    const totalDespesasOperacionais = despesasVendas + despesasAdministrativas + outrasOperar;

    // Resultado Operacional
    const resultadoOperacional = lucrosBruto - totalDespesasOperacionais;
    const margemOperacional = vendaLiquida > 0 ? (resultadoOperacional / vendaLiquida) * 100 : 0;

    // Impostos estimados
    const impostos = resultadoOperacional > 0 ? resultadoOperacional * 0.27 : 0; // 27% (IR + CSLL estimate)

    // Resultado Líquido
    const resultadoLiquido = resultadoOperacional - impostos;
    const margemLiquida = vendaLiquida > 0 ? (resultadoLiquido / vendaLiquida) * 100 : 0;

    return {
      // Receitas
      vendaBruta,
      deducoes,
      vendaLiquida,
      
      // COGS
      custosDiretos,
      lucrosBruto,
      margemBruta,
      
      // Despesas Operacionais
      despesasVendas,
      despesasAdministrativas,
      outrasOperar,
      totalDespesasOperacionais,
      
      // Resultados
      resultadoOperacional,
      margemOperacional,
      impostos,
      resultadoLiquido,
      margemLiquida,
      
      // Detalhes
      revenues,
      expenses,
      paymentMethodStats,
      despesasOperacionaisDetalhes: Object.entries(expenses)
        .filter(([cat]) => !cat.toLowerCase().includes('custo') && 
                          !cat.toLowerCase().includes('compra') &&
                          !cat.toLowerCase().includes('fornecedor') &&
                          !cat.toLowerCase().includes('mercadoria'))
        .map(([cat, val]) => [cat || 'Sem Categoria', val || 0])
        .sort((a, b) => b[1] - a[1])
    };
  };

  const dre = calculateDRE();

  const generateForecast = async () => {
    setIsAnalyzing(true);
    try {
      const historicalData = [];
      const referenceDate = transactions.length > 0 
        ? new Date(transactions[0].date) 
        : new Date();

      for (let i = 5; i >= 0; i--) {
        const date = subMonths(referenceDate, i);
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

      const prompt = `Atue como um analista financeiro. Analise a DRE CONTÁBIL e gere previsões:
      
      DRE ATUAL (COMPLETA):
      - Venda Bruta: R$ ${dre.vendaBruta.toFixed(2)}
      - Deduções (ICMS/PIS/COFINS): R$ ${dre.deducoes.toFixed(2)}
      - Venda Líquida: R$ ${dre.vendaLiquida.toFixed(2)}
      - CMV (Custo das Mercadorias): R$ ${dre.custosDiretos.toFixed(2)}
      - Lucro Bruto: R$ ${dre.lucrosBruto.toFixed(2)} (${dre.margemBruta.toFixed(1)}%)
      - Despesas Operacionais: R$ ${dre.totalDespesasOperacionais.toFixed(2)}
      - Resultado Operacional: R$ ${dre.resultadoOperacional.toFixed(2)} (${dre.margemOperacional.toFixed(1)}%)
      - Impostos (IR+CSLL): R$ ${dre.impostos.toFixed(2)}
      - Resultado Líquido: R$ ${dre.resultadoLiquido.toFixed(2)} (${dre.margemLiquida.toFixed(1)}%)
      
      HISTÓRICO (6 meses): ${JSON.stringify(historicalData)}
      
      Gere JSON com:
      1. forecast_months: 3 meses (month, venda_bruta, cmv, despesas_operacionais, lucro_liquido_estimado, margem, confidence)
      2. trend_analysis: texto curto sobre a tendência
      3. growth_opportunities: 3-4 oportunidades
      4. risk_factors: 2-3 riscos com impacto
      5. recommendations: 3-4 recomendações`;

      const response = await InvokeLLM(prompt, {
        properties: {
          forecast_months: {
            type: "array",
            items: {
              type: "object",
              properties: {
                month: { type: "string" },
                venda_bruta: { type: "number" },
                cmv: { type: "number" },
                despesas_operacionais: { type: "number" },
                lucro_liquido_estimado: { type: "number" },
                margem: { type: "number" },
                confidence: { type: "string", enum: ["high", "medium", "low"] }
              }
            }
          },
          trend_analysis: { type: "string" },
          growth_opportunities: { type: "array", items: { type: "string" } },
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
          recommendations: { type: "array", items: { type: "string" } }
        }
      });

      setForecast(response);
      toast.success('Previsão contábil gerada com sucesso!');
    } catch (error) {
      toast.error('Erro ao gerar previsão');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              DRE - Demonstração de Resultado do Exercício
            </CardTitle>
            <CardDescription>Análise contábil completa do desempenho financeiro</CardDescription>
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
        {/* ESTRUTURA DRE CONTÁBIL COMPLETA */}
        <div className="space-y-2 text-sm">
          {/* RECEITA */}
          <div className="space-y-1">
            <button 
              onClick={() => toggleSection('revenue')}
              className="w-full flex justify-between items-center p-3 bg-emerald-50 rounded-lg border border-emerald-200 hover:bg-emerald-100 transition-colors font-semibold"
            >
              <div className="flex items-center gap-2">
                {expandedSections.revenue ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <span>Venda Bruta</span>
              </div>
              <span className="text-lg text-emerald-700">
                R$ {dre.vendaBruta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </button>
            
            {expandedSections.revenue && (
              <div className="pl-6 space-y-1">
                <div className="text-xs text-slate-600 mb-2 font-medium">Por Forma de Pagamento:</div>
                {Object.entries(dre.paymentMethodStats)
                  .filter(([, stats]) => stats.income > 0)
                  .sort((a, b) => b[1].income - a[1].income)
                  .map(([method, stats]) => (
                    <div key={method} className="flex justify-between items-center p-2 bg-white rounded border border-emerald-100 text-xs">
                      <span className="text-slate-600">{method}</span>
                      <span className="text-emerald-700 font-medium">R$ {stats.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* DEDUÇÕES */}
          {dre.deducoes > 0 && (
            <div className="space-y-1">
              <button 
                onClick={() => toggleSection('deductions')}
                className="w-full flex justify-between items-center p-3 bg-amber-50 rounded-lg border border-amber-200 hover:bg-amber-100 transition-colors pl-8 font-semibold"
              >
                <div className="flex items-center gap-2">
                  {expandedSections.deductions ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  <span>(-) Deduções (ICMS/PIS/COFINS)</span>
                </div>
                <span className="text-amber-700">R$ {dre.deducoes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </button>
              
              {expandedSections.deductions && (
                <div className="pl-12 space-y-1 text-xs text-slate-600">
                  <div className="p-2 bg-white rounded border border-amber-100">
                    <span>ICMS (aprox 7%) + PIS/COFINS (aprox 1%)</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* RECEITA LÍQUIDA */}
          <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-200 font-semibold">
            <span className="text-blue-900">= Venda Líquida</span>
            <span className="text-lg text-blue-700">
              R$ {dre.vendaLiquida.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* COGS */}
          {dre.custosDiretos > 0 && (
            <div className="space-y-1">
              <button 
                onClick={() => toggleSection('cogs')}
                className="w-full flex justify-between items-center p-3 bg-white rounded-lg border hover:bg-slate-50 transition-colors pl-8 font-semibold"
              >
                <div className="flex items-center gap-2">
                  {expandedSections.cogs ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  <span>(-) CMV (Custo das Mercadorias Vendidas)</span>
                </div>
                <span className="text-slate-900">R$ {dre.custosDiretos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </button>

              {expandedSections.cogs && (
                <div className="pl-12 space-y-1">
                  {Object.entries(dre.expenses)
                    .filter(([cat]) => 
                      cat.toLowerCase().includes('custo') || 
                      cat.toLowerCase().includes('compra') ||
                      cat.toLowerCase().includes('fornecedor') ||
                      cat.toLowerCase().includes('mercadoria') ||
                      cat.toLowerCase().includes('cogs')
                    )
                    .sort((a, b) => b[1] - a[1])
                    .map(([cat, val]) => (
                      <div key={cat} className="flex justify-between items-center p-2 bg-white rounded border border-slate-100 text-xs">
                        <span className="text-slate-600">{cat}</span>
                        <span className="text-slate-900">R$ {val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* LUCRO BRUTO */}
          <div className="flex justify-between items-center p-3 bg-emerald-100 rounded-lg border border-emerald-300 font-bold">
            <span className="text-emerald-900">= Lucro Bruto</span>
            <div className="text-right">
              <span className="text-lg text-emerald-800">
                R$ {dre.lucrosBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              <p className="text-xs text-emerald-700 mt-0.5">({dre.margemBruta.toFixed(1)}%)</p>
            </div>
          </div>

          {/* DESPESAS OPERACIONAIS */}
          {dre.totalDespesasOperacionais > 0 && (
            <div className="space-y-1">
              <button 
                onClick={() => toggleSection('expenses')}
                className="w-full flex justify-between items-center p-3 bg-white rounded-lg border hover:bg-slate-50 transition-colors pl-8 font-semibold"
              >
                <div className="flex items-center gap-2">
                  {expandedSections.expenses ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  <span>(-) Despesas Operacionais</span>
                </div>
                <span className="text-slate-900">R$ {dre.totalDespesasOperacionais.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </button>

              {expandedSections.expenses && (
                <div className="pl-12 space-y-2 text-xs">
                  {dre.despesasVendas > 0 && (
                    <div className="p-2 bg-blue-50 rounded border border-blue-100">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Despesas de Vendas</span>
                        <span className="font-medium">R$ {dre.despesasVendas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  )}
                  {dre.despesasAdministrativas > 0 && (
                    <div className="p-2 bg-purple-50 rounded border border-purple-100">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Despesas Administrativas</span>
                        <span className="font-medium">R$ {dre.despesasAdministrativas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  )}
                  {dre.outrasOperar > 0 && (
                    <div className="p-2 bg-slate-50 rounded border border-slate-100">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Outras Despesas Operacionais</span>
                        <span className="font-medium">R$ {dre.outrasOperar.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* RESULTADO OPERACIONAL */}
          <div className="flex justify-between items-center p-3 bg-blue-100 rounded-lg border border-blue-300 font-bold">
            <span className="text-blue-900">= Resultado Operacional</span>
            <div className="text-right">
              <span className={`text-lg ${dre.resultadoOperacional >= 0 ? 'text-blue-800' : 'text-rose-700'}`}>
                R$ {dre.resultadoOperacional.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              <p className="text-xs text-slate-600 mt-0.5">({dre.margemOperacional.toFixed(1)}%)</p>
            </div>
          </div>

          {/* IMPOSTOS */}
          {dre.impostos > 0 && (
            <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg border border-orange-200 font-semibold">
              <span className="text-orange-900">(-) Impostos (IR+CSLL ~27%)</span>
              <span className="text-orange-700">R$ {dre.impostos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
          )}

          {/* RESULTADO LÍQUIDO FINAL */}
          <div className={`flex justify-between items-center p-4 rounded-lg border-2 font-bold ${dre.resultadoLiquido >= 0 ? 'bg-emerald-50 border-emerald-400' : 'bg-rose-50 border-rose-400'}`}>
            <span className={dre.resultadoLiquido >= 0 ? 'text-emerald-900 text-lg' : 'text-rose-900 text-lg'}>
              = Resultado Líquido
            </span>
            <div className="text-right">
              <span className={`text-2xl ${dre.resultadoLiquido >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                R$ {dre.resultadoLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              <p className={`text-xs mt-0.5 ${dre.resultadoLiquido >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                Margem Líquida: {dre.margemLiquida.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        {/* RESUMO POR FORMA DE PAGAMENTO */}
        <div className="space-y-3 pt-4 border-t">
          <h4 className="font-semibold text-slate-900 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-primary" />
            Resumo Detalhado por Forma de Pagamento
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(dre.paymentMethodStats)
              .sort((a, b) => (b[1].income + b[1].expense) - (a[1].income + a[1].expense))
              .map(([method, stats]) => (
                <div key={method} className="p-4 bg-gradient-to-br from-white to-slate-50 rounded-lg border border-slate-200">
                  <p className="text-sm font-bold text-slate-800 mb-3 border-b pb-2">{method}</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-600">Entradas (Receitas):</span>
                      <span className="font-semibold text-emerald-600">
                        R$ {stats.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-600">Saídas (Despesas):</span>
                      <span className="font-semibold text-rose-600">
                        R$ {stats.expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t text-xs font-bold">
                      <span className="text-slate-700">Saldo Líquido:</span>
                      <span className={stats.income - stats.expense >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                        R$ {(stats.income - stats.expense).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 pt-1">
                      Transações: {stats.count}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* FORECAST */}
        {forecast ? (
          <div className="space-y-6 pt-6 border-t">
            <h4 className="font-semibold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Previsões Contábeis (Próximos 3 Meses)
            </h4>

            {forecast.forecast_months?.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {forecast.forecast_months.map((month, idx) => (
                    <div key={idx} className="p-4 bg-white rounded-lg border">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="font-semibold text-slate-900">{month.month}</h5>
                        <Badge variant={
                          month.confidence === 'high' ? 'default' :
                          month.confidence === 'medium' ? 'secondary' : 'outline'
                        }>
                          {month.confidence === 'high' ? 'Alta' : month.confidence === 'medium' ? 'Média' : 'Baixa'}
                        </Badge>
                      </div>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Venda Bruta</span>
                          <span className="font-medium text-emerald-600">
                            R$ {month.venda_bruta.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">CMV</span>
                          <span className="font-medium text-rose-600">
                            R$ {month.cmv.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Desp. Operacionais</span>
                          <span className="font-medium text-orange-600">
                            R$ {month.despesas_operacionais.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                          </span>
                        </div>
                        <div className="flex justify-between pt-2 border-t font-bold">
                          <span className="text-slate-900">Lucro Líquido</span>
                          <span className={month.lucro_liquido_estimado >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                            R$ {month.lucro_liquido_estimado.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500">
                          Margem: {month.margem.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {forecast.trend_analysis && (
                  <div className="p-4 bg-indigo-50 rounded-lg border border-blue-200">
                    <h5 className="font-semibold text-indigo-900 mb-2">Análise de Tendências</h5>
                    <p className="text-sm text-slate-700">{forecast.trend_analysis}</p>
                  </div>
                )}

                {forecast.growth_opportunities?.length > 0 && (
                  <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                    <h5 className="font-semibold text-emerald-900 mb-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Oportunidades de Crescimento
                    </h5>
                    <ul className="space-y-2">
                      {forecast.growth_opportunities.map((opp, idx) => (
                        <li key={idx} className="text-sm text-emerald-700 flex items-start gap-2">
                          <span className="text-emerald-600 font-bold mt-0.5">•</span>
                          {opp}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {forecast.risk_factors?.length > 0 && (
                  <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                    <h5 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
                      <TrendingDown className="w-4 h-4" />
                      Fatores de Risco
                    </h5>
                    <div className="space-y-2">
                      {forecast.risk_factors.map((risk, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <Badge variant={
                            risk.impact === 'high' ? 'destructive' :
                            risk.impact === 'medium' ? 'default' : 'secondary'
                          } className="mt-0.5 text-xs">
                            {risk.impact === 'high' ? 'Alto' : risk.impact === 'medium' ? 'Médio' : 'Baixo'}
                          </Badge>
                          <span className="text-sm text-amber-700">{risk.factor}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {forecast.recommendations?.length > 0 && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h5 className="font-semibold text-blue-900 mb-3">Recomendações Estratégicas</h5>
                    <ul className="space-y-2">
                      {forecast.recommendations.map((rec, idx) => (
                        <li key={idx} className="text-sm text-blue-700 flex items-start gap-2">
                          <span className="text-blue-600 font-bold mt-0.5">•</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-lg border border-dashed">
                <TrendingUp className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-600">Dados insuficientes para previsão contábil</p>
              </div>
            )}
          </div>
        ) : isAnalyzing && (
          <div className="pt-6 border-t animate-pulse">
            <div className="h-4 w-48 bg-slate-200 rounded mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="h-32 bg-slate-100 rounded" />
              <div className="h-32 bg-slate-100 rounded" />
              <div className="h-32 bg-slate-100 rounded" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
