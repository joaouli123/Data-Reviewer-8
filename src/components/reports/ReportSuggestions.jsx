import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, TrendingDown, AlertCircle, BarChart3, Calendar, Loader2 } from 'lucide-react';
import { InvokeLLM } from '@/api/integrations';
import { toast } from 'sonner';
import { subMonths } from 'date-fns';

export default function ReportSuggestions({ transactions, saleInstallments, purchaseInstallments, onGenerateAnalysis, hideActionButton }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState(null);

  const extractTxDate = (t) => {
    if (!t) return null;
    const candidate = t.paymentDate || t.date || t.createdAt || t.created_at;
    if (!candidate) return null;
    const d = new Date(candidate);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const isIncomeType = (type) => ['venda', 'income', 'receita', 'entrada', 'venda_prazo'].includes(type);
  const isExpenseType = (type) => ['compra', 'expense', 'despesa', 'saida', 'compra_prazo'].includes(type);

  const generateSuggestions = async () => {
    setIsGenerating(true);
    try {
      const now = new Date();
      const threeMonthsAgo = subMonths(now, 3);
      
      // Calculate key metrics
      const recentTransactions = transactions.filter(t => {
        const txDate = extractTxDate(t);
        return txDate ? txDate >= threeMonthsAgo : false;
      });
      const revenue = recentTransactions.filter(t => isIncomeType(t.type)).reduce((sum, t) => sum + Math.abs(parseFloat(t.amount || 0)), 0);
      const expenses = recentTransactions.filter(t => isExpenseType(t.type)).reduce((sum, t) => sum + Math.abs(parseFloat(t.amount || 0)), 0);
      
      const pendingReceivables = saleInstallments.filter(i => !i.paid || i.status === 'parcial').reduce((sum, i) => {
        const amount = typeof i.amount === 'string' ? parseFloat(i.amount) : i.amount;
        const paidAmt = parseFloat(i.paidAmount || 0);
        const validAmount = isNaN(amount) ? 0 : amount;
        return sum + (i.status === 'parcial' ? Math.max(validAmount - paidAmt, 0) : validAmount);
      }, 0);
      const pendingPayables = purchaseInstallments.filter(i => !i.paid || i.status === 'parcial').reduce((sum, i) => {
        const amount = typeof i.amount === 'string' ? parseFloat(i.amount) : i.amount;
        const paidAmt = parseFloat(i.paidAmount || 0);
        const validAmount = isNaN(amount) ? 0 : amount;
        return sum + (i.status === 'parcial' ? Math.max(validAmount - paidAmt, 0) : validAmount);
      }, 0);
      
      const categoriesCount = [...new Set(transactions.map(t => t.categoryId))].length;

      const prompt = `Com base nos dados financeiros dos últimos 3 meses:
- Receita Total: R$ ${revenue.toFixed(2)}
- Despesas Totais: R$ ${expenses.toFixed(2)}
- Contas a Receber: R$ ${pendingReceivables.toFixed(2)}
- Contas a Pagar: R$ ${pendingPayables.toFixed(2)}
- Número de Categorias: ${categoriesCount}
- Total de Transações: ${transactions.length}

Sugira 4-5 relatórios mais relevantes que devem ser gerados, com justificativa de cada um.`;

      const schema = {
        properties: {
          suggested_reports: {
            type: "array",
            items: {
              type: "object",
              properties: {
                report_name: { type: "string" },
                priority: { type: "string", enum: ["high", "medium", "low"] },
                reason: { type: "string" },
                key_insight: { type: "string" }
              }
            }
          }
        }
      };

      const response = await InvokeLLM(prompt, schema);
      
      setSuggestions(response.suggested_reports);
      toast.success('Sugestões geradas com sucesso!');
    } catch (error) {
      toast.error('Erro ao gerar sugestões');
    } finally {
      setIsGenerating(false);
    }
  };

  const priorityConfig = {
    high: { color: 'bg-rose-100 text-rose-700 border-rose-200', icon: AlertCircle },
    medium: { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: TrendingUp },
    low: { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: BarChart3 }
  };

  return (
    <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-primary">
            <Sparkles className="w-5 h-5" />
            Sugestões de Relatórios
          </CardTitle>
          <Button
            onClick={generateSuggestions}
            disabled={isGenerating}
            size="sm"
            className="bg-primary text-white hover:bg-primary"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Gerar Sugestões
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!suggestions && !isGenerating && (
          <p className="text-sm text-slate-600 text-center py-4">
            Clique em "Gerar Sugestões" para que a IA recomende os relatórios mais relevantes para sua empresa.
          </p>
        )}
        
        {suggestions && (
          <div className="space-y-3">
            {suggestions.map((report, idx) => {
              const config = priorityConfig[report.priority] || priorityConfig.medium;
              const Icon = config.icon;
              
              return (
                <div key={idx} className="p-4 rounded-lg border bg-white shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-5 h-5 ${config.color.split(' ')[1]}`} />
                      <h4 className="font-semibold text-slate-900">{report.report_name}</h4>
                    </div>
                    <Badge className={`${config.color} border`}>
                      {report.priority === 'high' ? 'Alta Prioridade' : 
                       report.priority === 'medium' ? 'Média Prioridade' : 
                       'Baixa Prioridade'}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600 mb-2">{report.reason}</p>
                  <div className="flex items-start gap-2 p-2 bg-indigo-50 rounded border border-blue-100">
                    <TrendingUp className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-primary">
                      <strong>Insight:</strong> {report.key_insight}
                    </p>
                  </div>
                </div>
              );
            })}
            {!hideActionButton && (
              <Button 
                onClick={onGenerateAnalysis}
                className="w-full bg-primary hover:bg-primary mt-4"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Gerar Análise Completa
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}