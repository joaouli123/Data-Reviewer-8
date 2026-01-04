import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Upload, Save, Mail, Lock, CreditCard, User } from 'lucide-react';
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
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';

const BRAZILIAN_STATES = [
  { code: 'AC', name: 'Acre' }, { code: 'AL', name: 'Alagoas' }, { code: 'AP', name: 'Amapá' },
  { code: 'AM', name: 'Amazonas' }, { code: 'BA', name: 'Bahia' }, { code: 'CE', name: 'Ceará' },
  { code: 'DF', name: 'Distrito Federal' }, { code: 'ES', name: 'Espírito Santo' },
  { code: 'GO', name: 'Goiás' }, { code: 'MA', name: 'Maranhão' }, { code: 'MT', name: 'Mato Grosso' },
  { code: 'MS', name: 'Mato Grosso do Sul' }, { code: 'MG', name: 'Minas Gerais' },
  { code: 'PA', name: 'Pará' }, { code: 'PB', name: 'Paraíba' }, { code: 'PR', name: 'Paraná' },
  { code: 'PE', name: 'Pernambuco' }, { code: 'PI', name: 'Piauí' }, { code: 'RJ', name: 'Rio de Janeiro' },
  { code: 'RN', name: 'Rio Grande do Norte' }, { code: 'RS', name: 'Rio Grande do Sul' },
  { code: 'RO', name: 'Rondônia' }, { code: 'RR', name: 'Roraima' }, { code: 'SC', name: 'Santa Catarina' },
  { code: 'SP', name: 'São Paulo' }, { code: 'SE', name: 'Sergipe' }, { code: 'TO', name: 'Tocantins' },
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
  'DF': ['Brasília'], 'AC': ['Rio Branco', 'Cruzeiro do Sul'], 'AP': ['Macapá', 'Santana'],
  'AM': ['Manaus', 'Itacoatiara'], 'RO': ['Porto Velho', 'Vilhena', 'Ariquemes'],
  'RR': ['Boa Vista', 'Rorainópolis'], 'TO': ['Palmas', 'Araguaína'], 'SE': ['Aracaju', 'Lagarto']
};

const RedefinirSenhaForm = ({ passwords, setPasswords, handlePasswordReset, isPending }) => (
  <form onSubmit={handlePasswordReset} className="space-y-4">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="new">Nova Senha</Label>
        <Input 
          id="new" 
          type="password" 
          autoComplete="new-password"
          value={passwords.new} 
          onChange={e => setPasswords(prev => ({...prev, new: e.target.value}))} 
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm">Confirmar Senha</Label>
        <Input 
          id="confirm" 
          type="password" 
          autoComplete="new-password"
          value={passwords.confirm} 
          onChange={e => setPasswords(prev => ({...prev, confirm: e.target.value}))} 
        />
      </div>
    </div>
    <Button type="submit" className="w-full bg-[#005CB8] hover:bg-[#005CB8]/90 text-white font-semibold" disabled={isPending}>
      {isPending ? 'Atualizando...' : 'Atualizar Senha'}
    </Button>
  </form>
);

