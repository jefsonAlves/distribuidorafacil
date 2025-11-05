import { Building2, BarChart3, Settings as SettingsIcon } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const AdminSidebar = () => {
  const navigation = [
    {
      name: "Empresas",
      href: "/admin/companies",
      icon: Building2,
      id: "nav-admin-companies",
    },
    {
      name: "Relatórios",
      href: "/admin/reports",
      icon: BarChart3,
      id: "nav-admin-reports",
    },
    {
      name: "Configurações",
      href: "/admin/settings",
      icon: SettingsIcon,
      id: "nav-admin-settings",
    },
  ];

  return (
    <aside className="w-64 bg-sidebar border-r flex flex-col">
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-hero flex items-center justify-center shadow-glow">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-sidebar-foreground text-lg">DeliveryPro</h2>
            <p className="text-xs text-sidebar-foreground/60">Admin Master</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            id={item.id}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-smooth",
                "hover:bg-sidebar-accent",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground/70"
              )
            }
          >
            <item.icon className="h-5 w-5" />
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <div className="bg-sidebar-accent rounded-lg p-4">
          <p className="text-sm font-medium text-sidebar-foreground">
            Plataforma Multi-Tenant
          </p>
          <p className="text-xs text-sidebar-foreground/60 mt-1">
            Versão 1.0.0
          </p>
        </div>
      </div>
    </aside>
  );
};

export default AdminSidebar;
