import { InvokeLLM, UploadFile, ExtractDataFromUploadedFile } from '@/api/integrations';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet, TrendingUp, TrendingDown, AlertTriangle, Sparkles, Loader2 } from 'lucide-react';

import { toast } from 'sonner';
import { addMonths, format } from 'date-fns';

export default function WorkingCapitalAnalysis({ transactions, saleInstallments, purchaseInstallments, dateRange }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  const calculateWorkingCapital = () => {
    // Use ONLY filtered transactions (already filtered by dateRange)
    const vendas = Array.isArray(transactions)
      ? transactions.filter(t => t.type === 'venda' || t.type === 'income')
      : [];
    
    const compras = Array.isArray(transactions)
      ? transactions.filter(t => t.type === 'compra' || t.type === 'expense')
      : [];

    // Receivables = sum of all revenue in the period
    const currentReceivables = vendas.reduce((sum, t) => {
      const amount = Math.abs(parseFloat(t.amount || 0));
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);

    // Payables = sum of all expenses in the period
    const currentPayables = compras.reduce((sum, t) => {
      const amount = Math.abs(parseFloat(t.amount || 0));
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);

    // Working Capital = Receivables - Payables
    const workingCapital = currentReceivables - currentPayables;

    // Average monthly expenses
    const startDate = new Date(dateRange?.startDate);
    const endDate = new Date(dateRange?.endDate);
    const daysInPeriod = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    const monthsInPeriod = Math.max(1, Math.round(daysInPeriod / 30));
    const avgMonthlyExpenses = currentPayables / monthsInPeriod;

    // Recommended working capital (2 months of expenses as buffer)
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
      
      const prompt = `Você é um analista financeiro. Analise a situação de capital de giro e retorne recomendações estruturadas.

SITUAÇÃO ATUAL:
- Capital de Giro Atual: R$ ${wc.workingCapital.toFixed(2)}
- Contas a Receber (30 dias): R$ ${wc.currentReceivables.toFixed(2)}
- Contas a Pagar (30 dias): R$ ${wc.currentPayables.toFixed(2)}
- Despesas Mensais Médias: R$ ${wc.avgMonthlyExpenses.toFixed(2)}
- Capital de Giro Recomendado (2 meses): R$ ${wc.recommendedWorkingCapital.toFixed(2)}
- Déficit/Superávit: R$ ${(wc.workingCapital - wc.recommendedWorkingCapital).toFixed(2)}

FORNEÇA:
1. Assessment: análise da situação atual (1-2 frases)
2. Recommendations: lista com 2-3 ações específicas (action: string, impact: string, priority: high/medium/low)
3. Risk Level: low, medium ou high`;

      const schema = {
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
      };

      const response = await InvokeLLM(prompt, schema);

      // Validar resposta
      if (!response || typeof response !== 'object') {
        console.error('Resposta da IA não é um objeto:', response);
        toast.error('Resposta inválida da IA');
        setIsAnalyzing(false);
        return;
      }

      // Garantir estrutura mínima - ser mais flexível
      const validatedAnalysis = {
        assessment: response.assessment || 'Análise de capital de giro concluída',
        recommendations: Array.isArray(response.recommendations) ? response.recommendations : [],
        risk_level: response.risk_level || 'medium'
      };

      // Validar que temos pelo menos ALGUNS dados
      const hasAssessment = validatedAnalysis.assessment && validatedAnalysis.assessment.length > 0;
      const hasRecommendations = validatedAnalysis.recommendations && validatedAnalysis.recommendations.length > 0;
      const hasRiskLevel = validatedAnalysis.risk_level;
      
      const hasMinimalValidData = hasAssessment || hasRecommendations || hasRiskLevel;
      
      if (!hasMinimalValidData) {
        console.error('Resposta da IA sem dados essenciais:', response);
        toast.error('IA não conseguiu gerar análise válida');
        setIsAnalyzing(false);
        return;
      }

      setAnalysis(validatedAnalysis);
      toast.success('Análise concluída!');
    } catch (error) {
      console.error('Erro ao analisar:', error);
      toast.error('Erro ao analisar capital de giro: ' + error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const wc = calculateWorkingCapital();
  const healthStatus = wc.workingCapital >= wc.recommendedWorkingCapital ? 'healthy' : 
                       wc.workingCapital >= wc.recommendedWorkingCapital * 0.7 ? 'warning' : 'critical';

  const statusConfig = {
    healthy: { color: 'bg-green-50 text-teal-700 border-green-200', label: 'Saudável' },
    warning: { color: 'bg-yellow-50 text-amber-700 border-yellow-200', label: 'Atenção' },
    critical: { color: 'bg-pink-50 text-red-600 border-pink-200', label: 'Crítico' }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-primary" />
                Análise de Capital de Giro
              </CardTitle>
              <CardDescription>
                Capital necessário para operações do próximo mês
              </CardDescription>
            </div>
            <Button
              onClick={analyzeWithAI}
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
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-teal-700" />
                <p className="text-sm font-medium text-teal-700">Recebimentos (30d)</p>
              </div>
              <p className="text-2xl font-bold text-teal-700">
                R$ {wc.currentReceivables.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="p-4 bg-pink-50 rounded-lg border border-pink-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-4 h-4 text-red-600" />
                <p className="text-sm font-medium text-red-600">Pagamentos (30d)</p>
              </div>
              <p className="text-2xl font-bold text-red-600">
                R$ {wc.currentPayables.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="w-4 h-4 text-blue-700" />
                <p className="text-sm font-medium text-blue-700">Despesa Mensal Média</p>
              </div>
              <p className="text-2xl font-bold text-blue-700">
                R$ {wc.avgMonthlyExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Deficit/Surplus */}
          {wc.deficit > 0 && (
            <div className="p-4 bg-pink-50 rounded-lg border border-pink-200 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-semibold text-red-700 mb-1">Déficit de Capital de Giro</p>
                <p className="text-sm text-red-600 mb-2">
                  Você precisa de <strong>R$ {wc.deficit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> adicionais 
                  para manter 2 meses de despesas operacionais em caixa.
                </p>
                <p className="text-xs text-red-600">
                  Recomendamos manter capital de giro equivalente a 2 meses de despesas para garantir liquidez.
                </p>
              </div>
            </div>
          )}

          {wc.surplus > 0 && (
            <div className="p-4 bg-green-50 rounded-lg border border-green-200 flex items-start gap-3">
              <TrendingUp className="w-5 h-5 text-teal-700 mt-0.5" />
              <div>
                <p className="font-semibold text-teal-700 mb-1">Superávit de Capital de Giro</p>
                <p className="text-sm text-teal-700">
                  Você tem <strong>R$ {wc.surplus.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> além do recomendado.
                  Considere investir esse valor para maior rentabilidade.
                </p>
              </div>
            </div>
          )}

              {analysis && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-lg border">
                  <h4 className="font-semibold text-slate-900 mb-2">Avaliação Geral</h4>
                  <p className="text-sm text-slate-700">{analysis.assessment || 'Análise concluída'}</p>
                </div>
                
                <div className="p-4 bg-slate-50 rounded-lg border">
                  <h4 className="font-semibold text-slate-900 mb-2">Nível de Risco</h4>
                  <div className="flex items-center gap-2">
                    <Badge variant={analysis.risk_level === 'high' ? 'destructive' : analysis.risk_level === 'medium' ? 'default' : 'secondary'}>
                      {analysis.risk_level === 'high' ? 'Alto' : analysis.risk_level === 'medium' ? 'Médio' : 'Baixo'}
                    </Badge>
                    <span className="text-xs text-slate-500 italic">
                      Baseado na análise de IA
                    </span>
                  </div>
                </div>
              </div>

              {Array.isArray(analysis.recommendations) && analysis.recommendations.length > 0 && (
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
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}