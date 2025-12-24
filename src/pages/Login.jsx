import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Copy } from "lucide-react";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [credentials, setCredentials] = useState(null);
  const { login } = useAuth();
  const [, setLocation] = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      setLoading(true);
      await login(username, password);
      toast.success("Login successful!");
      setLocation("/");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetDatabase = async () => {
    const confirm = window.confirm(
      "⚠️ Isso vai DELETAR TODAS as tabelas e recriar com 3 logins de teste.\n\nTem certeza?"
    );
    if (!confirm) return;

    try {
      setResetting(true);
      const response = await fetch("/api/dev/reset-and-seed", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to reset database");
      }

      const data = await response.json();
      setCredentials(data);
      toast.success("Database reset successfully!");
    } catch (error) {
      toast.error(error.message || "Failed to reset database");
    } finally {
      setResetting(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-6">
        <h1 className="text-2xl font-bold mb-6">Login</h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Username</label>
            <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              disabled={loading || resetting}
              data-testid="input-username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              disabled={loading || resetting}
              data-testid="input-password"
            />
          </div>

          <Button
            type="submit"
            disabled={loading || resetting}
            className="w-full"
            data-testid="button-login"
          >
            {loading ? "Logging in..." : "Login"}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm">
          Don't have an account?{" "}
          <a href="/signup" className="text-primary hover:underline">
            Sign up
          </a>
        </p>

        <div className="mt-6 pt-6 border-t">
          <Button
            onClick={handleResetDatabase}
            disabled={loading || resetting}
            variant="outline"
            className="w-full"
            data-testid="button-reset-database"
          >
            {resetting ? "Resetting..." : "🔄 Reset Database (Dev)"}
          </Button>
        </div>

        {credentials && (
          <div className="mt-6 space-y-4">
            <div className="p-4 border border-primary rounded-lg bg-muted">
              <p className="text-sm font-medium">✓ Banco de dados resetado!</p>
              <p className="text-xs mt-1 text-muted-foreground">Empresa: {credentials.companyId}</p>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold">Usuários criados:</h3>
              {credentials.users && credentials.users.map((user, idx) => (
                <div key={idx} className="border rounded-lg p-3 space-y-2 bg-muted">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{user.name}</span>
                    <span className="text-xs px-2 py-1 bg-background rounded border">{user.role}</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Usuário:</p>
                      <div className="flex items-center gap-1 mt-1">
                        <code className="flex-1 bg-background px-2 py-1 rounded font-mono border">{user.username}</code>
                        <button
                          onClick={() => copyToClipboard(user.username)}
                          className="p-1 hover:bg-background rounded border"
                          title="Copiar"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Senha:</p>
                      <div className="flex items-center gap-1 mt-1">
                        <code className="flex-1 bg-background px-2 py-1 rounded font-mono border">{user.password}</code>
                        <button
                          onClick={() => copyToClipboard(user.password)}
                          className="p-1 hover:bg-background rounded border"
                          title="Copiar"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Email:</p>
                      <div className="flex items-center gap-1 mt-1">
                        <code className="flex-1 bg-background px-2 py-1 rounded font-mono border">{user.email}</code>
                        <button
                          onClick={() => copyToClipboard(user.email)}
                          className="p-1 hover:bg-background rounded border"
                          title="Copiar"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
