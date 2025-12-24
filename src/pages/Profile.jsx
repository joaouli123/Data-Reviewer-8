import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Upload, Save } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(user?.avatar || '');
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    email: user?.email || '',
    role: user?.role || '',
    companyId: user?.companyId || '',

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
    },

  const handleAvatarChange = (e) => {
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
    toast.info('Função de avatar implementada em breve');
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
    
    await updateProfileMutation.mutateAsync(formData);
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
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Meu Perfil</h1>
        <p className="text-muted-foreground mt-1">Gerencie suas informações pessoais</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações Pessoais</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Avatar Section */}
            <div className="flex flex-col gap-4 items-center pb-6 border-b">
              <Avatar className="w-24 h-24">
                <AvatarImage src={previewUrl || user?.avatar} alt={user?.name} />
                <AvatarFallback>{getInitials(user?.name)}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="outline"
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
            <div className="space-y-4">
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

            {/* Read-only Fields */}
            <div className="space-y-4 p-4 bg-muted rounded-lg">
              <p className="text-sm font-semibold text-muted-foreground">Informações da Conta (Somente Leitura)</p>
              
              <div>
                <Label className="text-muted-foreground">Email</Label>
                <div className="p-2 bg-background rounded border">
                  <p className="text-sm">{formData.email || 'Não definido'}</p>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Cargo</Label>
                <div className="p-2 bg-background rounded border">
                  <p className="text-sm capitalize">{formData.role}</p>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Empresa</Label>
                <div className="p-2 bg-background rounded border">
                  <p className="text-sm">{formData.companyId}</p>
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
    </div>
  );
}
