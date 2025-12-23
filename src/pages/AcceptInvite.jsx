import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Mail, CheckCircle } from 'lucide-react';

export default function AcceptInvitePage() {
  const [location, setLocation] = useLocation();
  const [token, setToken] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get('token') || '');
  }, []);

  const handleAccept = async (e) => {
    e.preventDefault();
    if (!token || !username || !password) {
      toast.error('Preencha todos os campos');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, username, password })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Falha ao aceitar convite');
      }

      setAccepted(true);
      toast.success('Convite aceito! Redirecionando...');
      setTimeout(() => setLocation('/login'), 2000);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Aceitar Convite</CardTitle>
          <CardDescription>
            {accepted ? 'Convite aceito com sucesso!' : 'Complete seu perfil para começar'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {accepted ? (
            <div className="text-center space-y-4">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
              <p className="text-sm text-muted-foreground">Você será redirecionado para login...</p>
            </div>
          ) : (
            <form onSubmit={handleAccept} className="space-y-4">
              <Input
                type="text"
                placeholder="Nome de usuário"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                data-testid="input-accept-username"
              />
              <Input
                type="password"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                data-testid="input-accept-password"
              />
              {!token && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <p className="text-sm text-amber-800">Link de convite inválido ou expirado</p>
                </div>
              )}
              <Button
                type="submit"
                disabled={loading || !token}
                className="w-full"
                data-testid="button-accept-invite"
              >
                {loading ? 'Processando...' : 'Aceitar Convite'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
