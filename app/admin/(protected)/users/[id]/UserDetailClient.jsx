"use client";
// app/admin/(protected)/users/[id]/UserDetailClient.jsx

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./userDetail.module.css";

const DURATION_OPTIONS = [
  { label: "1 dia",   days: 1,  plan: "1day" },
  { label: "7 dias",  days: 7,  plan: "7days" },
  { label: "15 dias", days: 15, plan: "15days" },
  { label: "30 dias", days: 30, plan: "30days" },
];

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default function UserDetailClient({ user }) {
  const router = useRouter();
  const [grantDays, setGrantDays] = useState(7);
  const [grantPlan, setGrantPlan] = useState("7days");
  const [grantReason, setGrantReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  async function callVip(action) {
    setMsg(null);
    setLoading(true);
    try {
      const body =
        action === "grant"
          ? { userId: user.id, durationDays: grantDays, plan: grantPlan, reason: grantReason }
          : { userId: user.id, reason: grantReason };
      const res = await fetch(`/api/admin/vip/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setMsg({ error: data.error }); return; }
      setMsg({ ok: action === "grant" ? "VIP concedido!" : "VIP removido!" });
      router.refresh();
    } catch {
      setMsg({ error: "Erro de conexão" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button className={styles.back} onClick={() => router.push("/admin/users")}>← Voltar</button>
      <h1 className={styles.pageTitle}>{user.display_name ?? user.username ?? user.id}</h1>

      <div className={styles.grid}>
        {/* Info card */}
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Perfil</h2>
          <table className={styles.infoTable}>
            <tbody>
              <Row label="ID"        value={user.id} mono />
              <Row label="Username"  value={user.username} />
              <Row label="Email"     value={user.email} />
              <Row label="Level"     value={user.level} />
              <Row label="VIP"       value={user.is_vip ? "✅ Ativo" : "❌ Inativo"} />
              <Row label="Expira em" value={formatDate(user.vip_expires_at)} />
              <Row label="Plano"     value={user.vip_plan ?? "—"} />
              <Row label="Cadastro"  value={formatDate(user.created_at)} />
            </tbody>
          </table>
        </section>

        {/* VIP grant/revoke */}
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Gerenciar VIP</h2>

          <label className={styles.label}>
            Duração
            <select
              className={styles.select}
              value={grantDays}
              onChange={(e) => {
                const opt = DURATION_OPTIONS.find((o) => o.days === Number(e.target.value));
                setGrantDays(opt.days);
                setGrantPlan(opt.plan);
              }}
              disabled={loading}
            >
              {DURATION_OPTIONS.map((o) => (
                <option key={o.days} value={o.days}>{o.label}</option>
              ))}
            </select>
          </label>

          <label className={styles.label}>
            Motivo (opcional)
            <input
              className={styles.input}
              type="text"
              placeholder="Ex: presente, compensação…"
              value={grantReason}
              onChange={(e) => setGrantReason(e.target.value)}
              disabled={loading}
            />
          </label>

          {msg?.ok    && <p className={styles.success}>{msg.ok}</p>}
          {msg?.error && <p className={styles.error}>{msg.error}</p>}

          <div className={styles.vipActions}>
            <button className={styles.grantBtn} onClick={() => callVip("grant")} disabled={loading}>
              {loading ? "…" : "Conceder / Extender VIP"}
            </button>
            {user.is_vip && (
              <button className={styles.revokeBtn} onClick={() => callVip("revoke")} disabled={loading}>
                {loading ? "…" : "Remover VIP"}
              </button>
            )}
          </div>
        </section>

        {/* Player stats */}
        {user.player_stats && (
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Stats</h2>
            <table className={styles.infoTable}>
              <tbody>
                <Row label="Vitórias"  value={user.player_stats.wins ?? 0} />
                <Row label="Derrotas"  value={user.player_stats.losses ?? 0} />
                <Row label="Partidas"  value={(user.player_stats.wins ?? 0) + (user.player_stats.losses ?? 0)} />
              </tbody>
            </table>
          </section>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, mono }) {
  return (
    <tr>
      <td className={styles.rowLabel}>{label}</td>
      <td className={mono ? styles.monoVal : styles.rowVal}>{value ?? "—"}</td>
    </tr>
  );
}
