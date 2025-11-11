import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CompanyStats {
  companyId: string;
  companyName: string;
  totalOrders: number;
  deliveredOrders: number;
  revenue: number;
  activeUsers: number;
  activeDrivers: number;
}

interface GlobalStats {
  totalCompanies: number;
  totalOrders: number;
  totalRevenue: number;
  totalUsers: number;
  companiesStats: CompanyStats[];
}

export const useAdminStats = (selectedCompanyId?: string) => {
  const [stats, setStats] = useState<GlobalStats>({
    totalCompanies: 0,
    totalOrders: 0,
    totalRevenue: 0,
    totalUsers: 0,
    companiesStats: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [selectedCompanyId]);

  const fetchStats = async () => {
    try {
      setLoading(true);

      // Buscar empresas
      const { data: companies, error: companiesError } = await supabase
        .from("tenants")
        .select("id, name")
        .eq("status", "ACTIVE");

      if (companiesError) throw companiesError;

      const companiesStats: CompanyStats[] = [];

      // Se uma empresa específica foi selecionada, buscar apenas seus dados
      const companiesToFetch = selectedCompanyId
        ? companies?.filter((c) => c.id === selectedCompanyId) || []
        : companies || [];

      for (const company of companiesToFetch) {
        // Buscar pedidos
        const { data: orders } = await supabase
          .from("orders")
          .select("status, total")
          .eq("tenant_id", company.id);

        const totalOrders = orders?.length || 0;
        const deliveredOrders = orders?.filter((o) => o.status === "ENTREGUE").length || 0;
        const revenue = orders
          ?.filter((o) => o.status === "ENTREGUE")
          .reduce((sum, o) => sum + parseFloat(String(o.total || "0")), 0) || 0;

        // Buscar usuários ativos
        const { data: users } = await supabase
          .from("profiles")
          .select("id")
          .eq("tenant_id", company.id)
          .eq("is_active", true);

        // Buscar motoristas ativos
        const { data: drivers } = await supabase
          .from("drivers")
          .select("id")
          .eq("tenant_id", company.id)
          .eq("status", "ACTIVE");

        companiesStats.push({
          companyId: company.id,
          companyName: company.name,
          totalOrders,
          deliveredOrders,
          revenue,
          activeUsers: users?.length || 0,
          activeDrivers: drivers?.length || 0,
        });
      }

      // Calcular estatísticas globais
      const globalStats: GlobalStats = {
        totalCompanies: companies?.length || 0,
        totalOrders: companiesStats.reduce((sum, c) => sum + c.totalOrders, 0),
        totalRevenue: companiesStats.reduce((sum, c) => sum + c.revenue, 0),
        totalUsers: companiesStats.reduce((sum, c) => sum + c.activeUsers, 0),
        companiesStats,
      };

      setStats(globalStats);
    } catch (error) {
      console.error("Erro ao buscar estatísticas:", error);
    } finally {
      setLoading(false);
    }
  };

  return { stats, loading, refresh: fetchStats };
};
