import { Switch, Route } from "wouter";
import Layout from "./Layout.jsx";
import Dashboard from "./Dashboard";
import Transactions from "./Transactions";
import Customers from "./Customers";
import Reports from "./Reports";
import Suppliers from "./Suppliers";
import CashFlowForecast from "./CashFlowForecast";
import PricingCalculator from "./PricingCalculator";
import Categories from "./Categories";

export default function Pages() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/transactions" component={Transactions} />
        <Route path="/customers" component={Customers} />
        <Route path="/reports" component={Reports} />
        <Route path="/suppliers" component={Suppliers} />
        <Route path="/cashflowforecast" component={CashFlowForecast} />
        <Route path="/pricingcalculator" component={PricingCalculator} />
        <Route path="/categories" component={Categories} />
      </Switch>
    </Layout>
  );
}
