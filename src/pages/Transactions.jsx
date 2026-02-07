import { TransactionFilters } from "@/components/transactions/sections/TransactionFilters";
import React, { useState } from 'react';
import { Transaction, Category } from '@/api/entities';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Download, Search, Trash2, Pencil, Wallet, TrendingUp, TrendingDown, Upload, ChevronRight, Check, Clock, CheckCircle2, XCircle, MoreHorizontal } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, isBefore, parse, subDays, startOfDay, endOfDay, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import TransactionForm from '../components/transactions/TransactionForm';
import BankStatementUpload from '../components/transactions/BankStatementUpload';
import BankReconciliation from '../components/transactions/BankReconciliation';
import PeriodFilter from '../components/dashboard/PeriodFilter';
import Pagination from '../components/Pagination';
import { toast } from 'sonner';
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const parseLocalDate = (dateStr) => {
  if (!dateStr) return new Date();
  const [year, month, day] = dateStr.split('T')[0].split('-');
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
};

const INCOME_TYPES = ['venda', 'income', 'venda_prazo', 'receita', 'entrada'];
const EXPENSE_TYPES = ['compra', 'expense', 'compra_prazo', 'despesa', 'saida'];

const isIncomeType = (type) => INCOME_TYPES.includes(type);
const isExpenseType = (type) => EXPENSE_TYPES.includes(type);

// Converte datas comuns (yyyy-mm-dd, dd/mm/yyyy, dd-mm-yyyy, ISO) para data local sem shift de fuso
const parseLocalDateString = (raw) => {
  const str = String(raw || '').trim();

  // yyyy-mm-dd (ou com tempo)
  const ymd = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymd) {
    const year = Number(ymd[1]);
    const month = Number(ymd[2]);
    const day = Number(ymd[3]);
    const d = new Date(year, month - 1, day, 12, 0, 0, 0);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // dd/mm/yyyy ou dd-mm-yyyy (com barra ou hífen)
  const dmy = str.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    const year = Number(dmy[3]);
    const d = new Date(year, month - 1, day, 12, 0, 0, 0);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // Fallback genérico
  const d = new Date(str);
  return Number.isNaN(d.getTime()) ? null : d;
};

// Normaliza valores monetários sem multiplicar por 100 quando já vierem com ponto decimal
const parseMoney = (value) => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;

  const str = String(value).replace(/\s/g, '').replace('R$', '');
  const usesComma = str.includes(',');
  const normalized = usesComma ? str.replace(/\./g, '').replace(',', '.') : str;

  const parsed = parseFloat(normalized);
  return Number.isNaN(parsed) ? 0 : parsed;
};

// Retorna uma data válida a partir dos campos conhecidos ou null
// Para pagas: usa data de pagamento; para pendentes: usa vencimento
const extractTxDate = (t) => {
  if (!t) return null;
  const statusValue = String(t.status || '').toLowerCase();
  const hasPaymentDate = !!(t.paymentDate || t.payment_date);
  const isPaid = ['pago', 'completed', 'parcial', 'paid', 'approved', 'aprovado'].includes(statusValue) || hasPaymentDate;
  const candidate = isPaid
    ? (t.paymentDate || t.payment_date || t.date || t.createdAt || t.created_at)
    : (t.date || t.paymentDate || t.payment_date || t.createdAt || t.created_at);
  if (!candidate) return null;
  try {
    return parseLocalDateString(candidate);
  } catch (e) {
    return null;
  }
};

// Data base para cálculo de saldo inicial: prioriza data de pagamento quando existir
const extractBalanceDate = (t) => {
  if (!t) return null;

  const statusValue = String(t.status || '').toLowerCase();
  const hasPaymentDate = !!(t.paymentDate || t.payment_date);
  const isPaid = ['pago', 'completed', 'parcial', 'paid', 'approved', 'aprovado'].includes(statusValue) || hasPaymentDate;

  const candidate = isPaid
    ? (t.paymentDate || t.payment_date || t.date || t.createdAt || t.created_at)
    : (t.date || t.paymentDate || t.payment_date || t.createdAt || t.created_at);

  if (!candidate) return null;
  try {
    return parseLocalDateString(candidate);
  } catch (e) {
    return null;
  }
};

