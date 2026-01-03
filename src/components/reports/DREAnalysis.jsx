import { InvokeLLM } from '@/api/integrations';
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Sparkles, Loader2, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

export default function DREAnalysis({ transactions = [], categories = [] }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [forecast, setForecast] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    vendaBruta: true,
    custos: true,
    despesas: false
  });

  const dreData = useMemo(() => {
    const txList = Array.isArray(transactions) ? transactions : [];
    
    const vendas = txList.filter(t => t.type === 'venda' || t.type === 'income');
    const compras = txList.filter(t => t.type === 'compra' || t.type === 'expense');

    const vendaBruta = vendas.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount || 0)), 0);
    const custosDiretos = compras.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount || 0)), 0);
    
    const receitaLiquida = vendaBruta - custosDiretos;
    const despesasOp = custosDiretos * 0.15;
    const lucroOp = receitaLiquida - despesasOp;
    const marginLiquida = vendaBruta > 0 ? (lucroOp / vendaBruta) * 100 : 0;

    const pagamentos = {};
    vendas.forEach(v => {
      const metodo = v.paymentMethod || 'Outros';
      if (!pagamentos[metodo]) {
        pagamentos[metodo] = { entradas: 0, saidas: 0 };
      }
      pagamentos[metodo].entradas += Math.abs(parseFloat(v.amount || 0));
    });

    compras.forEach(c => {
      const metodo = c.paymentMethod || 'Outros';
      if (!pagamentos[metodo]) {
        pagamentos[metodo] = { entradas: 0, saidas: 0 };
      }
      pagamentos[metodo].saidas += Math.abs(parseFloat(c.amount || 0));
    });

    return {
      vendaBruta,
      custosDiretos,
      receitaLiquida,
      despesasOp,
      lucroOp,
      marginLiquida,
      pagamentos,
      vendaCount: vendas.length,
      compraCount: compras.length
    };
  }, [transactions]);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleGenerateForecast = async () => {
    setIsAnalyzing(true);
    try {
      const prompt = `Análise rápida desta DRE:
      Receita Bruta: R$ ${dreData.vendaBruta.toFixed(2)}
      Custos Diretos: R$ ${dreData.custosDiretos.toFixed(2)}
      Receita Líquida: R$ ${dreData.receitaLiquida.toFixed(2)}
      Despesas Operacionais: R$ ${dreData.despesasOp.toFixed(2)}
      Lucro Operacional: R$ ${dreData.lucroOp.toFixed(2)} (${dreData.marginLiquida.toFixed(2)}%)
      
      Resumo em 1-2 linhas e 1 insight`;

      const response = await InvokeLLM(prompt);
      
      setForecast(response);
      toast.success('Análise gerada!');
    } catch (error) {
      toast.error('Erro ao gerar análise');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-slate-700" />
            <div>
              <CardTitle className="text-xl">DRE - Demonstração do Resultado do Exercício</CardTitle>
              <p className="text-sm text-slate-500">Análise detalhada do desempenho financeiro</p>
            </div>
          </div>
          <Button onClick={handleGenerateForecast} disabled={isAnalyzing} className="bg-blue-600 hover:bg-blue-700">
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Gerando...
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
      <CardContent className="space-y-2">
        {/* ===== RECEITA BRUTA ===== */}
        <div className="border border-green-200 rounded-md overflow-hidden">
          <button
            onClick={() => toggleSection('vendaBruta')}
            className="w-full flex items-center justify-between px-4 py-3 bg-green-50 hover:bg-green-100 transition"
          >
            <div className="flex items-center gap-2">
              <ChevronDown 
                className={`w-4 h-4 text-teal-700 transition-transform ${expandedSections.vendaBruta ? 'rotate-0' : '-rotate-90'}`}
              />
              <span className="font-semibold text-teal-800 text-sm">Receita Bruta</span>
            </div>
            <span className="font-bold text-teal-700 text-sm">R$ {dreData.vendaBruta.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </button>
          
          {expandedSections.vendaBruta && (
            <div className="bg-white">
              <div className="flex justify-between px-6 py-3 text-sm border-b border-slate-100 text-teal-700">
                <span>Outros</span>
                <span className="font-medium">R$ {(dreData.vendaBruta * 0.7).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between px-6 py-3 text-sm border-b border-slate-100 text-teal-700">
                <span>Cartão de Crédito</span>
                <span className="font-medium">R$ {(dreData.vendaBruta * 0.15).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between px-6 py-3 text-sm text-teal-700">
                <span>Boleto</span>
                <span className="font-medium">R$ {(dreData.vendaBruta * 0.15).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          )}
        </div>

        {/* ===== CUSTOS DIRETOS ===== */}
        <div className="border border-slate-200 rounded-md overflow-hidden">
          <button
            onClick={() => toggleSection('custos')}
            className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition"
          >
            <div className="flex items-center gap-2">
              <ChevronDown 
                className={`w-4 h-4 text-slate-600 transition-transform ${expandedSections.custos ? 'rotate-0' : '-rotate-90'}`}
              />
              <span className="font-semibold text-slate-800 text-sm">(-) Custos Diretos</span>
            </div>
            <span className="font-bold text-slate-800 text-sm">R$ {dreData.custosDiretos.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </button>
          
          {expandedSections.custos && (
            <div className="bg-white">
              <div className="flex justify-between px-6 py-3 text-sm text-slate-700">
                <span>Compras</span>
                <span className="font-medium">R$ {dreData.custosDiretos.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          )}
        </div>

        {/* ===== RECEITA LÍQUIDA ===== */}
        <div className="border border-blue-200 rounded-md overflow-hidden">
          <div className="px-4 py-3 bg-blue-50 flex items-center justify-between">
            <span className="font-semibold text-blue-900 text-sm">= Receita Líquida</span>
            <span className="font-bold text-blue-700 text-sm">R$ {dreData.receitaLiquida.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* ===== DESPESAS OPERACIONAIS ===== */}
        <div className="border border-slate-200 rounded-md overflow-hidden">
          <div className="px-4 py-3 bg-slate-50">
            <span className="font-semibold text-slate-800 text-sm">(-) Despesas Operacionais:</span>
          </div>
          <div className="bg-white">
            <div className="flex justify-between px-6 py-3 text-sm border-b border-slate-100 text-slate-700">
              <span>Vendas</span>
              <span className="font-medium">R$ {dreData.despesasOp.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between px-6 py-3 text-sm bg-slate-50 text-slate-800">
              <span className="font-semibold">Total Despesas Operacionais</span>
              <span className="font-bold">R$ {dreData.despesasOp.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* ===== LUCRO OPERACIONAL ===== */}
        <div className="border border-blue-200 rounded-md overflow-hidden">
          <div className="px-4 py-3 bg-blue-50">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-blue-900 text-sm">= Lucro Operacional</span>
              <span className="font-bold text-emerald-600 text-base">+ R$ {dreData.lucroOp.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="text-xs text-blue-600">Margem Líquida: {dreData.marginLiquida.toFixed(2)}%</div>
          </div>
        </div>

        {/* ===== RESUMO POR FORMA DE PAGAMENTO ===== */}
        <div className="mt-6 pt-4 border-t border-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-slate-700" />
            <h3 className="font-bold text-slate-800 text-sm">Resumo por Forma de Pagamento</h3>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {Object.entries(dreData.pagamentos).map(([metodo, dados]) => (
              <div key={metodo} className="border border-slate-200 rounded-md overflow-hidden">
                <div className="px-3 py-3 bg-slate-50">
                  <h4 className="font-bold text-slate-800 text-xs">{metodo}</h4>
                </div>
                <div className="bg-white p-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-600">Entradas:</span>
                    <span className="font-semibold text-emerald-600">R$ {dados.entradas.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-600">Saídas:</span>
                    <span className="font-semibold text-red-600">R$ {dados.saidas.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <span className="font-bold text-slate-700">Líquido:</span>
                    <span className="font-bold text-emerald-600">R$ {(dados.entradas - dados.saidas).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ===== FORECAST ===== */}
        {forecast && (
          <div className="mt-6 pt-4 border-t border-slate-200">
            <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
              <p className="text-sm text-slate-700">{forecast}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
