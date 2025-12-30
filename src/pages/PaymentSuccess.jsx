import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle2, Download } from 'lucide-react';

export default function PaymentSuccess() {
  const [, setLocation] = useLocation();
  const [paymentId, setPaymentId] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('payment_id');
    if (id) setPaymentId(id);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center p-4">
      <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur w-full max-w-md p-8 text-center">
        <div className="mb-6 flex justify-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-green-400" />
          </div>
        </div>

        <h1 className="text-3xl font-bold mb-2">Pagamento Confirmado!</h1>
        <p className="text-slate-400 mb-6">
          Sua assinatura foi ativada com sucesso. Bem-vindo ao HUA Analytics!
        </p>

        {paymentId && (
          <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-4 mb-6 text-left">
            <p className="text-xs text-slate-500 mb-1">ID do Pagamento</p>
            <p className="text-sm font-mono text-slate-300 break-all">{paymentId}</p>
          </div>
        )}

        <div className="space-y-3">
          <Button 
            onClick={() => setLocation('/login')}
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
            data-testid="button-success-login"
          >
            Acessar Minha Conta
          </Button>

          <Button 
            variant="outline"
            onClick={() => setLocation('/')}
            className="w-full border-slate-600 text-slate-300 hover:bg-slate-700/50"
            data-testid="button-success-home"
          >
            Voltar ao Início
          </Button>
        </div>

        <p className="text-xs text-slate-500 mt-6">
          Um email de confirmação foi enviado para você. Guarde-o como referência.
        </p>
      </Card>
    </div>
  );
}
