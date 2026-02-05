import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function useUnreadInboxNotifications(userId: string | null) {
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    if (!userId) {
      setHasUnread(false);
      return;
    }
    
    let mounted = true;
    
    async function fetchUnread() {
      try {
        // Tentar buscar com viewed = false primeiro
        const { data, error } = await supabase
          .from("inbox")
          .select("id")
          .eq("user_id", userId)
          .eq("viewed", false);
        
        // Se a coluna viewed não existe, contar todas
        if (error && error.message?.includes("viewed")) {
          const { data: allData } = await supabase
            .from("inbox")
            .select("id")
            .eq("user_id", userId);
          if (mounted) setHasUnread((allData?.length || 0) > 0);
        } else {
          if (mounted) setHasUnread(!error && (data?.length || 0) > 0);
        }
      } catch (e) {
        // Em caso de erro, assumir que não há não lidas
        if (mounted) setHasUnread(false);
      }
    }
    
    fetchUnread();
    
    // Subscribe to realtime changes
    const channel = supabase
      .channel(`inbox:${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'inbox',
        filter: `user_id=eq.${userId}`,
      }, () => {
        fetchUnread();
      })
      .subscribe();
    
    return () => { 
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return hasUnread;
}
