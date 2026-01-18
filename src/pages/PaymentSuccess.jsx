import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { initMercadoPago, StatusScreen } from '@mercadopago/sdk-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader, Check, MessageCircle, Download, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Inicializa o SDK fora do componente para evitar múltiplas inicializações
const publicKey = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY;
const hasPublicKey = !!publicKey;
if (hasPublicKey) {
  initMercadoPago(publicKey, { locale: 'pt-BR' });
}

export default function PaymentSuccess() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [paymentId, setPaymentId] = useState(null);
  const [ticketUrl, setTicketUrl] = useState(null);
  const [dueDate, setDueDate] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('payment_id') || params.get('paymentId');
    const status = params.get('status');
    const rawTicket = params.get('ticket_url') || params.get('ticketUrl') || params.get('ticket');
    const due = params.get('due_date');
    const decodedTicket = rawTicket ? decodeURIComponent(rawTicket) : null;

    if (decodedTicket) {
      setTicketUrl(decodedTicket);
      setLoading(false);
    }
    if (due) setDueDate(due);


    if (id) {
      setPaymentId(id);
      
      // Se for uma aprovação simulada, não precisamos do StatusScreen
      if (id.startsWith('simulated_') || status === 'approved') {
        setLoading(false);
        // Persist payment status in localStorage and potentially update company context
        const auth = localStorage.getItem("auth");
        if (auth) {
          try {
            const parsed = JSON.parse(auth);
            const updatedAuth = {
              ...parsed,
              paymentPending: false,
              company: { ...parsed.company, paymentStatus: 'approved' }
            };
            localStorage.setItem("auth", JSON.stringify(updatedAuth));
            
            // Dispatch storage event to notify AuthContext in other tabs or current tab
            window.dispatchEvent(new Event('storage'));
            
            // Forçamos o reload se necessário, ou apenas deixamos o botão levar ao dashboard
          } catch (e) {
          }
        }
      }
    } else {
      setLoading(false);
    }
  }, [user, window.location.search]);

  const initialization = {
    paymentId: paymentId,
  };

  const onError = (error) => {
    setLoading(false);
  };

  const onReady = () => {
    setLoading(false);
  };

  const whatsappNumber = "5554996231432";
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=Olá,%20envio%20comprovante%20do%20boleto%20para%20liberação%20do%20acesso.`;
  const dueDateText = dueDate
    ? format(new Date(dueDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    : "próximo dia útil";

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

          {ticketUrl ? (
            <div className="text-center py-10 flex flex-col items-center">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 className="w-10 h-10 text-emerald-600" />
              </div>
              <h2 className="text-3xl font-bold mb-2 text-slate-900">Boleto emitido com sucesso</h2>
              <p className="text-slate-600 mb-6 text-base px-4">
                Sua conta foi criada com sucesso. O boleto foi emitido com vencimento em <strong>{dueDateText}</strong>.
              </p>
              <p className="text-slate-500 mb-8 text-sm px-6">
                A compensação pode levar até <strong>1 dia útil</strong>. Se quiser liberação antecipada, envie o comprovante no WhatsApp.
              </p>

              <div className="w-full max-w-sm space-y-3">
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 rounded-lg"
                  onClick={() => window.open(whatsappUrl, '_blank')}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Enviar comprovante no WhatsApp
                </Button>

                <Button asChild variant="outline" className="w-full h-11">
                  <a href={ticketUrl} target="_blank" rel="noopener noreferrer">
                    <Download className="w-4 h-4 mr-2" />
                    Baixar boleto novamente
                  </a>
                </Button>
              </div>
            </div>
          ) : paymentId ? (
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
                  onClick={() => window.location.href = '/dashboard'} 
                  className="w-full max-w-sm bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 rounded-lg text-lg shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  Ir para o Dashboard
                </Button>
              </div>
            ) : hasPublicKey ? (
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
            ) : (
              <div className="text-center py-12">
                <h2 className="text-xl font-bold mb-4 text-slate-900">Pagamento em processamento</h2>
                <p className="text-slate-500 mb-8">
                  O status do pagamento será atualizado automaticamente. Se foi boleto, a compensação pode levar até 1 dia útil.
                </p>
                <Button onClick={() => setLocation('/')} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 rounded-lg">
                  Voltar para Início
                </Button>
              </div>
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
