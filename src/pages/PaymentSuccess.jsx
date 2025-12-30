import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader } from 'lucide-react';

export default function PaymentSuccess() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const statusScreenBrickContainerRef = useRef(null);
  const [brickRendered, setBrickRendered] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentId = params.get('payment_id') || params.get('paymentId');

    if (!paymentId) {
      setLoading(false);
      return;
    }

    const renderStatusBrick = async () => {
      try {
        if (!window.MercadoPago) {
          console.error('Mercado Pago SDK not loaded');
          return;
        }

        const publicKey = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY;
        const mp = new window.MercadoPago(publicKey);
        const bricksBuilder = mp.bricks();

        const settings = {
          initialization: {
            paymentId: paymentId,
          },
          customization: {
            visual: {
              hideStatusDetails: false,
              hideTransactionDate: false,
              style: {
                theme: 'dark',
              },
            },
            backUrls: {
              'error': window.location.origin + '/checkout',
              'return': window.location.origin + '/login'
            }
          },
          callbacks: {
            onReady: () => {
              setLoading(false);
              setBrickRendered(true);
            },
            onError: (error) => {
              console.error('Status Brick Error:', error);
              setLoading(false);
            },
          },
        };

        await bricksBuilder.create('statusScreen', 'statusScreenBrick_container', settings);
      } catch (error) {
        console.error('Error rendering Status Brick:', error);
        setLoading(false);
      }
    };

    renderStatusBrick();
  }, [brickRendered]);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-slate-800 border-slate-700 p-8">
        <div id="statusScreenBrick_container">
          {loading && (
            <div className="flex flex-col items-center py-12">
              <Loader className="w-8 h-8 animate-spin text-blue-500 mb-4" />
              <p className="text-slate-400">Consultando status do pagamento...</p>
            </div>
          )}
        </div>

        {!loading && !brickRendered && (
          <div className="text-center py-8">
            <h2 className="text-xl font-bold mb-4">Pagamento Processado</h2>
            <p className="text-slate-400 mb-8">
              Não conseguimos carregar os detalhes do status, mas seu pagamento foi recebido.
            </p>
            <Button onClick={() => setLocation('/login')} className="w-full">
              Ir para o Login
            </Button>
          </div>
        )}
        
        <div className="mt-8 pt-6 border-t border-slate-700">
           <Button 
            variant="ghost" 
            onClick={() => setLocation('/')}
            className="text-slate-400 hover:text-white flex items-center gap-2 mx-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para Home
          </Button>
        </div>
      </Card>
    </div>
  );
}
