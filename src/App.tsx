import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Landing & Auth
import LandingPage from "./pages/LandingPage";
import AuthLogin from "./pages/auth/Login";
import AuthRegister from "./pages/auth/Register";

// Admin Master
import AdminLogin from "./pages/admin/Login";
import AdminEmergencyReset from "./pages/admin/EmergencyReset";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminCompanies from "./pages/admin/Companies";

// Dashboards por tipo de usuário
import ClientDashboard from "./pages/client/Dashboard";
import CompanyDashboard from "./pages/company/Dashboard";
import DriverDashboard from "./pages/driver/Dashboard";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Landing Page */}
          <Route path="/" element={<LandingPage />} />
          
          {/* Auth */}
          <Route path="/auth/login" element={<AuthLogin />} />
          <Route path="/auth/register" element={<AuthRegister />} />
          
          {/* Admin Master */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/emergency-reset" element={<AdminEmergencyReset />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/companies" element={<AdminCompanies />} />
          
          {/* Dashboards */}
          <Route path="/client/dashboard" element={<ClientDashboard />} />
          <Route path="/company/dashboard" element={<CompanyDashboard />} />
          <Route path="/driver/dashboard" element={<DriverDashboard />} />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
