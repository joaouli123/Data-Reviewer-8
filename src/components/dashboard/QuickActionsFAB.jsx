import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Plus, Upload, DollarSign, Users, TrendingUp, FileText, Calculator } from 'lucide-react';
import { Link } from 'react-router-dom';
import TransactionForm from '../transactions/TransactionForm';
import BankStatementUpload from '../transactions/BankStatementUpload';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Transaction } from '@/api/entities';
import { toast } from 'sonner';

export default function QuickActionsFAB() {
  const [isOpen, setIsOpen] = useState(false);
  const [transactionFormOpen, setTransactionFormOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const queryClient = useQueryClient();

  const createTransactionMutation = useMutation({
    mutationFn: (data) => Transaction.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setTransactionFormOpen(false);
      toast.success('Transação criada!');
    }
  });

  const handleTransactionSubmit = (data) => {
    createTransactionMutation.mutate(data);
  };

  const handleStatementExtracted = (data) => {
    toast.success(`${data.length} transações extraídas!`);
    setUploadOpen(false);
  };

  const actions = [
    {
      label: 'Nova Transação',
      icon: Plus,
      className: 'bg-primary hover:bg-primary/90 text-white',
      onClick: () => {
        setTransactionFormOpen(true);
        setIsOpen(false);
      }
    },
    {
      label: 'Importar Extrato',
      icon: Upload,
      className: 'bg-primary hover:bg-primary/90 text-white',
      onClick: () => {
        setUploadOpen(true);
        setIsOpen(false);
      }
    },
    {
      label: 'Ver Transações',
      icon: DollarSign,
      className: 'bg-accent hover:bg-accent/90 text-primary font-semibold',
      link: '/transactions'
    },
    {
      label: 'Clientes',
      icon: Users,
      className: 'bg-primary hover:bg-primary/90 text-white',
      link: '/customers'
    },
    {
      label: 'Fluxo de Caixa',
      icon: TrendingUp,
      className: 'bg-accent hover:bg-accent/90 text-primary font-semibold',
      link: '/cashflowforecast'
    },
    {
      label: 'IA Analista',
      icon: FileText,
      className: 'bg-primary hover:bg-primary/90 text-white',
      link: '/reports'
    },
    {
      label: 'Calc. Preços',
      icon: Calculator,
      className: 'bg-accent hover:bg-accent/90 text-primary font-semibold',
      link: '/pricingcalculator'
    }
  ];

  return (
    <>
      <div className="fixed bottom-8 right-8 z-40">
        <div className="relative">
          {/* Menu Expandido */}
          {isOpen && (
            <div className="absolute bottom-20 right-0 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-border p-3 mb-2 min-w-max max-h-96 overflow-y-auto">
              <div className="space-y-2">
                {actions.map((action) => {
                  const Icon = action.icon;
                  
                  if (action.link) {
                    return (
                      <Link key={action.label} to={action.link} onClick={() => setIsOpen(false)}>
                        <button className="w-full flex items-center gap-3 px-4 py-2 rounded-md hover:bg-muted/50 dark:hover:bg-muted/20 transition-colors text-left">
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          <span className="text-sm font-medium">{action.label}</span>
                        </button>
                      </Link>
                    );
                  }

                  return (
                    <button
                      key={action.label}
                      onClick={action.onClick}
                      className="w-full flex items-center gap-3 px-4 py-2 rounded-md hover:bg-muted/50 dark:hover:bg-muted/20 transition-colors text-left"
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm font-medium">{action.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Botão FAB */}
          <Button
            size="icon"
            className="bg-primary hover:bg-primary/90 text-white rounded-full w-14 h-14 shadow-lg"
            onClick={() => setIsOpen(!isOpen)}
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
            data-testid="button-quick-actions-fab"
          >
            <Plus className="w-6 h-6" />
          </Button>
        </div>
      </div>

      <TransactionForm
        open={transactionFormOpen}
        onOpenChange={setTransactionFormOpen}
        onSubmit={handleTransactionSubmit}
      />

      <BankStatementUpload
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onExtracted={handleStatementExtracted}
      />
    </>
  );
}
