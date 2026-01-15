import { AlertCircle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";

export default function PaymentPending() {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full border-destructive/50">
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
          <p className="text-muted-foreground">
            Identificamos que existe uma pendência financeira em sua conta. Para regularizar seu acesso, por favor entre em contato com nosso suporte ou verifique seu e-mail para o boleto atualizado.
          </p>
          <div className="p-4 bg-muted rounded-md text-sm text-left">
            <p className="font-semibold mb-1">O que fazer agora?</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Verifique sua caixa de entrada de e-mail</li>
              <li>Realize o pagamento do boleto em anexo</li>
              <li>O desbloqueio é automático após a confirmação</li>
            </ul>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={() => window.location.href = "mailto:contato@huacontrol.com.br"}
          >
            Falar com Suporte
          </Button>
          <Button 
            variant="ghost" 
            className="w-full gap-2" 
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
