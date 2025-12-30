import React, { useState } from 'react';
import { Transaction, Customer } from '@/api/entities';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Download, Trash2, Pencil, DollarSign, TrendingUp, Clock, CheckCircle2, Eye, MoreHorizontal, Filter } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from "@/lib/utils";
import NewSaleDialog from '../components/customers/NewSaleDialog';
import CustomerSalesDialog from '../components/customers/CustomerSalesDialog';
import Pagination from '../components/Pagination';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatCurrency, formatDate } from '@/utils/formatters';

export default function SalesPage() {
  const [isNewSaleOpen, setIsNewSaleOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isSalesViewDialogOpen, setIsSalesViewDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  const { company } = useAuth();
  const queryClient = useQueryClient();

  // Fetch transactions (sales)
  const { data: transactionsData = [], isLoading } = useQuery({
    queryKey: ['/api/transactions', company?.id],
    queryFn: () => apiRequest('/api/transactions'),
    enabled: !!company?.id,
    staleTime: 0,
  });

  // Fetch customers for details
  const { data: customers = [] } = useQuery({
    queryKey: ['/api/customers', company?.id],
    queryFn: () => Customer.list(),
    enabled: !!company?.id,
  });

  const transactions = Array.isArray(transactionsData) ? transactionsData : (transactionsData?.data || []);
  
  // Filter only sales (type = 'venda' or 'income')
  const sales = transactions.filter(t => 
    t.customerId && (t.type === 'venda' || t.type === 'income')
  );

  // Aggregate sales by installment group for summary
  const aggregatedSales = React.useMemo(() => {
    const grouped = {};
    sales.forEach(s => {
      const groupKey = s.installmentGroup || `sale-${s.id}`;
      if (!grouped[groupKey]) {
        grouped[groupKey] = {
          id: groupKey,
          installments: [],
          customerId: s.customerId,
          totalAmount: 0,
          paidAmount: 0,
          isPaid: false,
          date: s.date,
        };
      }
      grouped[groupKey].installments.push(s);
      grouped[groupKey].totalAmount += parseFloat(s.amount || 0);
      grouped[groupKey].paidAmount += parseFloat(s.paidAmount || 0);
    });

    return Object.values(grouped).map(g => {
      const isPaid = g.installments.every(s => s.status === 'completed' || s.status === 'pago');
      return {
        ...g,
        isPaid,
        status: isPaid ? 'pago' : g.paidAmount > 0 ? 'parcial' : 'pendente',
        customer: customers.find(c => c.id === g.customerId)
      };
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales, customers]);

  // Filter and search
  const filteredSales = aggregatedSales.filter(sale => {
    const matchesSearch = !searchTerm || 
      sale.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || sale.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedSales = filteredSales.slice(startIndex, endIndex);

  // Calculate KPIs
  const totalRevenue = aggregatedSales.reduce((acc, s) => acc + s.totalAmount, 0);
  const totalReceived = aggregatedSales.reduce((acc, s) => acc + s.paidAmount, 0);
  const totalPending = totalRevenue - totalReceived;
  const completedSales = aggregatedSales.filter(s => s.isPaid).length;

  const deleteMutation = useMutation({
    mutationFn: async (saleId) => {
      const installmentsToDelete = aggregatedSales.find(s => s.id === saleId)?.installments || [];
      
      for (const installment of installmentsToDelete) {
        await apiRequest(`/api/transactions/${installment.id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${JSON.parse(localStorage.getItem('auth') || '{}').token}`,
          },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      toast.success('Venda removida com sucesso!');
      setSelectedSale(null);
    },
    onError: (error) => {
      toast.error(error?.message || 'Erro ao deletar venda');
    }
  });

  const handleExportExcel = () => {
    try {
      const headers = ['Data', 'Cliente', 'Total', 'Pago', 'Pendente', 'Status', 'Parcelas'];
      const rows = filteredSales.map(sale => [
        format(parseISO(sale.date), 'dd/MM/yyyy', { locale: ptBR }),
        sale.customer?.name || 'N/A',
        sale.totalAmount.toFixed(2).replace('.', ','),
        sale.paidAmount.toFixed(2).replace('.', ','),
        (sale.totalAmount - sale.paidAmount).toFixed(2).replace('.', ','),
        sale.status === 'pago' ? 'Pago' : sale.status === 'parcial' ? 'Parcial' : 'Pendente',
        sale.installments.length,
      ]);

      const csvContent = [
        headers.join(';'),
        ...rows.map(row => row.join(';'))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `vendas-${format(new Date(), 'dd-MM-yyyy')}.csv`);
      link.click();
      toast.success('Vendas exportadas com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar vendas');
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'pago':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Pago</Badge>;
      case 'parcial':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Parcial</Badge>;
      case 'pendente':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Pendente</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white">Vendas</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Gestão completa de vendas e acompanhamento de pagamentos
          </p>
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto flex-col sm:flex-row">
          <Button 
            variant="outline"
            onClick={handleExportExcel}
            className="border-slate-200"
          >
            <Download className="w-4 h-4 mr-2" /> Exportar
          </Button>
          <Button 
            className="bg-primary hover:bg-primary"
            onClick={() => setIsNewSaleOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" /> Nova Venda
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-slate-200 bg-white dark:bg-slate-950">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Receita Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {formatCurrency(totalRevenue)}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {aggregatedSales.length} vendas
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white dark:bg-slate-950">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Recebido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalReceived)}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {completedSales} vendas quitadas
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white dark:bg-slate-950">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Pendente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(totalPending)}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {aggregatedSales.filter(s => !s.isPaid).length} vendas em aberto
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white dark:bg-slate-950">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Taxa Recebimento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {totalRevenue > 0 ? ((totalReceived / totalRevenue) * 100).toFixed(1) : 0}%
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Do total de vendas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Buscar por cliente ou ID da venda..." 
                className="pl-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
            <Select value={statusFilter} onValueChange={(value) => {
              setStatusFilter(value);
              setCurrentPage(1);
            }}>
              <SelectTrigger className="w-full sm:w-40 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
                <SelectItem value="parcial">Parcial</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Sales Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-900">
              <TableRow className="border-slate-200 dark:border-slate-800 hover:bg-transparent">
                <TableHead className="text-slate-600 dark:text-slate-400">Data</TableHead>
                <TableHead className="text-slate-600 dark:text-slate-400">Cliente</TableHead>
                <TableHead className="text-right text-slate-600 dark:text-slate-400">Total</TableHead>
                <TableHead className="text-right text-slate-600 dark:text-slate-400">Recebido</TableHead>
                <TableHead className="text-right text-slate-600 dark:text-slate-400">Pendente</TableHead>
                <TableHead className="text-center text-slate-600 dark:text-slate-400">Parcelas</TableHead>
                <TableHead className="text-center text-slate-600 dark:text-slate-400">Status</TableHead>
                <TableHead className="text-center text-slate-600 dark:text-slate-400">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                    Carregando vendas...
                  </TableCell>
                </TableRow>
              ) : paginatedSales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                    Nenhuma venda encontrada
                  </TableCell>
                </TableRow>
              ) : (
                paginatedSales.map((sale) => (
                  <TableRow key={sale.id} className="border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50">
                    <TableCell className="text-slate-900 dark:text-white">
                      {format(parseISO(sale.date), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-slate-900 dark:text-white">
                      {sale.customer?.name || 'N/A'}
                    </TableCell>
                    <TableCell className="text-right text-slate-900 dark:text-white font-semibold">
                      {formatCurrency(sale.totalAmount)}
                    </TableCell>
                    <TableCell className="text-right text-green-600 font-semibold">
                      {formatCurrency(sale.paidAmount)}
                    </TableCell>
                    <TableCell className="text-right text-orange-600 font-semibold">
                      {formatCurrency(sale.totalAmount - sale.paidAmount)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{sale.installments.length}x</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(sale.status)}
                    </TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setSelectedCustomer(sale.customer);
                            setIsSalesViewDialogOpen(true);
                          }}>
                            <Eye className="w-4 h-4 mr-2" />
                            Ver Detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => deleteMutation.mutate(sale.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Deletar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(filteredSales.length / pageSize)}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
            totalItems={filteredSales.length}
          />
        </div>
      </div>

      {/* Dialogs */}
      <NewSaleDialog 
        open={isNewSaleOpen}
        onOpenChange={setIsNewSaleOpen}
        customers={customers}
      />

      <CustomerSalesDialog
        customer={selectedCustomer}
        open={isSalesViewDialogOpen}
        onOpenChange={setIsSalesViewDialogOpen}
      />
    </div>
  );
}
