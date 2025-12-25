import { InvokeLLM } from '@/api/integrations';
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Sparkles, Loader2, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

export default function DREAnalysis({ transactions = [], categories = [] }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [forecast, setForecast] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    vendaBruta: true,
    deducoes: false,
    custos: false,
    despesas: false,
    impostos: false
  });

  // Agrupar transações por tipo e categoria
  const dreData = useMemo(() => {
    const txList = Array.isArray(transactions) ? transactions : [];
    
    const vendas = txList.filter(t => t.type === 'venda' || t.type === 'income');
    const compras = txList.filter(t => t.type === 'compra' || t.type === 'expense');

    const vendaBruta = vendas.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount || 0)), 0);
    const custos = compras.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount || 0)), 0);

    // Agrupar vendas por categoria
    const vendaByCategory = {};
    vendas.forEach(v => {
      const cat = v.categoryId || 'sem-categoria';
      vendaByCategory[cat] = (vendaByCategory[cat] || 0) + Math.abs(parseFloat(v.amount || 0));
    });

    const deducoes = vendaBruta * 0.09; // ICMS/PIS/COFINS ~9%
    const vendaLiquida = vendaBruta - deducoes;
    const lucroBruto = vendaLiquida - custos;
    const marginLucroBruto = vendaLiquida > 0 ? (lucroBruto / vendaLiquida) * 100 : 0;

    const despesasOp = custos * 0.15; // estimativa
    const resultadoOp = lucroBruto - despesasOp;
    const marginOp = vendaLiquida > 0 ? (resultadoOp / vendaLiquida) * 100 : 0;

    const impostos = vendaBruta * 0.27; // 27% de IR/CSLL
    const resultadoLiquido = resultadoOp - impostos;
    const marginLiquido = vendaBruta > 0 ? (resultadoLiquido / vendaBruta) * 100 : 0;

    return {
      vendaBruta,
      vendaByCategory,
      deducoes,
      vendaLiquida,
      custos,
      lucroBruto,
      marginLucroBruto,
      despesasOp,
      resultadoOp,
      marginOp,
      impostos,
      resultadoLiquido,
      marginLiquido,
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
      const prompt = `Analise este DRE:
      Receita Bruta: R$ ${dreData.vendaBruta.toFixed(2)}
      Deduções: R$ ${dreData.deducoes.toFixed(2)}
      Receita Líquida: R$ ${dreData.vendaLiquida.toFixed(2)}
      CMV: R$ ${dreData.custos.toFixed(2)}
      Lucro Bruto: R$ ${dreData.lucroBruto.toFixed(2)} (${dreData.marginLucroBruto.toFixed(1)}%)
      Resultado Operacional: R$ ${dreData.resultadoOp.toFixed(2)} (${dreData.marginOp.toFixed(1)}%)
      Resultado Líquido: R$ ${dreData.resultadoLiquido.toFixed(2)} (${dreData.marginLiquido.toFixed(1)}%)
      
      Resuma em 2 linhas o desempenho e dê 1 recomendação`;

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

  const LineItem = ({ label, value, isHighlight = false, isNegative = false, showChevron = false, onToggle = null, isExpanded = false, category = null }) => (
    <div className="space-y-0">
      <div 
        className={`flex items-center justify-between px-4 py-3 ${
          isHighlight 
            ? isNegative 
              ? 'bg-red-50 border-l-4 border-l-red-400' 
              : 'bg-green-50 border-l-4 border-l-green-400'
            : ''
        } ${showChevron ? 'cursor-pointer hover-elevate' : ''}`}
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          {showChevron && (
            <ChevronDown 
              className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
            />
          )}
          <span className={`${isHighlight ? 'font-bold text-base' : 'text-sm'}`}>
            {label}
          </span>
        </div>
        <span className={`font-bold text-right ${
          isNegative ? 'text-red-600' : 'text-emerald-700'
        }`}>
          {isNegative ? '-' : ''}R$ {Math.abs(value).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
        </span>
      </div>
    </div>
  );

  if (dreData.vendaBruta === 0) {
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
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-slate-500">
            <p>Nenhuma transação encontrada</p>
          </div>
        </CardContent>
      </Card>
    );
  }

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
                Gerar Previsão
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-0">
        {/* VENDA BRUTA */}
        <LineItem 
          label="Venda Bruta"
          value={dreData.vendaBruta}
          showChevron={true}
          isExpanded={expandedSections.vendaBruta}
          onToggle={() => toggleSection('vendaBruta')}
          category="income"
        />
        
        {expandedSections.vendaBruta && (
          <div className="bg-slate-50 px-8 py-2 space-y-1 text-sm">
            {Object.entries(dreData.vendaByCategory).map(([catId, amount]) => (
              <div key={catId} className="flex justify-between">
                <span className="text-slate-600">{catId === 'sem-categoria' ? 'Outras' : 'Categoria'}</span>
                <span className="text-slate-600">R$ {amount.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
              </div>
            ))}
          </div>
        )}

        {/* DEDUÇÕES */}
        <LineItem 
          label="Deduções (ICMS/PIS/COFINS)"
          value={dreData.deducoes}
          isNegative={true}
          category="deduction"
        />

        {/* VENDA LÍQUIDA */}
        <div className="flex justify-between px-4 py-3 bg-blue-50 border-l-4 border-l-blue-400">
          <span className="font-bold">= Venda Líquida</span>
          <span className="font-bold text-blue-700">R$ {dreData.vendaLiquida.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
        </div>

        {/* CMV / CUSTOS */}
        <LineItem 
          label="CMV"
          value={dreData.custos}
          isNegative={true}
          category="cost"
        />

        {/* LUCRO BRUTO */}
        <div className="flex items-center justify-between px-4 py-3 bg-green-100 border-l-4 border-l-green-500">
          <span className="font-bold text-green-900">= Lucro Bruto</span>
          <div className="text-right">
            <div className="font-bold text-green-700 text-lg">R$ {dreData.lucroBruto.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</div>
            <div className="text-sm text-green-600">{dreData.marginLucroBruto.toFixed(1)}%</div>
          </div>
        </div>

        {/* DESPESAS OPERACIONAIS */}
        <LineItem 
          label="Despesas Operacionais"
          value={dreData.despesasOp}
          isNegative={true}
          category="expense"
        />

        {/* RESULTADO OPERACIONAL */}
        <div className="flex items-center justify-between px-4 py-3 bg-blue-50 border-l-4 border-l-blue-400">
          <span className="font-bold text-slate-800">= Resultado Operacional</span>
          <div className="text-right">
            <div className="font-bold text-blue-700">R$ {dreData.resultadoOp.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</div>
            <div className="text-sm text-blue-600">{dreData.marginOp.toFixed(1)}%</div>
          </div>
        </div>

        {/* IMPOSTOS */}
        <LineItem 
          label="Impostos (27%)"
          value={dreData.impostos}
          isNegative={true}
          category="tax"
        />

        {/* RESULTADO LÍQUIDO */}
        <div className="flex items-center justify-between px-4 py-3 bg-green-50 rounded-md border-2 border-green-400">
          <span className="font-bold text-green-900">= Resultado Líquido</span>
          <div className="text-right">
            <div className="font-bold text-green-700 text-xl">R$ {dreData.resultadoLiquido.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</div>
            <div className="text-sm text-green-600">{dreData.marginLiquido.toFixed(1)}%</div>
          </div>
        </div>

        {/* FORECAST */}
        {forecast && (
          <div className="mt-6 pt-6 border-t">
            <div className="p-4 bg-blue-50 rounded-md border border-blue-200">
              <p className="text-sm text-slate-700 leading-relaxed">{forecast}</p>
            </div>
          </div>
        )}

        {/* ESTATÍSTICAS */}
        <div className="mt-4 pt-4 border-t text-xs text-slate-500">
          <p>{dreData.vendaCount} vendas | {dreData.compraCount} compras analisadas</p>
        </div>
      </CardContent>
    </Card>
  );
}
