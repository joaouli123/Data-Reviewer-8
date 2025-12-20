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
    
    const avgRevenue = recentTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0) / 3;
    
    const avgExpense = recentTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0) / 3;

    let balance = 0;

    for (let i = 1; i <= monthsToProject; i++) {
      const monthDate = addMonths(now, i);
      const monthKey = format(monthDate, 'MMM/yy');
      
      // Project future receivables and payables
      const monthStart = addMonths(now, i - 1);
      const monthEnd = addMonths(now, i);
      
      const futureReceivables = saleInstallments
        .filter(inst => !inst.paid && new Date(inst.due_date) >= monthStart && new Date(inst.due_date) < monthEnd)
        .reduce((sum, inst) => sum + inst.amount, 0);
      
      const futurePayables = purchaseInstallments
        .filter(inst => !inst.paid && new Date(inst.due_date) >= monthStart && new Date(inst.due_date) < monthEnd)
        .reduce((sum, inst) => sum + inst.amount, 0);

      const revenue = futureReceivables > 0 ? futureReceivables : avgRevenue;
      const expense = futurePayables > 0 ? futurePayables : avgExpense;
      
      balance = revenue - expense;
      
      baseline.push({
        month: monthKey,
        revenue,
        expense,
        balance
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

      // Generate scenario data
      const optimistic = baseline.map(m => ({
        month: m.month,
        revenue: m.revenue * (1 + Math.abs(revenueChange)),
        expense: m.expense * (1 - Math.abs(expenseChange) * 0.5),
        balance: 0
      }));
      optimistic.forEach(m => m.balance = m.revenue - m.expense);

      const pessimistic = baseline.map(m => ({
        month: m.month,
        revenue: m.revenue * (1 - Math.abs(revenueChange) * 0.5),
        expense: m.expense * (1 + Math.abs(expenseChange)),
        balance: 0
      }));
      pessimistic.forEach(m => m.balance = m.revenue - m.expense);

      const withChanges = baseline.map(m => ({
        month: m.month,
        revenue: m.revenue * (1 + revenueChange),
        expense: m.expense * (1 + expenseChange),
        balance: 0
      }));
      withChanges.forEach(m => m.balance = m.revenue - m.expense);

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

      setScenarios({
        baseline,
        withChanges,
        optimistic,
        pessimistic,
        analysis: response
      });
      
      toast.success('Análise de cenários concluída!');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao analisar cenários');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-600" />
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
          className="w-full bg-blue-600 hover:bg-blue-700"
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
                  <LineChart>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(value) => `R$${(value/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value) => `R$ ${value}`} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      data={scenarios.baseline} 
                      dataKey="balance" 
                      stroke="#64748b" 
                      name="Base"
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      data={scenarios.withChanges} 
                      dataKey="balance" 
                      stroke="#6366f1" 
                      name="Com Alterações"
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      data={scenarios.optimistic} 
                      dataKey="balance" 
                      stroke="#10b981" 
                      name="Otimista"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                    />
                    <Line 
                      type="monotone" 
                      data={scenarios.pessimistic} 
                      dataKey="balance" 
                      stroke="#ef4444" 
                      name="Pessimista"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* AI Analysis */}
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-900">Análise dos Cenários</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-lg border">
                  <h4 className="font-medium text-slate-900 mb-2">Cenário Base</h4>
                  <p className="text-sm text-slate-700">{scenarios.analysis.scenario_analysis.base_case}</p>
                </div>
                
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-2">Com Alterações</h4>
                  <p className="text-sm text-blue-700">{scenarios.analysis.scenario_analysis.with_changes}</p>
                </div>

                <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                  <h4 className="font-medium text-emerald-900 mb-2">Cenário Otimista</h4>
                  <p className="text-sm text-emerald-700">{scenarios.analysis.scenario_analysis.optimistic}</p>
                </div>

                <div className="p-4 bg-rose-50 rounded-lg border border-rose-200">
                  <h4 className="font-medium text-rose-900 mb-2">Cenário Pessimista</h4>
                  <p className="text-sm text-rose-700">{scenarios.analysis.scenario_analysis.pessimistic}</p>
                </div>
              </div>

              {/* Key Risks */}
              {scenarios.analysis.key_risks?.length > 0 && (
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
              {scenarios.analysis.recommendations?.length > 0 && (
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
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-2">Impacto no Fluxo de Caixa</h4>
                <p className="text-sm text-blue-700">{scenarios.analysis.cash_flow_impact}</p>
              </div>
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