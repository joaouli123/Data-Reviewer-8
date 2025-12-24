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

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export default function ReportsPage() {
  const { company } = useAuth();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
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

  // Filter transactions based on period and category
  const getFilteredTransactions = () => {
    let filtered = [...transactions];
    
    // Period filter
    filtered = filtered.filter(t => {
      // Parse date using UTC to avoid timezone issues
      const tDate = parseISO(t.date.split('T')[0] + 'T12:00:00Z');
      return tDate >= dateRange.startDate && tDate <= dateRange.endDate;
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

  const handleStartAnalysis = () => {
    setModalOpen(true);
  };

  const generateAllAnalysesQuick = async () => {
    if (filteredTransactions.length === 0) {
      toast.error("Não há dados suficientes para análise.", { duration: 5000 });
      return;
    }

    setIsAnalyzing(true);
    try {
      const recentTransactions = filteredTransactions;
      
      // Simplify data to save tokens
      const simpleTransactions = recentTransactions.map(t => ({
        date: t.date,
        amount: t.amount,
        type: t.type,
        category: t.category,
        description: t.description
      }));

      const simpleCustomers = customers.map(c => ({
        status: c.status,
        join_date: c.join_date,
        ltv: c.ltv
      }));

      const prompt = `
        Atue como um consultor financeiro sênior para pequenas empresas. 
        
        Dados de Transações (últimos 6 meses):
        \${JSON.stringify(simpleTransactions)}

        Dados de Clientes (Resumo):
        \${JSON.stringify(simpleCustomers)}

        Gere uma análise estratégica detalhada contendo:
        1. Sumário executivo do desempenho.
        2. Previsão de fluxo de caixa para os próximos 3 meses (estimativa baseada no histórico).
        3. Oportunidades específicas de redução de despesas por categoria.
        4. Sugestões para aumentar receita baseadas no comportamento dos clientes e vendas.
        5. Alertas de anomalias se houver.
      `;

      const response = await InvokeLLM(prompt, {
        properties: {
          executive_summary: { type: "string" },
          cash_flow_forecast: {
            type: "array",
            items: {
              type: "object",
              properties: {
                month: { type: "string", description: "Nome do mês futuro" },
                predicted_revenue: { type: "number" },
                predicted_expense: { type: "number" },
                reasoning: { type: "string" }
              }
            }
          },
          expense_reduction_opportunities: {
            type: "array",
            items: {
              type: "object",
              properties: {
                category: { type: "string" },
                suggestion: { type: "string" },
                potential_savings: { type: "string" }
              }
            }
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
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                severity: { type: "string", enum: ["high", "medium", "low"] },
              }
            }
          }
        }
      });

      setAnalysisResult(response);
      toast.success("Análise completa gerada com sucesso!", { duration: 5000 });
    } catch (error) {
      toast.error("Erro ao gerar análise. Tente novamente.", { duration: 5000 });
    } finally {
      setIsAnalyzing(false);
    }
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
    <div className="space-y-8 max-w-6xl mx-auto p-4 sm:p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-2 flex-wrap">
            <Brain className="w-6 sm:w-8 h-6 sm:h-8 text-blue-600" />
            IA Analista Financeiro
          </h1>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <p className="text-xs sm:text-sm text-slate-500">Insights inteligentes para o seu negócio baseados em dados reais.</p>
            {dateRange && (
              <Badge variant="secondary" className="text-xs" data-testid="badge-period-selected">
                {dateRange.label}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
          <ReportExporter 
            reportData={{
              summary: analysisResult ? {
                receita_total: filteredTransactions.filter(t => t.type === 'venda').reduce((sum, t) => sum + Math.abs(parseFloat(t.amount || 0)), 0),
                despesas_total: filteredTransactions.filter(t => t.type === 'compra').reduce((sum, t) => sum + Math.abs(parseFloat(t.amount || 0)), 0),
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
            className="flex-1 sm:flex-none"
          />
          <Button 
            onClick={handleStartAnalysis} 
            disabled={isAnalyzing}
            className="bg-primary hover:bg-primary text-white px-6 w-full sm:w-auto"
            size="lg"
            data-testid="button-new-analysis"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Analisando...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Gerar Nova Análise
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Modal de Configuração da Análise */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              Configurar Nova Análise
            </DialogTitle>
            <DialogDescription>
              Selecione o período e a categoria para que nossa IA gere os insights.
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
      {!analysisResult && !isAnalyzing ? (
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
      ) : analysisResult ? (
        <div className="space-y-6 animate-in fade-in duration-500">
          {/* Executive Summary with KPIs */}
          <ExecutiveSummary 
            summary={analysisResult.executive_summary}
            transactions={filteredTransactions}
            saleInstallments={saleInstallments}
            purchaseInstallments={purchaseInstallments}
          />

          <ReportSuggestions 
            transactions={filteredTransactions}
            saleInstallments={saleInstallments}
            purchaseInstallments={purchaseInstallments}
            onGenerateAnalysis={handleStartAnalysis}
            hideActionButton={!!analysisResult}
          />

          <Tabs defaultValue="cashflow" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="cashflow">Fluxo de Caixa</TabsTrigger>
              <TabsTrigger value="expenses">Despesas</TabsTrigger>
              <TabsTrigger value="revenue">Receita</TabsTrigger>
              <TabsTrigger value="working-capital">Capital de Giro</TabsTrigger>
              <TabsTrigger value="debt">Endividamento</TabsTrigger>
            </TabsList>

            <TabsContent value="cashflow" className="space-y-6 mt-6">
              <CashFlowForecastChart forecast={analysisResult.cash_flow_forecast} />
              <WhatIfAnalysis 
                transactions={filteredTransactions}
                saleInstallments={saleInstallments}
                purchaseInstallments={purchaseInstallments}
              />
            </TabsContent>

            <TabsContent value="expenses" className="space-y-6 mt-6">
              <ExpensesBreakdown 
                opportunities={analysisResult.expense_reduction_opportunities}
                transactions={filteredTransactions}
                categories={categories}
              />
            </TabsContent>

            <TabsContent value="revenue" className="space-y-6 mt-6">
              <RevenueGrowthReport
                strategies={analysisResult.revenue_growth_suggestions}
                transactions={filteredTransactions}
                customers={customers}
              />
            </TabsContent>

            <TabsContent value="working-capital" className="space-y-6 mt-6">
              <WorkingCapitalAnalysis 
                transactions={filteredTransactions}
                saleInstallments={saleInstallments}
                purchaseInstallments={purchaseInstallments}
              />
            </TabsContent>

            <TabsContent value="debt" className="space-y-6 mt-6">
              <DebtAnalysis 
                transactions={filteredTransactions}
                purchases={purchases}
                purchaseInstallments={purchaseInstallments}
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
      ) : null}
    </div>
  );
}
