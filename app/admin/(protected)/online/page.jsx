"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

function getAvatarColor(username) {
  const colors = ["#6366f1", "#22d3ee", "#a78bfa", "#34d399", "#fb923c", "#f472b6", "#facc15"];
  let hash = 0;
  for (const c of (username || "?")) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
  return colors[Math.abs(hash) % colors.length];
}

const STATUS_META = {
  online:   { dot: "#22c55e", shadow: "0 0 8px #22c55e", label: "Disponível" },
  on_site:  { dot: "#64748b", shadow: "none",            label: "No site" },
  playing:  { dot: "#f59e0b", shadow: "0 0 8px #f59e0b", label: "Em jogo" },
};

export default function OnlinePage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const channelRef = useRef(null);

  useEffect(() => {
    const ch = supabase.channel("presence:online-users-admin-list", {
      config: { presence: { key: "admin-list-observer" } },
    });

    const rebuild = () => {
      // Try to get the main channel state first
      const mainCh = supabase.getChannels().find(c => c.topic === "realtime:presence:online-users");
      const source = mainCh || ch;
      const state = source.presenceState();

      const list = [];
      Object.entries(state).forEach(([key, presences]) => {
        if (key === "admin-observer" || key === "admin-list-observer") return;
        const p = presences?.[0];
        if (!p) return;
        list.push({
          userId: p.user_id || key,
          username: p.username || "—",
          avatar: p.avatar || "normal",
          status: p.status || "on_site",
          isVip: p.is_vip || false,
          vipNameColor: p.vip_name_color || "#FFD700",
          onlineAt: p.online_at,
        });
      });

      list.sort((a, b) => {
        const order = { playing: 0, online: 1, on_site: 2 };
        return (order[a.status] ?? 3) - (order[b.status] ?? 3);
      });

      setUsers(list);
      setLoading(false);
    };

    ch.on("presence", { event: "sync" }, rebuild);
    ch.on("presence", { event: "join" }, rebuild);
    ch.on("presence", { event: "leave" }, rebuild);

    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        // Do NOT track — admin should be invisible
        setTimeout(rebuild, 600);
      }
    });

    channelRef.current = ch;
    return () => { supabase.removeChannel(ch); };
  }, []);

  const online = users.filter(u => u.status === "online").length;
  const onSite = users.filter(u => u.status === "on_site").length;
  const playing = users.filter(u => u.status === "playing").length;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1.5rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: "2rem", flexWrap: "wrap" }}>
        <button
          onClick={() => router.push("/admin/analytics")}
          style={{ background: "none", border: "1px solid #2d3448", borderRadius: 8, color: "#94a3b8", padding: "0.4rem 0.9rem", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
        >
          ← Voltar
        </button>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#e2e8f0", margin: 0 }}>Usuários online agora</h1>
        <span style={{ background: "#1e2a50", color: "#818cf8", border: "1px solid #6366f144", borderRadius: 20, padding: "0.2rem 0.8rem", fontSize: 13, fontWeight: 700 }}>
          {loading ? "—" : users.length} total
        </span>
      </div>

      {/* Summary pills */}
      <div style={{ display: "flex", gap: 10, marginBottom: "1.5rem", flexWrap: "wrap" }}>
        {[
          { label: "Disponível", count: online, color: "#22c55e" },
          { label: "No site", count: onSite, color: "#64748b" },
          { label: "Em jogo", count: playing, color: "#f59e0b" },
        ].map(s => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 6, background: "#1a1f2e", border: "1px solid #1e2540", borderRadius: 10, padding: "0.4rem 0.9rem" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, display: "inline-block", flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: "#94a3b8" }}>{s.label}</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: "#e2e8f0" }}>{s.count}</span>
          </div>
        ))}
      </div>

      {/* User list */}
      <div style={{ background: "#1a1f2e", border: "1px solid #1e2540", borderRadius: 12, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "#64748b", fontSize: 14 }}>Conectando ao canal de presença…</div>
        ) : users.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "#64748b", fontSize: 14 }}>Nenhum usuário online no momento.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #1e2540" }}>
                {["Usuário", "Status", "VIP", "Online há"].map(h => (
                  <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.73rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => {
                const meta = STATUS_META[u.status] ?? STATUS_META.on_site;
                const col = getAvatarColor(u.username);
                const elapsed = u.onlineAt ? Math.floor((Date.now() - new Date(u.onlineAt).getTime()) / 60000) : null;
                return (
                  <tr key={u.userId} style={{ borderBottom: i < users.length - 1 ? "1px solid #1a2035" : "none" }}>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: col, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, color: "#fff", flexShrink: 0 }}>
                          {(u.username?.[0] || "?").toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 600, color: u.isVip ? u.vipNameColor : "#e2e8f0", fontSize: 14 }}>
                          {u.username}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: meta.dot, boxShadow: meta.shadow, display: "inline-block", flexShrink: 0 }} />
                        <span style={{ fontSize: 13, color: "#94a3b8" }}>{meta.label}</span>
                      </div>
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      {u.isVip
                        ? <span style={{ background: "#1c1400", color: "#FFD700", border: "1px solid #FFD70033", borderRadius: 5, padding: "0.1rem 0.5rem", fontSize: 11, fontWeight: 700 }}>VIP</span>
                        : <span style={{ color: "#334155", fontSize: 13 }}>—</span>}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "#64748b", fontSize: 13 }}>
                      {elapsed === null ? "—" : elapsed < 1 ? "agora" : `${elapsed} min`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
