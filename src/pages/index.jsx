import Layout from "./Layout.jsx";

import Dashboard from "./Dashboard";

import Transactions from "./Transactions";

import Customers from "./Customers";

import Reports from "./Reports";

import Suppliers from "./Suppliers";

import CashFlowForecast from "./CashFlowForecast";

import PricingCalculator from "./PricingCalculator";

import Categories from "./Categories";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

const PAGES = {
    
    Dashboard: Dashboard,
    
    Transactions: Transactions,
    
    Customers: Customers,
    
    Reports: Reports,
    
    Suppliers: Suppliers,
    
    CashFlowForecast: CashFlowForecast,
    
    PricingCalculator: PricingCalculator,
    
    Categories: Categories,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                <Route path="/" element={<Dashboard />} />
                <Route path="/transactions" element={<Transactions />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/suppliers" element={<Suppliers />} />
                <Route path="/cashflowforecast" element={<CashFlowForecast />} />
                <Route path="/pricingcalculator" element={<PricingCalculator />} />
                <Route path="/categories" element={<Categories />} />
            </Routes>
        </Layout>
    );
}

const queryClient = new QueryClient();

export default function Pages() {
    return (
        <QueryClientProvider client={queryClient}>
            <Router>
                <PagesContent />
            </Router>
        </QueryClientProvider>
    );
}