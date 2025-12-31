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
  const { isAuthenticated, company, loading, token, paymentPending } = useAuth();

  useEffect(() => {
    if (token) {
      const initializeData = async () => {
        try {
          await fetch("/api/categories", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
        } catch (error) {
          // Error handled by auth context
        }
      };
      initializeData();
    }
  }, [token]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  // Verificar se está em página pública (sem window dependency)
  const isPublicPage = typeof window !== 'undefined' ? 
    ["/", "/payment-success", "/accept-invite"].includes(window.location.pathname) : 
    false;

  // Se está logado mas com pagamento pendente, força checkout
  if ((isAuthenticated || paymentPending) && company && company.paymentStatus !== "approved" && !isPublicPage) {
    // Only redirect to checkout if we're not already there
    if (typeof window !== 'undefined' && 
        window.location.pathname !== '/checkout' && 
        window.location.pathname !== '/payment-success' &&
        window.location.pathname !== '/accept-invite') {
      window.location.href = '/checkout';
      return null;
    }
    return (
      <Switch>
        <Route path="/checkout" component={Checkout} />
        <Route path="/payment-success" component={PaymentSuccess} />
        <Route path="/accept-invite" component={AcceptInvite} />
        <Route component={Checkout} />
      </Switch>
    );
  }

  if (!isAuthenticated && !paymentPending) {
    return (
      <Switch>
        <Route path="/" component={Login} />
        <Route path="/login" component={Login} />
        <Route path="/signup" component={Signup} />
        <Route path="/checkout" component={Checkout} />
        <Route path="/payment-success" component={PaymentSuccess} />
        <Route path="/accept-invite" component={AcceptInvite} />
        <Route component={Login} />
      </Switch>
    );
  }

  // Página de sucesso não deve ter o layout lateral
  if (window.location.pathname === "/payment-success") {
    return <PaymentSuccess />;
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
