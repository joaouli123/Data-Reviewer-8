import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Upload, Save, Lock, CreditCard, User, Loader2, Download } from 'lucide-react';
import { addMonths } from 'date-fns';
import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Dados estáticos movidos para fora do componente para performance
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
  // ... (Mantenha sua lista completa aqui, abreviei para economizar espaço visual) ...
  'MG': ['Belo Horizonte', 'Uberlândia', 'Juiz de Fora', 'Contagem'],
  'PR': ['Curitiba', 'Londrina', 'Maringá', 'Ponta Grossa'],
  // Adicione um fallback genérico caso o estado não tenha cidades cadastradas
  'DEFAULT': ['Capital', 'Interior'] 
};

export default function ProfilePage() {
  const { user, updateUser, company, isLoading: authLoading } = useAuth();
  const fileInputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [loadingCep, setLoadingCep] = useState(false);

  // Estado inicial seguro
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', name: '', phone: '', email: '', role: '',
    cep: '', rua: '', numero: '', complemento: '', estado: '', cidade: '', cnpj: '',
  });

  const [cities, setCities] = useState([]);
  const [passwords, setPasswords] = useState({ new: '', confirm: '' });

  // Sincroniza dados do usuário com o formulário
  useEffect(() => {
    if (user) {
      const resolvedFirst = user.firstName || user.name?.split(' ')[0] || '';
      const resolvedLast = user.lastName || user.name?.split(' ').slice(1).join(' ') || '';
      const resolvedFullName = [resolvedFirst, resolvedLast].filter(Boolean).join(' ');
      setFormData({
        firstName: resolvedFirst,
        lastName: resolvedLast,
        name: resolvedFullName,
        phone: user.phone || '',
        email: user.email || '',
        role: user.role || '',
        cep: user.cep || '',
        rua: user.rua || '',
        numero: user.numero || '',
        complemento: user.complemento || '',
        estado: user.estado || '',
        cidade: user.cidade || '',
        cnpj: company?.document || company?.cnpj || '',
      });
      setPreviewUrl(user.avatar || '');

      if (user.estado) {
        setCities(CITIES_BY_STATE[user.estado] || []);
      }
    }
  }, [user]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data) => apiRequest('PATCH', '/api/auth/profile', data),
    onSuccess: (data) => {
      updateUser(data.user);
      toast.success('Perfil salvo com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['/api/auth/profile'] });
    },
    onError: (error) => toast.error(error.message || 'Erro ao atualizar perfil')
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async (data) => apiRequest('POST', '/api/auth/reset-password', data),
    onSuccess: () => {
      toast.success('Senha atualizada!');
      setPasswords({ new: '', confirm: '' });
    },
    onError: (error) => toast.error(error.message)
  });

  // Queries e Helpers
  const { data: invoicesResult = [], isLoading: isLoadingInvoices } = useQuery({
    queryKey: ['/api/auth/invoices'],
    queryFn: () => apiRequest('GET', '/api/auth/invoices'),
    enabled: !!company?.id
  });
  const invoices = Array.isArray(invoicesResult) ? invoicesResult : [];

  const planTranslation = { 'monthly': 'Mensal', 'pro': 'Pro / Vitalício', 'basic': 'Básico', 'enterprise': 'Empresarial' };
  const currentSubscription = company?.subscriptionPlan === 'monthly' ? 'Mensal' : (planTranslation[company?.subscriptionPlan] || company?.subscriptionPlan || "Free");
  const planValue = company?.subscriptionPlan === "pro" ? "997,00" : (company?.subscriptionPlan === "monthly" ? "215,00" : "0,00");
  const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'US';
  const displayName = [formData.firstName, formData.lastName].filter(Boolean).join(' ') || formData.name;
  const primaryInvoice = (() => {
    // Prioriza fatura pendente; se todas pagas, usa a mais recente
    const pending = invoices.find(inv => inv.status !== 'paid' && inv.status !== 'approved');
    return pending || invoices[0] || null;
  })();

  const nextDueDate = (() => {
    if (!(primaryInvoice?.expiresAt)) return null;
    const base = new Date(primaryInvoice.expiresAt);
    const now = new Date();
    // Se a fatura corrente já venceu, projeta para o mês seguinte
    return base <= now ? addMonths(base, 1) : base;
  })();

  // Handlers
  const formatPhone = (value) => {
    if (!value) return "";
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "");
    }
    return numbers.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "");
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "phone") {
      const numbers = value.replace(/\D/g, "");
      const formatted = formatPhone(numbers);
      if (numbers.length <= 11) {
        setFormData(prev => ({ ...prev, [name]: formatted }));
      }
      return;
    }
    if (name === "firstName" || name === "lastName") {
      setFormData(prev => {
        const next = { ...prev, [name]: value };
        const newFirst = name === "firstName" ? value : prev.firstName;
        const newLast = name === "lastName" ? value : prev.lastName;
        next.name = [newFirst, newLast].filter(Boolean).join(' ');
        return next;
      });
      return;
    }
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
        const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setFormData(prev => ({
            ...prev, 
            rua: data.logradouro || '', 
            complemento: data.complemento || '',
            cidade: data.localidade || '', 
            estado: data.uf || '',
          }));
          setCities(CITIES_BY_STATE[data.uf] || []);
          toast.success('Endereço encontrado!');
        }
      } catch (err) { toast.error('Erro ao buscar CEP'); }
      finally { setLoadingCep(false); }
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPreviewUrl(ev.target.result);
        // Aqui você pode implementar o upload imediato se desejar
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      name: displayName,
      avatar: previewUrl
    };
    updateProfileMutation.mutate(payload);
  };

  // Previne tela branca se user não estiver carregado
  if (!user && authLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="container max-w-4xl py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Meu Perfil</h1>
        <p className="text-muted-foreground text-sm">Gerencie suas informações.</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="profile">Dados Pessoais</TabsTrigger>
          <TabsTrigger value="subscription">Financeiro</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><User className="w-5 h-5"/> Perfil</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex flex-col gap-4 items-center pb-6 border-b">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src={previewUrl} />
                    <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
                  </Avatar>
                  <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-4 h-4 mr-2" /> Alterar Foto
                  </Button>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Primeiro Nome</Label>
                    <Input id="firstName" name="firstName" value={formData.firstName} onChange={handleInputChange} data-testid="input-first-name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Sobrenome</Label>
                    <Input id="lastName" name="lastName" value={formData.lastName} onChange={handleInputChange} data-testid="input-last-name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input 
                      id="phone" 
                      name="phone" 
                      value={formData.phone} 
                      onChange={handleInputChange} 
                      placeholder="(00) 00000-0000"
                      data-testid="input-phone"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      name="email" 
                      type="email"
                      value={formData.email} 
                      onChange={handleInputChange} 
                      placeholder="seu@email.com"
                      data-testid="input-email"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="cnpj">CNPJ</Label>
                    <Input 
                      id="cnpj" 
                      name="cnpj" 
                      value={formData.cnpj || ''} 
                      onChange={handleInputChange} 
                      placeholder="00.000.000/0000-00"
                      data-testid="input-cnpj"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t space-y-4">
                  <h3 className="text-lg font-semibold">Endereço</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cep">CEP {loadingCep && <Loader2 className="w-3 h-3 animate-spin inline"/>}</Label>
                      <Input id="cep" name="cep" value={formData.cep} onChange={handleCepChange} maxLength="8" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rua">Rua</Label>
                      <Input id="rua" name="rua" value={formData.rua} onChange={handleInputChange} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="numero">Número</Label>
                      <Input id="numero" name="numero" value={formData.numero} onChange={handleInputChange} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="estado">Estado</Label>
                      <Select value={formData.estado || ""} onValueChange={handleStateChange}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {BRAZILIAN_STATES.map(s => <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cidade">Cidade</Label>
                      <Input id="cidade" name="cidade" value={formData.cidade} onChange={handleInputChange} />
                    </div>
                  </div>
                </div>

                <Button type="submit" className="w-full bg-[#005CB8]" disabled={updateProfileMutation.isPending}>
                  <Save className="w-4 h-4 mr-2" /> {updateProfileMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="mt-6">
             <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Lock className="w-5 h-5" /> Senha</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                     <div className="space-y-2">
                        <Label>Nova Senha</Label>
                        <Input type="password" value={passwords.new} onChange={e => setPasswords({...passwords, new: e.target.value})} />
                     </div>
                     <div className="space-y-2">
                        <Label>Confirmar Senha</Label>
                        <Input type="password" value={passwords.confirm} onChange={e => setPasswords({...passwords, confirm: e.target.value})} />
                     </div>
                     <Button onClick={(e) => {
                        e.preventDefault();
                        if(passwords.new !== passwords.confirm) return toast.error("Senhas não conferem");
                        updatePasswordMutation.mutate({ newPassword: passwords.new });
                     }} disabled={updatePasswordMutation.isPending} className="w-full">
                        Atualizar Senha
                     </Button>
                  </div>
                </CardContent>
             </Card>
          </div>
        </TabsContent>

        <TabsContent value="subscription">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5"/> Financeiro</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground">Plano</div>
                  <div className="font-bold capitalize">{currentSubscription}</div>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                   <div className="text-sm text-muted-foreground">Valor</div>
                   <div className="font-bold">R$ {planValue}</div>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                   <div className="text-sm text-muted-foreground">Próximo vencimento</div>
                   <div className="font-bold">
                     {nextDueDate ? nextDueDate.toLocaleDateString('pt-BR') : '-'}
                   </div>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                   <div className="text-sm text-muted-foreground">Status</div>
                   <Badge variant={company?.paymentStatus === "approved" ? "default" : "secondary"}>
                     {company?.paymentStatus === "approved" ? "Ativo" : "Pendente"}
                   </Badge>
                </div>
              </div>

              {primaryInvoice && (
                <div className="mb-6 p-4 border border-blue-100 bg-blue-50 rounded-lg flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-blue-900">Download do Boleto</div>
                    <div className="text-sm text-blue-700">Baixe o boleto da sua última fatura.</div>
                  </div>
                  <Button asChild variant="outline" className="border-blue-200 hover:bg-blue-100">
                    <a href={primaryInvoice.ticket_url || '#'} target="_blank" rel="noopener noreferrer">
                      <Download className="w-4 h-4 mr-2" /> Baixar Boleto
                    </a>
                  </Button>
                </div>
              )}

              <div className="border rounded-md">
                 <table className="w-full text-sm">
                      <thead className="bg-muted border-b">
                        <tr>
                         <th className="p-3 text-left">Data</th>
                         <th className="p-3 text-left">Plano</th>
                         <th className="p-3 text-left">Vencimento</th>
                         <th className="p-3 text-right">Valor</th>
                        </tr>
                      </thead>
                    <tbody>
                       {invoices.length > 0 ? invoices.map((inv, i) => (
                          <tr key={i} className="border-b last:border-0">
                             <td className="p-3">{inv.date ? new Date(inv.date).toLocaleDateString() : '-'}</td>
                             <td className="p-3">{planTranslation[inv.plan] || inv.plan}</td>
                            <td className="p-3">{inv.expiresAt ? new Date(inv.expiresAt).toLocaleDateString('pt-BR') : '-'}</td>
                            <td className="p-3 text-right">R$ {parseFloat(inv.amount||0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          </tr>
                        )) : <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">Nenhuma fatura encontrada</td></tr>}
                    </tbody>
                 </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}