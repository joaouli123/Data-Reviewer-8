import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDateWithTimezone } from '@/utils/dateFormatter';

export function CustomerEditModal({ customer, open, onOpenChange, onSave, isPending }) {
  const [isEditing, setIsEditing] = useState(false);
  
  const form = useForm({
    defaultValues: {
      name: customer?.name || '',
      email: customer?.email || '',
      phone: customer?.phone || '',
      companyName: customer?.companyName || '',
      document: customer?.document || '',
      status: customer?.status || 'active',
    },

  const onSubmit = async (data) => {
    await onSave({
      id: customer.id,
      ...data,
    });
    setIsEditing(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Cliente' : 'Detalhes do Cliente'}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? 'Atualize as informações do cliente' : 'Visualize as informações completas do cliente'}
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
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Empresa</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome da empresa" {...field} data-testid="input-company" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="document"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CPF/CNPJ</FormLabel>
                    <FormControl>
                      <Input placeholder="00000000000000" {...field} data-testid="input-document" />
                    </FormControl>
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
                        <SelectItem value="blocked">Bloqueado</SelectItem>
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
                <p className="text-xs text-muted-foreground uppercase mb-2">Nome</p>
                <p className="text-lg font-medium" data-testid="text-name">{customer?.name || 'N/A'}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground uppercase mb-2">Email</p>
                <p className="text-lg font-medium" data-testid="text-email">{customer?.email || 'N/A'}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground uppercase mb-2">Telefone</p>
                <p className="text-lg font-medium" data-testid="text-phone">{customer?.phone || 'N/A'}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground uppercase mb-2">Empresa</p>
                <p className="text-lg font-medium" data-testid="text-company">{customer?.companyName || 'N/A'}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground uppercase mb-2">CPF/CNPJ</p>
                <p className="text-lg font-medium" data-testid="text-document">{customer?.document || 'N/A'}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground uppercase mb-2">Status</p>
                <Badge 
                  variant={customer?.status === 'active' ? 'default' : customer?.status === 'blocked' ? 'destructive' : 'secondary'}
                  className="capitalize"
                  data-testid={`badge-status-${customer?.id}`}
                >
                  {customer?.status === 'active' ? 'Ativo' : customer?.status === 'blocked' ? 'Bloqueado' : 'Inativo'}
                </Badge>
              </div>

              <div>
                <p className="text-xs text-muted-foreground uppercase mb-2">Data de Criação</p>
                <p className="text-lg font-medium" data-testid="text-created-at">
                  {formatDateWithTimezone(customer?.createdAt)}
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
