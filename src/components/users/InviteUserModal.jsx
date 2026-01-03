import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, Copy, UserPlus, Loader2, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'operational', label: 'Operacional' }
];

export default function InviteUserModal({ open, onOpenChange, onInvite }) {
  const { company } = useAuth();
  const [step, setStep] = useState('methods'); // methods, create, email
  const [inviteData, setInviteData] = useState({
    email: '',
    role: 'operational',
    name: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState('');

  const handleCreateNow = async () => {
    if (!inviteData.email || !inviteData.name || !inviteData.password) {
      toast.error('Email, nome e senha são obrigatórios');
      return;
    }
    if (inviteData.password !== inviteData.confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }
    if (inviteData.password.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres');
      return;
    }
    setLoading(true);
    try {
        email: inviteData.email,
        name: inviteData.name,
        role: inviteData.role
      });
      const result = await onInvite({
        email: inviteData.email,
        role: inviteData.role,
        name: inviteData.name,
        password: inviteData.password,
        companyId: company?.id
      });
      
      // Toast de sucesso agora é gerenciado pelo componente pai via queryClient.invalidateQueries
      // mas mantemos o resetModal aqui para fechar o diálogo
      resetModal();
    } catch (error) {
      toast.error(error.message || 'Erro ao criar usuário');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!inviteData.email || !inviteData.name) {
      toast.error('Email e nome são obrigatórios');
      return;
    }
    const link = `${window.location.origin}/signup?companyId=${company?.id}&email=${encodeURIComponent(inviteData.email)}&name=${encodeURIComponent(inviteData.name)}&role=${inviteData.role}`;
    navigator.clipboard.writeText(link);
    toast.success('Link copiado para a área de transferência!');
  };

  const handleSendEmail = async () => {
    if (!inviteData.email || !inviteData.name) {
      toast.error('Email e nome são obrigatórios');
      return;
    }
    setLoading(true);
    try {
      const token = JSON.parse(localStorage.getItem('auth') || '{}').token;
      const response = await fetch('/api/invitations/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          email: inviteData.email,
          name: inviteData.name,
          role: inviteData.role,
          companyId: company?.id
        })
      });
      
      if (!response.ok) throw new Error('Falha ao enviar email');
      toast.success('Email enviado com sucesso!');
      resetModal();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetModal = () => {
    setStep('methods');
    setInviteData({ email: '', role: 'user', name: '', password: '', confirmPassword: '' });
    setInviteLink('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen) resetModal();
      onOpenChange(newOpen);
    }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {step === 'methods' && 'Convidar Novo Usuário'}
            {step === 'create' && 'Criar Usuário Agora'}
            {step === 'email' && 'Enviar Link por Email'}
          </DialogTitle>
        </DialogHeader>

        {step === 'methods' && (
          <div className="grid grid-cols-3 gap-4 py-6">
            <Card 
              className="p-6 cursor-pointer hover-elevate transition-all flex flex-col items-center text-center gap-4"
              onClick={() => setStep('create')}
              data-testid="card-create-now"
            >
              <div className="p-3 bg-emerald-100 rounded-lg">
                <UserPlus className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Criar Agora</h3>
                <p className="text-xs text-slate-500 mt-1">Cadastro imediato do usuário</p>
              </div>
            </Card>

            <Card 
              className="p-6 cursor-pointer hover-elevate transition-all flex flex-col items-center text-center gap-4 opacity-50 cursor-not-allowed"
              onClick={() => toast.info('Funcionalidade em desenvolvimento')}
              data-testid="card-copy-link"
            >
              <div className="p-3 bg-blue-100 rounded-lg">
                <Copy className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Copiar Link</h3>
                <p className="text-xs text-slate-500 mt-1">Compartilhar manualmente</p>
              </div>
            </Card>

            <Card 
              className="p-6 cursor-pointer hover-elevate transition-all flex flex-col items-center text-center gap-4"
              onClick={() => setStep('email')}
              data-testid="card-send-email"
            >
              <div className="p-3 bg-amber-100 rounded-lg">
                <Mail className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Enviar por Email</h3>
                <p className="text-xs text-slate-500 mt-1">Link automático por e-mail</p>
              </div>
            </Card>
          </div>
        )}

        {(step === 'create' || step === 'email') && (
          <div className="space-y-6 py-6">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Usuário</Label>
              <Input
                id="name"
                placeholder="João Silva"
                value={inviteData.name}
                onChange={(e) => setInviteData({ ...inviteData, name: e.target.value })}
                disabled={loading}
                data-testid="input-invite-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="joao@example.com"
                value={inviteData.email}
                onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                disabled={loading}
                data-testid="input-invite-email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Cargo</Label>
              <Select value={inviteData.role} onValueChange={(value) => setInviteData({ ...inviteData, role: value })}>
                <SelectTrigger id="role" data-testid="select-invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map(role => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {step === 'create' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={inviteData.password}
                      onChange={(e) => setInviteData({ ...inviteData, password: e.target.value })}
                      disabled={loading}
                      data-testid="input-invite-password"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirme a senha"
                      value={inviteData.confirmPassword}
                      onChange={(e) => setInviteData({ ...inviteData, confirmPassword: e.target.value })}
                      disabled={loading}
                      data-testid="input-invite-confirm-password"
                      className="pl-10"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setStep('methods')}
                disabled={loading}
                className="flex-1"
              >
                Voltar
              </Button>
              <Button 
                onClick={step === 'create' ? handleCreateNow : handleSendEmail}
                disabled={loading}
                className="flex-1"
                data-testid={`button-${step}-confirm`}
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {step === 'create' ? 'Criar Usuário' : 'Enviar Email'}
              </Button>
            </div>
          </div>
        )}

        {step === 'methods' && (
          <div className="flex gap-3 pt-4">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => resetModal()}
              data-testid="button-cancel-invite"
            >
              Cancelar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
