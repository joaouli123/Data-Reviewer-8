import { InvokeLLM } from '@/api/integrations';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function DREAnalysis({ transactions = [], categories = [] }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [forecast, setForecast] = useState(null);

  // Calcular DRE diretamente sem memoize
  const calculateDRE = () => {
    try {
      const txList = Array.isArray(transactions) ? transactions : [];
      console.log('🔍 DRE recebeu transações:', txList.length);
      
      let totalReceita = 0;
      let totalDespesa = 0;
      
      txList.forEach(t => {
        const amt = Math.abs(parseFloat(t.amount || 0));
        if (t.type === 'venda' || t.type === 'income') {
          totalReceita += amt;
          console.log('💰 Receita encontrada:', amt, t);
        } else if (t.type === 'compra' || t.type === 'expense') {
          totalDespesa += amt;
          console.log('💸 Despesa encontrada:', amt, t);
        }
      });

      const lucroLiquido = totalReceita - totalDespesa;
      const margem = totalReceita > 0 ? (lucroLiquido / totalReceita) * 100 : 0;

      console.log('✅ DRE Calculado:', { totalReceita, totalDespesa, lucroLiquido, margem });

      return {
        totalReceita,
        totalDespesa,
        lucroLiquido,
        margem,
        transacoes: txList.length
      };
    } catch (error) {
      console.error('❌ Erro ao calcular DRE:', error);
      return {
        totalReceita: 0,
        totalDespesa: 0,
        lucroLiquido: 0,
        margem: 0,
        transacoes: 0
      };
    }
  };

  const dre = calculateDRE();

  const handleGenerateForecast = async () => {
    setIsAnalyzing(true);
    try {
      const prompt = `Analise esta DRE simples:
      Receita: R$ ${dre.totalReceita.toFixed(2)}
      Despesa: R$ ${dre.totalDespesa.toFixed(2)}
      Lucro: R$ ${dre.lucroLiquido.toFixed(2)}
      Margem: ${dre.margem.toFixed(1)}%
      
      Resuma em 1-2 linhas a tendência e dê 1 recomendação`;

      const response = await InvokeLLM(prompt);
      setForecast(response);
      toast.success('Análise gerada!');
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao gerar análise');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              DRE
            </CardTitle>
            <CardDescription>Demonstração de Resultado</CardDescription>
          </div>
          <Button onClick={handleGenerateForecast} disabled={isAnalyzing} size="sm">
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analisando...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Análise
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {dre.transacoes === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <p>Nenhuma transação encontrada</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-emerald-50 rounded border border-emerald-200">
                <span className="font-semibold">Receita Total</span>
                <span className="text-lg text-emerald-700 font-bold">
                  R$ {dre.totalReceita.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-red-50 rounded border border-red-200">
                <span className="font-semibold">Despesa Total</span>
                <span className="text-lg text-red-700 font-bold">
                  R$ {dre.totalDespesa.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                </span>
              </div>

              <div className={`flex justify-between items-center p-3 rounded border-2 font-bold ${dre.lucroLiquido >= 0 ? 'bg-green-50 border-green-400' : 'bg-red-50 border-red-400'}`}>
                <span>Lucro Líquido</span>
                <div className="text-right">
                  <div className={`text-2xl ${dre.lucroLiquido >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    R$ {dre.lucroLiquido.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                  </div>
                  <div className={`text-sm ${dre.lucroLiquido >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    Margem: {dre.margem.toFixed(1)}%
                  </div>
                </div>
              </div>

              <div className="text-xs text-slate-500 pt-2">
                Total: {dre.transacoes} transações analisadas
              </div>
            </div>

            {forecast && (
              <div className="pt-4 border-t">
                <div className="p-3 bg-blue-50 rounded border border-blue-200 text-sm">
                  <p className="text-slate-700">{forecast}</p>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
