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
import PaymentPending from "@/pages/PaymentPending.jsx";

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
import Layout from "./components/Layout.jsx";

function MainApp() {
  const { user } = useAuth();
  
  return (
    <Layout>
      <Switch>
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/transactions" component={Transactions} />
        <Route path="/customers" component={Customers} />
        <Route path="/reports" component={Reports} />
        <Route path="/suppliers" component={Suppliers} />
        <Route path="/forecast" component={CashFlowForecast} />
        <Route path="/pricing" component={PricingCalculator} />
        <Route path="/categories" component={Categories} />
        <Route path="/users" component={UserManagement} />
        <Route path="/permissions" component={UserPermissions} />
        <Route path="/team" component={TeamPage} />
        <Route path="/profile" component={Profile} />
        
        {user?.isSuperAdmin && (
          <>
            <Route path="/admin" component={SuperAdminDashboard} />
            <Route path="/admin/customers" component={AdminCustomers} />
            <Route path="/admin/subscriptions" component={AdminSubscriptions} />
            <Route path="/admin/users" component={AdminUsers} />
          </>
        )}
        
        <Route component={Dashboard} />
      </Switch>
    </Layout>
  );
}

function AppContent() {
  const auth = useAuth();
  
  if (auth.loading) return null;

  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/payment-success" component={PaymentSuccess} />
      <Route path="/accept-invite" component={AcceptInvite} />
      <Route path="/terms" component={TermsOfUse} />
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/payment-pending" component={PaymentPending} />
      <Route path="/" component={LandingPage} />
      <Route>
        {auth.user ? (
          auth.user.company?.paymentStatus === 'approved' ? (
            <MainApp />
          ) : (
            <PaymentPending />
          )
        ) : (
          <Login />
        )}
      </Route>
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
