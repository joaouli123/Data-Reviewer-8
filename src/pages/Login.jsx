import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Copy } from "lucide-react";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
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
      setShowCredentials(true);
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
      </Card>

      <Dialog open={showCredentials} onOpenChange={setShowCredentials}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Database Reset - Login Credentials</DialogTitle>
            <DialogDescription>
              Três usuários foram criados com sucesso. Copie as credenciais abaixo para logar.
            </DialogDescription>
          </DialogHeader>

          {credentials && (
            <div className="space-y-6">
              {[0, 1, 2].map((idx) => {
                const cred = credentials[idx];
                return (
                  <div key={idx} className="border rounded-lg p-4 space-y-3">
                    <h3 className="font-bold text-sm">{cred.role.toUpperCase()} #{idx + 1}</h3>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground">Username:</span>
                        <code className="bg-muted px-2 py-1 rounded text-xs flex-1 text-right">{cred.username}</code>
                        <button
                          onClick={() => copyToClipboard(cred.username)}
                          className="p-1 hover:bg-muted rounded"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground">Password:</span>
                        <code className="bg-muted px-2 py-1 rounded text-xs flex-1 text-right">{cred.password}</code>
                        <button
                          onClick={() => copyToClipboard(cred.password)}
                          className="p-1 hover:bg-muted rounded"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground">Email:</span>
                        <code className="bg-muted px-2 py-1 rounded text-xs flex-1 text-right">{cred.email}</code>
                        <button
                          onClick={() => copyToClipboard(cred.email)}
                          className="p-1 hover:bg-muted rounded"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="border-t pt-4">
                <h4 className="font-bold text-sm mb-2">Company Info</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">Company ID:</span>
                    <code className="bg-muted px-2 py-1 rounded text-xs flex-1 text-right">{credentials.companyId}</code>
                    <button
                      onClick={() => copyToClipboard(credentials.companyId)}
                      className="p-1 hover:bg-muted rounded"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">API Key:</span>
                    <code className="bg-muted px-2 py-1 rounded text-xs flex-1 text-right">{credentials.apiKey}</code>
                    <button
                      onClick={() => copyToClipboard(credentials.apiKey)}
                      className="p-1 hover:bg-muted rounded"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
