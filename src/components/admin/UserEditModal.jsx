import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDateWithTimezone } from '@/utils/dateFormatter';

export function UserEditModal({ user, open, onOpenChange, onSave, isPending }) {
  const [isEditing, setIsEditing] = useState(false);
  
  const form = useForm({
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      role: user?.role || 'user',
      status: user?.status || 'active',
    },

  const onSubmit = async (data) => {
    await onSave({
      id: user.id,
      ...data,
    });
    setIsEditing(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Usuário' : 'Detalhes do Usuário'}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? 'Atualize as informações do usuário' : 'Visualize as informações completas do usuário'}
          </DialogDescription>
        </DialogHeader>

        {isEditing ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome completo" {...field} data-testid="input-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="email@exemplo.com" type="email" {...field} data-testid="input-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input placeholder="(11) 99999-9999" {...field} data-testid="input-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Função</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-role">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="operational">Operational</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-status">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Ativo</SelectItem>
                        <SelectItem value="inactive">Inativo</SelectItem>
                        <SelectItem value="suspended">Suspenso</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3">
                <Button 
                  type="submit" 
                  disabled={isPending}
                  data-testid="button-save"
                >
                  {isPending ? 'Salvando...' : 'Salvar'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  data-testid="button-cancel"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </Form>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-muted-foreground uppercase mb-2">Nome Completo</p>
                <p className="text-lg font-medium" data-testid="text-name">{user?.name || 'N/A'}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground uppercase mb-2">Usuário</p>
                <p className="text-lg font-medium" data-testid="text-username">{user?.username || 'N/A'}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground uppercase mb-2">Email</p>
                <p className="text-lg font-medium" data-testid="text-email">{user?.email || 'N/A'}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground uppercase mb-2">Telefone</p>
                <p className="text-lg font-medium" data-testid="text-phone">{user?.phone || 'N/A'}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground uppercase mb-2">Empresa</p>
                <p className="text-lg font-medium" data-testid="text-company">{user?.companyName || 'N/A'}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground uppercase mb-2">Função</p>
                <p className="text-lg font-medium capitalize" data-testid="text-role">{user?.role || 'N/A'}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground uppercase mb-2">Status</p>
                <Badge 
                  variant={user?.status === 'active' ? 'default' : user?.status === 'suspended' ? 'destructive' : 'secondary'}
                  className="capitalize"
                  data-testid={`badge-status-${user?.id}`}
                >
                  {user?.status === 'active' ? 'Ativo' : user?.status === 'suspended' ? 'Suspenso' : 'Inativo'}
                </Badge>
              </div>

              <div>
                <p className="text-xs text-muted-foreground uppercase mb-2">Data de Criação</p>
                <p className="text-lg font-medium" data-testid="text-created-at">
                  {formatDateWithTimezone(user?.createdAt)}
                </p>
              </div>
            </div>

            <Button 
              onClick={() => setIsEditing(true)}
              variant="outline"
              className="w-full"
              data-testid="button-edit"
            >
              Editar Informações
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
