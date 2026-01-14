import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Building2, FileText, User, UserCheck, Mail, Lock, CheckCircle2, UserPlus, ArrowLeft } from "lucide-react";
import { formatCNPJ } from "@/utils/masks";

const PLANS = {
  monthly: { name: 'Mensal', price: 'R$ 215', features: 'Acesso completo ao sistema' },
};

export default function Signup() {
  const [formData, setFormData] = useState({
    companyName: "",
    companyDocument: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    plan: "monthly",
    cep: "",
    rua: "",
    numero: "",
    cidade: "",
    estado: "",
  });
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedPlan, setSelectedPlan] = useState("monthly");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const planParam = params.get("plan");
    if (planParam && PLANS[planParam]) {
      setSelectedPlan(planParam);
      setFormData(prev => ({ ...prev, plan: planParam }));
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === "companyDocument") {
      const formatted = formatCNPJ(value);
      setFormData((prev) => ({ ...prev, [name]: formatted }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (Object.entries(formData).some(([key, v]) => key !== 'complemento' && !v)) {
      toast.error("Por favor, preencha todos os campos");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error("Email inválido");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres");
      return;
    }

    try {
      setLoading(true);
      const result = await signup(
        formData.companyName,
        formData.companyDocument,
        formData.username,
        formData.email,
        formData.password,
        formData.name,
        formData.plan,
        {
          cep: formData.cep,
          rua: formData.rua,
          numero: formData.numero,
          cidade: formData.cidade,
          estado: formData.estado
        }
      );
      
      // Check if this was a successful new signup
      if (result.user) {
        // O signup já salva no localStorage e seta paymentPending
        // O App.jsx agora vai redirecionar automaticamente para /checkout
        toast.success("Conta criada! Redirecionando para pagamento...");
        setTimeout(() => setLocation("/checkout?plan=" + formData.plan), 1000);
      }
    } catch (error) {
      // Handle duplicate company scenarios
      const errorMsg = error.message || "";
      if (errorMsg.includes("409") || errorMsg.includes("DUPLICATE")) {
        if (errorMsg.includes("DUPLICATE_PAID")) {
          toast.error("Essa empresa já possui um cadastro ativo com pagamento confirmado");
        } else if (errorMsg.includes("DUPLICATE_PENDING")) {
          // SALVAR NO LOCALSTORAGE ANTES DE REDIRECIONAR
          const auth = localStorage.getItem("auth");
          if (auth) {
            try {
              const parsed = JSON.parse(auth);
              localStorage.setItem("auth", JSON.stringify({
                ...parsed,
                company: { ...parsed.company },
                user: { ...parsed.user },
                plan: formData.plan,
                token: null,
                paymentPending: true
              }));
            } catch (e) {
            }
          }
          // Redirect to checkout for existing company
          toast.success("Cadastro encontrado! Redirecionando para completar pagamento...");
          setTimeout(() => setLocation("/checkout?plan=" + formData.plan), 1500);
          return;
        } else {
          toast.error(errorMsg || "Essa empresa já existe");
        }
      } else {
        toast.error(errorMsg || "Erro ao criar conta");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
      <Card className="w-full max-w-2xl p-8 shadow-lg">
        <div className="mb-8">
          <button 
            onClick={() => setLocation('/')}
            className="flex items-center gap-2 text-primary hover:underline mb-4"
            data-testid="button-back-plans"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar aos Planos
          </button>
          <h1 className="text-3xl font-bold">Criar Conta</h1>
          <p className="text-sm text-muted-foreground mt-2">Registre-se para começar a usar</p>
        </div>

        {/* Plano Selecionado */}
        <div className="mb-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Plano Selecionado</p>
              <p className="text-lg font-bold text-blue-900 dark:text-blue-100">
                {PLANS[selectedPlan]?.name} - {PLANS[selectedPlan]?.price}/mês
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">{PLANS[selectedPlan]?.features}</p>
            </div>
            <Button 
              type="button"
              variant="outline"
              onClick={() => setLocation('/#pricing')}
              data-testid="button-change-plan"
            >
              Mudar Plano
            </Button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <label className="block text-sm font-medium">Empresa</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                name="companyName"
                value={formData.companyName}
                onChange={handleChange}
                placeholder="Nome da empresa"
                disabled={loading}
                data-testid="input-company-name"
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">CNPJ/CPF</label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                name="companyDocument"
                value={formData.companyDocument}
                onChange={handleChange}
                placeholder="00.000.000/0000-00"
                disabled={loading}
                data-testid="input-company-document"
                className="pl-10"
                maxLength="18"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">Nome Completo</label>
            <div className="relative">
              <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Seu nome completo"
                disabled={loading}
                data-testid="input-name"
                className="pl-10"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium">CEP</label>
              <Input
                type="text"
                name="cep"
                value={formData.cep}
                onChange={handleChange}
                placeholder="00000-000"
                disabled={loading}
                maxLength="9"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium">Cidade</label>
              <Input
                type="text"
                name="cidade"
                value={formData.cidade}
                onChange={handleChange}
                placeholder="Sua cidade"
                disabled={loading}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-2">
              <label className="block text-sm font-medium">Rua</label>
              <Input
                type="text"
                name="rua"
                value={formData.rua}
                onChange={handleChange}
                placeholder="Endereço"
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium">Nº</label>
              <Input
                type="text"
                name="numero"
                value={formData.numero}
                onChange={handleChange}
                placeholder="123"
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">Usuário</label>
            <div className="relative">
              <UserCheck className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Escolha um usuário"
                disabled={loading}
                data-testid="input-username"
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="seu@email.com"
                disabled={loading}
                data-testid="input-email"
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
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Mínimo 6 caracteres"
                disabled={loading}
                data-testid="input-password"
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">Confirmar Senha</label>
            <div className="relative">
              <CheckCircle2 className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirme sua senha"
                disabled={loading}
                data-testid="input-confirm-password"
                className="pl-10"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full mt-6"
            data-testid="button-signup"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            {loading ? "Criando conta..." : "Criar Conta"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Já tem conta?{" "}
          <a href="/login" className="text-primary font-medium hover:underline">
            Entrar
          </a>
        </p>
      </Card>
    </div>
  );
}
