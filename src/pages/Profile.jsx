import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Upload, Save, Building2, User, Mail, Lock, Settings, CreditCard } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
    companyPhone: company?.phone || '',
  });

  const [cities, setCities] = useState(CITIES_BY_STATE[formData.estado] || []);
  const [loadingCep, setLoadingCep] = useState(false);

  const { data: companyData } = useQuery({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/auth/me');
      return res.company;
    },
    enabled: !!company?.id
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data) => {
      const res = await apiRequest('PATCH', '/api/auth/profile', {
          name: data.name || '',
          phone: data.phone || '',
          companyPhone: data.companyPhone || '',
          avatar: data.avatar,
          cep: data.cep || '',
          endereco: data.endereco || '',
          rua: data.rua || '',
          numero: data.numero || '',
          complemento: data.complemento || '',
          estado: data.estado || '',
          cidade: data.cidade || '',
        });
      
      return res;
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
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreviewUrl(event.target?.result || '');
    };
    reader.readAsDataURL(file);
    
    const dataUrlReader = new FileReader();
    dataUrlReader.onload = async (event) => {
      const dataUrl = event.target?.result;
      if (dataUrl) {
        try {
          const result = await apiRequest('POST', '/api/auth/avatar', { avatarDataUrl: dataUrl });
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

  const [passwords, setPasswords] = useState({
    new: '',
    confirm: ''
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async (data) => {
      const res = await apiRequest('POST', '/api/auth/reset-password', data);
      return res;
    },
    onSuccess: () => {
      toast.success('Senha atualizada com sucesso!');
      setPasswords({ new: '', confirm: '' });
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const handlePasswordReset = (e) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      toast.error('As senhas não coincidem');
      return;
    }
    if (passwords.new.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres');
      return;
    }
    updatePasswordMutation.mutate({
      newPassword: passwords.new
    });
  };

  const RedefinirSenhaForm = () => {
    return (
      <form onSubmit={handlePasswordReset} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="new">Nova Senha</Label>
            <Input 
              id="new" 
              type="password" 
              autoComplete="new-password"
              value={passwords.new} 
              onChange={e => {
                const val = e.target.value;
                setPasswords(prev => ({...prev, new: val}));
              }} 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirmar Senha</Label>
            <Input 
              id="confirm" 
              type="password" 
              autoComplete="new-password"
              value={passwords.confirm} 
              onChange={e => {
                const val = e.target.value;
                setPasswords(prev => ({...prev, confirm: val}));
              }} 
            />
          </div>
        </div>
        <Button type="submit" className="w-full bg-[#005CB8] hover:bg-[#005CB8]/90 text-white font-semibold" disabled={updatePasswordMutation.isPending}>
          {updatePasswordMutation.isPending ? 'Atualizando...' : 'Atualizar Senha'}
        </Button>
      </form>
    );
  };

  const ProfileTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Perfil do Usuário
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
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
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Alterar Foto
                </Button>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input id="name" name="name" value={formData.name} onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone Pessoal</Label>
                <Input id="phone" name="phone" value={formData.phone} onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyPhone">Telefone da Empresa</Label>
                <Input id="companyPhone" name="companyPhone" value={formData.companyPhone} onChange={handleInputChange} placeholder="(00) 00000-0000" />
              </div>
            </div>

            <div className="pt-4 border-t space-y-4">
              <h3 className="text-lg font-semibold">Endereço</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cep">CEP</Label>
                  <Input id="cep" name="cep" value={formData.cep} onChange={handleCepChange} maxLength="8" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rua">Rua/Avenida</Label>
                  <Input id="rua" name="rua" value={formData.rua} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numero">Número</Label>
                  <Input id="numero" name="numero" value={formData.numero} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="complemento">Complemento</Label>
                  <Input id="complemento" name="complemento" value={formData.complemento} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estado">Estado</Label>
                  <Select value={formData.estado} onValueChange={handleStateChange}>
                    <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
                    <SelectContent>
                      {BRAZILIAN_STATES.map(s => <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cidade">Cidade</Label>
                  <Select value={formData.cidade} onValueChange={v => setFormData(p => ({...p, cidade: v}))}>
                    <SelectTrigger disabled={!formData.estado}><SelectValue placeholder="Cidade" /></SelectTrigger>
                    <SelectContent>
                      {cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Button type="submit" disabled={updateProfileMutation.isPending} className="w-full bg-[#005CB8] hover:bg-[#005CB8]/90 text-white font-semibold">
              <Save className="w-4 h-4 mr-2" />
              {updateProfileMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Lock className="w-5 h-5" /> Redefinir Senha</CardTitle></CardHeader>
        <CardContent>
          <RedefinirSenhaForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Mail className="w-5 h-5" /> Conta</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-muted/50 rounded-lg border">
              <Label className="text-xs text-muted-foreground block mb-1">Email</Label>
              <p className="text-sm font-medium">{formData.email}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg border">
              <Label className="text-xs text-muted-foreground block mb-1">Cargo</Label>
              <Badge variant="outline" className="capitalize">{formData.role === 'admin' ? 'Administrador' : 'Operacional'}</Badge>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg border">
              <Label className="text-xs text-muted-foreground block mb-1">CNPJ/CPF</Label>
              <p className="text-sm font-medium">{company?.document || 'Não definido'}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg border">
              <Label className="text-xs text-muted-foreground block mb-1">Telefone da Empresa</Label>
              <p className="text-sm font-medium">{company?.phone || 'Não definido'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Minha Assinatura
          </CardTitle>
          {company?.paymentStatus === 'approved' && (
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={() => {
                if(confirm('Tem certeza que deseja cancelar sua assinatura? Você perderá o acesso premium ao final do ciclo atual.')) {
                  cancelSubscriptionMutation.mutate();
                }
              }}
              disabled={cancelSubscriptionMutation.isPending}
            >
              Cancelar Assinatura
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
              <Label className="text-xs text-primary font-semibold uppercase tracking-wider mb-1 block">Plano Atual</Label>
              <p className="text-2xl font-bold capitalize">{company?.subscriptionPlan || 'Nenhum'}</p>
            </div>
            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
              <Label className="text-xs text-primary font-semibold uppercase tracking-wider mb-1 block">Status</Label>
              <Badge className={company?.paymentStatus === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                {company?.paymentStatus === 'approved' ? 'Ativa' : 'Pendente/Inativa'}
              </Badge>
            </div>
            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
              <Label className="text-xs text-primary font-semibold uppercase tracking-wider mb-1 block">Forma de Pagamento</Label>
              <div className="flex items-center gap-2 mt-1">
                <CreditCard className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Cartão de Crédito</span>
              </div>
            </div>
          </div>
          
          <div className="pt-4 border-t">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Dados da Empresa
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Razão Social</Label>
                <p className="font-medium">{company?.name}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">CNPJ/CPF</Label>
                <p className="font-medium">{company?.document}</p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <h3 className="text-lg font-semibold mb-4">Histórico de Cobranças</h3>
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Data</th>
                    <th className="px-4 py-3 text-left font-medium">Plano</th>
                    <th className="px-4 py-3 text-left font-medium">Valor</th>
                    <th className="px-4 py-3 text-right font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {invoices.length > 0 ? invoices.map((inv, i) => (
                    <tr key={i} className="hover:bg-muted/30">
                      <td className="px-4 py-3">{new Date(inv.date).toLocaleDateString('pt-BR')}</td>
                      <td className="px-4 py-3 capitalize">{inv.plan}</td>
                      <td className="px-4 py-3">R$ {parseFloat(inv.amount).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Pago</Badge>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground italic">Nenhuma cobrança encontrada.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const EmailConfigTab = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Configuração de Email (SMTP)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
          Configure as credenciais SMTP para habilitar o envio de convites e notificações por email.
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Host SMTP</Label>
            <Input placeholder="smtp.gmail.com" value={smtpConfig.host} onChange={e => setSmtpConfig({...smtpConfig, host: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>Porta</Label>
            <Input placeholder="587" value={smtpConfig.port} onChange={e => setSmtpConfig({...smtpConfig, port: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>Usuário</Label>
            <Input placeholder="seu-email@gmail.com" value={smtpConfig.user} onChange={e => setSmtpConfig({...smtpConfig, user: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>Senha</Label>
            <Input type="password" placeholder="••••••••" value={smtpConfig.password} onChange={e => setSmtpConfig({...smtpConfig, password: e.target.value})} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Email do Remetente</Label>
            <Input placeholder="seu-email@gmail.com" value={smtpConfig.fromEmail} onChange={e => setSmtpConfig({...smtpConfig, fromEmail: e.target.value})} />
          </div>
        </div>
        <Button className="w-full" onClick={() => toast.info('Configuração de SMTP será implementada em breve.')}>
          Salvar Configurações de Email
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground mt-1">Gerencie seu perfil, assinatura e preferências do sistema.</p>
      </div>

      <Tabs defaultValue="perfil" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8 bg-muted/50 p-1">
          <TabsTrigger 
            value="perfil" 
            className="gap-2 data-[state=active]:bg-[#005CB8] data-[state=active]:text-white font-medium transition-all"
          >
            <User className="w-4 h-4" /> <span className="hidden sm:inline">Perfil</span>
          </TabsTrigger>
          <TabsTrigger 
            value="assinatura" 
            className="gap-2 data-[state=active]:bg-[#005CB8] data-[state=active]:text-white font-medium transition-all"
          >
            <CreditCard className="w-4 h-4" /> <span className="hidden sm:inline">Assinaturas</span>
          </TabsTrigger>
          <TabsTrigger 
            value="email" 
            className="gap-2 data-[state=active]:bg-[#005CB8] data-[state=active]:text-white font-medium transition-all"
          >
            <Settings className="w-4 h-4" /> <span className="hidden sm:inline">Configuração Email</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="perfil">
          <ProfileTab />
        </TabsContent>
        
        <TabsContent value="assinatura">
          <SubscriptionTab />
        </TabsContent>

        <TabsContent value="email">
          <EmailConfigTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
