import { useEffect } from "react";
import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Toaster } from "sonner";
import LandingPage from "@/components/landing/LandingPage.jsx";
import Login from "@/pages/Login.jsx";
import Signup from "@/pages/Signup.jsx";
import Checkout from "@/pages/Checkout.jsx";
import PaymentSuccess from "@/pages/PaymentSuccess.jsx";
import AcceptInvite from "@/pages/AcceptInvite.jsx";
import AccessDenied from "@/pages/AccessDenied.jsx";

import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Customers from "./pages/Customers";
import Reports from "./pages/Reports";
import Suppliers from "./pages/Suppliers";
import CashFlowForecast from "./pages/CashFlowForecast";
import PricingCalculator from "./pages/PricingCalculator";
import Categories from "./pages/Categories";
import UserManagement from "./pages/UserManagement";
import UserPermissions from "./pages/UserPermissions";
import SuperAdmin from "./pages/SuperAdmin";
import SuperAdminDashboard from "./pages/admin/super-dashboard";
import AdminCustomers from "./pages/admin/customers";
import AdminSubscriptions from "./pages/admin/subscriptions";
import AdminUsers from "./pages/admin/users";
import TeamPage from "./pages/settings/Team";
import Profile from "./pages/Profile";
import TermsOfUse from "./pages/TermsOfUse";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import { usePermission } from "@/hooks/usePermission";
import Layout from "./components/Layout.jsx";

function ProtectedRoute({ component: Component, permission }) {
  const { user } = useAuth();
  const { hasPermission } = usePermission();

  if (user?.role === "admin") {
    return <Component />;
  }

  if (permission && !hasPermission(permission)) {
    return <AccessDenied />;
  }

  return <Component />;
}

function MainApp() {
  const { user } = useAuth();

  if (user?.isSuperAdmin) {
    return (
      <Switch>
        <Route path="/" component={SuperAdmin} />
        <Route component={SuperAdmin} />
      </Switch>
    );
  }

  return (
    <Layout>
      <Switch>
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/" component={Dashboard} />
        <Route path="/profile" component={Profile} />
        <Route path="/transactions">{() => <ProtectedRoute component={Transactions} permission="view_transactions" />}</Route>
        <Route path="/customers">{() => <ProtectedRoute component={Customers} permission="view_customers" />}</Route>
        <Route path="/reports">{() => <ProtectedRoute component={Reports} permission="view_reports" />}</Route>
        <Route path="/suppliers">{() => <ProtectedRoute component={Suppliers} permission="view_suppliers" />}</Route>
        <Route path="/cashflowforecast">{() => <ProtectedRoute component={CashFlowForecast} permission="view_reports" />}</Route>
        <Route path="/pricingcalculator" component={PricingCalculator} />
        <Route path="/categories" component={Categories} />
        <Route path="/settings/users">{() => <ProtectedRoute component={UserManagement} permission="manage_users" />}</Route>
        <Route path="/settings/team">{() => <ProtectedRoute component={TeamPage} permission="manage_users" />}</Route>
        <Route path="/users">{() => <ProtectedRoute component={UserManagement} permission="manage_users" />}</Route>
        <Route path="/permissions">{() => <ProtectedRoute component={UserPermissions} permission="manage_users" />}</Route>
        <Route path="/access-denied" component={AccessDenied} />
      </Switch>
    </Layout>
  );
}

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
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background animate-in fade-in duration-700">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-muted-foreground animate-pulse text-sm">Carregando...</p>
      </div>
    );
  }

  const isPublicPage = typeof window !== 'undefined' ? 
    ["/", "/payment-success", "/accept-invite", "/terms", "/privacy"].includes(window.location.pathname) : 
    false;

  if ((isAuthenticated || paymentPending) && company && company.paymentStatus !== "approved" && !isPublicPage) {
    if (typeof window !== 'undefined' && 
        window.location.pathname !== '/checkout' && 
        window.location.pathname !== '/payment-success' &&
        window.location.pathname !== '/accept-invite' &&
        window.location.pathname !== '/terms' &&
        window.location.pathname !== '/privacy') {
      window.location.href = '/checkout';
      return null;
    }
    return (
      <Switch>
        <Route path="/checkout" component={Checkout} />
        <Route path="/payment-success" component={PaymentSuccess} />
        <Route path="/accept-invite" component={AcceptInvite} />
        <Route path="/terms" component={TermsOfUse} />
        <Route path="/privacy" component={PrivacyPolicy} />
        <Route component={Checkout} />
      </Switch>
    );
  }

  if (!isAuthenticated && !paymentPending) {
    return (
      <Switch>
        <Route path="/" component={LandingPage} />
        <Route path="/login" component={Login} />
        <Route path="/signup" component={Signup} />
        <Route path="/checkout" component={Checkout} />
        <Route path="/payment-success" component={PaymentSuccess} />
        <Route path="/accept-invite" component={AcceptInvite} />
        <Route path="/terms" component={TermsOfUse} />
        <Route path="/privacy" component={PrivacyPolicy} />
        <Route component={() => {
          if (typeof window !== 'undefined' && window.location.pathname === '/') {
            return <LandingPage />;
          }
          return <Login />;
        }} />
      </Switch>
    );
  }

  // Se o usuário está autenticado e aprovado, ele não deve ver Landing ou Checkout
  if (isAuthenticated && company?.paymentStatus === "approved") {
    const isPublicOrCheckout = typeof window !== 'undefined' ? 
      ["/", "/checkout", "/signup", "/login"].includes(window.location.pathname) : 
      false;
    
    if (isPublicOrCheckout) {
      if (typeof window !== 'undefined') {
        window.location.href = '/dashboard';
        return null;
      }
    }
  }

  if (window.location.pathname === "/payment-success") {
    return <PaymentSuccess />;
  }

  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/terms" component={TermsOfUse} />
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/access-denied" component={AccessDenied} />
      <Route component={MainApp} />
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
