import { Switch, Route } from "wouter";
import Layout from "../components/Layout.jsx";
import Dashboard from "./Dashboard";
import Transactions from "./Transactions";
import Customers from "./Customers";
import Sales from "./Sales";
import Reports from "./Reports";
import Suppliers from "./Suppliers";
import CashFlowForecast from "./CashFlowForecast";
import PricingCalculator from "./PricingCalculator";
import Categories from "./Categories";
import UserManagement from "./UserManagement";
import UserPermissions from "./UserPermissions";
import SuperAdmin from "./SuperAdmin";
import SuperAdminDashboard from "./admin/super-dashboard";
import AdminCustomers from "./admin/customers";
import AdminSubscriptions from "./admin/subscriptions";
import AdminUsers from "./admin/users";
import AccessDenied from "./AccessDenied";
import TeamPage from "./settings/Team";
import Profile from "./Profile";
import { useAuth } from "@/contexts/AuthContext";
import { usePermission } from "@/hooks/usePermission";

function ProtectedRoute({ component: Component, permission }) {
  const { user } = useAuth();
  const { hasPermission } = usePermission();

  // Admin bypass: admins can access everything
  if (user?.role === "admin") {
    return <Component />;
  }

  if (permission && !hasPermission(permission)) {
    return <AccessDenied />;
  }

  return <Component />;
}

export default function Pages() {
  const { user } = useAuth();

  // Super Admin routes
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
        <Route path="/" component={Dashboard} />
        <Route path="/profile" component={Profile} />
        <Route path="/transactions">{() => <ProtectedRoute component={Transactions} permission="view_transactions" />}</Route>
        <Route path="/customers">{() => <ProtectedRoute component={Customers} permission="view_customers" />}</Route>
        <Route path="/sales">{() => <ProtectedRoute component={Sales} permission="view_transactions" />}</Route>
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
