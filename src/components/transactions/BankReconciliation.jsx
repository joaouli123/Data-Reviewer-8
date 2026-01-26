import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, XCircle, AlertCircle, Plus, Loader2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiRequest } from '@/lib/queryClient';
import TransactionForm from './TransactionForm';

export default function BankReconciliation({ open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("unmatched");
  const [lastFileName, setLastFileName] = useState(localStorage.getItem('lastBankStatementFile'));
  const [isTransactionFormOpen, setIsTransactionFormOpen] = useState(false);
  const [selectedBankItemForForm, setSelectedBankItemForForm] = useState(null);
  const [selectedBankItemId, setSelectedBankItemId] = useState(null);
  const [isAutoReconciling, setIsAutoReconciling] = useState(false);
  const autoReconcileTriggered = useRef(false);

  // Sincroniza o nome do arquivo ao abrir
  useEffect(() => {
    if (open) {
      const fileName = localStorage.getItem('lastBankStatementFile');
      setLastFileName(fileName);
      autoReconcileTriggered.current = false;
    }
  }, [open]);

  // Busca os itens do banco
  const { data: bankItemsRaw = [], isLoading: isLoadingItems, refetch: refetchBankItems } = useQuery({
    queryKey: ['/api/bank/items'],
    queryFn: () => apiRequest('GET', '/api/bank/items'),
    staleTime: 0,
    gcTime: 0
  });

  const bankItems = Array.isArray(bankItemsRaw) ? bankItemsRaw : (bankItemsRaw.data || []);

  // Busca sugestões quando um item é selecionado
  const { data: suggestions = [], isLoading: isLoadingSuggestions } = useQuery({
    queryKey: ['/api/bank/suggest', selectedBankItemId],
    queryFn: () => {
      if (!selectedBankItemId) return [];
      return apiRequest('GET', `/api/bank/suggest/${selectedBankItemId}`);
    },
    enabled: !!selectedBankItemId
  });

  // Atualiza a lista ao abrir o modal
  useEffect(() => {
    if (open) {
      refetchBankItems();
    }
  }, [open, refetchBankItems]);

  // --- MUTAÇÕES ---

  const matchMutation = useMutation({
    mutationFn: ({ bankItemId, transactionId }) => apiRequest('POST', '/api/bank/match', { bankItemId, transactionId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bank/items'] });
      queryClient.invalidateQueries({ exact: false, queryKey: ['/api/transactions'] });
      toast.success('Conciliação realizada com sucesso!');
      setSelectedBankItemId(null);
      setActiveTab("unmatched");
    },
    onError: () => toast.error('Erro ao realizar conciliação')
  });

  const createTransactionAndMatchMutation = useMutation({
    mutationFn: async (transactionData) => {
      const transaction = await apiRequest('POST', '/api/transactions', transactionData);
      if (selectedBankItemForForm) {
        return matchMutation.mutateAsync({ 
          bankItemId: selectedBankItemForForm.id, 
          transactionId: transaction.id 
        });
      }
      return transaction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bank/items'] });
      queryClient.invalidateQueries({ exact: false, queryKey: ['/api/transactions'] });
      setIsTransactionFormOpen(false);
      setSelectedBankItemForForm(null);
      toast.success('Transação criada e conciliada!');
    },
    onError: (error) => toast.error(error.message || 'Erro ao criar transação')
  });

  const clearBankDataMutation = useMutation({
    mutationFn: () => apiRequest('DELETE', '/api/bank/clear'),
    onSuccess: () => {
      queryClient.setQueryData(['/api/bank/items'], []);
      queryClient.invalidateQueries({ queryKey: ['/api/bank/items'] });
      localStorage.removeItem('lastBankStatementFile');
      localStorage.removeItem('lastBankStatementContent');
      setLastFileName(null);
      toast.success('Dados removidos');
      onOpenChange(false);
    },
    onError: () => toast.error('Erro ao limpar dados')
  });

  // --- LÓGICA DE AUTO-CONCILIAÇÃO INTELIGENTE ---
  const performAutoReconciliation = async () => {
    if (!bankItems.length || isAutoReconciling) return;
    setIsAutoReconciling(true);
    let count = 0;
    const pending = bankItems.filter(i => i.status === 'PENDING');

    for (const item of pending) {
      try {
        const suggs = await apiRequest('GET', `/api/bank/suggest/${item.id}`);
        if (!suggs.length) continue;

        // Usa o sistema de score: aceita match automático se score >= 70 (alta confiança)
        // Score 70+ significa: valor exato (50) + data próxima (20+) ou valor próximo + descrição similar
        const bestMatch = suggs[0]; // Já vem ordenado por score do backend
        
        if (bestMatch && bestMatch.score >= 70) {
          await apiRequest('POST', '/api/bank/match', { bankItemId: item.id, transactionId: bestMatch.id });
          count++;
        }
      } catch (e) {
        console.error('Auto-reconcile error:', e);
      }
    }

    setIsAutoReconciling(false);
    queryClient.invalidateQueries({ queryKey: ['/api/bank/items'] });
    queryClient.invalidateQueries({ exact: false, queryKey: ['/api/transactions'] });
    
    if (count > 0) {
      toast.success(`${count} itens conciliados automaticamente!`);
    } else {
      toast.info('Nenhum match automático encontrado. Use "Buscar Match" para conciliar manualmente.');
    }
  };

  useEffect(() => {
    if (open && bankItems.length > 0 && !autoReconcileTriggered.current) {
      autoReconcileTriggered.current = true;
      setTimeout(performAutoReconciliation, 500);
    }
  }, [open, bankItems.length]);

  // Filtros mais abrangentes para garantir que itens apareçam
  const pendingItems = bankItems.filter(item => {
    const status = (item.status || 'PENDING').toUpperCase();
    return status === 'PENDING' || status === 'PENDENTE';
  });
  
  const reconciledItems = bankItems.filter(item => {
    const status = (item.status || '').toUpperCase();
    return status === 'RECONCILED' || status === 'MATCHED' || status === 'CONCILIADO' || status === 'COMPLETED';
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Conciliação Bancária</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {lastFileName && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-600">Arquivo Carregado</p>
                <p className="text-sm font-medium text-blue-900">{lastFileName}</p>
              </div>
              <Button 
                size="sm" variant="ghost" className="text-rose-600 hover:bg-rose-50"
                onClick={() => clearBankDataMutation.mutate()} disabled={clearBankDataMutation.isPending}
              >
                <Trash2 className="w-4 h-4 mr-1" /> Limpar
              </Button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <p className="text-sm font-medium text-amber-900">Pendentes</p>
              </div>
              <p className="text-2xl font-bold text-amber-700">{pendingItems.length}</p>
            </div>
            <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <p className="text-sm font-medium text-emerald-900">Conciliados</p>
              </div>
              <p className="text-2xl font-bold text-emerald-700">{reconciledItems.length}</p>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="unmatched">Pendentes ({pendingItems.length})</TabsTrigger>
              <TabsTrigger value="reconciled">Conciliados ({reconciledItems.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="unmatched" className="space-y-4 mt-4">
              {isLoadingItems ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>
              ) : pendingItems.length === 0 ? (
                <div className="text-center py-8 text-slate-500">Nenhum item pendente.</div>
              ) : (
                pendingItems.map((item) => (
                  <div key={item.id} className="p-4 bg-white rounded-lg border space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          parseFloat(item.amount) > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                        }`}>
                          {parseFloat(item.amount) > 0 ? '+' : '-'}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">{item.description}</p>
                          <div className="flex items-center gap-3 text-xs text-slate-600">
                            <span>{format(new Date(item.date), "dd/MM/yyyy", { locale: ptBR })}</span>
                            <span className="font-semibold">
                              R$ {Math.abs(parseFloat(item.amount)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <XCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                          <span className="text-xs font-medium text-rose-600">Pendente</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setSelectedBankItemId(selectedBankItemId === item.id ? null : item.id)}>
                          {selectedBankItemId === item.id ? 'Fechar' : 'Buscar Match'}
                        </Button>
                        <Button size="sm" onClick={() => { setSelectedBankItemForForm(item); setIsTransactionFormOpen(true); }}>
                          <Plus className="w-4 h-4 mr-1" /> Criar Transação
                        </Button>
                      </div>
                    </div>

                    {selectedBankItemId === item.id && (
                      <div className="mt-4 p-3 bg-slate-50 rounded-md border border-slate-200">
                        <h4 className="text-sm font-semibold mb-2">Sugestões do Sistema:</h4>
                        {isLoadingSuggestions ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : suggestions.length === 0 ? (
                          <p className="text-xs text-slate-500">Nenhuma transação similar encontrada.</p>
                        ) : (
                          <div className="space-y-2">
                            {suggestions.map((t) => (
                              <div key={t.id} className="flex items-center justify-between p-2 bg-white rounded border text-sm">
                                <div>
                                  <p className="font-medium">{t.description}</p>
                                  <p className="text-xs text-slate-500">
                                    {format(new Date(t.date), "dd/MM/yyyy")} - R$ {Math.abs(parseFloat(t.amount)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </p>
                                </div>
                                <Button size="sm" variant="ghost" className="text-emerald-600" onClick={() => matchMutation.mutate({ bankItemId: item.id, transactionId: t.id })}>
                                  Conciliar
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="reconciled" className="space-y-2 mt-4">
              {reconciledItems.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{item.description}</p>
                    <p className="text-xs text-slate-600">
                      {format(new Date(item.date), "dd/MM/yyyy")} - R$ {Math.abs(parseFloat(item.amount)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span className="text-xs font-medium text-emerald-600">Conciliado</span>
                  </div>
                </div>
              ))}
            </TabsContent>
          </Tabs>

          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          </div>
        </div>

        {selectedBankItemForForm && (
          <TransactionForm
            open={isTransactionFormOpen}
            onOpenChange={(value) => { setIsTransactionFormOpen(value); if (!value) setSelectedBankItemForForm(null); }}
            onSubmit={(data) => {
              const transactionData = Array.isArray(data) ? data : [data];
              transactionData.forEach(t => createTransactionAndMatchMutation.mutate(t));
            }}
            initialData={selectedBankItemForForm ? {
              description: selectedBankItemForForm.description,
              amount: Math.abs(parseFloat(selectedBankItemForForm.amount)).toString(),
              date: new Date(selectedBankItemForForm.date),
              type: parseFloat(selectedBankItemForForm.amount) > 0 ? 'venda' : 'compra'
            } : null}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}