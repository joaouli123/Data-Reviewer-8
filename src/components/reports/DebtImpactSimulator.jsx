import { InvokeLLM, UploadFile, ExtractDataFromUploadedFile } from '@/api/integrations';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Sparkles, TrendingDown, Loader2, Calculator } from 'lucide-react';

import { toast } from 'sonner';
import { addMonths } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function DebtImpactSimulator({ currentMetrics }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [simulation, setSimulation] = useState(null);
  const [newDebtInputs, setNewDebtInputs] = useState({
    debtAmount: '',
    installments: '12',
    interestRate: '0',
    purposeDescription: ''
  });

  const simulateNewDebt = async () => {
    const debtAmount = parseFloat(newDebtInputs.debtAmount);
    const installments = parseInt(newDebtInputs.installments);
    const interestRate = parseFloat(newDebtInputs.interestRate) / 100;

    if (!debtAmount || !installments) {
      toast.error('Preencha o valor e número de parcelas');
      return;
    }

    setIsAnalyzing(true);
    try {
      // Calculate monthly payment with interest
      const monthlyRate = interestRate / 12;
      const monthlyPayment = monthlyRate > 0 
        ? debtAmount * (monthlyRate * Math.pow(1 + monthlyRate, installments)) / (Math.pow(1 + monthlyRate, installments) - 1)
        : debtAmount / installments;

      const totalPayment = monthlyPayment * installments;
      const totalInterest = totalPayment - debtAmount;

      // Project impact over time
      const projections = [];
      let cumulativeDebt = currentMetrics.totalDebt + debtAmount;
      
      for (let i = 0; i <= installments; i++) {
        const monthsFromNow = i;
        const paidInstallments = i;
        const remainingDebt = debtAmount - (monthlyPayment * paidInstallments - totalInterest * (paidInstallments / installments));
        
        projections.push({
          month: `Mês ${i}`,
          currentDebt: currentMetrics.totalDebt,
          projectedDebt: currentMetrics.totalDebt + Math.max(0, remainingDebt),
          monthlyPayment: i > 0 && i <= installments ? monthlyPayment : 0,
          debtServiceRatio: ((currentMetrics.monthlyDebtPayment + (i > 0 && i <= installments ? monthlyPayment : 0)) / currentMetrics.avgMonthlyRevenue * 100)
        });
      }

      // AI Analysis
      const prompt = `Analise o impacto de uma nova dívida:

Situação Atual:
- Dívida Total: R$ ${currentMetrics.totalDebt.toFixed(2)}
- Receita Mensal Média: R$ ${currentMetrics.avgMonthlyRevenue.toFixed(2)}
- Pagamento Mensal de Dívidas: R$ ${currentMetrics.monthlyDebtPayment.toFixed(2)}
- Índice de Cobertura: ${currentMetrics.debtServiceRatio.toFixed(1)}%

Nova Dívida Proposta:
- Valor: R$ ${debtAmount.toFixed(2)}
- Parcelas: ${installments}
- Taxa de Juros: ${(interestRate * 100).toFixed(2)}%
- Pagamento Mensal: R$ ${monthlyPayment.toFixed(2)}
- Total a Pagar: R$ ${totalPayment.toFixed(2)}
- Total em Juros: R$ ${totalInterest.toFixed(2)}
- Propósito: ${newDebtInputs.purposeDescription || 'Não especificado'}

Novo Índice de Cobertura: ${((currentMetrics.monthlyDebtPayment + monthlyPayment) / currentMetrics.avgMonthlyRevenue * 100).toFixed(1)}%

Forneça análise detalhada do impacto e recomendações.`;

      const response = await InvokeLLM(prompt, {
        properties: {
          viability_assessment: {
            type: "object",
            properties: {
              recommendation: { type: "string", enum: ["recommended", "caution", "not_recommended"] },
              reasoning: { type: "string" },
              score: { type: "number", description: "0-100" }
            }
          },
          financial_impact: {
            type: "object",
            properties: {
              cash_flow_impact: { type: "string" },
              liquidity_impact: { type: "string" },
              leverage_impact: { type: "string" }
            }
          },
          risk_analysis: {
            type: "array",
            items: {
              type: "object",
              properties: {
                risk_factor: { type: "string" },
                severity: { type: "string", enum: ["high", "medium", "low"] },
                mitigation: { type: "string" }
              }
            }
          },
          alternative_suggestions: {
            type: "array",
            items: { type: "string" }
          },
          break_even_analysis: { type: "string" }
        }
      });

      setSimulation({
        inputs: {
          debtAmount,
          installments,
          interestRate: interestRate * 100,
          monthlyPayment,
          totalPayment,
          totalInterest
        },
        projections,
        analysis: response
      });

      toast.success('Simulação concluída!');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao simular impacto');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Card className="border-rose-200 bg-gradient-to-br from-rose-50 to-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-rose-700">
          <AlertCircle className="w-5 h-5" />
          Simulador de Impacto de Novas Dívidas
        </CardTitle>
        <CardDescription>
          Avalie o impacto financeiro antes de assumir novas obrigações
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Valor da Dívida (R$)</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="50000"
              value={newDebtInputs.debtAmount}
              onChange={(e) => setNewDebtInputs({ ...newDebtInputs, debtAmount: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Número de Parcelas</Label>
            <Input
              type="number"
              placeholder="12"
              value={newDebtInputs.installments}
              onChange={(e) => setNewDebtInputs({ ...newDebtInputs, installments: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Taxa de Juros Anual (%)</Label>
            <Input
              type="number"
              step="0.1"
              placeholder="12.5"
              value={newDebtInputs.interestRate}
              onChange={(e) => setNewDebtInputs({ ...newDebtInputs, interestRate: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Propósito (opcional)</Label>
            <Input
              placeholder="Ex: Expansão, equipamento"
              value={newDebtInputs.purposeDescription}
              onChange={(e) => setNewDebtInputs({ ...newDebtInputs, purposeDescription: e.target.value })}
            />
          </div>
        </div>

        <Button
          onClick={simulateNewDebt}
          disabled={isAnalyzing}
          className="w-full bg-rose-600 hover:bg-rose-700"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Simulando...
            </>
          ) : (
            <>
              <Calculator className="w-4 h-4 mr-2" />
              Simular Impacto
            </>
          )}
        </Button>

        {/* Results */}
        {simulation && (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-white rounded-lg border">
                <p className="text-sm text-slate-600 mb-1">Pagamento Mensal</p>
                <p className="text-2xl font-bold text-slate-900">
                  R$ {simulation.inputs.monthlyPayment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="p-4 bg-white rounded-lg border">
                <p className="text-sm text-slate-600 mb-1">Total com Juros</p>
                <p className="text-2xl font-bold text-slate-900">
                  R$ {simulation.inputs.totalPayment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="p-4 bg-white rounded-lg border">
                <p className="text-sm text-slate-600 mb-1">Total em Juros</p>
                <p className="text-2xl font-bold text-rose-600">
                  R$ {simulation.inputs.totalInterest.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {/* Viability Assessment */}
            <Card className={
              simulation.analysis.viability_assessment.recommendation === 'recommended' 
                ? 'bg-emerald-50 border-emerald-200' 
                : simulation.analysis.viability_assessment.recommendation === 'caution'
                ? 'bg-amber-50 border-amber-200'
                : 'bg-rose-50 border-rose-200'
            }>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Avaliação de Viabilidade</span>
                  <Badge className={
                    simulation.analysis.viability_assessment.recommendation === 'recommended'
                      ? 'bg-emerald-600'
                      : simulation.analysis.viability_assessment.recommendation === 'caution'
                      ? 'bg-amber-600'
                      : 'bg-rose-600'
                  }>
                    Score: {simulation.analysis.viability_assessment.score}/100
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  {simulation.analysis.viability_assessment.reasoning}
                </p>
              </CardContent>
            </Card>

            {/* Projection Chart */}
            <Card className="bg-slate-50">
              <CardHeader>
                <CardTitle className="text-base">Projeção de Endividamento</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={simulation.projections}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(value) => `R$${(value/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
                    <Legend />
                    <Line type="monotone" dataKey="currentDebt" stroke="#64748b" name="Dívida Atual" strokeWidth={2} />
                    <Line type="monotone" dataKey="projectedDebt" stroke="#ef4444" name="Dívida Projetada" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Financial Impact */}
            <div className="space-y-3">
              <h4 className="font-semibold text-slate-900">Impacto Financeiro</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 bg-white rounded-lg border">
                  <p className="text-xs font-medium text-slate-600 mb-1">Fluxo de Caixa</p>
                  <p className="text-sm text-slate-700">{simulation.analysis.financial_impact.cash_flow_impact}</p>
                </div>
                <div className="p-3 bg-white rounded-lg border">
                  <p className="text-xs font-medium text-slate-600 mb-1">Liquidez</p>
                  <p className="text-sm text-slate-700">{simulation.analysis.financial_impact.liquidity_impact}</p>
                </div>
                <div className="p-3 bg-white rounded-lg border">
                  <p className="text-xs font-medium text-slate-600 mb-1">Alavancagem</p>
                  <p className="text-sm text-slate-700">{simulation.analysis.financial_impact.leverage_impact}</p>
                </div>
              </div>
            </div>

            {/* Risk Analysis */}
            {simulation.analysis.risk_analysis?.length > 0 && (
              <div>
                <h4 className="font-semibold text-slate-900 mb-3">Análise de Riscos</h4>
                <div className="space-y-2">
                  {simulation.analysis.risk_analysis.map((risk, idx) => (
                    <div key={idx} className="p-3 bg-white rounded-lg border">
                      <div className="flex items-start justify-between mb-2">
                        <p className="font-medium text-slate-900 text-sm">{risk.risk_factor}</p>
                        <Badge variant={
                          risk.severity === 'high' ? 'destructive' :
                          risk.severity === 'medium' ? 'default' : 'secondary'
                        }>
                          {risk.severity === 'high' ? 'Alto' : risk.severity === 'medium' ? 'Médio' : 'Baixo'}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-600">
                        <strong>Mitigação:</strong> {risk.mitigation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Alternative Suggestions */}
            {simulation.analysis.alternative_suggestions?.length > 0 && (
              <div className="p-4 bg-indigo-50 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-indigo-900 mb-2">Alternativas Sugeridas</h4>
                <ul className="space-y-1">
                  {simulation.analysis.alternative_suggestions.map((suggestion, idx) => (
                    <li key={idx} className="text-sm text-primary flex items-start gap-2">
                      <span className="text-primary font-bold mt-0.5">•</span>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Break Even */}
            <div className="p-4 bg-slate-50 rounded-lg border">
              <h4 className="font-semibold text-slate-900 mb-2">Análise de Ponto de Equilíbrio</h4>
              <p className="text-sm text-slate-700">{simulation.analysis.break_even_analysis}</p>
            </div>
          </div>
        )}

        {!simulation && (
          <div className="text-center py-8 text-slate-500">
            <p className="text-sm">Configure os dados da nova dívida e simule o impacto no seu negócio</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}