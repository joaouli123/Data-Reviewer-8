import { useEffect } from "react";
import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Toaster } from "sonner";
import Pages from "@/pages/index.jsx";
import Home from "@/pages/Home.jsx";
import Login from "@/pages/Login.jsx";
import Signup from "@/pages/Signup.jsx";
import Checkout from "@/pages/Checkout.jsx";
import PaymentSuccess from "@/pages/PaymentSuccess.jsx";
import AcceptInvite from "@/pages/AcceptInvite.jsx";
import AccessDenied from "@/pages/AccessDenied.jsx";

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
        <Route path="/" component={Home} />
        <Route path="/login" component={Login} />
        <Route path="/signup" component={Signup} />
        <Route path="/checkout" component={Checkout} />
        <Route path="/payment-success" component={PaymentSuccess} />
        <Route path="/accept-invite" component={AcceptInvite} />
        <Route component={Home} />
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/access-denied" component={AccessDenied} />
      <Route component={Pages} />
    </Switch>
  );
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
