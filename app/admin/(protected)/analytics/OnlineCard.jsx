"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import styles from "./analytics.module.css";

export default function OnlineCard() {
  const [count, setCount] = useState(null);
  const router = useRouter();
  const channelRef = useRef(null);

  useEffect(() => {
    const ch = supabase.channel("presence:online-users-admin-observer", {
      config: { presence: { key: "admin-observer" } },
    });

    const rebuild = () => {
      // Read state from the main presence channel
      const mainCh = supabase.getChannels().find(c => c.topic === "realtime:presence:online-users");
      if (mainCh) {
        const state = mainCh.presenceState();
        setCount(Object.keys(state).filter(k => k !== "admin-observer").length);
      } else {
        const state = ch.presenceState();
        setCount(Object.keys(state).filter(k => k !== "admin-observer").length);
      }
    };

    ch.on("presence", { event: "sync" }, rebuild);
    ch.on("presence", { event: "join" }, rebuild);
    ch.on("presence", { event: "leave" }, rebuild);

    ch.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        // Do NOT call track() — admin should not appear as "online" to users
        setTimeout(rebuild, 500);
      }
    });

    channelRef.current = ch;
    return () => { supabase.removeChannel(ch); };
  }, []);

  return (
    <div className={styles.statCard} style={{ borderColor: "#22d3ee33", background: "linear-gradient(135deg, #0c1a2e 0%, #0f1f35 100%)" }}>
      <div className={styles.statLabel} style={{ color: "#67e8f9" }}>Online agora</div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
        <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: count > 0 ? "#22c55e" : "#64748b", boxShadow: count > 0 ? "0 0 8px #22c55e" : "none", flexShrink: 0 }} />
        <span className={styles.statValue} style={{ color: "#e0f2fe" }}>
          {count === null ? "—" : count}
        </span>
      </div>
      <div className={styles.statSub} style={{ marginTop: 4 }}>
        {count === null ? "Conectando…" : count === 0 ? "Nenhum usuário no site" : `usuário${count !== 1 ? "s" : ""} com o site aberto`}
      </div>
      <button
        onClick={() => router.push("/admin/online")}
        style={{ marginTop: 12, background: "rgba(34,211,238,0.12)", border: "1px solid #22d3ee44", borderRadius: 8, color: "#67e8f9", padding: "0.4rem 1rem", cursor: "pointer", fontSize: 13, fontWeight: 600, width: "100%" }}
      >
        Ver quem está online →
      </button>
    </div>
  );
}
