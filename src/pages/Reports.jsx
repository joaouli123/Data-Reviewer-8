import { InvokeLLM, UploadFile, ExtractDataFromUploadedFile } from '@/api/integrations';
import React, { useState } from 'react';
import { Transaction, Customer, Category, Installment, PurchaseInstallment, Purchase } from '@/api/entities';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Brain, Sparkles, TrendingUp, AlertTriangle, Lightbulb, FileText, Loader2, ArrowRight, Filter, BarChart3 } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth, isAfter, isBefore, startOfDay, endOfDay, subDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PeriodFilter from '../components/dashboard/PeriodFilter';
import CashFlowForecastChart from '../components/reports/CashFlowForecastChart';
import ExpensesBreakdown from '../components/reports/ExpensesBreakdown';
import RevenueGrowthReport from '../components/reports/RevenueGrowthReport';
import WorkingCapitalAnalysis from '../components/reports/WorkingCapitalAnalysis';
import DebtAnalysis from '../components/reports/DebtAnalysis';
import ExecutiveSummary from '../components/reports/ExecutiveSummary';
import ReportSuggestions from '../components/reports/ReportSuggestions';
import WhatIfAnalysis from '../components/reports/WhatIfAnalysis';
import DebtImpactSimulator from '../components/reports/DebtImpactSimulator';
import DREAnalysis from '../components/reports/DREAnalysis';
import ReportExporter from '../components/reports/ReportExporter';
import AnalysisLoading from '../components/reports/AnalysisLoading';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export default function ReportsPage() {
  const { company, user } = useAuth();
  
  const hasPermission = (permission) => {
    if (user?.role === 'admin' || user?.isSuperAdmin) return true;
    return !!user?.permissions?.[permission];
  };

  if (!hasPermission('view_reports')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-4">
        <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mb-4">
          <AlertTriangle className="w-8 h-8 text-rose-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Acesso Negado</h2>
        <p className="text-slate-500 max-w-md">
          Você não tem permissão para visualizar relatórios financeiros. Entre em contato com o administrador da sua empresa.
        </p>
      </div>
    );
  }

  const [modalOpen, setModalOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  const setQuickPeriod = (period) => {
    // Create dates in UTC to avoid timezone issues
    const today = new Date();
    const year = today.getUTCFullYear();
    const month = today.getUTCMonth();
    const date = today.getUTCDate();
    
    let start, end, label;
    
    switch(period) {
      case 'this-month':
        start = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
        end = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
        label = 'Este Mês';
        break;
      case 'next-3-months':
        start = new Date(Date.UTC(year, month, date, 0, 0, 0, 0));
        // 3 months ahead: go to end of (month + 3)
        // If current month is 11 (Dec), month+3 = 14, which wraps to month 2 of next year
        const endMonth = month + 3;
        const endYear = endMonth > 11 ? year + 1 : year;
        const normalizedMonth = endMonth > 11 ? endMonth - 12 : endMonth;
        // Get last day of that month
        const lastDayOfMonth = new Date(Date.UTC(endYear, normalizedMonth + 1, 0)).getUTCDate();
        end = new Date(Date.UTC(endYear, normalizedMonth, lastDayOfMonth, 23, 59, 59, 999));
        label = 'Próximos 3 Meses';
        break;
      case 'year':
        start = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
        end = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
        label = 'Ano Atual';
        break;
      default:
        return;
    }
    
    
    setDateRange({
      startDate: start,
      endDate: end,
      label
    });

    // Ação imediata: dispara a análise com o novo período
    setTimeout(() => generateAllAnalysesQuick(), 100);
  };

  const [tempDateRange, setTempDateRange] = useState({
    startDate: startOfDay(subDays(new Date(), 29)),
    endDate: endOfDay(new Date()),
    label: 'Últimos 30 dias'
  });
  const [tempCategory, setTempCategory] = useState('all');

  const [dateRange, setDateRange] = useState({
    startDate: startOfDay(subDays(new Date(), 29)),
    endDate: endOfDay(new Date()),
    label: 'Últimos 30 dias'
  });
  const [categoryFilter, setCategoryFilter] = useState('all');

  const { data: transactionsData } = useQuery({
    queryKey: ['/api/transactions', company?.id],
    queryFn: () => Transaction.list(),
    initialData: [],
    enabled: !!company?.id
  });

  const transactions = Array.isArray(transactionsData) ? transactionsData : (transactionsData?.data || []);

  const { data: customers } = useQuery({
    queryKey: ['/api/customers', company?.id],
    queryFn: () => Customer.list(),
    initialData: [],
    enabled: !!company?.id
  });

  const { data: categories } = useQuery({
    queryKey: ['/api/categories', company?.id],
    queryFn: () => Category.list(),
    initialData: [],
    enabled: !!company?.id
  });

  const { data: saleInstallments } = useQuery({
    queryKey: ['/api/sale-installments', company?.id],
    queryFn: () => Installment.list(),
    initialData: [],
    enabled: !!company?.id
  });

  const { data: purchaseInstallments } = useQuery({
    queryKey: ['/api/purchase-installments', company?.id],
    queryFn: () => PurchaseInstallment.list(),
    initialData: [],
    enabled: !!company?.id
  });

  const { data: purchases } = useQuery({
    queryKey: ['/api/purchases', company?.id],
    queryFn: () => Purchase.list(),
    initialData: [],
    enabled: !!company?.id
  });

  // NUCLEAR FIX: Use string comparison (YYYY-MM-DD) to avoid timezone issues completely
  const dateToString = (d) => {
    if (!d) return '';
    const date = new Date(d);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Filter transactions based on period and category
  const getFilteredTransactions = () => {
    let filtered = [...transactions];
    
    // Period filter using string date comparison (immune to timezone issues)
    const startStr = dateToString(dateRange.startDate);
    const endStr = dateToString(dateRange.endDate);
    
    filtered = filtered.filter(t => {
      if (!t.date) return false;
      const tStr = dateToString(t.date);
      return tStr >= startStr && tStr <= endStr;
    });
    
    
    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(t => t.category === categoryFilter || t.categoryId === categoryFilter);
    }
    
    return filtered;
  };

  const filteredTransactions = getFilteredTransactions();

  // Map category names to transactions for export
  const transactionsWithCategories = filteredTransactions.map(t => {
    const categoryName = t.categoryId 
      ? (categories.find(c => c.id === t.categoryId)?.name || 'Sem Categoria')
      : (t.category || 'Sem Categoria');
    return {
      ...t,
      category: categoryName // Ensure category is the name, not ID
    };
  });

  const handleStartAnalysis = () => {
    setModalOpen(true);
  };

  const generateAllAnalysesQuick = async () => {
    // Use ALL transactions for AI context (not filtered), but calculate metrics for selected period
    const filteredTxns = getFilteredTransactions();
    const allTransactions = transactions; // Use complete history for AI forecasting
    
    if (allTransactions.length === 0) {
      toast.error("Não há dados suficientes para análise.", { duration: 5000 });
      return;
    }

    setIsAnalyzing(true);
    try {
      // Calculate metrics for FILTERED period
      const totalRevenue = filteredTxns
        .filter(t => t.type === 'venda' || t.type === 'income')
        .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount || 0)), 0);
      
      const totalExpense = filteredTxns
        .filter(t => t.type === 'compra' || t.type === 'expense')
        .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount || 0)), 0);

      const profit = totalRevenue - totalExpense;

      // Create transaction summary from ALL history for better forecasting
      const allRevenue = allTransactions
        .filter(t => t.type === 'venda' || t.type === 'income')
        .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount || 0)), 0);
      
      const allExpense = allTransactions
        .filter(t => t.type === 'compra' || t.type === 'expense')
        .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount || 0)), 0);

      // Improved prompt with complete history context
      const prompt = `Você é um consultor financeiro sênior especializado em PME. Analise o histórico COMPLETO de transações e forneça insights estratégicos em JSON.

IMPORTANTE: Toda a sua resposta deve estar em PORTUGUÊS (BR), incluindo os campos de texto dentro do JSON.

HISTÓRICO COMPLETO:
- Receita Total: R$ ${allRevenue.toFixed(0)}
- Despesa Total: R$ ${allExpense.toFixed(0)}
- Total de Transações: ${allTransactions.length}
- Clientes: ${customers.length}

PERÍODO SELECIONADO (${dateRange.label}):
- Receita: R$ ${totalRevenue.toFixed(0)}
- Despesa: R$ ${totalExpense.toFixed(0)}
- Lucro: R$ ${profit.toFixed(0)}
- Transações: ${filteredTxns.length}

REQUISITOS DA RESPOSTA (JSON EM PORTUGUÊS):
1. executive_summary: Resumo executivo da saúde financeira atual e projeção (mínimo 3 frases).
2. cash_flow_forecast: Array com 3 meses de previsão (month, predicted_revenue, predicted_expense). Use meses reais ou nomes relativos.
3. expense_reduction_opportunities: Array de { suggestion: 'sugestão em PT-BR' } com pelo menos 2 oportunidades de corte.
4. revenue_growth_suggestions: Array de { strategy: 'estratégia em PT-BR', rationale: 'por que fazer em PT-BR', target_customer_segment: 'quem focar em PT-BR' } com pelo menos 3 estratégias.
5. anomalies: Array de { title, description } com riscos identificados.

RESPOSTA OBRIGATÓRIA EM JSON E EM PORTUGUÊS DO BRASIL.`;

      const response = await InvokeLLM(prompt, {
        properties: {
          executive_summary: { type: "string" },
          cash_flow_forecast: {
            type: "array",
            items: {
              type: "object",
              properties: {
                month: { type: "string" },
                predicted_revenue: { type: "number" },
                predicted_expense: { type: "number" }
              }
            }
          },
          expense_reduction_opportunities: {
            type: "array",
            items: { type: "object", properties: { suggestion: { type: "string" } } }
          },
          revenue_growth_suggestions: {
            type: "array",
            items: { 
              type: "object", 
              properties: { 
                strategy: { type: "string" },
                rationale: { type: "string" },
                target_customer_segment: { type: "string" }
              } 
            }
          },
          anomalies: {
            type: "array",
            items: { type: "object", properties: { title: { type: "string" }, description: { type: "string" } } }
          }
        }
      });

      // Ensure forecast has valid data
      if (!response.cash_flow_forecast || response.cash_flow_forecast.length === 0) {
        response.cash_flow_forecast = generateDefaultForecast(allRevenue, allExpense, allTransactions.length);
      }

      // Ensure other arrays exist
      if (!response.expense_reduction_opportunities) response.expense_reduction_opportunities = [];
      if (!response.revenue_growth_suggestions) response.revenue_growth_suggestions = [];
      if (!response.anomalies) response.anomalies = [];

      setAnalysisResult(response);
      toast.success("Análise completa gerada com sucesso!", { duration: 5000 });
    } catch (error) {
      toast.error("Erro ao gerar análise. Tente novamente.", { duration: 5000 });
      setAnalysisResult(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Fallback forecast generation
  const generateDefaultForecast = (totalRevenue, totalExpense, transactionCount) => {
    const avgMonthlyRevenue = transactionCount > 0 ? totalRevenue / Math.max(3, Math.floor(transactionCount / 10)) : totalRevenue;
    const avgMonthlyExpense = transactionCount > 0 ? totalExpense / Math.max(3, Math.floor(transactionCount / 10)) : totalExpense;
    
    const monthLabels = ['Próximo Mês', 'Mês 2', 'Mês 3'];
    return monthLabels.map((label, idx) => ({
      month: label,
      predicted_revenue: Math.round(avgMonthlyRevenue * (0.95 + Math.random() * 0.1)),
      predicted_expense: Math.round(avgMonthlyExpense * (0.95 + Math.random() * 0.1)),
      reasoning: 'Baseado em média histórica'
    }));
  };

  const generateAnalysis = async () => {
    // Apply temporary filters to the actual state
    setDateRange(tempDateRange);
    setCategoryFilter(tempCategory);
    setModalOpen(false);
    
    // Call the quick analysis with new filters
    setTimeout(() => generateAllAnalysesQuick(), 100);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 sm:p-6">
      {/* Header Section */}
      <div>
        <div className="mb-4">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 flex items-center gap-3 mb-2">
            <Brain className="w-8 h-8 text-blue-600" />
            IA Analista Financeiro
          </h1>
          <p className="text-sm text-slate-600">Insights inteligentes para o seu negócio baseados em dados reais.</p>
        </div>

        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-slate-50 border border-slate-200 rounded-lg p-4">
          {/* Period Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase">Período:</span>
            <div className="flex gap-1.5 flex-wrap">
              <Button 
                variant={dateRange.label === 'Este Mês' ? 'default' : 'outline'}
                size="sm" 
                className="text-xs whitespace-nowrap"
                onClick={() => setQuickPeriod('this-month')}
                disabled={isAnalyzing}
                data-testid="button-period-month"
              >
                Este Mês
              </Button>
              <Button 
                variant={dateRange.label === 'Próximos 3 Meses' ? 'default' : 'outline'}
                size="sm" 
                className="text-xs whitespace-nowrap"
                onClick={() => setQuickPeriod('next-3-months')}
                disabled={isAnalyzing}
                data-testid="button-period-3months"
              >
                Próx. 3M
              </Button>
              <Button 
                variant={dateRange.label === 'Ano Atual' ? 'default' : 'outline'}
                size="sm" 
                className="text-xs whitespace-nowrap"
                onClick={() => setQuickPeriod('year')}
                disabled={isAnalyzing}
                data-testid="button-period-year"
              >
                Ano Atual
              </Button>
            </div>
          </div>

          {/* Spacer */}
          <div className="hidden sm:block flex-1" />

          {/* Action Buttons */}
          <div className="flex gap-2 flex-wrap sm:flex-nowrap">
            {hasPermission('export_reports') && (
              <ReportExporter 
                reportData={{
                  summary: analysisResult ? {
                    receita_total: filteredTransactions.filter(t => ['venda', 'venda_prazo', 'receita', 'income'].includes(t.type)).reduce((sum, t) => sum + Math.abs(parseFloat(t.amount || 0)), 0),
                    despesas_total: filteredTransactions.filter(t => ['compra', 'compra_prazo', 'despesa', 'expense'].includes(t.type)).reduce((sum, t) => sum + Math.abs(parseFloat(t.amount || 0)), 0),
                    periodo: dateRange.label
                  } : null,
                  transactions: transactionsWithCategories,
                  forecast: analysisResult?.cash_flow_forecast,
                  expenses: analysisResult?.expense_reduction_opportunities,
                  revenue: analysisResult?.revenue_growth_suggestions,
                  debt: analysisResult?.debt_metrics,
                  working_capital: analysisResult?.working_capital_metrics
                }}
                analysisResult={analysisResult}
                reportType="general"
              />
            )}
            <Button 
              onClick={handleStartAnalysis} 
              disabled={isAnalyzing}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 whitespace-nowrap"
              size="sm"
              data-testid="button-new-analysis"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analisando
                </>
              ) : (
                <>
                  <Filter className="w-4 h-4 mr-2" />
                  Filtro Avançado
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Modal de Configuração da Análise */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-blue-600" />
              Filtro Avançado
            </DialogTitle>
            <DialogDescription>
              Selecione um período personalizado e categoria para uma análise detalhada.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Período de Análise</label>
              <PeriodFilter 
                onPeriodChange={setTempDateRange}
                mode="days"
                defaultPeriod="last30Days"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Filtrar por Categoria (Opcional)</label>
              <Select value={tempCategory} onValueChange={setTempCategory}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Todas as Categorias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Categorias</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.name || 'uncategorized'}>
                      {(cat.name || 'Sem Categoria').charAt(0).toUpperCase() + (cat.name || 'Sem Categoria').slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={generateAnalysis} className="bg-primary">
              Iniciar Análise IA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Suggestions and Results */}
      {isAnalyzing ? (
        <AnalysisLoading />
      ) : !analysisResult ? (
        <div className="space-y-6">
          <ReportSuggestions 
            transactions={filteredTransactions}
            saleInstallments={saleInstallments}
            purchaseInstallments={purchaseInstallments}
            onGenerateAnalysis={handleStartAnalysis}
            hideActionButton={!!analysisResult}
          />
          <Card className="bg-slate-50 border-dashed border-2 border-slate-200">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Nenhuma análise gerada ainda</h3>
              <p className="text-slate-500 max-w-md mb-6">
                Clique no botão "Gerar Nova Análise" acima para que nossa IA processe suas transações e gere insights valiosos para seu negócio.
              </p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in duration-500">
          {/* Executive Summary with KPIs */}
          <ExecutiveSummary 
            summary={analysisResult.executive_summary}
            transactions={filteredTransactions}
            saleInstallments={saleInstallments}
            purchaseInstallments={purchaseInstallments}
            dateRange={dateRange}
          />

          <ReportSuggestions 
            transactions={filteredTransactions}
            saleInstallments={saleInstallments}
            purchaseInstallments={purchaseInstallments}
            onGenerateAnalysis={handleStartAnalysis}
            hideActionButton={!!analysisResult}
          />

          <Tabs defaultValue="cashflow" className="w-full">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 h-auto gap-1 p-1 bg-slate-100 rounded-lg">
              <TabsTrigger value="cashflow" className="text-xs sm:text-sm">Fluxo de Caixa</TabsTrigger>
              <TabsTrigger value="dre" className="text-xs sm:text-sm">DRE</TabsTrigger>
              <TabsTrigger value="revenue" className="text-xs sm:text-sm">Receitas</TabsTrigger>
              <TabsTrigger value="expenses" className="text-xs sm:text-sm">Despesas</TabsTrigger>
              <TabsTrigger value="working-capital" className="text-xs sm:text-sm">Capital</TabsTrigger>
              <TabsTrigger value="debt" className="text-xs sm:text-sm">Dívidas</TabsTrigger>
            </TabsList>

            <TabsContent value="dre" className="space-y-6 mt-6">
              <div id="report-dre">
                <DREAnalysis transactions={filteredTransactions} categories={categories} />
              </div>
            </TabsContent>

            <TabsContent value="cashflow" className="space-y-6 mt-6">
              <div id="report-chart-cashflow">
                <CashFlowForecastChart forecast={analysisResult.cash_flow_forecast} />
              </div>
              <WhatIfAnalysis 
                transactions={filteredTransactions}
                saleInstallments={saleInstallments}
                purchaseInstallments={purchaseInstallments}
              />
            </TabsContent>

            <TabsContent value="revenue" className="space-y-6 mt-6">
              <div id="report-chart-revenue">
                <RevenueGrowthReport 
                  strategies={analysisResult.revenue_growth_suggestions}
                  transactions={filteredTransactions}
                  customers={customers}
                />
              </div>
            </TabsContent>

            <TabsContent value="expenses" className="space-y-6 mt-6">
              <ExpensesBreakdown 
                opportunities={analysisResult.expense_reduction_opportunities}
                transactions={filteredTransactions}
                categories={categories}
              />
            </TabsContent>

            <TabsContent value="working-capital" className="space-y-6 mt-6">
              <WorkingCapitalAnalysis 
                transactions={filteredTransactions}
                saleInstallments={saleInstallments}
                purchaseInstallments={purchaseInstallments}
                dateRange={dateRange}
              />
            </TabsContent>

            <TabsContent value="debt" className="space-y-6 mt-6">
              <DebtAnalysis 
                transactions={filteredTransactions}
                purchases={purchases}
                purchaseInstallments={purchaseInstallments}
                dateRange={dateRange}
                categories={categories}
              />
              {(() => {
                // Calculate metrics with fallbacks
                const totalDebt = purchaseInstallments && purchaseInstallments.length > 0
                  ? purchaseInstallments.filter(i => !i.paid).reduce((sum, i) => sum + parseFloat(i.amount || 0), 0)
                  : transactions.filter(t => t.type === 'compra' && t.status === 'pendente').reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
                
                const revenueData = transactions.filter(t => (t.type === 'venda' || t.type === 'income'));
                const avgMonthlyRevenue = revenueData.length > 0 
                  ? revenueData.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount || 0)), 0) / 3
                  : 1; // Default to 1 to avoid division by zero
                
                const monthlyDebtPayment = totalDebt > 0 ? totalDebt / 12 : 0;
                const debtServiceRatio = avgMonthlyRevenue > 0 ? (monthlyDebtPayment / avgMonthlyRevenue) * 100 : 0;
                
                return (
                  <DebtImpactSimulator 
                    currentMetrics={{
                      totalDebt,
                      avgMonthlyRevenue,
                      monthlyDebtPayment,
                      debtServiceRatio
                    }}
                  />
                );
              })()}
            </TabsContent>
          </Tabs>
          
          {/* Anomalies (kept at bottom if any) */}
          {analysisResult.anomalies?.length > 0 && (
            <Card className="border-slate-200 shadow-sm bg-slate-50">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wide">
                  Outros Alertas
                </CardTitle>
              </CardHeader>
              <CardContent>
                  <ul className="space-y-2">
                    {analysisResult.anomalies.map((item, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm text-slate-700">
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                            <span className="font-medium">{item.title}:</span> {item.description}
                        </li>
                    ))}
                  </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
