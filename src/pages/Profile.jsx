import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Upload, Save, Building2, User, Mail, Lock, Settings } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';

export default function ProfilePage() {
  const { user, updateUser, company } = useAuth();
  const fileInputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(user?.avatar || '');
  const [smtpConfig, setSmtpConfig] = useState({
    host: '',
    port: '',
    user: '',
    password: '',
    fromEmail: ''
  });
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    email: user?.email || '',
    role: user?.role || '',
  });

  const { data: companyData } = useQuery({
    queryKey: ['/api/companies', company?.id],
    queryFn: async () => {
      const token = JSON.parse(localStorage.getItem('auth') || '{}').token;
      const res = await fetch(`/api/companies/${company?.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!company?.id
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data) => {
      const token = JSON.parse(localStorage.getItem('auth') || '{}').token;
      
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: data.name || '',
          phone: data.phone || '',
          avatar: data.avatar,
        }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Falha ao atualizar perfil');
      }
      
      return res.json();
    },
    onSuccess: (data) => {
      updateUser(data.user);
      toast.success('Perfil atualizado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['/api/auth/profile'] });
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem válida');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 5MB');
      return;
    }
    
    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreviewUrl(event.target?.result || '');
    };
    reader.readAsDataURL(file);
    
    // Convert to data URL and upload
    const dataUrlReader = new FileReader();
    dataUrlReader.onload = async (event) => {
      const dataUrl = event.target?.result;
      if (dataUrl) {
        try {
          const token = JSON.parse(localStorage.getItem('auth') || '{}').token;
          const res = await fetch('/api/auth/avatar', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ avatarDataUrl: dataUrl }),
          });
          
          if (!res.ok) {
            const error = await res.json();
            toast.error(error.error || 'Falha ao fazer upload');
            return;
          }
          
          const result = await res.json();
          updateUser(result.user);
          toast.success('Foto atualizada com sucesso!');
        } catch (error) {
          toast.error(error?.message || 'Falha ao fazer upload');
        }
      }
    };
    dataUrlReader.readAsDataURL(file);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name?.trim()) {
      toast.error('Nome completo é obrigatório');
      return;
    }
    
    await updateProfileMutation.mutateAsync({
      ...formData,
      avatar: previewUrl || user?.avatar,
    });
  };

  const getInitials = (name) => {
    return name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'US';
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Meu Perfil</h1>
        <p className="text-muted-foreground mt-1">Gerencie suas informações pessoais e configurações</p>
      </div>

      {/* User Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Perfil do Usuário
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Avatar Section */}
            <div className="flex flex-col gap-4 items-center pb-6 border-b">
              <Avatar className="w-24 h-24">
                <AvatarImage src={previewUrl || user?.avatar} alt={user?.name} />
                <AvatarFallback>{getInitials(user?.name)}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-2 items-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={updateProfileMutation.isPending}
                  data-testid="button-upload-avatar"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Alterar Foto
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  JPG, PNG ou GIF. Máximo 5MB.
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
                data-testid="input-avatar-file"
              />
            </div>

            {/* Editable Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nome Completo</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Seu nome completo"
                  data-testid="input-name"
                />
              </div>

              <div>
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="(11) 9 9999-9999"
                  data-testid="input-phone"
                />
              </div>
            </div>

            {/* Save Button */}
            <Button 
              type="submit" 
              disabled={updateProfileMutation.isPending}
              className="w-full"
              data-testid="button-save-profile"
            >
              <Save className="w-4 h-4 mr-2" />
              {updateProfileMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Account Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Informações da Conta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-600 text-xs mb-2 block">Email</Label>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-sm font-medium text-slate-900">{formData.email || 'Não definido'}</p>
              </div>
            </div>

            <div>
              <Label className="text-slate-600 text-xs mb-2 block">Cargo</Label>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-2">
                <Badge variant="outline" className="capitalize">
                  {formData.role === 'admin' ? 'Admin' : formData.role === 'manager' ? 'Gerente' : formData.role === 'operational' ? 'Operacional' : 'Usuário'}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company Information Card */}
      {company && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Informações da Empresa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-600 text-xs mb-2 block">Nome da Empresa</Label>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-sm font-medium text-slate-900">{company?.name || 'Não definido'}</p>
                </div>
              </div>

              <div>
                <Label className="text-slate-600 text-xs mb-2 block">CNPJ/CPF</Label>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-sm font-medium text-slate-900">{company?.document || 'Não definido'}</p>
                </div>
              </div>

              <div>
                <Label className="text-slate-600 text-xs mb-2 block">ID da Empresa</Label>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between gap-2">
                  <p className="text-sm font-mono text-slate-900 truncate">{company?.id}</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      navigator.clipboard.writeText(company?.id || '');
                      toast.success('ID copiado!');
                    }}
                    data-testid="button-copy-company-id"
                  >
                    Copiar
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-slate-600 text-xs mb-2 block">Status da Assinatura</Label>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-2">
                  <Badge className={company?.subscriptionStatus === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                    {company?.subscriptionStatus === 'active' ? 'Ativa' : 'Inativa'}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SMTP Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configuração de Email (SMTP)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg mb-4">
            <p className="text-sm text-amber-800">
              Configure as credenciais SMTP para habilitar o envio de convites por email.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 space-y-4">
            <div>
              <Label htmlFor="smtpHost">Host SMTP</Label>
              <Input
                id="smtpHost"
                placeholder="smtp.gmail.com"
                value={smtpConfig.host}
                onChange={(e) => setSmtpConfig({ ...smtpConfig, host: e.target.value })}
                disabled
                data-testid="input-smtp-host"
              />
            </div>

            <div>
              <Label htmlFor="smtpPort">Porta</Label>
              <Input
                id="smtpPort"
                placeholder="587"
                value={smtpConfig.port}
                onChange={(e) => setSmtpConfig({ ...smtpConfig, port: e.target.value })}
                disabled
                data-testid="input-smtp-port"
              />
            </div>

            <div>
              <Label htmlFor="smtpUser">Usuário</Label>
              <Input
                id="smtpUser"
                placeholder="seu-email@gmail.com"
                value={smtpConfig.user}
                onChange={(e) => setSmtpConfig({ ...smtpConfig, user: e.target.value })}
                disabled
                data-testid="input-smtp-user"
              />
            </div>

            <div>
              <Label htmlFor="smtpPassword">Senha</Label>
              <Input
                id="smtpPassword"
                type="password"
                placeholder="Sua senha"
                value={smtpConfig.password}
                onChange={(e) => setSmtpConfig({ ...smtpConfig, password: e.target.value })}
                disabled
                data-testid="input-smtp-password"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="fromEmail">Email de Origem</Label>
              <Input
                id="fromEmail"
                type="email"
                placeholder="noreply@sua-empresa.com"
                value={smtpConfig.fromEmail}
                onChange={(e) => setSmtpConfig({ ...smtpConfig, fromEmail: e.target.value })}
                disabled
                data-testid="input-smtp-from"
              />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-4">
            A configuração de SMTP será habilitada em breve. Por enquanto, use "Copiar Link" ou "Enviar Email" na gestão de usuários.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
