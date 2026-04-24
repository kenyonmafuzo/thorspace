"use client";
// app/admin/(protected)/analytics/AnalyticsClient.jsx

import { useRouter, useSearchParams } from "next/navigation";
import styles from "./analytics.module.css";
import OnlineCard from "./OnlineCard";

const COUNTRY_NAMES = {
  BR: "Brasil", US: "EUA", PT: "Portugal", AR: "Argentina",
  MX: "México", DE: "Alemanha", FR: "França", GB: "Reino Unido",
  ES: "Espanha", JP: "Japão", CA: "Canadá", AU: "Austrália",
  IT: "Itália", NL: "Holanda", PL: "Polônia", RU: "Rússia",
  IN: "Índia", CN: "China", KR: "Coreia do Sul", CO: "Colômbia",
  CL: "Chile", PE: "Peru", UY: "Uruguai", VE: "Venezuela",
};

function countryName(code) {
  return code ? (COUNTRY_NAMES[code] ?? code) : "—";
}

function parseBrowser(ua) {
  if (!ua) return "—";
  if (/Edg\//.test(ua))       return "Edge";
  if (/OPR\/|Opera/.test(ua)) return "Opera";
  if (/Chrome\//.test(ua))    return "Chrome";
  if (/Firefox\//.test(ua))   return "Firefox";
  if (/Safari\//.test(ua))    return "Safari";
  return "Outro";
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function formatDay(dateStr) {
  const [, m, d] = dateStr.split("-");
  return `${d}/${m}`;
}

// ── Bar chart ─────────────────────────────────────────────────────────────────
function BarChart({ rows, labelKey, valueKey, color = "#6366f1" }) {
  const max = Math.max(1, ...rows.map(r => r[valueKey]));
  return (
    <div className={styles.barChart}>
      {rows.map((row, i) => (
        <div key={i} className={styles.barRow}>
          <span className={styles.barLabel}>{row[labelKey]}</span>
          <div className={styles.barTrack}>
            <div
              className={styles.barFill}
              style={{ width: `${Math.round((row[valueKey] / max) * 100)}%`, background: color }}
            />
          </div>
          <span className={styles.barValue}>{row[valueKey].toLocaleString("pt-BR")}</span>
        </div>
      ))}
      {rows.length === 0 && <div className={styles.empty}>Sem dados ainda.</div>}
    </div>
  );
}

// ── Mini line chart (SVG) ─────────────────────────────────────────────────────
function LineChart({ data }) {
  if (!data || data.length === 0) return null;
  const W = 520, H = 90;
  const maxV = Math.max(1, ...data.map(d => d.views));
  const pts  = data.map((d, i) => {
    const x = (i / (data.length - 1)) * (W - 20) + 10;
    const y = H - 10 - ((d.views / maxV) * (H - 20));
    return `${x},${y}`;
  });
  const polyline = pts.join(" ");
  return (
    <div className={styles.chartWrap}>
      <svg viewBox={`0 0 ${W} ${H}`} className={styles.svg} preserveAspectRatio="none">
        <defs>
          <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Fill area */}
        <polygon
          points={`10,${H} ${polyline} ${(data.length - 1) / (data.length - 1) * (W - 20) + 10},${H}`}
          fill="url(#grad)"
        />
        <polyline points={polyline} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinejoin="round" />
      </svg>
      <div className={styles.chartLabels}>
        {data.filter((_, i) => i % Math.ceil(data.length / 7) === 0 || i === data.length - 1).map((d, i) => (
          <span key={i} className={styles.chartLabel}>{formatDay(d.date)}</span>
        ))}
      </div>
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, change, sub }) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statValue}>{typeof value === "number" ? value.toLocaleString("pt-BR") : value}</div>
      {change != null && (
        <div className={`${styles.statChange} ${change >= 0 ? styles.up : styles.down}`}>
          {change >= 0 ? "▲" : "▼"} {Math.abs(change)}% vs período anterior
        </div>
      )}
      {sub && <div className={styles.statSub}>{sub}</div>}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AnalyticsClient({ data, period }) {
  const router = useRouter();
  const { overview, byDay, topPages, topCountries, browsers, referrers, recent } = data;

  function setPeriod(p) {
    router.push(`/admin/analytics?period=${p}`);
  }

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>Analytics</h1>
        <div className={styles.periodTabs}>
          {["1d", "7d", "30d"].map(p => (
            <button
              key={p}
              className={`${styles.periodBtn} ${period === p ? styles.periodActive : ""}`}
              onClick={() => setPeriod(p)}
            >
              {p === "1d" ? "Hoje" : p === "7d" ? "7 dias" : "30 dias"}
            </button>
          ))}
        </div>
      </div>

      {/* Overview cards */}
      <div className={styles.statsGrid}>
        <OnlineCard />
        <StatCard label="Total de visitas"    value={overview.totalViews}    change={overview.viewsChange} />
        <StatCard label="Visitantes únicos"   value={overview.uniqueVisitors} sub="por dia (fingerprint anônimo)" />
        <StatCard label="Média por dia"
          value={byDay.length > 0 ? Math.round(overview.totalViews / byDay.length) : 0}
          sub="visitas / dia"
        />
      </div>

      {/* Chart */}
      {period !== "1d" && (
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Visitas por dia</h2>
          <LineChart data={byDay} />
        </div>
      )}

      {/* Two-column */}
      <div className={styles.twoCol}>
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Páginas mais acessadas</h2>
          <BarChart rows={topPages} labelKey="path" valueKey="views" color="#6366f1" />
        </div>
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Países</h2>
          <BarChart
            rows={topCountries.map(r => ({ ...r, label: countryName(r.country) }))}
            labelKey="label" valueKey="views" color="#22d3ee"
          />
        </div>
      </div>

      <div className={styles.twoCol}>
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Navegadores</h2>
          <BarChart rows={browsers} labelKey="browser" valueKey="views" color="#a78bfa" />
        </div>
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Origens (referrer)</h2>
          <BarChart rows={referrers} labelKey="source" valueKey="views" color="#34d399" />
        </div>
      </div>

      {/* Recent visits table */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Últimas visitas</h2>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Data / Hora</th>
                <th>Página</th>
                <th>Localização</th>
                <th>Navegador</th>
                <th>Origem</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 && (
                <tr><td colSpan={5} className={styles.empty}>Nenhuma visita registrada ainda.</td></tr>
              )}
              {recent.map(v => (
                <tr key={v.id}>
                  <td className={styles.mono}>{formatDate(v.created_at)}</td>
                  <td className={styles.path}>{v.path}</td>
                  <td>{v.city ? `${v.city}, ${countryName(v.country)}` : countryName(v.country)}</td>
                  <td>{parseBrowser(v.user_agent)}</td>
                  <td className={styles.ref}>
                    {v.referrer ? (
                      (() => { try { return new URL(v.referrer).hostname.replace(/^www\./, ""); } catch { return v.referrer.slice(0, 40); } })()
                    ) : <span className={styles.dim}>(direto)</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
