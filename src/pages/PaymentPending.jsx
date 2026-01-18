import { AlertCircle, LogOut, MessageCircle, FileText, Loader2, CheckCircle2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { toast } from "sonner";
import { useState } from "react";

export default function PaymentPending() {
  const { logout, company, user } = useAuth();
  const [issuedInfo, setIssuedInfo] = useState(null);

  const { data: subscription, isLoading } = useQuery({
    queryKey: ["/api/subscriptions/active"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/subscriptions/active");
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!company?.id,
  });

  const regenerateBoletoMutation = useMutation({
    mutationFn: async () => {
      const data = await apiRequest("POST", "/api/payment/regenerate-boleto", {
        companyId: company?.id,
        email: user?.email,
        amount: subscription?.amount || "215.00",
        plan: company?.subscriptionPlan || "monthly",
        payer: {
          email: user?.email,
          first_name: user?.name?.split(' ')[0] || 'Admin',
          last_name: user?.name?.split(' ').slice(1).join(' ') || 'User',
          identification: {
            type: company?.document?.replace(/\D/g, '').length > 11 ? 'CNPJ' : 'CPF',
            number: company?.document?.replace(/\D/g, '') || ''
          },
          address: {
            zip_code: user?.cep?.replace(/\D/g, '') || '',
            street_name: user?.rua || '',
            street_number: user?.numero || '',
            neighborhood: user?.bairro || user?.complemento || '',
            city: user?.cidade || '',
            federal_unit: user?.estado || ''
          }
        }
      });
      return data;
    },
    onSuccess: (data) => {
      if (data.ticket_url) {
        setIssuedInfo({ ticketUrl: data.ticket_url, dueDate: data.dueDate || null });
        window.open(data.ticket_url, '_blank');
        queryClient.invalidateQueries({ queryKey: ["/api/subscriptions/active"] });
        toast.success("Boleto gerado com sucesso!");
      }
    },
    onError: (error) => {
      console.error("Erro ao gerar boleto:", error);
      toast.error(error?.message || "Erro ao gerar boleto");
    }
  });

  const whatsappNumber = "5554996231432";
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=Olá,%20meu%20acesso%20está%20suspenso%20e%20gostaria%20de%20regularizar%20minha%20assinatura.`;

  const ticketUrl = issuedInfo?.ticketUrl || subscription?.ticket_url;
  const dueDateValue = issuedInfo?.dueDate || subscription?.expiresAt;
  const dueDateText = dueDateValue
    ? format(new Date(dueDateValue), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    : "próximo dia útil";

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full border-destructive/50 shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <AlertCircle className="w-6 h-6 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-bold text-destructive">Pagamento Pendente</CardTitle>
          <CardDescription>
            Seu acesso ao sistema foi temporariamente suspenso.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-left">
            <div className="flex items-center gap-2 text-emerald-700 text-sm font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              Conta criada com sucesso
            </div>
            <p className="text-xs text-emerald-700 mt-1">
              Seu boleto já foi emitido. Vencimento: <strong>{dueDateText}</strong>.
            </p>
            <p className="text-xs text-emerald-700 mt-1">
              Prazo de compensação: até <strong>1 dia útil</strong> após o pagamento.
            </p>
          </div>
          {subscription?.expiresAt && (
            <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 mb-4">
              <p className="text-sm font-medium text-destructive">
                Sua assinatura venceu em: <span className="font-bold">{format(new Date(subscription.expiresAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
              </p>
            </div>
          )}
          
          <p className="text-muted-foreground text-sm">
            Identificamos uma pendência financeira. Para regularizar seu acesso, você pode baixar o boleto novamente, gerar um novo boleto ou falar com nosso suporte.
          </p>

          <div className="grid grid-cols-1 gap-3 pt-2">
            <Button 
              className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white border-none h-11" 
              onClick={() => window.open(whatsappUrl, '_blank')}
            >
              <MessageCircle className="w-5 h-5" />
              Falar com Suporte (WhatsApp)
            </Button>

            {ticketUrl && (
              <Button asChild variant="secondary" className="w-full gap-2 h-11">
                <a href={ticketUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="w-5 h-5" />
                  Baixar boleto novamente
                </a>
              </Button>
            )}

            <Button 
              variant="outline"
              className="w-full gap-2 h-11 border-primary/20 hover:bg-primary/5" 
              onClick={() => regenerateBoletoMutation.mutate()}
              disabled={regenerateBoletoMutation.isPending || isLoading}
            >
              {regenerateBoletoMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <FileText className="w-5 h-5 text-primary" />
              )}
              Gerar novo boleto
            </Button>
          </div>

          <div className="p-4 bg-muted/50 rounded-lg text-xs text-left border border-border mt-4">
            <p className="font-semibold mb-2 flex items-center gap-2">
              <AlertCircle className="w-3 h-3" />
              Informações Importantes:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>O vencimento do boleto é: <strong>{dueDateText}</strong>.</li>
              <li>Compensação bancária em até <strong>1 dia útil</strong>.</li>
              <li>Para liberação imediata, envie o comprovante no WhatsApp acima.</li>
            </ul>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            variant="ghost" 
            className="w-full gap-2 text-muted-foreground hover:text-destructive transition-colors" 
            onClick={() => logout()}
          >
            <LogOut className="w-4 h-4" />
            Sair da Conta
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
