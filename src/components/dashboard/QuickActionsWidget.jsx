import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Plus, Upload, DollarSign, Users, TrendingUp, FileText, Calculator } from 'lucide-react';
import { Link } from 'react-router-dom';
import TransactionForm from '../transactions/TransactionForm';
import BankStatementUpload from '../transactions/BankStatementUpload';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Transaction } from '@/api/entities';
import { toast } from 'sonner';

export default function QuickActionsWidget() {
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
      onClick: () => setTransactionFormOpen(true)
    },
    {
      label: 'Importar Extrato',
      icon: Upload,
      className: 'bg-primary/80 hover:bg-primary/70 text-white',
      onClick: () => setUploadOpen(true)
    },
    {
      label: 'Ver Transações',
      icon: DollarSign,
      className: 'bg-primary/60 hover:bg-primary/50 text-white',
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
      className: 'bg-primary/80 hover:bg-primary/70 text-white',
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
      className: 'bg-primary/60 hover:bg-primary/50 text-white',
      link: '/pricingcalculator'
    }
  ];

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {actions.map((action) => {
          const ButtonContent = (
            <>
              <action.icon className="w-5 h-5 mb-2" />
              <span className="text-sm font-medium">{action.label}</span>
            </>
          );

          if (action.link) {
            return (
              <Link key={action.label} to={action.link}>
                <Button
                  className={`w-full h-24 flex flex-col items-center justify-center ${action.className}`}
                >
                  {ButtonContent}
                </Button>
              </Link>
            );
          }

          return (
            <Button
              key={action.label}
              onClick={action.onClick}
              className={`w-full h-24 flex flex-col items-center justify-center ${action.className}`}
            >
              {ButtonContent}
            </Button>
          );
        })}
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
