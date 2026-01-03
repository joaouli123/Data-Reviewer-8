import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { initMercadoPago, StatusScreen } from '@mercadopago/sdk-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '@/contexts/AuthContext';

// Inicializa o SDK fora do componente para evitar múltiplas inicializações
const publicKey = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY;
if (publicKey) {
  initMercadoPago(publicKey, { locale: 'pt-BR' });
}

export default function PaymentSuccess() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [paymentId, setPaymentId] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('payment_id') || params.get('paymentId');
    const status = params.get('status');

    console.log('PaymentSuccess Debug:', { id, status, user: !!user });

    if (id) {
      setPaymentId(id);
      
      // Se for uma aprovação simulada, não precisamos do StatusScreen
      if (id.startsWith('simulated_')) {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [user, window.location.search]);

  const initialization = {
    paymentId: paymentId,
  };

  const onError = (error) => {
    console.error('Status Screen Brick Error:', error);
    setLoading(false);
  };

  const onReady = () => {
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col items-center justify-center p-0 lg:p-4">
      <Card className="w-full max-w-2xl bg-white border-0 lg:border-slate-200 p-6 lg:p-8 shadow-none lg:shadow-sm rounded-none lg:rounded-xl">
        <div className="relative min-h-[400px]">
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-10">
              <Loader className="w-10 h-10 animate-spin text-blue-500 mb-4" />
              <p className="text-slate-500 font-medium">Carregando status do pagamento...</p>
            </div>
          )}

          {paymentId ? (
            paymentId.startsWith('simulated_') ? (
              <div className="text-center py-12 flex flex-col items-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                  <Check className="w-10 h-10 text-green-600" />
                </div>
                <h2 className="text-3xl font-bold mb-4 text-slate-900">Pagamento Confirmado!</h2>
                <p className="text-slate-600 mb-8 text-lg px-4">
                  Sua assinatura foi ativada com sucesso. Você já pode aproveitar todos os recursos do sistema.
                </p>
                <Button 
                  onClick={() => window.location.href = '/'} 
                  className="w-full max-w-sm bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 rounded-lg text-lg shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  Ir para o Painel
                </Button>
              </div>
            ) : (
              <StatusScreen
                initialization={initialization}
                onReady={onReady}
                onError={onError}
                customization={{
                  visual: {
                    hideStatusDetails: false,
                    hideTransactionDate: false,
                    style: {
                      theme: 'default',
                    }
                  },
                  backUrls: {
                    'error': window.location.origin + '/checkout',
                    'return': window.location.origin + '/'
                  }
                }}
              />
            )
          ) : !loading && (
            <div className="text-center py-12">
              <h2 className="text-xl font-bold mb-4 text-red-600">ID de Pagamento não encontrado</h2>
              <p className="text-slate-500 mb-8">
                Não foi possível identificar a transação para exibir o status.
              </p>
              <Button onClick={() => setLocation('/')} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 rounded-lg">
                Voltar para Início
              </Button>
            </div>
          )}
        </div>
        
        <div className="mt-8 pt-6 border-t border-slate-100">
           <Button 
            variant="ghost" 
            onClick={() => setLocation('/')}
            className="text-slate-500 hover:text-blue-600 flex items-center gap-2 mx-auto transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para Home
          </Button>
        </div>
      </Card>
    </div>
  );
}
