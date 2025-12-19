import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet, TrendingUp, TrendingDown, AlertTriangle, Sparkles, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { addMonths, format } from 'date-fns';

export default function WorkingCapitalAnalysis({ transactions, saleInstallments, purchaseInstallments }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  const calculateWorkingCapital = () => {
    const now = new Date();
    const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Current Assets (Receivables)
    const currentReceivables = saleInstallments
      .filter(i => !i.paid && new Date(i.due_date) <= next30Days)
      .reduce((sum, i) => sum + i.amount, 0);

    // Current Liabilities (Payables)
    const currentPayables = purchaseInstallments
      .filter(i => !i.paid && new Date(i.due_date) <= next30Days)
      .reduce((sum, i) => sum + i.amount, 0);

    // Working Capital
    const workingCapital = currentReceivables - currentPayables;

    // Average monthly expenses (last 3 months)
    const threeMonthsAgo = addMonths(now, -3);
    const recentExpenses = transactions
      .filter(t => t.type === 'expense' && new Date(t.date) >= threeMonthsAgo)
      .reduce((sum, t) => sum + t.amount, 0);
    const avgMonthlyExpenses = recentExpenses / 3;

    // Recommended working capital (2 months of expenses)
    const recommendedWorkingCapital = avgMonthlyExpenses * 2;

    return {
      currentReceivables,
      currentPayables,
      workingCapital,
      avgMonthlyExpenses,
      recommendedWorkingCapital,
      deficit: Math.max(0, recommendedWorkingCapital - workingCapital),
      surplus: Math.max(0, workingCapital - recommendedWorkingCapital)
    };
  };

  const analyzeWithAI = async () => {
    setIsAnalyzing(true);
    try {
      const wc = calculateWorkingCapital();
      
      const prompt = `Analise a situação de capital de giro:
- Capital de Giro Atual: R$ ${wc.workingCapital.toFixed(2)}
- Contas a Receber (30 dias): R$ ${wc.currentReceivables.toFixed(2)}
- Contas a Pagar (30 dias): R$ ${wc.currentPayables.toFixed(2)}
- Despesas Mensais Médias: R$ ${wc.avgMonthlyExpenses.toFixed(2)}
- Capital de Giro Recomendado: R$ ${wc.recommendedWorkingCapital.toFixed(2)}
- Déficit/Superávit: R$ ${(wc.workingCapital - wc.recommendedWorkingCapital).toFixed(2)}

Forneça recomendações específicas para melhorar a gestão do capital de giro.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        response_json_schema: {
          type: "object",
          properties: {
            assessment: { type: "string" },
            recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  action: { type: "string" },
                  impact: { type: "string" },
                  priority: { type: "string", enum: ["high", "medium", "low"] }
                }
              }
            },
            risk_level: { type: "string", enum: ["low", "medium", "high"] }
          }
        }
      });

      setAnalysis(response);
      toast.success('Análise concluída!');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao analisar capital de giro');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const wc = calculateWorkingCapital();
  const healthStatus = wc.workingCapital >= wc.recommendedWorkingCapital ? 'healthy' : 
                       wc.workingCapital >= wc.recommendedWorkingCapital * 0.7 ? 'warning' : 'critical';

  const statusConfig = {
    healthy: { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Saudável' },
    warning: { color: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Atenção' },
    critical: { color: 'bg-rose-100 text-rose-700 border-rose-200', label: 'Crítico' }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-indigo-600" />
                Análise de Capital de Giro
              </CardTitle>
              <CardDescription>
                Capital necessário para operações do próximo mês
              </CardDescription>
            </div>
            <Button
              onClick={analyzeWithAI}
              disabled={isAnalyzing}
              className="bg-indigo-600 hover:bg-indigo-700"
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
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status Card */}
          <div className={`p-6 rounded-lg border-2 ${statusConfig[healthStatus].color}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Status do Capital de Giro</h3>
              <Badge className={statusConfig[healthStatus].color}>
                {statusConfig[healthStatus].label}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium mb-1">Capital de Giro Atual</p>
                <p className="text-3xl font-bold">
                  R$ {wc.workingCapital.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Recomendado</p>
                <p className="text-3xl font-bold">
                  R$ {wc.recommendedWorkingCapital.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          {/* Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <p className="text-sm font-medium text-emerald-700">Recebimentos (30d)</p>
              </div>
              <p className="text-2xl font-bold text-emerald-700">
                R$ {wc.currentReceivables.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="p-4 bg-rose-50 rounded-lg border border-rose-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-4 h-4 text-rose-600" />
                <p className="text-sm font-medium text-rose-700">Pagamentos (30d)</p>
              </div>
              <p className="text-2xl font-bold text-rose-700">
                R$ {wc.currentPayables.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="w-4 h-4 text-indigo-600" />
                <p className="text-sm font-medium text-indigo-700">Despesa Mensal Média</p>
              </div>
              <p className="text-2xl font-bold text-indigo-700">
                R$ {wc.avgMonthlyExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Deficit/Surplus */}
          {wc.deficit > 0 && (
            <div className="p-4 bg-rose-50 rounded-lg border border-rose-200 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-900 mb-1">Déficit de Capital de Giro</p>
                <p className="text-sm text-rose-700 mb-2">
                  Você precisa de <strong>R$ {wc.deficit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> adicionais 
                  para manter 2 meses de despesas operacionais em caixa.
                </p>
                <p className="text-xs text-rose-600">
                  Recomendamos manter capital de giro equivalente a 2 meses de despesas para garantir liquidez.
                </p>
              </div>
            </div>
          )}

          {wc.surplus > 0 && (
            <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200 flex items-start gap-3">
              <TrendingUp className="w-5 h-5 text-emerald-600 mt-0.5" />
              <div>
                <p className="font-semibold text-emerald-900 mb-1">Superávit de Capital de Giro</p>
                <p className="text-sm text-emerald-700">
                  Você tem <strong>R$ {wc.surplus.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> além do recomendado.
                  Considere investir esse valor para maior rentabilidade.
                </p>
              </div>
            </div>
          )}

          {/* AI Analysis */}
          {analysis && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg border">
                <h4 className="font-semibold text-slate-900 mb-2">Avaliação</h4>
                <p className="text-sm text-slate-700">{analysis.assessment}</p>
              </div>

              <div>
                <h4 className="font-semibold text-slate-900 mb-3">Recomendações</h4>
                <div className="space-y-3">
                  {analysis.recommendations.map((rec, idx) => (
                    <div key={idx} className="p-3 bg-white rounded-lg border">
                      <div className="flex items-start justify-between mb-2">
                        <p className="font-medium text-slate-900">{rec.action}</p>
                        <Badge variant={rec.priority === 'high' ? 'destructive' : rec.priority === 'medium' ? 'default' : 'secondary'}>
                          {rec.priority === 'high' ? 'Alta' : rec.priority === 'medium' ? 'Média' : 'Baixa'}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600">{rec.impact}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}