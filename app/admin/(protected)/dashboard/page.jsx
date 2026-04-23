// app/admin/(protected)/dashboard/page.jsx
import { getDashboardStats } from "@/lib/admin/adminData";
import styles from "./dashboard.module.css";

export const dynamic = "force-dynamic";

function StatCard({ label, value, accent }) {
  return (
    <div className={styles.statCard} style={accent ? { borderTopColor: accent } : {}}>
      <span className={styles.statValue}>{value?.toLocaleString("pt-BR") ?? 0}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  return (
    <div>
      <h1 className={styles.pageTitle}>Dashboard</h1>

      <div className={styles.statsGrid}>
        <StatCard label="Total de usuários" value={stats.totalUsers} accent="#6366f1" />
        <StatCard label="VIPs ativos" value={stats.totalVips} accent="#f59e0b" />
        <StatCard label="Novos (24h)" value={stats.newUsersToday} accent="#10b981" />
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Últimos pagamentos</h2>
        {stats.recentPayments.length === 0 ? (
          <p className={styles.empty}>Nenhum pagamento registrado ainda.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Data</th>
                <th>Usuário</th>
                <th>Valor</th>
                <th>Provedor</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentPayments.map((p) => (
                <tr key={p.id}>
                  <td>{formatDate(p.paid_at ?? p.created_at)}</td>
                  <td className={styles.emailCell}>{p.email?.email ?? p.user_id ?? "—"}</td>
                  <td>{p.currency} {Number(p.amount).toFixed(2)}</td>
                  <td><span className={styles.badge}>{p.provider}</span></td>
                  <td>
                    <span className={`${styles.statusBadge} ${styles[`status_${p.status}`]}`}>{p.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
