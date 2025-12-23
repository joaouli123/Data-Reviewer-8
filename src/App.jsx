import { useEffect } from "react";
import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Toaster } from "sonner";
import Pages from "@/pages/index.jsx";
import Login from "@/pages/Login.jsx";
import Signup from "@/pages/Signup.jsx";

function AppContent() {
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      const initializeData = async () => {
        try {
          await fetch("/api/categories", {
            headers: {
              Authorization: `Bearer ${JSON.parse(localStorage.getItem("auth") || "{}").token}`,
            },
          });
        } catch (error) {
          // Error handled by auth context
        }
      };
      initializeData();
    }
  }, [isAuthenticated]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/signup" component={Signup} />
        <Route component={Login} />
      </Switch>
    );
  }

  return <Pages />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppContent />
        <Toaster position="bottom-right" richColors />
      </AuthProvider>
    </QueryClientProvider>
  );
}
