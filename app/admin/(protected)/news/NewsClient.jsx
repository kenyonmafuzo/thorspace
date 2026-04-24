"use client";
// app/admin/(protected)/news/NewsClient.jsx

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import styles from "./news.module.css";

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

const EMPTY_FORM = {
  title_pt: "", body_pt: "",
  title_en: "", body_en: "",
  title_es: "", body_es: "",
  published: false,
  show_as_login_modal: false, show_in_notifications: false, show_in_game_updates: false,
};

const LANG_TAB_CONFIG = [
  { key: "pt", label: "🇧🇷 Português", flag: "PT" },
  { key: "en", label: "🇺🇸 Inglês",    flag: "EN" },
  { key: "es", label: "🇪🇸 Espanhol",  flag: "ES" },
];

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

function UserSearchField({ selectedUsers, onAdd, onRemove, disabled }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!query || query.length < 2) { setResults([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/admin/users/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        // Exclude already selected
        const selectedIds = new Set(selectedUsers.map(u => u.id));
        setResults((data.users || []).filter(u => !selectedIds.has(u.id)));
      } finally { setSearching(false); }
    }, 300);
  }, [query, selectedUsers]);

  return (
    <div>
      {/* Tags */}
      {selectedUsers.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
          {selectedUsers.map(u => (
            <span key={u.id} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#1e2a50", color: "#818cf8", border: "1px solid #6366f144", borderRadius: 20, padding: "0.2rem 0.5rem 0.2rem 0.7rem", fontSize: "0.85rem", fontWeight: 700 }}>
              @{u.username}
              <button type="button" onClick={() => onRemove(u.id)} disabled={disabled}
                style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", lineHeight: 1, padding: "0 2px", fontSize: 13, display: "flex", alignItems: "center" }}>
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
      {/* Search input */}
      <div style={{ position: "relative" }}>
        <input
          className={styles.input}
          placeholder="Buscar por username…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoComplete="off"
          disabled={disabled}
        />
        {(results.length > 0 || searching) && (
          <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#1a2035", border: "1px solid #2d3448", borderRadius: 8, zIndex: 20, maxHeight: 200, overflowY: "auto" }}>
            {searching && <div style={{ padding: "8px 12px", color: "#94a3b8", fontSize: 13 }}>Buscando…</div>}
            {results.map(u => (
              <button key={u.id} type="button"
                style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", color: "#e2e8f0", padding: "8px 12px", cursor: "pointer", fontSize: 14 }}
                onMouseEnter={e => e.currentTarget.style.background = "#2d3448"}
                onMouseLeave={e => e.currentTarget.style.background = "none"}
                onClick={() => { onAdd(u); setQuery(""); setResults([]); }}>
                @{u.username}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NewsForm({ initial = EMPTY_FORM, onSave, onCancel, loading, msg }) {
  const [form, setForm] = useState(initial);
  const [recipientMode, setRecipientMode] = useState("all"); // "all" | "specific"
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [activeLang, setActiveLang] = useState("pt");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const addUser = (u) => setSelectedUsers(prev => prev.find(x => x.id === u.id) ? prev : [...prev, u]);
  const removeUser = (id) => setSelectedUsers(prev => prev.filter(u => u.id !== id));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title_pt || !form.body_pt) {
      alert("A aba Português (título e conteúdo) é obrigatória.");
      setActiveLang("pt");
      return;
    }
    const translations = {
      pt: { title: form.title_pt, body: form.body_pt },
      en: { title: form.title_en, body: form.body_en },
      es: { title: form.title_es, body: form.body_es },
    };
    const payload = {
      title: form.title_pt,
      body:  form.body_pt,
      translations,
      lang: "all",
      published:            form.published,
      show_as_login_modal:  form.show_as_login_modal,
      show_in_notifications: form.show_in_notifications,
      show_in_game_updates: form.show_in_game_updates,
    };
    if (recipientMode === "specific") {
      if (selectedUsers.length === 0) return;
      onSave({ ...payload, target_user_ids: selectedUsers.map(u => u.id) });
    } else {
      onSave(payload);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {msg?.error && <p className={styles.error}>{msg.error}</p>}
      {msg?.ok    && <p className={styles.success}>{msg.ok}</p>}

      {/* Recipient selector */}
      <div className={styles.label} style={{ display: "block" }}>
        <span style={{ marginBottom: 8, display: "block" }}>Destinatário</span>
        <div style={{ display: "flex", gap: 10, marginBottom: recipientMode === "specific" ? 10 : 0 }}>
          <button type="button"
            onClick={() => setRecipientMode("all")}
            style={{ padding: "0.4rem 1rem", borderRadius: 8, border: `1.5px solid ${recipientMode === "all" ? "#6366f1" : "#2d3448"}`, background: recipientMode === "all" ? "#1e2a50" : "transparent", color: recipientMode === "all" ? "#818cf8" : "#94a3b8", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
            Todos
          </button>
          <button type="button"
            onClick={() => setRecipientMode("specific")}
            style={{ padding: "0.4rem 1rem", borderRadius: 8, border: `1.5px solid ${recipientMode === "specific" ? "#6366f1" : "#2d3448"}`, background: recipientMode === "specific" ? "#1e2a50" : "transparent", color: recipientMode === "specific" ? "#818cf8" : "#94a3b8", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
            Usuário específico
          </button>
        </div>
        {recipientMode === "specific" && (
          <UserSearchField selectedUsers={selectedUsers} onAdd={addUser} onRemove={removeUser} disabled={loading} />
        )}
      </div>

      {/* Language tabs */}
      <div style={{ marginBottom: 0 }}>
        <div style={{ display: "flex", gap: 4, borderBottom: "1.5px solid #2d3448", marginBottom: 0 }}>
          {LANG_TAB_CONFIG.map(tab => {
            const hasContent = form[`title_${tab.key}`] || form[`body_${tab.key}`];
            const isActive = activeLang === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveLang(tab.key)}
                disabled={loading}
                style={{
                  padding: "0.45rem 1rem",
                  borderRadius: "8px 8px 0 0",
                  border: isActive ? "1.5px solid #6366f1" : "1.5px solid #2d3448",
                  borderBottom: isActive ? "1.5px solid #111827" : "1.5px solid #2d3448",
                  background: isActive ? "#1e2a50" : "#111827",
                  color: isActive ? "#818cf8" : hasContent ? "#94a3b8" : "#4b5563",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 700,
                  position: "relative",
                  bottom: -1,
                }}
              >
                {tab.label}
                {tab.key !== "pt" && !hasContent && (
                  <span style={{ marginLeft: 5, fontSize: 10, color: "#4b5563" }}>vazio</span>
                )}
              </button>
            );
          })}
        </div>

        <div style={{
          background: "#111827",
          border: "1.5px solid #2d3448",
          borderTop: "none",
          borderRadius: "0 0 10px 10px",
          padding: "16px 16px 8px",
          marginBottom: 16,
        }}>
          {LANG_TAB_CONFIG.map(tab => activeLang === tab.key && (
            <div key={tab.key}>
              <label className={styles.label} style={{ marginBottom: 10, display: "block" }}>
                Título {tab.key === "pt" ? <span style={{ color: "#f87171", fontSize: 11 }}>*obrigatório</span> : <span style={{ color: "#4b5563", fontSize: 11 }}>opcional</span>}
                <input
                  className={styles.input}
                  value={form[`title_${tab.key}`]}
                  onChange={e => set(`title_${tab.key}`, e.target.value)}
                  placeholder={tab.key === "pt" ? "Título em Português" : `Título em ${tab.label.split(" ")[1]}`}
                  disabled={loading}
                />
              </label>
              <label className={styles.label} style={{ display: "block" }}>
                Conteúdo {tab.key === "pt" ? <span style={{ color: "#f87171", fontSize: 11 }}>*obrigatório</span> : <span style={{ color: "#4b5563", fontSize: 11 }}>opcional</span>}
                <textarea
                  className={styles.textarea}
                  value={form[`body_${tab.key}`]}
                  onChange={e => set(`body_${tab.key}`, e.target.value)}
                  placeholder={tab.key === "pt" ? "Conteúdo em Português" : `Conteúdo em ${tab.label.split(" ")[1]}`}
                  disabled={loading}
                  rows={6}
                />
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.toggleGroup}>
        <span className={styles.toggleGroupLabel}>Onde mostrar</span>
        <Toggle label="Modal de login" hint="Popup quando o usuário entra no jogo pela primeira vez após publicar" checked={form.show_as_login_modal} onChange={v => set("show_as_login_modal", v)} disabled={loading} />
        <Toggle label="Aba Notificações (Inbox)" hint="Aparece na aba Notifications do inbox para todos" checked={form.show_in_notifications} onChange={v => set("show_in_notifications", v)} disabled={loading} />
        <Toggle label="Aba Game Updates (Inbox)" hint="Aparece na aba Game Updates do inbox para todos" checked={form.show_in_game_updates} onChange={v => set("show_in_game_updates", v)} disabled={loading} />
        {recipientMode === "all" && (
          <Toggle label="Publicado" hint="Visível no site (desligado = rascunho)" checked={form.published} onChange={v => set("published", v)} disabled={loading} />
        )}
      </div>

      <div className={styles.formActions}>
        <button className={styles.submitBtn} type="submit"
          disabled={loading || (recipientMode === "specific" && selectedUsers.length === 0)}>
          {loading ? "Salvando…" : recipientMode === "specific" ? `Enviar para ${selectedUsers.length} usuário${selectedUsers.length !== 1 ? "s" : ""}` : "Salvar"}
        </button>
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
      // DM: send one request with all target_user_ids — API handles the rest
      const res = await fetch("/api/admin/news", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) { setMsg({ error: data.error }); return; }
      if (form.target_user_ids?.length) {
        setMsg({ ok: `Mensagem enviada para ${form.target_user_ids.length} usuário${form.target_user_ids.length !== 1 ? "s" : ""}!` });
        setShowForm(false); router.refresh(); return;
      }
      setMsg({ ok: "Notícia criada!" }); setShowForm(false); router.refresh();
    } catch { setMsg({ error: "Erro de conexão" }); } finally { setLoading(false); }
  }

  async function handleEdit(form) {
    setMsg(null); setLoading(true);
    try {
      const patch = { id: editItem.id, ...form };
      // If the original item was a DM but the form is saving without specific users, clear DM status
      if (editItem.meta?.is_dm && !form.target_user_ids?.length) {
        patch.clear_dm = true;
      }
      const res = await fetch("/api/admin/news", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
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
          initial={{
            title_pt: editItem.meta?.translations?.pt?.title ?? editItem.title ?? "",
            body_pt:  editItem.meta?.translations?.pt?.body  ?? editItem.body  ?? "",
            title_en: editItem.meta?.translations?.en?.title ?? "",
            body_en:  editItem.meta?.translations?.en?.body  ?? "",
            title_es: editItem.meta?.translations?.es?.title ?? "",
            body_es:  editItem.meta?.translations?.es?.body  ?? "",
            published:             editItem.published,
            show_as_login_modal:   editItem.show_as_login_modal   ?? false,
            show_in_notifications: editItem.show_in_notifications ?? false,
            show_in_game_updates:  editItem.show_in_game_updates  ?? false,
          }}
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

      {msg?.ok && !showForm && <p className={styles.success} style={{ marginBottom: 16 }}>{msg.ok}</p>}
      {showForm && <NewsForm onSave={handleCreate} onCancel={() => { setShowForm(false); setMsg(null); }} loading={loading} msg={msg} />}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr><th>Título</th><th>Idioma</th><th>Entrega</th><th>Status</th><th>Criado em</th><th></th></tr>
          </thead>
          <tbody>
            {news.length === 0 && <tr><td colSpan={5} className={styles.empty}>Sem notícias ainda.</td></tr>}
            {news.map(n => {
              const isDm = n.meta?.is_dm === true;
              const dmUsernames = n.meta?.dm_usernames ?? [];
              return (
              <tr key={n.id}>
                <td className={styles.titleCell}>
                  {n.title}
                  {isDm && (
                    <div style={{ marginTop: 3, fontSize: 11, color: "#a78bfa" }}>
                      ✉️ Para: {dmUsernames.length > 0 ? dmUsernames.join(", ") : `${(n.meta?.dm_user_ids ?? []).length} usuário(s)`}
                    </div>
                  )}
                </td>
                <td><LangBadge lang={n.lang} /></td>
                <td className={styles.deliveryCell}>
                  {isDm ? (
                    <span style={{ background: "#2d1a4d", color: "#c4b5fd", border: "1px solid #7c3aed66", borderRadius: 5, padding: "0.15rem 0.5rem", fontSize: "0.7rem", fontWeight: 700 }}>DM</span>
                  ) : (<>
                    <DeliveryBadge label="Modal" active={n.show_as_login_modal} />
                    <DeliveryBadge label="Notif." active={n.show_in_notifications} />
                    <DeliveryBadge label="Updates" active={n.show_in_game_updates} />
                    {!n.show_as_login_modal && !n.show_in_notifications && !n.show_in_game_updates && <span className={styles.noneTag}>—</span>}
                  </>)}
                </td>
                <td><span className={`${styles.badge} ${n.published ? styles.published : styles.draft}`}>{n.published ? "Publicado" : "Rascunho"}</span></td>
                <td>{formatDate(n.created_at)}</td>
                <td className={styles.actions}>
                  <button className={styles.actionBtn} onClick={() => { setEditItem(n); setMsg(null); }}>Editar</button>
                  <button className={styles.deleteBtn} onClick={() => handleDelete(n.id)}>Apagar</button>
                </td>
              </tr>
            )})}
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
