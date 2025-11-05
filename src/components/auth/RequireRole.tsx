import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "admin_master" | "company_admin" | "driver" | "client";

type RequireRoleProps = {
  role: AppRole | AppRole[];
  children: JSX.Element;
};

export const RequireRole = ({ role, children }: RequireRoleProps) => {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        if (isMounted) {
          setAuthorized(false);
          setLoading(false);
        }
        return;
      }

      const userId = sessionData.session.user.id;
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      if (!isMounted) return;
      if (error) {
        setAuthorized(false);
        setLoading(false);
        return;
      }

      const userRoles = (roles || []).map(r => r.role as AppRole);
      const required = Array.isArray(role) ? role : [role];
      const ok = required.some(r => userRoles.includes(r));
      setAuthorized(ok);
      setLoading(false);
    };

    load();
    return () => { isMounted = false; };
  }, [role]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  if (!authorized) return <Navigate to="/auth/login" replace />;
  return children;
};

export default RequireRole;


