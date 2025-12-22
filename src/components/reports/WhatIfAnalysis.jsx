import { InvokeLLM, UploadFile, ExtractDataFromUploadedFile } from '@/api/integrations';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, TrendingDown, AlertTriangle, Loader2, Play } from 'lucide-react';

import { toast } from 'sonner';
import { addMonths, format } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function WhatIfAnalysis({ transactions, saleInstallments, purchaseInstallments }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scenarios, setScenarios] = useState(null);
  const [scenarioInputs, setScenarioInputs] = useState({
    revenueIncrease: '0',
    expenseIncrease: '0',
    receivableDelay: '0',
    payableDelay: '0'
  });

  const calculateBaselineScenario = () => {
    const now = new Date();
    const monthsToProject = 6;
    const baseline = [];

    // Calculate average monthly revenue and expenses (last 3 months)
    const threeMonthsAgo = addMonths(now, -3);
    const recentTransactions = transactions.filter(t => new Date(t.date) >= threeMonthsAgo);
    
    // Corrigido: usar tipos corretos 'venda' e 'compra'
    const totalRevenue = recentTransactions
      .filter(t => t.type === 'venda' || t.type === 'income')
      .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount || 0)), 0);
    
    const totalExpense = recentTransactions
      .filter(t => t.type === 'compra' || t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount || 0)), 0);

    const avgRevenue = totalRevenue / 3 || 0;
    const avgExpense = totalExpense / 3 || 0;

    let cumulativeBalance = 0;

    for (let i = 1; i <= monthsToProject; i++) {
      const monthDate = addMonths(now, i);
      const monthKey = format(monthDate, 'MMM/yy');
      
      // Project future receivables and payables
      const monthStart = addMonths(now, i - 1);
      const monthEnd = addMonths(now, i);
      
      const futureReceivables = saleInstallments && Array.isArray(saleInstallments)
        ? saleInstallments
            .filter(inst => inst && !inst.paid && inst.due_date && new Date(inst.due_date) >= monthStart && new Date(inst.due_date) < monthEnd)
            .reduce((sum, inst) => sum + (inst.amount || 0), 0)
        : 0;
      
      const futurePayables = purchaseInstallments && Array.isArray(purchaseInstallments)
        ? purchaseInstallments
            .filter(inst => inst && !inst.paid && inst.due_date && new Date(inst.due_date) >= monthStart && new Date(inst.due_date) < monthEnd)
            .reduce((sum, inst) => sum + (inst.amount || 0), 0)
        : 0;

      const monthRevenue = futureReceivables > 0 ? futureReceivables : avgRevenue;
      const monthExpense = futurePayables > 0 ? futurePayables : avgExpense;
      
      const monthBalance = monthRevenue - monthExpense;
      cumulativeBalance += monthBalance;
      
      baseline.push({
        month: monthKey,
        revenue: monthRevenue,
        expense: monthExpense,
        balance: monthBalance,
        cumulativeBalance
      });
    }

    return { baseline, avgRevenue, avgExpense };
  };

  const runScenarioAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const { baseline, avgRevenue, avgExpense } = calculateBaselineScenario();
      
      const revenueChange = parseFloat(scenarioInputs.revenueIncrease) / 100;
      const expenseChange = parseFloat(scenarioInputs.expenseIncrease) / 100;
      const receivableDelay = parseInt(scenarioInputs.receivableDelay) || 0;
      const payableDelay = parseInt(scenarioInputs.payableDelay) || 0;

      // Generate scenario data with cumulative balance
      let cumulativeOpt = 0, cumulativePess = 0, cumulativeWith = 0;
      
      const optimistic = baseline.map(m => {
        const revenue = m.revenue * (1 + Math.abs(revenueChange));
        const expense = m.expense * (1 - Math.abs(expenseChange) * 0.5);
        const balance = revenue - expense;
        cumulativeOpt += balance;
        return { month: m.month, revenue, expense, balance, cumulativeBalance: cumulativeOpt };
      });

      const pessimistic = baseline.map(m => {
        const revenue = m.revenue * (1 - Math.abs(revenueChange) * 0.5);
        const expense = m.expense * (1 + Math.abs(expenseChange));
        const balance = revenue - expense;
        cumulativePess += balance;
        return { month: m.month, revenue, expense, balance, cumulativeBalance: cumulativePess };
      });

      const withChanges = baseline.map(m => {
        const revenue = m.revenue * (1 + revenueChange);
        const expense = m.expense * (1 + expenseChange);
        const balance = revenue - expense;
        cumulativeWith += balance;
        return { month: m.month, revenue, expense, balance, cumulativeBalance: cumulativeWith };
      });

      // Use AI to analyze scenarios
      const prompt = `Analise os seguintes cenários de fluxo de caixa para os próximos 6 meses:

Cenário Base: ${JSON.stringify(baseline)}
Cenário com Alterações (${scenarioInputs.revenueIncrease}% receita, ${scenarioInputs.expenseIncrease}% despesa): ${JSON.stringify(withChanges)}
Cenário Otimista: ${JSON.stringify(optimistic)}
Cenário Pessimista: ${JSON.stringify(pessimistic)}

Atraso Recebimentos: ${receivableDelay} dias
Atraso Pagamentos: ${payableDelay} dias

Forneça análise detalhada e recomendações estratégicas.`;

      const response = await InvokeLLM(prompt, {
        properties: {
          scenario_analysis: {
            type: "object",
            properties: {
              base_case: { type: "string" },
              with_changes: { type: "string" },
              optimistic: { type: "string" },
              pessimistic: { type: "string" }
            }
          },
          key_risks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                risk: { type: "string" },
                probability: { type: "string", enum: ["high", "medium", "low"] },
                impact: { type: "string" }
              }
            }
          },
          recommendations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                action: { type: "string" },
                scenario: { type: "string" },
                priority: { type: "string", enum: ["critical", "high", "medium", "low"] }
              }
            }
          },
          cash_flow_impact: { type: "string" }
        }
      });

      // Garantir que a resposta tenha a estrutura esperada para evitar tela branca
      const safeAnalysis = {
        scenario_analysis: {
          base_case: response?.scenario_analysis?.base_case || response?.base_case || "Análise indisponível",
          with_changes: response?.scenario_analysis?.with_changes || response?.with_changes || "Análise indisponível",
          optimistic: response?.scenario_analysis?.optimistic || response?.optimistic || "Análise indisponível",
          pessimistic: response?.scenario_analysis?.pessimistic || response?.pessimistic || "Análise indisponível"
        },
        key_risks: response?.key_risks || [],
        recommendations: response?.recommendations || [],
        cash_flow_impact: response?.cash_flow_impact || ""
      };

      setScenarios({
        baseline,
        withChanges,
        optimistic,
        pessimistic,
        analysis: safeAnalysis
      });
      
      toast.success('Análise de cenários concluída!');
    } catch (error) {
      toast.error('Erro ao analisar cenários');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Análise Preditiva "What-If"
        </CardTitle>
        <CardDescription>
          Simule diferentes cenários e veja o impacto no seu fluxo de caixa
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Scenario Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Variação na Receita (%)</Label>
            <Input
              type="number"
              step="0.1"
              placeholder="Ex: 10 (aumento) ou -10 (redução)"
              value={scenarioInputs.revenueIncrease}
              onChange={(e) => setScenarioInputs({ ...scenarioInputs, revenueIncrease: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Variação nas Despesas (%)</Label>
            <Input
              type="number"
              step="0.1"
              placeholder="Ex: 5 (aumento) ou -5 (redução)"
              value={scenarioInputs.expenseIncrease}
              onChange={(e) => setScenarioInputs({ ...scenarioInputs, expenseIncrease: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Atraso em Recebimentos (dias)</Label>
            <Input
              type="number"
              placeholder="Ex: 15"
              value={scenarioInputs.receivableDelay}
              onChange={(e) => setScenarioInputs({ ...scenarioInputs, receivableDelay: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Atraso em Pagamentos (dias)</Label>
            <Input
              type="number"
              placeholder="Ex: 10"
              value={scenarioInputs.payableDelay}
              onChange={(e) => setScenarioInputs({ ...scenarioInputs, payableDelay: e.target.value })}
            />
          </div>
        </div>

        <Button
          onClick={runScenarioAnalysis}
          disabled={isAnalyzing}
          className="w-full bg-primary hover:bg-primary"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processando Cenários...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Executar Análise
            </>
          )}
        </Button>

        {/* Results */}
        {scenarios && (
          <div className="space-y-6">
            {/* Chart Comparison */}
            <Card className="bg-slate-50">
              <CardHeader>
                <CardTitle className="text-base">Comparação de Cenários</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={scenarios.baseline}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(value) => `R$${(value/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="cumulativeBalance" 
                      stroke="#64748b" 
                      name="Base (Acumulado)"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
                
                <div className="mt-4 space-y-3">
                  <div className="text-sm font-medium text-slate-700">Resumo dos Cenários (Último Mês):</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div className="p-2 bg-slate-50 rounded border text-xs">
                      <p className="text-slate-600">Base</p>
                      <p className="font-bold text-slate-900">
                        R$ {(scenarios.baseline[scenarios.baseline.length - 1]?.cumulativeBalance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="p-2 bg-indigo-50 rounded border text-xs">
                      <p className="text-indigo-600">Com Alterações</p>
                      <p className="font-bold text-indigo-900">
                        R$ {(scenarios.withChanges[scenarios.withChanges.length - 1]?.cumulativeBalance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="p-2 bg-emerald-50 rounded border text-xs">
                      <p className="text-emerald-600">Otimista</p>
                      <p className="font-bold text-emerald-900">
                        R$ {(scenarios.optimistic[scenarios.optimistic.length - 1]?.cumulativeBalance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="p-2 bg-rose-50 rounded border text-xs">
                      <p className="text-rose-600">Pessimista</p>
                      <p className="font-bold text-rose-900">
                        R$ {(scenarios.pessimistic[scenarios.pessimistic.length - 1]?.cumulativeBalance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI Analysis */}
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-900">Análise dos Cenários</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-lg border">
                  <h4 className="font-medium text-slate-900 mb-2">Cenário Base</h4>
                  <p className="text-sm text-slate-700">{scenarios.analysis?.scenario_analysis?.base_case || "Análise indisponível"}</p>
                </div>
                
                <div className="p-4 bg-indigo-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-indigo-900 mb-2">Com Alterações</h4>
                  <p className="text-sm text-primary">{scenarios.analysis?.scenario_analysis?.with_changes || "Análise indisponível"}</p>
                </div>

                <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                  <h4 className="font-medium text-emerald-900 mb-2">Cenário Otimista</h4>
                  <p className="text-sm text-emerald-700">{scenarios.analysis?.scenario_analysis?.optimistic || "Análise indisponível"}</p>
                </div>

                <div className="p-4 bg-rose-50 rounded-lg border border-rose-200">
                  <h4 className="font-medium text-rose-900 mb-2">Cenário Pessimista</h4>
                  <p className="text-sm text-rose-700">{scenarios.analysis?.scenario_analysis?.pessimistic || "Análise indisponível"}</p>
                </div>
              </div>

              {/* Key Risks */}
              {scenarios.analysis?.key_risks?.length > 0 && (
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <h4 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Principais Riscos
                  </h4>
                  <div className="space-y-2">
                    {scenarios.analysis.key_risks.map((risk, idx) => (
                      <div key={idx} className="flex items-start gap-3 bg-white p-3 rounded border">
                        <Badge variant={
                          risk.probability === 'high' ? 'destructive' :
                          risk.probability === 'medium' ? 'default' : 'secondary'
                        }>
                          {risk.probability === 'high' ? 'Alta' : risk.probability === 'medium' ? 'Média' : 'Baixa'}
                        </Badge>
                        <div className="flex-1">
                          <p className="font-medium text-slate-900 text-sm">{risk.risk}</p>
                          <p className="text-xs text-slate-600 mt-1">{risk.impact}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {scenarios.analysis?.recommendations?.length > 0 && (
                <div>
                  <h4 className="font-semibold text-slate-900 mb-3">Recomendações Estratégicas</h4>
                  <div className="space-y-2">
                    {scenarios.analysis.recommendations.map((rec, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 bg-white rounded-lg border">
                        <Badge variant={
                          rec.priority === 'critical' ? 'destructive' :
                          rec.priority === 'high' ? 'default' : 'secondary'
                        }>
                          {rec.priority === 'critical' ? 'Crítico' :
                           rec.priority === 'high' ? 'Alta' :
                           rec.priority === 'medium' ? 'Média' : 'Baixa'}
                        </Badge>
                        <div className="flex-1">
                          <p className="font-medium text-slate-900 text-sm mb-1">{rec.action}</p>
                          <p className="text-xs text-slate-500">Para: {rec.scenario}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Impact Summary */}
              {scenarios.analysis?.cash_flow_impact && (
                <div className="p-4 bg-indigo-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-indigo-900 mb-2">Impacto no Fluxo de Caixa</h4>
                  <p className="text-sm text-primary">{scenarios.analysis.cash_flow_impact}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {!scenarios && (
          <div className="text-center py-8 text-slate-500">
            <p className="text-sm">Configure os parâmetros acima e execute a análise para ver os cenários preditivos</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}