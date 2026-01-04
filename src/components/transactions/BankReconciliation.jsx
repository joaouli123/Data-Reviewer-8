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

  // --- QUERY DE BUSCA ---
  const { data: bankItemsRaw = [], isLoading: isLoadingItems, refetch, isError, error } = useQuery({
    queryKey: ['/api/bank/items'],
    queryFn: async () => {
      console.log("Fazendo fetch dos itens...");
      const res = await apiRequest('GET', '/api/bank/items');
      console.log("Fetch retornou:", res);
      return res;
    },
    // Força atualização sempre que abre
    refetchOnWindowFocus: true, 
    staleTime: 0
  });

  const bankItems = Array.isArray(bankItemsRaw) ? bankItemsRaw : (bankItemsRaw.data || []);

  // Força atualização ao abrir o modal
  useEffect(() => {
    if (open) {
      refetch();
    }
  }, [open, refetch]);

  // --- MUTAÇÕES ---
  const clearBankDataMutation = useMutation({
    mutationFn: () => apiRequest('DELETE', '/api/bank/clear'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bank/items'] });
      localStorage.removeItem('lastBankStatementFile');
      setLastFileName(null);
      toast.success('Dados limpos');
    },
  });

  // --- LÓGICA SIMPLIFICADA (SEM FILTROS COMPLEXOS) ---
  const pendingItems = bankItems.filter(i => !i.status || i.status === 'PENDING' || i.status === 'PENDENTE');
  const reconciledItems = bankItems.filter(i => i.status === 'RECONCILED' || i.status === 'MATCHED' || i.status === 'CONCILIADO');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Conciliação Bancária (MODO DEBUG)</DialogTitle>
        </DialogHeader>

        {/* --- ÁREA DE DEBUG (SOMENTE PARA DIAGNÓSTICO) --- */}
        <div className="p-4 bg-slate-950 text-green-400 text-xs font-mono rounded-md overflow-auto max-h-40 border-2 border-red-500">
          <p className="font-bold text-white mb-2">--- PAINEL DE DIAGNÓSTICO ---</p>
          <p>Status do Carregamento: {isLoadingItems ? 'Carregando...' : 'Pronto'}</p>
          <p>Deu Erro?: {isError ? `SIM: ${error.message}` : 'Não'}</p>
          <p>Total de Itens Recebidos: {bankItems.length}</p>
          <p>Itens Pendentes Filtrados: {pendingItems.length}</p>
          <hr className="border-gray-700 my-2"/>
          <p className="text-white">DADOS BRUTOS (Primeiros 3 itens):</p>
          <pre>{JSON.stringify(bankItems.slice(0, 3), null, 2)}</pre>
        </div>
        {/* ----------------------------------------------- */}

        <div className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
             <p className="text-sm text-slate-500">Arquivo: {lastFileName || 'Nenhum'}</p>
             <Button variant="destructive" size="sm" onClick={() => clearBankDataMutation.mutate()}>
                <Trash2 className="w-4 h-4 mr-2" /> Limpar Tudo
             </Button>
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
                <div className="text-center py-8 text-slate-500 border-2 border-dashed rounded-lg">
                    Nenhum item pendente encontrado na lista filtrada.
                    <br/>Verifique o Painel de Diagnóstico acima.
                </div>
              ) : (
                pendingItems.map((item) => (
                  <div key={item.id} className="p-4 bg-white rounded-lg border space-y-2">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="font-bold">{item.description}</p>
                            <p className="text-xs text-slate-500">
                                {item.date ? format(new Date(item.date), "dd/MM/yyyy") : 'Sem data'} | ID: {item.id}
                            </p>
                        </div>
                        <div className="text-right">
                            <span className="font-bold block">R$ {item.amount}</span>
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                                {item.status}
                            </span>
                        </div>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="reconciled">
                <p>Itens conciliados: {reconciledItems.length}</p>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}