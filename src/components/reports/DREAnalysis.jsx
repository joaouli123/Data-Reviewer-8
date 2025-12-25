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

    // Agrupar vendas por forma de pagamento
    const pagamentos = {};
    vendas.forEach(v => {
      const metodo = v.paymentMethod || 'Outros';
      if (!pagamentos[metodo]) {
        pagamentos[metodo] = { entradas: 0, saidas: 0 };
      }
      pagamentos[metodo].entradas += Math.abs(parseFloat(v.amount || 0));
    });

    // Agrupar compras por forma de pagamento
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
      console.error('Erro:', error);
      toast.error('Erro ao gerar análise');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const ExpandableRow = ({ label, value, isExpanded, onToggle, children, bgClass = '' }) => (
    <div className={`border border-slate-200 rounded-md overflow-hidden ${bgClass}`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition"
      >
        <div className="flex items-center gap-3">
          <ChevronDown 
            className={`w-5 h-5 text-slate-500 transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
          />
          <span className="font-semibold text-slate-700">{label}</span>
        </div>
        <span className="font-bold text-slate-900">R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      </button>
      
      {isExpanded && children && (
        <div className="bg-slate-50 border-t border-slate-200 px-4 py-2 space-y-1">
          {children}
        </div>
      )}
    </div>
  );

  const SubItem = ({ label, value, indent = false }) => (
    <div className={`flex items-center justify-between py-2 text-slate-700 ${indent ? 'pl-8' : ''}`}>
      <span className="text-slate-600">{label}</span>
      <span className="font-semibold text-slate-900">R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
    </div>
  );

  const ResultRow = ({ label, value, bgClass = '', textColorValue = '', marginText = null }) => (
    <div className={`border border-slate-200 rounded-md px-4 py-3 ${bgClass}`}>
      <div className="flex items-center justify-between">
        <span className="font-bold text-slate-800">{label}</span>
        <span className={`font-bold text-lg ${textColorValue}`}>R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      </div>
      {marginText && <div className="text-sm text-blue-600 mt-1">{marginText}</div>}
    </div>
  );

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
      <CardContent className="space-y-4">
        {/* Receita Bruta */}
        <ExpandableRow
          label="Receita Bruta"
          value={dreData.vendaBruta}
          isExpanded={expandedSections.vendaBruta}
          onToggle={() => toggleSection('vendaBruta')}
          bgClass="bg-green-50"
        >
          <SubItem label="Outros" value={dreData.vendaBruta * 0.7} />
          <SubItem label="Cartão de Crédito" value={dreData.vendaBruta * 0.15} />
          <SubItem label="Boleto" value={dreData.vendaBruta * 0.15} />
        </ExpandableRow>

        {/* Custos Diretos */}
        <ExpandableRow
          label="(-) Custos Diretos"
          value={dreData.custosDiretos}
          isExpanded={expandedSections.custos}
          onToggle={() => toggleSection('custos')}
        >
          <SubItem label="Compras" value={dreData.custosDiretos} />
        </ExpandableRow>

        {/* Receita Líquida */}
        <ResultRow
          label="= Receita Líquida"
          value={dreData.receitaLiquida}
          bgClass="bg-blue-50 border-blue-200"
          textColorValue="text-blue-700"
        />

        {/* Despesas Operacionais */}
        <div className="border border-slate-200 rounded-md px-4 py-3">
          <div className="text-slate-700 font-semibold mb-3">(-) Despesas Operacionais:</div>
          <div className="space-y-2 pl-4">
            <SubItem label="Vendas" value={dreData.despesasOp} />
            <div className="flex items-center justify-between py-3 border-t border-slate-200">
              <span className="font-bold text-slate-800">Total Despesas Operacionais</span>
              <span className="font-bold text-slate-900">R$ {dreData.despesasOp.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* Lucro Operacional */}
        <ResultRow
          label="= Lucro Operacional"
          value={dreData.lucroOp}
          bgClass="bg-pink-50 border-pink-200"
          textColorValue="text-green-600"
          marginText={`Margem Líquida: ${dreData.marginLiquida.toFixed(2)}%`}
        />

        {/* Resumo por Forma de Pagamento */}
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-slate-700" />
            <h3 className="font-bold text-slate-800">Resumo por Forma de Pagamento</h3>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {Object.entries(dreData.pagamentos).map(([metodo, dados]) => (
              <div key={metodo} className="border border-slate-200 rounded-md p-4">
                <h4 className="font-bold text-slate-800 mb-3 text-sm">{metodo}</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Entradas:</span>
                    <span className="font-semibold text-green-600">R$ {dados.entradas.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Saídas:</span>
                    <span className="font-semibold text-red-600">R$ {dados.saidas.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-200 pt-2">
                    <span className="font-bold text-slate-700">Líquido:</span>
                    <span className="font-bold text-green-600">R$ {(dados.entradas - dados.saidas).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Forecast */}
        {forecast && (
          <div className="mt-6 pt-6 border-t">
            <div className="p-4 bg-blue-50 rounded-md border border-blue-200">
              <p className="text-sm text-slate-700">{forecast}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
