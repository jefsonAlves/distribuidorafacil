import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import RequireAuth from "@/components/auth/RequireAuth";
import RequireRole from "@/components/auth/RequireRole";

// Landing & Auth
import LandingPage from "./pages/LandingPage";
import AuthLogin from "./pages/auth/Login";
import AuthRegister from "./pages/auth/Register";

// Admin Master
import AdminLogin from "./pages/admin/Login";
import AdminEmergencyReset from "./pages/admin/EmergencyReset";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminCompanies from "./pages/admin/Companies";
import BootstrapAdmin from "./pages/admin/BootstrapAdmin";

// Dashboards por tipo de usuário
import ClientDashboard from "./pages/client/Dashboard";
import CompanyDashboard from "./pages/company/Dashboard";
import DriverDashboard from "./pages/driver/Dashboard";

import NotFound from "./pages/NotFound";
import NotAuthorized from "./pages/NotAuthorized";

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
          <Route path="/admin/bootstrap" element={<BootstrapAdmin />} />
          <Route
            path="/admin/dashboard"
            element={
              <RequireAuth>
                <RequireRole role="admin_master">
                  <AdminDashboard />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/companies"
            element={
              <RequireAuth>
                <RequireRole role="admin_master">
                  <AdminCompanies />
                </RequireRole>
              </RequireAuth>
            }
          />
          
          {/* Dashboards */}
          <Route
            path="/client/dashboard"
            element={
              <RequireAuth>
                <RequireRole role="client">
                  <ClientDashboard />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/company/dashboard"
            element={
              <RequireAuth>
                <RequireRole role="company_admin">
                  <CompanyDashboard />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/driver/dashboard"
            element={
              <RequireAuth>
                <RequireRole role="driver">
                  <DriverDashboard />
                </RequireRole>
              </RequireAuth>
            }
          />
          
          {/* Not Authorized */}
          <Route path="/403" element={<NotAuthorized />} />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
