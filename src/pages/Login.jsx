import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { User, Lock, LogIn, Mail, ArrowLeft } from "lucide-react";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [sendingReset, setSendingReset] = useState(false);
  const [pendingBanner, setPendingBanner] = useState(null);
  const { login } = useAuth();
  const [, setLocation] = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error("Por favor, preencha todos os campos");
      return;
    }

    try {
      setLoading(true);
      const data = await login(username, password);
      
      // Check if payment is pending
      if (data.paymentPending) {
        const whatsappNumber = "5554996231432";
        const whatsappUrl = `https://wa.me/${whatsappNumber}?text=Olá,%20envio%20comprovante%20do%20boleto%20para%20liberação%20do%20acesso.`;
        setPendingBanner({ whatsappUrl });
        setLoading(false);
        return;
      }
      
      const userName = data.user?.name || "usuário";
      toast.success(`Seja bem vindo, ${userName}!`);
      
      // Redirect Super Admin to admin dashboard
      if (data.user?.isSuperAdmin) {
        setLocation("/admin");
      } else {
        setLocation("/dashboard");
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestReset = async (e) => {
    e.preventDefault();
    
    if (!resetEmail || !resetEmail.includes('@')) {
      toast.error("Por favor, insira um email válido");
      return;
    }

    try {
      setSendingReset(true);
      const response = await fetch("/api/auth/request-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Email de redefinição enviado! Verifique sua caixa de entrada");
        setShowResetForm(false);
        setResetEmail("");
      } else {
        toast.error(data.error || "Erro ao enviar email");
      }
    } catch (error) {
      toast.error("Erro ao solicitar redefinição de senha");
    } finally {
      setSendingReset(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
      <div className="w-full max-w-2xl flex flex-col gap-6">
        {pendingBanner && !showResetForm && (
          <Card className="p-6 shadow-lg border-rose-200">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center">
                <div className="w-6 h-6 rounded-full bg-rose-500/80 flex items-center justify-center text-white text-lg">!</div>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-rose-700">Pagamento Pendente</h2>
                <p className="text-sm text-rose-800 mt-1 max-w-xl">
                  Seu acesso ao sistema foi temporariamente suspenso. Gere um novo boleto ou envie o comprovante para liberar o acesso.
                </p>
              </div>

              <div className="w-full max-w-md grid grid-cols-1 gap-3">
                <Button
                  className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                  onClick={() => setLocation("/payment-pending")}
                >
                  Falar com Suporte (WhatsApp)
                </Button>
                <Button
                  variant="secondary"
                  className="w-full h-11"
                  onClick={() => setLocation("/payment-pending")}
                >
                  Gerar Boleto (Vence amanhã)
                </Button>
              </div>

              <div className="w-full max-w-md bg-slate-50 border border-slate-200 rounded-md p-4 text-left text-sm text-slate-700">
                <p className="font-semibold mb-2">Informações Importantes:</p>
                <ul className="list-disc list-inside space-y-1 text-slate-600">
                  <li>O novo boleto terá vencimento para o próximo dia útil.</li>
                  <li>O desbloqueio ocorre em até 24h após o pagamento.</li>
                  <li>Para liberação imediata, envie o comprovante no WhatsApp.</li>
                </ul>
              </div>
            </div>
          </Card>
        )}

        <Card className="w-full max-w-md p-8 shadow-lg mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold">{showResetForm ? "Redefinir Senha" : "Entrar"}</h1>
            <p className="text-sm text-muted-foreground mt-2">
              {showResetForm ? "Digite seu email para receber o link" : "Acesse sua conta para continuar"}
            </p>
          </div>
        
        {!showResetForm ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="block text-sm font-medium">Usuário ou Email</label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Digite seu usuário ou email"
                  disabled={loading}
                  data-testid="input-username"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  disabled={loading}
                  data-testid="input-password"
                  className="pl-10"
                />
              </div>
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setShowResetForm(true)}
                  className="text-sm text-primary hover:underline"
                >
                  Esqueceu sua senha?
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full mt-6"
              data-testid="button-login"
            >
              <LogIn className="w-4 h-4 mr-2" />
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleRequestReset} className="space-y-5">
            <div className="space-y-2">
              <label className="block text-sm font-medium">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="Digite seu email"
                  disabled={sendingReset}
                  className="pl-10"
                  autoFocus
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Enviaremos um link de redefinição para este email
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowResetForm(false);
                  setResetEmail("");
                }}
                disabled={sendingReset}
                className="flex-1"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <Button
                type="submit"
                disabled={sendingReset}
                className="flex-1"
              >
                {sendingReset ? "Enviando..." : "Enviar Link"}
              </Button>
            </div>
          </form>
        )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Não tem conta?{" "}
            <Link href="/signup" className="text-primary font-medium hover:underline">
              Criar conta
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
