import { useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

interface UseRealtimeUpdatesOptions {
  table: string;
  filter?: string;
  onUpdate?: (payload: any) => void;
  onInsert?: (payload: any) => void;
  onDelete?: (payload: any) => void;
  debounceMs?: number;
  enabled?: boolean;
}

/**
 * Hook para gerenciar atualizações em tempo real do Supabase
 * Atualiza automaticamente os dados sem necessidade de refresh manual
 */
export const useRealtimeUpdates = ({
  table,
  filter,
  onUpdate,
  onInsert,
  onDelete,
  debounceMs = 100,
  enabled = true,
}: UseRealtimeUpdatesOptions) => {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedCallback = useCallback(
    (callback: () => void) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callback();
      }, debounceMs);
    },
    [debounceMs]
  );

  useEffect(() => {
    if (!enabled) return;

    const channelName = `realtime_${table}_${filter || "all"}_${Date.now()}`;
    const channel = supabase.channel(channelName);

    // Configurar filtro
    const filterConfig: any = {
      event: "*",
      schema: "public",
      table: table,
    };

    if (filter) {
      filterConfig.filter = filter;
    }

    // Escutar mudanças
    channel
      .on("postgres_changes", filterConfig, (payload: any) => {
        if (payload.eventType === "UPDATE" && onUpdate) {
          debouncedCallback(() => onUpdate(payload));
        } else if (payload.eventType === "INSERT" && onInsert) {
          debouncedCallback(() => onInsert(payload));
        } else if (payload.eventType === "DELETE" && onDelete) {
          debouncedCallback(() => onDelete(payload));
        }
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log(`✅ Realtime subscription ativo: ${channelName}`);
        } else if (status === "CHANNEL_ERROR") {
          console.error(`❌ Erro na subscription: ${channelName}`);
        }
      });

    channelRef.current = channel;

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [table, filter, enabled, onUpdate, onInsert, onDelete, debouncedCallback]);

  return {
    channel: channelRef.current,
  };
};

/**
 * Hook específico para atualizar pedidos em tempo real
 */
export const useOrderRealtime = (
  orderId: string | null,
  onOrderUpdate: (order: any) => void,
  enabled: boolean = true
) => {
  return useRealtimeUpdates({
    table: "orders",
    filter: orderId ? `id=eq.${orderId}` : undefined,
    onUpdate: (payload) => {
      if (payload.new) {
        onOrderUpdate(payload.new);
      }
    },
    enabled: enabled && !!orderId,
  });
};

/**
 * Hook para atualizar lista de pedidos em tempo real (por tenant)
 */
export const useOrdersListRealtime = (
  tenantId: string | null,
  onOrdersUpdate: () => void,
  enabled: boolean = true
) => {
  return useRealtimeUpdates({
    table: "orders",
    filter: tenantId ? `tenant_id=eq.${tenantId}` : undefined,
    onUpdate: () => onOrdersUpdate(),
    onInsert: () => onOrdersUpdate(),
    onDelete: () => onOrdersUpdate(),
    enabled: enabled && !!tenantId,
  });
};

/**
 * Hook para atualizar pedidos do cliente em tempo real
 */
export const useClientOrdersRealtime = (
  clientId: string | null,
  onOrdersUpdate: () => void,
  enabled: boolean = true
) => {
  return useRealtimeUpdates({
    table: "orders",
    filter: clientId ? `client_id=eq.${clientId}` : undefined,
    onUpdate: () => onOrdersUpdate(),
    onInsert: () => onOrdersUpdate(),
    onDelete: () => onOrdersUpdate(),
    enabled: enabled && !!clientId,
  });
};

/**
 * Hook para atualizar pedidos disponíveis para motoristas em tempo real
 * Filtra por tenant_id e detecta novos pedidos ACEITOS
 */
export const useDriverOrdersRealtime = (
  driverTenantId: string | null,
  onOrdersUpdate: () => void,
  enabled: boolean = true
) => {
  return useRealtimeUpdates({
    table: "orders",
    filter: driverTenantId ? `tenant_id=eq.${driverTenantId}` : undefined,
    onUpdate: (payload) => {
      // Atualizar se pedido mudou para ACEITO ou mudou assigned_driver
      if (
        payload.new?.status === 'ACEITO' || 
        payload.old?.assigned_driver !== payload.new?.assigned_driver
      ) {
        onOrdersUpdate();
      }
    },
    onInsert: (payload) => {
      // Novo pedido ACEITO apareceu
      if (payload.new?.status === 'ACEITO') {
        onOrdersUpdate();
      }
    },
    enabled: enabled && !!driverTenantId,
    debounceMs: 500,
  });
};

