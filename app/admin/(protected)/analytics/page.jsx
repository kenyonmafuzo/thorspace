// app/admin/(protected)/analytics/page.jsx
import { getAnalyticsData } from "@/lib/admin/analyticsData";
import AnalyticsClient from "./AnalyticsClient";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage({ searchParams }) {
  const sp     = await searchParams;
  const period = ["1d", "7d", "30d"].includes(sp?.period) ? sp.period : "7d";

  let data;
  try {
    data = await getAnalyticsData(period);
  } catch (err) {
    return (
      <div style={{ padding: "2rem", color: "#f87171" }}>
        <h2 style={{ marginBottom: "0.5rem" }}>Erro ao carregar analytics</h2>
        <pre style={{ fontSize: "0.8rem", opacity: 0.7 }}>{err?.message ?? String(err)}</pre>
        <p style={{ marginTop: "1rem", color: "#94a3b8", fontSize: "0.85rem" }}>
          Certifique-se de ter rodado a migration <code>20260423_page_views.sql</code> no Supabase.
        </p>
      </div>
    );
  }

  return <AnalyticsClient data={data} period={period} />;
}
