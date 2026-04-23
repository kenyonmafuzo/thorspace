"use client";
// app/admin/(protected)/news/NewsClient.jsx

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./news.module.css";

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

const EMPTY_FORM = {
  title: "", body: "", published: false, lang: "all",
  show_as_login_modal: false, show_in_notifications: false, show_in_game_updates: false,
};

const LANG_LABELS = { all: "Todos os idiomas", pt: "Português", en: "Inglês", es: "Espanhol" };
const LANG_COLORS = { all: { bg: "#1e2a50", color: "#818cf8" }, pt: { bg: "#052e16", color: "#4ade80" }, en: { bg: "#1e3a5f", color: "#60a5fa" }, es: { bg: "#3b1f00", color: "#fb923c" } };

function LangBadge({ lang }) {
  const l = lang ?? "all";
  const c = LANG_COLORS[l] ?? LANG_COLORS.all;
  return (
    <span style={{ background: c.bg, color: c.color, border: `1px solid ${c.color}44`, borderRadius: 5, padding: "0.15rem 0.45rem", fontSize: "0.7rem", fontWeight: 700, whiteSpace: "nowrap" }}>
      {LANG_LABELS[l] ?? l}
    </span>
  );
}

function Toggle({ label, hint, checked, onChange, disabled }) {
  return (
    <label className={styles.toggleRow}>
      <div className={styles.toggleInfo}>
        <span className={styles.toggleLabel}>{label}</span>
        {hint && <span className={styles.toggleHint}>{hint}</span>}
      </div>
      <button type="button" role="switch" aria-checked={checked}
        className={`${styles.toggle} ${checked ? styles.toggleOn : ""}`}
        onClick={() => onChange(!checked)} disabled={disabled}>
        <span className={styles.toggleThumb} />
      </button>
    </label>
  );
}

function DeliveryBadge({ label, active }) {
  if (!active) return null;
  return <span className={styles.deliveryBadge}>{label}</span>;
}

function NewsForm({ initial = EMPTY_FORM, onSave, onCancel, loading, msg }) {
  const [form, setForm] = useState(initial);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <form className={styles.form} onSubmit={e => { e.preventDefault(); onSave(form); }}>
      {msg?.error && <p className={styles.error}>{msg.error}</p>}
      {msg?.ok    && <p className={styles.success}>{msg.ok}</p>}
      <label className={styles.label}>
        Título
        <input className={styles.input} value={form.title} onChange={e => set("title", e.target.value)} required disabled={loading} />
      </label>
      <label className={styles.label}>
        Conteúdo
        <textarea className={styles.textarea} value={form.body} onChange={e => set("body", e.target.value)} required disabled={loading} rows={6} />
      </label>
      <label className={styles.label}>
        Idioma
        <select className={styles.input} value={form.lang} onChange={e => set("lang", e.target.value)} disabled={loading}>
          <option value="all">Todos os idiomas (PT + EN + ES)</option>
          <option value="pt">Português</option>
          <option value="en">Inglês</option>
          <option value="es">Espanhol</option>
        </select>
      </label>
      <div className={styles.toggleGroup}>
        <span className={styles.toggleGroupLabel}>Onde mostrar</span>
        <Toggle label="Modal de login" hint="Popup quando o usuário entra no jogo pela primeira vez após publicar" checked={form.show_as_login_modal} onChange={v => set("show_as_login_modal", v)} disabled={loading} />
        <Toggle label="Aba Notificações (Inbox)" hint="Aparece na aba Notifications do inbox para todos" checked={form.show_in_notifications} onChange={v => set("show_in_notifications", v)} disabled={loading} />
        <Toggle label="Aba Game Updates (Inbox)" hint="Aparece na aba Game Updates do inbox para todos" checked={form.show_in_game_updates} onChange={v => set("show_in_game_updates", v)} disabled={loading} />
        <Toggle label="Publicado" hint="Visível no site (desligado = rascunho)" checked={form.published} onChange={v => set("published", v)} disabled={loading} />
      </div>
      <div className={styles.formActions}>
        <button className={styles.submitBtn} type="submit" disabled={loading}>{loading ? "Salvando…" : "Salvar"}</button>
        <button className={styles.cancelBtn} type="button" onClick={onCancel} disabled={loading}>Cancelar</button>
      </div>
    </form>
  );
}

