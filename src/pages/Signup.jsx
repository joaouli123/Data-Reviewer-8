import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Building2, FileText, User, UserCheck, Mail, Lock, CheckCircle2, UserPlus } from "lucide-react";
import { formatCNPJ } from "@/utils/masks";

export default function Signup() {
  const [formData, setFormData] = useState({
    companyName: "",
    companyDocument: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
  });
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const [, setLocation] = useLocation();

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

    if (Object.values(formData).some((v) => !v)) {
      toast.error("Por favor, preencha todos os campos");
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
      await signup(
        formData.companyName,
        formData.companyDocument,
        formData.username,
        formData.email,
        formData.password,
        formData.name
      );
      toast.success("Conta criada com sucesso!");
      setLocation("/");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
      <Card className="w-full max-w-md p-8 shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">Criar Conta</h1>
          <p className="text-sm text-muted-foreground mt-2">Registre-se para começar a usar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