const SubscriptionTab = ({ company, invoices, isLoadingInvoices }) => (
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Detalhes da Assinatura
        </CardTitle>
        <CardDescription>Gerencie seu plano e visualize o histórico de cobranças.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
            <div className="text-sm text-muted-foreground mb-1">Plano Atual</div>
            <div className="text-xl font-bold capitalize">{company?.plan || "Free"}</div>
          </div>
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
            <div className="text-sm text-muted-foreground mb-1">Status</div>
            <Badge variant={company?.paymentStatus === "approved" ? "default" : "secondary"}>
              {company?.paymentStatus === "approved" ? "Ativo" : "Pendente"}
            </Badge>
          </div>
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
            <div className="text-sm text-muted-foreground mb-1">Valor Mensal</div>
            <div className="text-xl font-bold">R$ {company?.plan === "pro" ? "99,90" : "0,00"}</div>
          </div>
        </div>
        <div className="pt-4 border-t">
          <h3 className="text-lg font-semibold mb-4">Histórico de Cobranças</h3>
          {isLoadingInvoices ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : (
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
                  {invoices?.length > 0 ? invoices.map((inv, i) => (
                    <tr key={i} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        {inv.date ? new Date(inv.date).toLocaleDateString('pt-BR') : '---'}
                      </td>
                      <td className="px-4 py-3 capitalize">{inv.plan}</td>
                      <td className="px-4 py-3">R$ {parseFloat(inv.amount || 0).toFixed(2)}</td>
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
          )}
        </div>
      </CardContent>
    </Card>
  </div>
);

export default function ProfilePage() {
  const { user, updateUser, company } = useAuth();
  const fileInputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(user?.avatar || '');
  const [loadingCep, setLoadingCep] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    email: user?.email || '',
    role: user?.role || '',
    cep: user?.cep || '',
    rua: user?.rua || '',
    numero: user?.numero || '',
    complemento: user?.complemento || '',
    estado: user?.estado || '',
    cidade: user?.cidade || '',
    companyPhone: company?.phone || '',
  });

  const [passwords, setPasswords] = useState({ new: '', confirm: '' });
  const [cities, setCities] = useState(CITIES_BY_STATE[formData.estado] || []);

  const updateProfileMutation = useMutation({
    mutationFn: async (data) => apiRequest('PATCH', '/api/auth/profile', data),
    onSuccess: (data) => {
      updateUser(data.user);
      toast.success('Perfil atualizado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['/api/auth/profile'] });
    },
    onError: (error) => toast.error(error.message || 'Erro ao atualizar perfil')
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async (data) => apiRequest('POST', '/api/auth/reset-password', data),
    onSuccess: () => {
      toast.success('Senha atualizada com sucesso!');
      setPasswords({ new: '', confirm: '' });
    },
    onError: (error) => toast.error(error.message)
  });

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => setPreviewUrl(event.target?.result || '');
    reader.readAsDataURL(file);
    const dataUrlReader = new FileReader();
    dataUrlReader.onload = async (event) => {
      const dataUrl = event.target?.result;
      if (dataUrl) {
        try {
          const result = await apiRequest('POST', '/api/auth/avatar', { avatarDataUrl: dataUrl });
          
          // Se o servidor retornou o usuário atualizado, atualizamos o contexto e o localStorage
          if (result && result.user) {
            updateUser(result.user);
            toast.success('Foto atualizada com sucesso!');
          }
        } catch (error) {
          console.error('Erro no upload do avatar:', error);
          toast.error('Falha ao fazer upload');
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
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json//`);
        const data = await response.json();
        if (!data.erro) {
          setFormData(prev => ({
            ...prev, rua: data.logradouro || '', complemento: data.complemento || '',
            cidade: data.localidade || '', estado: data.uf || '',
          }));
          setCities(CITIES_BY_STATE[data.uf] || []);
          toast.success('CEP encontrado!');
        } else toast.error('CEP não encontrado');
      } catch (error) { toast.error('Erro ao buscar CEP'); }
      finally { setLoadingCep(false); }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name?.trim()) return toast.error('Nome completo é obrigatório');
    updateProfileMutation.mutate({ ...formData, avatar: previewUrl || user?.avatar });
  };

  const handlePasswordReset = (e) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) return toast.error('As senhas não coincidem');
    if (passwords.new.length < 6) return toast.error('A senha deve ter no mínimo 6 caracteres');
    updatePasswordMutation.mutate({ newPassword: passwords.new });
  };

  const { data: invoicesResult = [], isLoading: isLoadingInvoices } = useQuery({
    queryKey: ['/api/auth/invoices'],
    queryFn: () => apiRequest('GET', '/api/auth/invoices'),
    enabled: !!company?.id
  });

  const invoices = Array.isArray(invoicesResult) ? invoicesResult : [];

  const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'US';

  const currentSubscription = company?.subscriptionPlan || "Free";
  const subscriptionStatus = company?.paymentStatus === "approved" ? "Ativo" : "Pendente";
  const planValue = company?.subscriptionPlan === "pro" ? "99,90" : "0,00";

  return (
    <div className="container max-w-4xl py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Meu Perfil</h1>
        <p className="text-muted-foreground text-sm">Gerencie suas informações e preferências da conta.</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="profile">Dados Pessoais</TabsTrigger>
          <TabsTrigger value="subscription">Assinatura</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><User className="w-5 h-5" /> Perfil</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex flex-col gap-4 items-center pb-6 border-b">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src={previewUrl || user?.avatar || ''} />
                    <AvatarFallback>{getInitials(user?.name)}</AvatarFallback>
                  </Avatar>
                  <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={updateProfileMutation.isPending}>
                    <Upload className="w-4 h-4 mr-2" /> Alterar Foto
                  </Button>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome Completo</Label>
                    <Input id="name" name="name" value={formData.name} onChange={handleInputChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input id="phone" name="phone" value={formData.phone} onChange={handleInputChange} />
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
                      <Label htmlFor="estado">Estado</Label>
                      <Select value={formData.estado} onValueChange={handleStateChange}>
                        <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
                        <SelectContent>{BRAZILIAN_STATES.map(s => <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cidade">Cidade</Label>
                      <Select value={formData.cidade} onValueChange={v => setFormData(p => ({...p, cidade: v}))}>
                        <SelectTrigger disabled={!formData.estado}><SelectValue placeholder="Cidade" /></SelectTrigger>
                        <SelectContent>{cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <Button type="submit" disabled={updateProfileMutation.isPending} className="w-full bg-[#005CB8] hover:bg-[#005CB8]/90 text-white font-semibold">
                  <Save className="w-4 h-4 mr-2" /> {updateProfileMutation.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Lock className="w-5 h-5" /> Senha</CardTitle></CardHeader>
            <CardContent>
              <RedefinirSenhaForm passwords={passwords} setPasswords={setPasswords} handlePasswordReset={handlePasswordReset} isPending={updatePasswordMutation.isPending} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscription">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Detalhes da Assinatura
                </CardTitle>
                <CardDescription>Gerencie seu plano e visualize o histórico de cobranças.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                    <div className="text-sm text-muted-foreground mb-1">Plano Atual</div>
                    <div className="text-xl font-bold capitalize">{currentSubscription}</div>
                  </div>
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                    <div className="text-sm text-muted-foreground mb-1">Status</div>
                    <Badge variant={company?.paymentStatus === "approved" ? "default" : "secondary"}>
                      {subscriptionStatus}
                    </Badge>
                  </div>
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                    <div className="text-sm text-muted-foreground mb-1">Valor Mensal</div>
                    <div className="text-xl font-bold">R$ {planValue}</div>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <h3 className="text-lg font-semibold mb-4">Histórico de Cobranças</h3>
                  {isLoadingInvoices ? (
                    <div className="text-center py-8 text-muted-foreground">Carregando...</div>
                  ) : (
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
                          {invoices?.length > 0 ? invoices.map((inv, i) => (
                            <tr key={i} className="hover:bg-muted/30">
                              <td className="px-4 py-3">
                                {inv.date ? new Date(inv.date).toLocaleDateString('pt-BR') : '---'}
                              </td>
                              <td className="px-4 py-3 capitalize">{inv.plan}</td>
                              <td className="px-4 py-3">R$ {parseFloat(inv.amount || 0).toFixed(2)}</td>
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
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
