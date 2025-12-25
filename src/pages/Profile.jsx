import { useState, useRef, useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Brazilian states
const BRAZILIAN_STATES = [
  { code: 'AC', name: 'Acre' },
  { code: 'AL', name: 'Alagoas' },
  { code: 'AP', name: 'Amapá' },
  { code: 'AM', name: 'Amazonas' },
  { code: 'BA', name: 'Bahia' },
  { code: 'CE', name: 'Ceará' },
  { code: 'DF', name: 'Distrito Federal' },
  { code: 'ES', name: 'Espírito Santo' },
  { code: 'GO', name: 'Goiás' },
  { code: 'MA', name: 'Maranhão' },
  { code: 'MT', name: 'Mato Grosso' },
  { code: 'MS', name: 'Mato Grosso do Sul' },
  { code: 'MG', name: 'Minas Gerais' },
  { code: 'PA', name: 'Pará' },
  { code: 'PB', name: 'Paraíba' },
  { code: 'PR', name: 'Paraná' },
  { code: 'PE', name: 'Pernambuco' },
  { code: 'PI', name: 'Piauí' },
  { code: 'RJ', name: 'Rio de Janeiro' },
  { code: 'RN', name: 'Rio Grande do Norte' },
  { code: 'RS', name: 'Rio Grande do Sul' },
  { code: 'RO', name: 'Rondônia' },
  { code: 'RR', name: 'Roraima' },
  { code: 'SC', name: 'Santa Catarina' },
  { code: 'SP', name: 'São Paulo' },
  { code: 'SE', name: 'Sergipe' },
  { code: 'TO', name: 'Tocantins' },
];

// Mock cities by state (in production, fetch from an API)
const CITIES_BY_STATE = {
  'SP': ['São Paulo', 'Campinas', 'Santos', 'Sorocaba', 'Ribeirão Preto'],
  'RJ': ['Rio de Janeiro', 'Niterói', 'Duque de Caxias', 'São Gonçalo', 'Nova Iguaçu'],
  'MG': ['Belo Horizonte', 'Uberlândia', 'Juiz de Fora', 'Contagem', 'Montes Claros'],
  'BA': ['Salvador', 'Feira de Santana', 'Vitória da Conquista', 'Ilhéus', 'Jequié'],
  'RS': ['Porto Alegre', 'Caxias do Sul', 'Pelotas', 'Santa Maria', 'Novo Hamburgo'],
  'PE': ['Recife', 'Olinda', 'Jaboatão dos Guararapes', 'Caruaru', 'Petrolina'],
  'CE': ['Fortaleza', 'Caucaia', 'Juazeiro do Norte', 'Maracanaú', 'Sobral'],
  'PR': ['Curitiba', 'Londrina', 'Maringá', 'São José dos Pinhais', 'Ponta Grossa'],
  'SC': ['Florianópolis', 'Joinville', 'Blumenau', 'Brusque', 'Chapecó'],
  'GO': ['Goiânia', 'Aparecida de Goiânia', 'Anápolis', 'Rio Verde', 'Luziânia'],
  'PA': ['Belém', 'Ananindeua', 'Santarém', 'Marabá', 'Castanhal'],
  'MA': ['São Luís', 'Imperatriz', 'Timon', 'Caxias', 'Codó'],
  'PB': ['João Pessoa', 'Campina Grande', 'Patos', 'Cabedelo', 'Sousa'],
  'ES': ['Vitória', 'Vila Velha', 'Serra', 'Cariacica', 'Cachoeiro de Itapemirim'],
  'PI': ['Teresina', 'Parnaíba', 'Picos', 'Campo Maior', 'Oeiras'],
  'RN': ['Natal', 'Mossoró', 'Parnamirim', 'São Gonçalo do Amarante', 'Ceará-Mirim'],
  'AL': ['Maceió', 'Arapiraca', 'Rio Largo', 'Marechal Deodoro', 'Delmiro Gouveia'],
  'MT': ['Cuiabá', 'Várzea Grande', 'Rondonópolis', 'Sinop', 'Cáceres'],
  'MS': ['Campo Grande', 'Dourados', 'Três Lagoas', 'Corumbá', 'Maracaju'],
  'DF': ['Brasília'],
  'AC': ['Rio Branco', 'Cruzeiro do Sul'],
  'AP': ['Macapá', 'Santana'],
  'AM': ['Manaus', 'Itacoatiara'],
  'RO': ['Porto Velho', 'Vilhena', 'Ariquemes'],
  'RR': ['Boa Vista', 'Rorainópolis'],
  'TO': ['Palmas', 'Araguaína'],
  'SE': ['Aracaju', 'Lagarto']
};

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
    cep: user?.cep || '',
    endereco: user?.endereco || '',
    rua: user?.rua || '',
    numero: user?.numero || '',
    complemento: user?.complemento || '',
    estado: user?.estado || '',
    cidade: user?.cidade || '',
  });

  const [cities, setCities] = useState(CITIES_BY_STATE[formData.estado] || []);
  const [loadingCep, setLoadingCep] = useState(false);

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
      const auth = JSON.parse(localStorage.getItem('auth') || '{}');
      const token = auth?.token;
      
      if (!token) {
        throw new Error('Sessão expirada. Por favor, faça login novamente.');
      }
      
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
          cep: data.cep || '',
          endereco: data.endereco || '',
          rua: data.rua || '',
          numero: data.numero || '',
          complemento: data.complemento || '',
          estado: data.estado || '',
          cidade: data.cidade || '',
        }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        if (res.status === 401) {
          throw new Error('Sessão expirada. Por favor, faça login novamente.');
        }
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
      const errorMessage = typeof error?.message === 'string' ? error.message : (typeof error === 'string' ? error : 'Erro ao atualizar perfil');
      toast.error(String(errorMessage));
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
            toast.error(String(error.error || 'Falha ao fazer upload'));
            return;
          }
          
          const result = await res.json();
          updateUser(result.user);
          toast.success('Foto atualizada com sucesso!');
        } catch (error) {
          const errorMsg = typeof error?.message === 'string' ? error.message : 'Falha ao fazer upload';
          toast.error(String(errorMsg));
        }
      }
    };
    dataUrlReader.readAsDataURL(file);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleStateChange = (value) => {
    setFormData(prev => ({ ...prev, estado: value, cidade: '' }));
    setCities(CITIES_BY_STATE[value] || []);
  };

  const handleCepChange = async (e) => {
    const cep = e.target.value.replace(/\D/g, '');
    setFormData(prev => ({ ...prev, cep }));

    if (cep.length === 8) {
      setLoadingCep(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();
        
        if (!data.erro) {
          setFormData(prev => ({
            ...prev,
            rua: data.logradouro || '',
            complemento: data.complemento || '',
            cidade: data.localidade || '',
            estado: data.uf || '',
          }));
          setCities(CITIES_BY_STATE[data.uf] || []);
          toast.success('CEP encontrado!');
        } else {
          toast.error('CEP não encontrado');
        }
      } catch (error) {
        toast.error('Erro ao buscar CEP');
      } finally {
        setLoadingCep(false);
      }
    }
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

            {/* Address Section */}
            <div className="pt-4 border-t">
              <h3 className="text-lg font-semibold mb-4">Endereço</h3>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <Label htmlFor="cep">CEP</Label>
                  <Input
                    id="cep"
                    name="cep"
                    type="text"
                    value={formData.cep}
                    onChange={handleCepChange}
                    placeholder="00000-000"
                    maxLength="8"
                    disabled={loadingCep}
                    data-testid="input-cep"
                  />
                  {loadingCep && <p className="text-xs text-muted-foreground mt-1">Buscando...</p>}
                </div>

                <div>
                  <Label htmlFor="endereco">Endereço</Label>
                  <Input
                    id="endereco"
                    name="endereco"
                    type="text"
                    value={formData.endereco}
                    onChange={handleInputChange}
                    placeholder="Complemento do endereço"
                    data-testid="input-endereco"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <Label htmlFor="rua">Rua/Avenida</Label>
                  <Input
                    id="rua"
                    name="rua"
                    type="text"
                    value={formData.rua}
                    onChange={handleInputChange}
                    placeholder="Nome da rua"
                    data-testid="input-rua"
                  />
                </div>

                <div>
                  <Label htmlFor="numero">Número</Label>
                  <Input
                    id="numero"
                    name="numero"
                    type="text"
                    value={formData.numero}
                    onChange={handleInputChange}
                    placeholder="Número"
                    data-testid="input-numero"
                  />
                </div>

                <div>
                  <Label htmlFor="complemento">Complemento</Label>
                  <Input
                    id="complemento"
                    name="complemento"
                    type="text"
                    value={formData.complemento}
                    onChange={handleInputChange}
                    placeholder="Apt., sala, etc."
                    data-testid="input-complemento"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="estado">Estado</Label>
                  <Select value={formData.estado} onValueChange={handleStateChange}>
                    <SelectTrigger data-testid="select-estado">
                      <SelectValue placeholder="Selecione o estado" />
                    </SelectTrigger>
                    <SelectContent>
                      {BRAZILIAN_STATES.map(state => (
                        <SelectItem key={state.code} value={state.code}>
                          {state.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="cidade">Cidade</Label>
                  <Select value={formData.cidade} onValueChange={(value) => setFormData(prev => ({ ...prev, cidade: value }))}>
                    <SelectTrigger disabled={!formData.estado} data-testid="select-cidade">
                      <SelectValue placeholder={formData.estado ? "Selecione a cidade" : "Selecione um estado primeiro"} />
                    </SelectTrigger>
                    <SelectContent>
                      {cities.map(city => (
                        <SelectItem key={city} value={city}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
        <CardContent className="space-y-4">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              Configure as credenciais SMTP para habilitar o envio de convites por email.
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="smtpHost">Host SMTP</Label>
              <Input
                id="smtpHost"
                placeholder="smtp.gmail.com"
                value={smtpConfig.host}
                onChange={(e) => setSmtpConfig({ ...smtpConfig, host: e.target.value })}
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
                data-testid="input-smtp-from"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button 
              type="button"
              onClick={async () => {
                try {
                  const token = JSON.parse(localStorage.getItem('auth') || '{}').token;
                  const res = await fetch('/api/auth/smtp-config', {
                    method: 'PATCH',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(smtpConfig),
                  });
                  if (!res.ok) throw new Error('Falha ao salvar');
                  toast.success('Configuração SMTP salva!');
                } catch (error) {
                  toast.error('Erro ao salvar configuração SMTP');
                }
              }}
              disabled={updateProfileMutation.isPending}
              data-testid="button-save-smtp"
            >
              <Save className="w-4 h-4 mr-2" />
              Salvar Configuração SMTP
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
