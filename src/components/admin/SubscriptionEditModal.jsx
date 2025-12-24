import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDateWithTimezone } from '@/utils/dateFormatter';

export function SubscriptionEditModal({ subscription, open, onOpenChange, onSave, isPending }) {
  const [isEditing, setIsEditing] = useState(false);
  
  const form = useForm({
    defaultValues: {
      subscriberName: subscription?.subscriberName || '',
      paymentMethod: subscription?.paymentMethod || '',
      plan: subscription?.plan || 'basic',
      amount: subscription?.amount || '',
      status: subscription?.status || 'active',
    },
  });

  const onSubmit = async (data) => {
    await onSave({
      id: subscription.id,
      ...data,
    });
    setIsEditing(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Assinatura' : 'Detalhes da Assinatura'}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? 'Atualize as informações da assinatura' : 'Visualize as informações completas da assinatura'}
          </DialogDescription>
        </DialogHeader>

        {isEditing ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="subscriberName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Comprador</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome completo" {...field} data-testid="input-subscriber-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="plan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plano</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-plan">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="basic">Basic</SelectItem>
                        <SelectItem value="pro">Pro</SelectItem>
                        <SelectItem value="enterprise">Enterprise</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Forma de Pagamento</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-payment-method">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                        <SelectItem value="debit_card">Cartão de Débito</SelectItem>
                        <SelectItem value="pix">PIX</SelectItem>
                        <SelectItem value="bank_transfer">Transferência Bancária</SelectItem>
                        <SelectItem value="boleto">Boleto</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor (R$)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="0.00" 
                        type="number" 
                        step="0.01"
                        {...field} 
                        data-testid="input-amount" 
                      />
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
                        <SelectItem value="active">Ativa</SelectItem>
                        <SelectItem value="blocked">Bloqueada</SelectItem>
                        <SelectItem value="cancelled">Cancelada</SelectItem>
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
                <p className="text-xs text-muted-foreground uppercase mb-2">Empresa</p>
                <p className="text-lg font-medium" data-testid="text-company">{subscription?.companyName || 'N/A'}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground uppercase mb-2">Comprador</p>
                <p className="text-lg font-medium" data-testid="text-subscriber-name">{subscription?.subscriberName || 'N/A'}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground uppercase mb-2">Plano</p>
                <p className="text-lg font-medium capitalize" data-testid="text-plan">{subscription?.plan || 'N/A'}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground uppercase mb-2">Valor</p>
                <p className="text-lg font-medium" data-testid="text-amount">
                  {subscription?.amount ? `R$ ${parseFloat(subscription.amount).toFixed(2)}` : 'N/A'}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground uppercase mb-2">Forma de Pagamento</p>
                <p className="text-lg font-medium" data-testid="text-payment-method">{subscription?.paymentMethod || 'N/A'}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground uppercase mb-2">Data de Assinatura</p>
                <p className="text-lg font-medium" data-testid="text-created">
                  {formatDateWithTimezone(subscription?.createdAt)}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground uppercase mb-2">Próximo Vencimento</p>
                <p className="text-lg font-medium" data-testid="text-expires">
                  {subscription?.isLifetime ? (
                    <Badge variant="outline">Vitalício</Badge>
                  ) : (
                    subscription?.expiresAt ? formatDateWithTimezone(subscription.expiresAt) : 'N/A'
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground uppercase mb-2">Status</p>
                <p data-testid="text-status">
                  <Badge 
                    variant={subscription?.status === 'active' ? 'default' : subscription?.status === 'blocked' ? 'destructive' : 'secondary'}
                  >
                    {subscription?.status === 'active' ? 'Ativa' : subscription?.status === 'blocked' ? 'Bloqueada' : 'Cancelada'}
                  </Badge>
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button 
                onClick={() => setIsEditing(true)}
                data-testid="button-edit"
              >
                Editar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
