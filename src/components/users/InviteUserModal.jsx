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
  const [inviteData, setInviteData] = useState({
    email: '',
    role: 'operational',
    name: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);

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
      const result = await onInvite({
        email: inviteData.email,
        role: inviteData.role,
        name: inviteData.name,
        password: inviteData.password,
        companyId: company?.id
      });
      
      resetModal();
    } catch (error) {
      toast.error(error.message || 'Erro ao criar usuário');
    } finally {
      setLoading(false);
    }
  };

  const resetModal = () => {
    setInviteData({ email: '', role: 'operational', name: '', password: '', confirmPassword: '' });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen) resetModal();
      onOpenChange(newOpen);
    }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Criar Novo Usuário</DialogTitle>
        </DialogHeader>

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

          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => resetModal()}
              disabled={loading}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateNow}
              disabled={loading}
              className="flex-1"
              data-testid="button-confirm-invite"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Criar Usuário
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