export default function TransactionsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('paid'); // 'all', 'paid', 'pending'
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  // Initialize with local date (not UTC) to respect user timezone
  const getInitialDateRange = () => {
    const today = new Date();
    
    return {
      startDate: startOfDay(today),
      endDate: endOfDay(today),
      label: 'Hoje'
    };
  };

  const [dateRange, setDateRange] = useState(getInitialDateRange());
  const [uploadOpen, setUploadOpen] = useState(false);
  const [reconciliationOpen, setReconciliationOpen] = useState(false);
  const [statementData, setStatementData] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { company, user } = useAuth();
  
  if (!user?.isSuperAdmin && user?.role !== 'admin' && !user?.permissions?.view_transactions) {
    return <AccessDenied />;
  }

  const queryClient = useQueryClient();

    const hasPermission = (permission) => {
        if (user?.role === 'admin' || user?.isSuperAdmin) return true;
        // Map from old names or use PERMISSIONS object keys
        const permKey = permission?.toLowerCase?.() || permission;
        return !!user?.permissions?.[permKey] || !!user?.permissions?.[permission];
    };

    const PERMISSIONS = {
        VIEW_TRANSACTIONS: 'view_transactions',
        CREATE_TRANSACTIONS: 'create_transactions',
        EDIT_TRANSACTIONS: 'edit_transactions',
        DELETE_TRANSACTIONS: 'delete_transactions',
        VIEW_FINANCIAL: 'view_financial'
    };

  const { data: categoriesData } = useQuery({
    queryKey: ['/api/categories', company?.id],
    queryFn: () => apiRequest('GET', '/api/categories'),
    initialData: [],
    enabled: !!company?.id
  });

  const categories = Array.isArray(categoriesData) ? categoriesData : [];

  const { data: transactionsData, isLoading } = useQuery({
    queryKey: ['/api/transactions', company?.id],
    queryFn: () => apiRequest('GET', '/api/transactions'),
    initialData: [],
    enabled: !!company?.id,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  // Re-invalidate transactions on mount just in case
  React.useEffect(() => {
    if (company?.id) {
      // Limpa e refaz o fetch para não exibir cache depois de exclusões manuais
      queryClient.removeQueries({ queryKey: ['/api/transactions'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions', company.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'], exact: false });
    }
  }, [company?.id, queryClient]);

  const transactions = Array.isArray(transactionsData) ? transactionsData : (transactionsData?.data || []);

  const categoryMap = React.useMemo(() => {
    const map = {};
    categories.forEach(cat => {
      map[cat.id] = cat.name;
    });
    return map;
  }, [categories]);

  const createMutation = useMutation({
    mutationFn: (data) => Transaction.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ exact: false, queryKey: ['/api/transactions'] });
      setIsFormOpen(false);
      toast.success('Transação criada com sucesso!', { duration: 5000 });
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao salvar transação. Tente novamente.');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => Transaction.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ exact: false, queryKey: ['/api/transactions'] });
      setIsFormOpen(false);
      setEditingTransaction(null);
      toast.success('Transação atualizada!', { duration: 5000 });
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao atualizar transação. Tente novamente.');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => Transaction.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ exact: false, queryKey: ['/api/transactions'] });
      toast.success('Transação removida.', { duration: 5000 });
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao remover transação. Tente novamente.');
    }
  });

  const handleSubmit = (data) => {
    if (editingTransaction) {
      return updateMutation.mutateAsync({ id: editingTransaction.id, data });
    }

    // Handle array of transactions (for installments)
    if (Array.isArray(data)) {
      return Promise.all(data.map((transaction) => createMutation.mutateAsync(transaction)));
    }

    return createMutation.mutateAsync(data);
  };

  const handleEdit = async (item) => {
    // Open with current data, then try to load full transaction by id
    const transactionToEdit = { ...item };
    setEditingTransaction(transactionToEdit);
    setIsFormOpen(true);

    if (item?.id) {
      try {
        const full = await Transaction.get(item.id);
        if (full && typeof full === 'object' && full.id) {
          setEditingTransaction(full);
        }
      } catch (e) {
        // Keep current data if fetch fails
      }
    }
  };

  const handleDelete = (id) => {
    if (confirm('Tem certeza que deseja excluir esta transação?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleStatementExtracted = (data) => {
    setStatementData(data);
    setReconciliationOpen(true);
  };

    const handleExport = () => {
    if (!transactions.length) return;
    
    const formatCurrency = (val) => `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const formatDateBR = (d) => format(new Date(d), 'dd/MM/yyyy', { locale: ptBR });
    
    // Period info
    const periodStart = formatDateBR(dateRange.startDate);
    const periodEnd = formatDateBR(dateRange.endDate);
    
    // Calculate totals for filtered transactions
    const totalIncome = filteredTransactions
      .filter(t => t.type === 'venda' || t.type === 'income')
      .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount || 0)), 0);
    const totalExpense = filteredTransactions
      .filter(t => t.type === 'compra' || t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount || 0)), 0);
    
    // Build CSV with header info
    const csvLines = [
      '=== EXTRATO DE TRANSACOES ===',
      '',
      `Periodo:,${periodStart} a ${periodEnd}`,
      `Saldo Inicial:,${formatCurrency(balances.opening)}`,
      `Total Entradas:,${formatCurrency(balances.income)}`,
      `Total Saidas:,${formatCurrency(balances.expense)}`,
      `Saldo Final:,${formatCurrency(balances.closing)}`,
      '',
      '=== DETALHAMENTO ===',
      '',
      'Data,Descricao,Tipo,Categoria,Forma de Pagamento,Valor'
    ];
    
    filteredTransactions.forEach(t => {
      const categoryName = t.categoryId ? (categoryMap[t.categoryId] || 'Outros') : (t.categoryName || t.category || 'Outros');
      const dateStr = t.date ? formatDateBR(t.date) : '';
      const amount = parseFloat(t.amount || 0);
      const formattedAmount = formatCurrency(amount);
      const typeLabel = (t.type === 'venda' || t.type === 'income') ? 'Receita' : 'Despesa';
      const description = (t.description || '').replace(/"/g, '""');
      const paymentMethod = t.paymentMethod || '-';
      
      csvLines.push(`${dateStr},"${description}",${typeLabel},${categoryName},${paymentMethod},${formattedAmount}`);
    });
    
    // Add summary at the end
    csvLines.push('');
    csvLines.push('=== RESUMO ===');
    csvLines.push(`Total de Receitas:,${formatCurrency(totalIncome)}`);
    csvLines.push(`Total de Despesas:,${formatCurrency(totalExpense)}`);
    csvLines.push(`Resultado do Periodo:,${formatCurrency(totalIncome - totalExpense)}`);
    
    const csvContent = csvLines.join('\n');

    // UTF-8 with BOM (Byte Order Mark) for proper Excel compatibility
    const encoder = new TextEncoder();
    const uint8Array = encoder.encode(csvContent);
    const BOM = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blobData = new Uint8Array(BOM.length + uint8Array.length);
    blobData.set(BOM, 0);
    blobData.set(uint8Array, BOM.length);
    
    const blob = new Blob([blobData], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `transacoes_${periodStart.replace(/\//g, '-')}_a_${periodEnd.replace(/\//g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

    const txArray = Array.isArray(transactionsData) ? transactionsData : (transactionsData?.data || []);
    
    const calculateBalances = (periodTransactions) => {
      let openingBalance = 0;
      let periodIncome = 0;
      let periodExpense = 0;
      
      // Usa limites locais para evitar deslocamentos por timezone
      const startTime = startOfDay(dateRange.startDate).getTime();
      const endTime = endOfDay(dateRange.endDate).getTime();

      txArray.forEach(t => {
        if (!t) return;
        
        // APENAS transações pagas ou completadas devem ser contabilizadas no saldo
        const statusValue = String(t.status || '').toLowerCase();
        const hasPaymentDate = !!(t.paymentDate || t.payment_date);
        const isPaid = ['pago', 'completed', 'parcial', 'paid', 'approved', 'aprovado'].includes(statusValue) || hasPaymentDate;
        if (!isPaid) return;

        const relevantDate = extractBalanceDate(t);
        if (!relevantDate) return;
        
        let tDate;
        try {
          tDate = startOfDay(relevantDate).getTime();
        } catch (e) {
          return;
        }
        
        // Se for pagamento parcial, usa o valor efetivamente pago
        const statusVal = String(t.status || '').toLowerCase();
        const baseAmount = statusVal === 'parcial' 
          ? parseMoney(t.paidAmount || 0) 
          : parseMoney(t.amount);
        const amount = baseAmount + parseMoney(t.interest);
        // Considerar taxa de cartão para receitas
        const cardFee = t.hasCardFee && isIncomeType(t.type) ? (Math.abs(baseAmount) * (parseMoney(t.cardFee) || 0)) / 100 : 0;
        const netAmount = isIncomeType(t.type) ? amount - cardFee : amount;

        if (tDate < startTime) {
          if (isIncomeType(t.type)) openingBalance += netAmount;
          else if (isExpenseType(t.type)) openingBalance -= Math.abs(amount);
        }
      });

      (periodTransactions || []).forEach(t => {
        if (!t) return;
        
        // APENAS transações pagas ou parciais devem ser contabilizadas
        const statusVal = String(t.status || '').toLowerCase();
        const hasPaymentDate = !!(t.paymentDate || t.payment_date);
        const isPaid = ['pago', 'completed', 'parcial', 'paid', 'approved', 'aprovado'].includes(statusVal) || hasPaymentDate;
        if (!isPaid) return;
        
        // Se for pagamento parcial, usa o valor efetivamente pago
        const baseAmount = statusVal === 'parcial' 
          ? parseMoney(t.paidAmount || 0) 
          : parseMoney(t.amount);
        const amount = baseAmount + parseMoney(t.interest);
        const cardFee = t.hasCardFee && isIncomeType(t.type) ? (Math.abs(baseAmount) * (parseMoney(t.cardFee) || 0)) / 100 : 0;
        const netAmount = isIncomeType(t.type) ? amount - cardFee : amount;
        if (isIncomeType(t.type)) periodIncome += netAmount;
        else if (isExpenseType(t.type)) periodExpense += Math.abs(amount);
      });

      return {
        opening: openingBalance,
        income: periodIncome,
        expense: periodExpense,
        closing: openingBalance + periodIncome - periodExpense
      };
    };

    const isInDateRange = (t) => {
      const relevantDate = extractTxDate(t);
      if (!relevantDate) return false;
      let tTime;
      try {
        tTime = startOfDay(relevantDate).getTime();
      } catch (e) {
        return false;
      }

      const startTime = startOfDay(dateRange.startDate).getTime();
      const endTime = endOfDay(dateRange.endDate).getTime();
      return tTime >= startTime && tTime <= endTime;
    };

    const periodBaseTransactions = React.useMemo(() => {
      return txArray.filter(t => {
        if (!t) return false;

        // Tipo
        if (typeFilter !== 'all') {
          if (typeFilter === 'income' && !isIncomeType(t.type)) return false;
          if (typeFilter === 'expense' && !isExpenseType(t.type)) return false;
        }

        // Status
        if (statusFilter === 'paid') {
          const statusValue = String(t.status || '').toLowerCase();
          const isPaidOrPartial = ['pago', 'completed', 'parcial', 'paid', 'approved', 'aprovado'].includes(statusValue) || !!(t.paymentDate || t.payment_date);
          if (!isPaidOrPartial) return false;
        } else if (statusFilter === 'pending') {
          const statusValue = String(t.status || '').toLowerCase();
          const isPending = ['pendente', 'agendado', 'pending', 'scheduled'].includes(statusValue);
          if (!isPending) return false;
        }

        // Data
        return isInDateRange(t);
      });
    }, [txArray, typeFilter, statusFilter, dateRange]);

    // Memoize calculations to prevent lag
    const filteredTransactions = React.useMemo(() => {
      return txArray
        .filter(t => {
          if (!t) return false;
          
          // 1. Filtrar por Tipo
          if (typeFilter !== 'all') {
            if (typeFilter === 'income' && !isIncomeType(t.type)) return false;
            if (typeFilter === 'expense' && !isExpenseType(t.type)) return false;
          }

          // 2. Filtrar por Status
          if (statusFilter === 'paid') {
            const statusValue = String(t.status || '').toLowerCase();
            const isPaidOrPartial = ['pago', 'completed', 'parcial', 'paid', 'approved', 'aprovado'].includes(statusValue) || !!(t.paymentDate || t.payment_date);
            if (!isPaidOrPartial) return false;
          } else if (statusFilter === 'pending') {
            const statusValue = String(t.status || '').toLowerCase();
            const isPending = ['pendente', 'agendado', 'pending', 'scheduled'].includes(statusValue);
            if (!isPending) return false;
          }
          
          // 3. Filtrar por Categoria
          const tCategoryName = t.categoryId ? categoryMap[t.categoryId] : (t.categoryName || t.category || 'Outros');
          const matchesCategory = categoryFilter === 'all' || 
                                 tCategoryName === categoryFilter ||
                                 t.categoryId === categoryFilter;
          if (!matchesCategory) return false;

          // 4. Filtrar por Busca
          const matchesSearch = (t.description || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                                (tCategoryName && tCategoryName.toLowerCase().includes(searchTerm.toLowerCase()));
          if (!matchesSearch) return false;

          // 5. Filtrar por Forma de Pagamento
          const matchesPaymentMethod = paymentMethodFilter === 'all' || t.paymentMethod === paymentMethodFilter;
          if (!matchesPaymentMethod) return false;

          // 6. Filtrar por Data (sempre local para evitar trazer dia anterior)
          return isInDateRange(t);
        })
      .sort((a, b) => {
        // Sort by relevant date (local)
        const aDate = extractTxDate(a);
        const bDate = extractTxDate(b);
        if (!aDate && !bDate) return 0;
        if (!aDate) return 1;
        if (!bDate) return -1;
        return bDate.getTime() - aDate.getTime();
      });
    }, [txArray, typeFilter, statusFilter, categoryFilter, searchTerm, paymentMethodFilter, dateRange, categories]);

    const balances = React.useMemo(
      () => calculateBalances(periodBaseTransactions),
      [txArray, dateRange, periodBaseTransactions]
    );

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Transações</h1>
            <p className="text-xs sm:text-sm text-slate-500">Gerencie suas receitas e despesas.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <PeriodFilter 
              onPeriodChange={setDateRange}
              mode="days"
              defaultPeriod="today"
            />
            {hasPermission('export_reports') && (
              <Button variant="outline" onClick={handleExport} className="flex items-center gap-2 flex-1 sm:flex-none">
                  <Download className="w-4 h-4" /> Exportar CSV
              </Button>
            )}
            {hasPermission('import_bank') && (
              <Button 
                onClick={() => setUploadOpen(true)} 
                variant="outline"
                className="flex items-center gap-2 flex-1 sm:flex-none"
              >
                <Upload className="w-4 h-4" /> Importar Extrato
              </Button>
            )}
            {hasPermission('view_transactions') && (
              <Button 
                onClick={() => setReconciliationOpen(true)} 
                variant="outline"
                className="flex items-center gap-2 flex-1 sm:flex-none"
              >
                <CheckCircle2 className="w-4 h-4" /> Conciliação
              </Button>
            )}
            {hasPermission('create_transactions') && (
              <Button onClick={() => { setEditingTransaction(null); setIsFormOpen(true); }} className="bg-primary hover:bg-primary w-full sm:w-auto">
                  <Plus className="w-4 h-4 mr-2" /> Nova Transação
              </Button>
            )}
        </div>
      </div>

      <BankStatementUpload 
        open={uploadOpen} 
        onOpenChange={setUploadOpen} 
        onExtracted={() => setReconciliationOpen(true)} 
      />
      
      <BankReconciliation 
        open={reconciliationOpen} 
        onOpenChange={setReconciliationOpen} 
      />

      {/* Balance Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-slate-500">Saldo Inicial</p>
                    <h3 className="text-xl font-bold text-slate-700">R$ {balances.opening.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                </div>
                <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                    <Wallet className="w-5 h-5" />
                </div>
            </CardContent>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-emerald-600">Entradas</p>
                    <h3 className="text-xl font-bold text-emerald-600">+ R$ {balances.income.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                </div>
                <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                    <TrendingUp className="w-5 h-5" />
                </div>
            </CardContent>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-rose-600">Saídas</p>
                    <h3 className="text-xl font-bold text-rose-600">- R$ {balances.expense.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                </div>
                <div className="p-2 bg-rose-100 rounded-lg text-rose-600">
                    <TrendingDown className="w-5 h-5" />
                </div>
            </CardContent>
        </Card>
        <Card className={balances.closing >= 0 ? "bg-emerald-600 border-emerald-600 shadow-md" : "bg-rose-600 border-rose-600 shadow-md"}>
            <CardContent className="p-4 flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-white/80">Saldo Final</p>
                    <h3 className="text-xl font-bold text-white">R$ {balances.closing.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                </div>
                <div className={`p-2 rounded-lg text-white ${balances.closing >= 0 ? 'bg-emerald-700' : 'bg-rose-700'}`}>
                    <Wallet className="w-5 h-5" />
                </div>
            </CardContent>
        </Card>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <TransactionFilters 
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          paymentMethodFilter={paymentMethodFilter}
          setPaymentMethodFilter={setPaymentMethodFilter}
          categories={categories}
        />

        <div className="overflow-x-auto">
            <Table>
                <TableHeader className="bg-slate-50">
                    <TableRow>
                        <TableHead className="pl-6 text-left">Data</TableHead>
                        <TableHead className="text-left">Descrição</TableHead>
                        <TableHead className="text-left">Categoria</TableHead>
                        <TableHead className="text-left">Forma</TableHead>
                        <TableHead className="text-left">Status</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead className="text-center">Conciliação</TableHead>
                        <TableHead className="text-right pr-6">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {paginatedTransactions.length > 0 ? (
                        paginatedTransactions.map((t) => (
                            <TableRow key={t.id} className="hover:bg-slate-50/50 group">
                                <TableCell className="font-medium text-slate-600 pl-6 text-left">
                                    {/* Mostrar data da transação (vencimento) */}
                                    {(() => {
                                      try {
                                        const dt = extractTxDate(t);
                                        if (!dt) return '-';
                                        return format(dt, "dd/MM/yyyy", { locale: ptBR });
                                      } catch (e) {
                                        console.error("Date formatting error:", e, t);
                                        return '-';
                                      }
                                    })()}
                                </TableCell>
                                <TableCell className="font-medium text-slate-900 text-left">
                                    {t.description}
                                    {t.installmentNumber && t.installmentTotal && (
                                        <span className="ml-2 text-xs text-slate-500 font-normal">
                                            ({t.installmentNumber}/{t.installmentTotal})
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell className="text-left">
                                    <Badge variant="secondary" className="capitalize font-normal bg-slate-100 text-slate-600 hover:bg-slate-200">
                                        {t.categoryId ? (categoryMap[t.categoryId] || 'Outros') : (t.categoryName || t.category || 'Outros')}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-left">
                                    <span className="text-xs font-medium text-slate-600">
                                        {t.paymentMethod && t.paymentMethod !== '-' ? t.paymentMethod : 'Outros'}
                                    </span>
                                </TableCell>
                                <TableCell className="text-left">
                                    <Badge 
                                        className={`font-normal ${
                                            t.status === 'pago' || t.status === 'completed' 
                                                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                                : t.status === 'parcial'
                                                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                                : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                        }`}
                                    >
                                        {t.status === 'pago' || t.status === 'completed' ? 'Pago' : t.status === 'parcial' ? 'Parcial' : 'Pendente'}
                                    </Badge>
                                </TableCell>
                                <TableCell className={`text-right font-bold ${['venda', 'venda_prazo', 'receita', 'income'].includes(t.type) ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    <div className="flex flex-col items-end">
                                        <span>
                                            {['venda', 'venda_prazo', 'receita', 'income'].includes(t.type) ? '+' : '-'} R$ {Math.abs(parseFloat(t.status === 'parcial' && t.paidAmount ? t.paidAmount : (t.amount || 0)) + parseFloat(t.interest || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                        {t.status === 'parcial' && t.paidAmount && (
                                            <span className="text-[10px] text-amber-600 font-normal">
                                                de R$ {parseFloat(t.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        )}
                                        {t.hasCardFee && parseFloat(t.cardFee) > 0 && (
                                            <span className="text-[10px] text-amber-600 font-normal">
                                                Taxa: {parseFloat(t.cardFee).toFixed(2)}% (-R$ {((Math.abs(parseFloat(t.amount || 0)) * parseFloat(t.cardFee)) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                                            </span>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="text-center" data-testid={`status-reconciliation-${t.id}`}>
                                    <div className="flex items-center justify-center gap-1">
                                        {t.isReconciled ? (
                                            <>
                                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                                <span className="text-xs font-medium text-emerald-600">Sim</span>
                                            </>
                                        ) : (
                                            <>
                                                <XCircle className="w-4 h-4 text-rose-600" />
                                                <span className="text-xs font-medium text-rose-600">Não</span>
                                            </>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right pr-6">
                                    <div className="flex justify-end">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100" data-testid={`button-actions-${t.id}`}>
                                                    <MoreHorizontal className="w-4 h-4 text-slate-500" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-40">
                                                {hasPermission(PERMISSIONS.EDIT_TRANSACTIONS) && (
                                                    <DropdownMenuItem 
                                                        className="cursor-pointer"
                                                        onClick={() => handleEdit(t)}
                                                        data-testid={`menu-edit-${t.id}`}
                                                    >
                                                        <Pencil className="w-4 h-4 mr-2" /> Editar
                                                    </DropdownMenuItem>
                                                )}
                                                {hasPermission(PERMISSIONS.DELETE_TRANSACTIONS) && (
                                                    <DropdownMenuItem 
                                                        className="text-rose-600 focus:text-rose-700 focus:bg-rose-50 cursor-pointer"
                                                        onClick={() => handleDelete(t.id)}
                                                        data-testid={`menu-delete-${t.id}`}
                                                    >
                                                        <Trash2 className="w-4 h-4 mr-2" /> Remover
                                                    </DropdownMenuItem>
                                                )}
                                                {!hasPermission(PERMISSIONS.EDIT_TRANSACTIONS) && !hasPermission(PERMISSIONS.DELETE_TRANSACTIONS) && (
                                                    <DropdownMenuItem disabled>
                                                        Sem permissão
                                                    </DropdownMenuItem>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={8} className="text-center py-10 text-slate-500">
                                Nenhuma transação encontrada.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
        <Pagination 
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={filteredTransactions.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
        />
      </div>

      <TransactionForm 
        key={editingTransaction?.id || 'new'}
        open={isFormOpen} 
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setEditingTransaction(null);
        }}
        onSubmit={handleSubmit}
        initialData={editingTransaction}
      />

      <BankStatementUpload
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onExtracted={handleStatementExtracted}
      />

      {statementData && (
        <BankReconciliation
          open={reconciliationOpen}
          onOpenChange={setReconciliationOpen}
          statementData={statementData}
          transactions={transactions}
        />
      )}
    </div>
  );
}