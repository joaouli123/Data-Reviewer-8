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

  const extractTxDate = (t) => {
    if (!t) return null;
    const candidate = t.paymentDate || t.date || t.createdAt || t.created_at;
    if (!candidate) return null;
    const d = new Date(candidate);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const isIncomeType = (type) => ['venda', 'income', 'receita', 'entrada', 'venda_prazo'].includes(type);
  const isExpenseType = (type) => ['compra', 'expense', 'despesa', 'saida', 'compra_prazo'].includes(type);

  const calculateWorkingCapital = () => {
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Receivables in next 30 days from installments
    const next30DaysReceivables = Array.isArray(saleInstallments)
      ? saleInstallments
          .filter(inst => {
            const dueDate = new Date(inst.dueDate);
            return dueDate >= today && dueDate <= thirtyDaysFromNow && !inst.paidAt;
          })
          .reduce((sum, inst) => sum + parseFloat(inst.amount || 0), 0)
      : 0;

    // Payables in next 30 days from installments
    const next30DaysPayables = Array.isArray(purchaseInstallments)
      ? purchaseInstallments
          .filter(inst => {
            const dueDate = new Date(inst.dueDate);
            return dueDate >= today && dueDate <= thirtyDaysFromNow && !inst.paidAt;
          })
          .reduce((sum, inst) => sum + parseFloat(inst.amount || 0), 0)
      : 0;

    // Current Cash (from transactions total balance)
    const currentCash = Array.isArray(transactions)
      ? transactions.reduce((sum, t) => {
          const amount = parseFloat(t.amount || 0);
          // If transaction is in the past, it counts towards current cash
          const txnDate = extractTxDate(t);
          if (txnDate && txnDate <= today) {
            return sum + (isIncomeType(t.type) ? amount : isExpenseType(t.type) ? -amount : 0);
          }
          return sum;
        }, 0)
      : 0;

    // Current Assets (Circulante) = Cash + Receivables (30d)
    const currentAssets = currentCash + next30DaysReceivables;
    
    // Current Liabilities (Circulante) = Payables (30d)
    const currentLiabilities = next30DaysPayables;

    // Working Capital = Assets - Liabilities
    const workingCapital = currentAssets - currentLiabilities;

    // Average monthly expenses (past 3 months)
    const pastExpenses = Array.isArray(transactions)
      ? transactions
          .filter(t => isExpenseType(t.type))
          .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount || 0)), 0)
      : 0;
    
    const avgMonthlyExpenses = pastExpenses / 3;
    const recommendedWorkingCapital = avgMonthlyExpenses * 2;

    return {
      currentReceivables: next30DaysReceivables,
      currentPayables: next30DaysPayables,
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
      
    const prompt = `Você é um analista financeiro sênior. Analise a situação de capital de giro e retorne recomendações estruturadas e detalhadas.

SITUAÇÃO ATUAL:
- Capital de Giro Atual: R$ ${wc.workingCapital.toFixed(2)}
- Contas a Receber (30 dias): R$ ${wc.currentReceivables.toFixed(2)}
- Contas a Pagar (30 dias): R$ ${wc.currentPayables.toFixed(2)}
- Despesas Mensais Médias: R$ ${wc.avgMonthlyExpenses.toFixed(2)}
- Capital de Giro Recomendado (2 meses): R$ ${wc.recommendedWorkingCapital.toFixed(2)}
- Déficit/Superávit: R$ ${(wc.workingCapital - wc.recommendedWorkingCapital).toFixed(2)}

REQUISITOS DA RESPOSTA:
1. "assessment": Uma análise profunda da saúde financeira atual (mínimo 3 frases).
2. "recommendations": Uma lista com exatamente 3 ações práticas. Cada ação deve ter "action" (o que fazer), "impact" (qual o resultado esperado) e "priority" ("high", "medium" ou "low").
3. "risk_level": Nível de risco ("low", "medium" ou "high").

Responda em JSON seguindo rigorosamente os nomes das chaves acima.`;

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
        toast.error('Resposta inválida da IA');
        setIsAnalyzing(false);
        return;
      }

      // Garantir estrutura mínima - ser mais flexível
      const validatedAnalysis = {
        assessment: response.assessment || response.avaliacao || response.overall_assessment || 'Análise de capital de giro concluída',
        recommendations: Array.isArray(response.recommendations) ? response.recommendations : 
                         Array.isArray(response.recomendacoes) ? response.recomendacoes : 
                         Array.isArray(response.key_recommendations) ? response.key_recommendations : [],
        risk_level: response.risk_level || response.nivel_risco || response.risk || 'medium'
      };

      // Mapear campos internos se a IA responder em português ou formatos alternativos
      if (validatedAnalysis.recommendations.length > 0) {
        validatedAnalysis.recommendations = validatedAnalysis.recommendations.map(rec => {
          // Extrair ação
          const action = rec.action || rec.acao || rec.suggestion || rec.strategy || 'Ação sugerida';
          // Extrair impacto
          const impact = rec.impact || rec.impacto || rec.expected_impact || rec.rationale || 'Impacto positivo';
          // Extrair prioridade
          const priority = (rec.priority || rec.prioridade || rec.risk_level || 'medium').toLowerCase();
          
          return {
            action,
            impact,
            priority: priority.includes('alta') || priority.includes('high') ? 'high' :
                      priority.includes('baixa') || priority.includes('low') ? 'low' : 'medium'
          };
        });
      }

      // Validar que temos pelo menos ALGUNS dados
      const hasAssessment = validatedAnalysis.assessment && validatedAnalysis.assessment.length > 0;
      const hasRecommendations = validatedAnalysis.recommendations && validatedAnalysis.recommendations.length > 0;
      const hasRiskLevel = validatedAnalysis.risk_level;
      
      const hasMinimalValidData = hasAssessment || hasRecommendations || hasRiskLevel;
      
      if (!hasMinimalValidData) {
        toast.error('IA não conseguiu gerar análise válida');
        setIsAnalyzing(false);
        return;
      }

      setAnalysis(validatedAnalysis);
      toast.success('Análise concluída!');
    } catch (error) {
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
                  <p className="text-sm text-slate-700">
                    {analysis && typeof analysis.assessment === 'string' ? analysis.assessment : 'Análise concluída'}
                  </p>
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