export default function NewsClient({ news, total, page, adminId }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [loading, setLoading]   = useState(false);
  const [msg, setMsg]           = useState(null);

  const totalPages = Math.ceil(total / 20);

  async function handleCreate(form) {
    setMsg(null); setLoading(true);
    try {
      const res = await fetch("/api/admin/news", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) { setMsg({ error: data.error }); return; }
      setMsg({ ok: "Notícia criada!" }); setShowForm(false); router.refresh();
    } catch { setMsg({ error: "Erro de conexão" }); } finally { setLoading(false); }
  }

  async function handleEdit(form) {
    setMsg(null); setLoading(true);
    try {
      const res = await fetch("/api/admin/news", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editItem.id, ...form }) });
      const data = await res.json();
      if (!res.ok) { setMsg({ error: data.error }); return; }
      setMsg({ ok: "Salvo!" }); setEditItem(null); router.refresh();
    } catch { setMsg({ error: "Erro de conexão" }); } finally { setLoading(false); }
  }

  async function handleDelete(id) {
    if (!confirm("Apagar esta notícia permanentemente?")) return;
    await fetch("/api/admin/news", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    router.refresh();
  }

  if (editItem) {
    return (
      <div>
        <button className={styles.back} onClick={() => { setEditItem(null); setMsg(null); }}>← Voltar</button>
        <h1 className={styles.pageTitle}>Editar notícia</h1>
        <NewsForm
          initial={{ title: editItem.title, body: editItem.body, published: editItem.published, lang: editItem.lang ?? "all", show_as_login_modal: editItem.show_as_login_modal ?? false, show_in_notifications: editItem.show_in_notifications ?? false, show_in_game_updates: editItem.show_in_game_updates ?? false }}
          onSave={handleEdit} onCancel={() => { setEditItem(null); setMsg(null); }} loading={loading} msg={msg}
        />
      </div>
    );
  }

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>Notícias</h1>
        <button className={styles.newBtn} onClick={() => { setShowForm(!showForm); setMsg(null); }}>
          {showForm ? "✕ Cancelar" : "+ Nova notícia"}
        </button>
      </div>

      {showForm && <NewsForm onSave={handleCreate} onCancel={() => { setShowForm(false); setMsg(null); }} loading={loading} msg={msg} />}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr><th>Título</th><th>Idioma</th><th>Entrega</th><th>Status</th><th>Criado em</th><th></th></tr>
          </thead>
          <tbody>
            {news.length === 0 && <tr><td colSpan={5} className={styles.empty}>Sem notícias ainda.</td></tr>}
            {news.map(n => (
              <tr key={n.id}>
                <td className={styles.titleCell}>{n.title}</td>
                <td><LangBadge lang={n.lang} /></td>
                <td className={styles.deliveryCell}>
                  <DeliveryBadge label="Modal" active={n.show_as_login_modal} />
                  <DeliveryBadge label="Notif." active={n.show_in_notifications} />
                  <DeliveryBadge label="Updates" active={n.show_in_game_updates} />
                  {!n.show_as_login_modal && !n.show_in_notifications && !n.show_in_game_updates && <span className={styles.noneTag}>—</span>}
                </td>
                <td><span className={`${styles.badge} ${n.published ? styles.published : styles.draft}`}>{n.published ? "Publicado" : "Rascunho"}</span></td>
                <td>{formatDate(n.created_at)}</td>
                <td className={styles.actions}>
                  <button className={styles.actionBtn} onClick={() => { setEditItem(n); setMsg(null); }}>Editar</button>
                  <button className={styles.deleteBtn} onClick={() => handleDelete(n.id)}>Apagar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          {page > 1 && <button className={styles.pageBtn} onClick={() => router.push(`/admin/news?page=${page - 1}`)}>← Anterior</button>}
          <span className={styles.pageInfo}>Página {page} / {totalPages}</span>
          {page < totalPages && <button className={styles.pageBtn} onClick={() => router.push(`/admin/news?page=${page + 1}`)}>Próxima →</button>}
        </div>
      )}
    </div>
  );
}
