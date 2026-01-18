import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Lock, KeyRound, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState("");
  const [, setLocation] = useLocation();
  const { setAuth } = useAuth();

  useEffect(() => {
    // Get token from URL query params
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get("token");
    
    if (!tokenParam) {
      toast.error("Token de redefinição inválido");
      setTimeout(() => setLocation("/login"), 2000);
      return;
    }
    
    setToken(tokenParam);
  }, [setLocation]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!password || !confirmPassword) {
      toast.error("Por favor, preencha todos os campos");
      return;
    }

    if (password.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Senha redefinida com sucesso!");
        
        // Auto-login: Save auth data
        if (data.user && data.token) {
          setAuth({
            user: data.user,
            token: data.token,
            isAuthenticated: true
          });
          
          // Redirect to dashboard after 1.5s
          setTimeout(() => {
            window.location.href = "/dashboard";
          }, 1500);
        } else {
          // Fallback to login if no auto-login data
          setTimeout(() => setLocation("/login"), 1500);
        }
      } else {
        toast.error(data.error || "Erro ao redefinir senha");
      }
    } catch (error) {
      toast.error("Erro ao redefinir senha. Tente novamente");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
      <Card className="w-full max-w-md p-8 shadow-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <KeyRound className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Nova Senha</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Crie uma nova senha para sua conta
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="block text-sm font-medium">Nova Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua nova senha"
                disabled={loading}
                className="pl-10"
                autoFocus
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Mínimo de 6 caracteres
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">Repetir Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Digite a senha novamente"
                disabled={loading}
                className="pl-10"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full mt-6"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            {loading ? "Redefinindo..." : "Redefinir Senha"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Lembrou sua senha?{" "}
          <button
            onClick={() => setLocation("/login")}
            className="text-primary font-medium hover:underline"
          >
            Voltar para login
          </button>
        </p>
      </Card>
    </div>
  );
}
