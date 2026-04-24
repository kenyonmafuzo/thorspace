"use client";


import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import UserHeader from "@/app/components/UserHeader";
import MobileHeader from "@/app/components/MobileHeader";
import { useI18n } from "@/src/hooks/useI18n";
import { useGuest } from "@/src/hooks/useGuest";
import { useGuest } from "@/src/hooks/useGuest";


export default function InboxPage() {
  const [notifications, setNotifications] = useState([]);
  const [globalNews, setGlobalNews] = useState([]);
  const [gameUpdates, setGameUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState(null);
  const [tab, setTab] = useState("notifications");
  const { t, lang } = useI18n();
  const { isGuest } = useGuest();
  // Import getDailyLoginText at top level
  const { getDailyLoginText } = require("@/lib/i18n/dailyLogin");

  useEffect(() => {
    // Guests see static welcome messages — no DB fetch
    if (isGuest) {
      const guestNotifs = [
        {
          id: "guest_welcome",
          type: "system",
          title: "Bem-vindo ao Thorspace! 🚀",
          content: "Explore batalhas espaciais por turnos. Crie sua conta gratuita para salvar progresso, subir no ranking e desafiar outros jogadores.",
          created_at: new Date().toISOString(),
          _src: "inbox",
        },
        {
          id: "guest_cta",
          type: "system",
          title: "Cadastre-se gratuitamente",
          content: "Com uma conta você acumula XP, desbloqueia badges, entra no ranking global e joga multiplayer.",
          cta: "Criar conta",
          cta_url: "/login",
          created_at: new Date(Date.now() - 1000).toISOString(),
          _src: "inbox",
        },
      ];
      setGlobalNews(guestNotifs);
      setLoading(false);
      return;
    }
    let mounted = true;
    async function fetchNotifications() {
      setLoading(true);
      setError("");
      try {
        const { data } = await supabase.auth.getSession();
        const session = data?.session ?? data;
        const user = session?.user ?? (await supabase.auth.getUser()).data?.user;
        if (!user) {
          setUserId(null);
          setNotifications([]);
          setLoading(false);
          return;
        }
        setUserId(user.id);
        // Fetch user inbox and global news in parallel
        const [{ data: notifs, error: notifErr }, notifNewsRes, updatesRes] = await Promise.all([
          supabase
            .from("inbox")
            .select("id, type, title, content, cta, cta_url, created_at, lang, meta")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false }),
          fetch(`/api/news?delivery=notifications&lang=${lang}`).then(r => r.json()).catch(() => ({ news: [] })),
          fetch(`/api/news?delivery=game_updates&lang=${lang}`).then(r => r.json()).catch(() => ({ news: [] })),
        ]);
        if (notifErr) throw notifErr;
        if (mounted) {
          setNotifications(notifs || []);

          // IDs of admin_news items that already have a personal inbox row for this user
          // (so we don't show both the global announcement AND the inbox DM)
          const personalSourceIds = new Set(
            (notifs || [])
              .map(n => {
                const m = typeof n.meta === "string" ? JSON.parse(n.meta) : (n.meta ?? {});
                return m?.source_news_id;
              })
              .filter(Boolean)
          );

          // Global announcements — exclude any that the user already has a personal DM for
          const globalAnnouncements = (notifNewsRes.news || [])
            .filter(n => !personalSourceIds.has(n.id))
            .map(n => ({ ...n, _src: "global" }));

          // Personal inbox items for the notifications tab:
          // admin_message items only shown here if show_in_notifications=true (or no flag = old-style DM)
          const inboxForNotifications = (notifs || []).filter(n => {
            if (n.type !== "admin_message") return true; // all other types always shown
            const m = typeof n.meta === "string" ? JSON.parse(n.meta) : (n.meta ?? {});
            // Old DMs without source_news_id: always show
            if (!m?.source_news_id) return true;
            return m?.show_in_notifications === true;
          }).map(n => ({ ...n, _src: "inbox" }));

          const merged = [
            ...globalAnnouncements,
            ...inboxForNotifications,
          ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

          setGlobalNews(merged);
          setGameUpdates(updatesRes.news || []);
        }

        // Marcar todas as notificações como vistas (se a coluna viewed existir)
        if (notifs && notifs.length > 0) {
          try {
            await supabase
              .from("inbox")
              .update({ viewed: true })
              .eq("user_id", user.id);
          } catch (e) {
            // Coluna viewed ainda não existe, ignorar
          }
        }
      } catch (e) {
        setError("Failed to load notifications");
      } finally {
        setLoading(false);
      }
    }
    fetchNotifications();
    return () => { mounted = false; };
  }, [lang, isGuest]);

  // Nenhuma ação direta nas notificações

  // Sombra dinâmica ao rolar
  useEffect(() => {
    function handleScroll() {
      const shadow = document.getElementById("inbox-shadow-top");
      if (!shadow) return;
      shadow.style.opacity = window.scrollY > 30 ? "1" : "0";
    }
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // --- UI ---
  return (
    <div style={{ minHeight: "100vh", background: "transparent", position: "relative" }}>
      <div style={{ position: "fixed", inset: 0, zIndex: 0, backgroundImage: "url('/game/images/galaxiaintro.png'), radial-gradient(ellipse at bottom, #01030a 0%, #000016 40%, #000000 100%)", backgroundSize: "cover, cover", backgroundRepeat: "no-repeat, no-repeat", backgroundPosition: "center center, center center", opacity: 0.35, pointerEvents: "none" }} />
      <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        @media (max-width: 768px) {
          .inbox-layout { flex-direction: column !important; padding-top: 220px !important; gap: 0 !important; }
          .inbox-sidebar { flex-direction: row !important; min-width: 0 !important; max-width: none !important; width: 100% !important; margin-top: 0 !important; gap: 0 !important; border-bottom: 1px solid rgba(0,229,255,0.15); }
          .inbox-sidebar button { flex: 1 !important; border-radius: 0 !important; border-bottom: none !important; font-size: 11px !important; padding: 10px 4px !important; }
          .inbox-content { margin-top: 12px !important; }
        }
      `}</style>
      <UserHeader />
      <MobileHeader />
      <div style={{
        maxWidth: 960,
        margin: "0 auto",
        padding: "0 16px",
        display: "flex",
        flexDirection: "row",
        gap: 32,
        marginTop: 0,
        position: "relative",
        zIndex: 1,
        paddingTop: 90
      }} className="inbox-layout">
        {/* Sombra no topo ao rolar */}
        <div id="inbox-shadow-top" style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: 90,
          pointerEvents: "none",
          zIndex: 100,
          background: "linear-gradient(180deg, rgba(1,3,10,0.95) 0%, rgba(1,3,10,0.7) 40px, rgba(1,3,10,0.0) 100%)",
          transition: "opacity 0.3s",
          opacity: 0
        }} />
        {/* Sidebar / Tabs */}
        <div className="inbox-sidebar" style={{ minWidth: 180, maxWidth: 220, width: "100%", display: "flex", flexDirection: "column", gap: 8, marginTop: 32 }}>
          <SidebarTab label={t("inbox.notificationsTab") || "Notifications"} active={tab === "notifications"} onClick={() => setTab("notifications")}/>
          <SidebarTab label={t("inbox.updatesTab") || "Game Updates"} active={tab === "updates"} onClick={() => setTab("updates")}/>
        </div>
        {/* Content */}
        <div className="inbox-content" style={{ flex: 1, minWidth: 0, marginTop: 32, position: "relative", zIndex: 2 }}>
          {tab === "notifications" ? (
              <div>
                <h2 style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 700, fontSize: 22, marginBottom: 2 }}>{t("inbox.notificationsTitle") || "Notifications"}</h2>
                <div style={{ fontSize: 14, color: "#9FF6FF", marginBottom: 18 }}>{t("inbox.notificationsDesc") || "All your notifications and friend activity"}</div>
                {loading ? (
                  <div style={{ fontSize: 16, opacity: 0.7, marginBottom: 24 }}>Loading…</div>
                ) : error ? (
                  <div style={{ color: "#FFB3B3", marginBottom: 24 }}>{error}</div>
                ) : globalNews.length === 0 ? (
                  <div style={{
                    background: "rgba(0,229,255,0.07)",
                    border: "1px solid #00E5FF22",
                    borderRadius: 12,
                    padding: 32,
                    marginBottom: 32,
                    textAlign: "center",
                    maxWidth: 420
                  }}>
                    <div style={{ fontSize: 17, fontWeight: 700, color: "#9FF6FF", marginBottom: 6 }}>{t("inbox.noNotifications") || "No notifications yet."}</div>
                    <div style={{ fontSize: 13, color: "#b3eaff", opacity: 0.7 }}>{t("inbox.noNotificationsDesc") || "You have no notifications. Friend requests and news will appear here."}</div>
                  </div>
                ) : (
                  <div style={{ width: "100%", maxWidth: 480, marginLeft: 0, marginRight: "auto", marginBottom: 32 }}>
                    {/* Merged & sorted by date: newest first */}
                    {globalNews.map((n, idx) => {
                      if (n._src === "global") return (
                        <div key={`gn-${n.id}`} style={{
                          marginBottom: 24,
                          background: "rgba(99,102,241,0.12)",
                          border: "1.5px solid #6366f155",
                          borderRadius: 12,
                          padding: 18,
                          boxShadow: "0 2px 12px #6366f111",
                        }}>
                          <div style={{ fontSize: 11, color: "#818cf8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}> 📢 Anúncio</div>
                          <div style={{ fontSize: 15, color: "#e0e7ff", fontWeight: 700, marginBottom: 6 }}>{n.title}</div>
                          <div style={{ fontSize: 14, color: "#a5b4fc", whiteSpace: "pre-line" }}>{n.body}</div>
                          <div style={{ fontSize: 12, color: "#6366f1", marginTop: 8 }}>{new Date(n.created_at).toLocaleDateString("pt-BR")}</div>
                        </div>
                      );
                      const notif = n;
                      // Fonte do texto: prioriza notif.content, t(...) só como fallback
                      let text, notifTitle;
                      const date = new Date(notif.created_at);
                      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      const dayStr = date.toLocaleDateString();
                      let bg = "rgba(0,229,255,0.10)";
                      let border = "1.5px solid #00E5FF55";
                      let color = "#9FF6FF";
                      let cta = notif.cta;
                      let ctaUrl = notif.cta_url;
                      
                      // DEBUG: Log TODOS os tipos
                      console.log('[INBOX] Notif:', notif.type, 'content:', notif.content, 'meta:', notif.meta);
                      
                      if (
                        notif.type === "friend_request_declined" || 
                        notif.type === "friend_removed_by_other" || 
                        notif.type === "friend_removed_by_self" || 
                        notif.type === "friend_removed_title_self" ||
                        notif.type === "friend_removed_title" ||
                        notif.type === "friend_removed_you"
                      ) {
                        bg = "rgba(255,0,0,0.10)";
                        border = "1.5px solid #FF7F7F55";
                        color = "#FF7F7F";
                        
                        // Extrair username do meta
                        let username = 'Alguém';
                        try {
                          if (typeof notif.meta === 'string') {
                            const parsed = JSON.parse(notif.meta);
                            username = parsed?.username || 'Alguém';
                          } else if (notif.meta?.username) {
                            username = notif.meta.username;
                          }
                        } catch (e) {}
                        
                        // Definir texto baseado no content ou fallback
                        if (notif.content && notif.content.trim().length > 0) {
                          text = notif.content;
                        } else {
                          // Fallback baseado no tipo
                          if (notif.type === "friend_removed_by_other" || notif.type === "friend_removed_title" || notif.type === "friend_removed_you") {
                            text = `${username} removeu você da lista de amigos.`;
                          } else if (notif.type === "friend_removed_by_self" || notif.type === "friend_removed_title_self") {
                            text = `Você removeu ${username} da sua lista de amigos.`;
                          } else if (notif.type === "friend_request_declined") {
                            text = `${username} recusou seu pedido de amizade.`;
                          } else {
                            text = `Amizade com ${username} foi desfeita.`;
                          }
                        }
                      } else if (notif.type === "friend_accepted") {
                        // Verde forte para "Agora você e usuario são amigos."
                        bg = "rgba(0,255,120,0.10)";
                        border = "1.5px solid #00FF7F99";
                        color = "#00FF7F";
                      } else if (notif.type === "daily_login") {
                        bg = "rgba(0,255,120,0.10)";
                        border = "1.5px solid #00FF7F99";
                        color = "#00FF7F";
                        cta = undefined;
                        ctaUrl = undefined;
                        // Use new streak phrases
                        const streakDay = notif.meta?.streakDay || notif.streakDay || notif.streak || 1;
                        const awardedXp = notif.meta?.awardedXp || notif.awardedXp || notif.xp || 20;
                        const titleKey = `streak${streakDay}_title`;
                        const bodyKey = `streak${streakDay}_body`;
                        notifTitle = getDailyLoginText(titleKey, lang);
                        text = getDailyLoginText(bodyKey, lang).replace("20 XP", `${awardedXp} XP`);
                      } else if (notif.type === "streak_broken") {
                        bg = "rgba(255,165,0,0.10)";
                        border = "1.5px solid #FFA50099";
                        color = "#FFA500";
                        cta = undefined;
                        ctaUrl = undefined;
                        text = notif.content || t('inbox.streak_broken', { days: '?' });
                      } else if (notif.type === "badge_unlocked") {
                        // Badge desbloqueada - fundo verde
                        bg = "rgba(0,255,120,0.10)";
                        border = "1.5px solid #00FF7F99";
                        color = "#00FF7F";
                        
                        // Parse do content JSON
                        let badgeData = {};
                        try {
                          badgeData = typeof notif.content === 'string' ? JSON.parse(notif.content) : notif.content;
                        } catch (e) {
                          console.error('[INBOX] Erro ao parsear badge:', e);
                        }
                        
                        notifTitle = `🏆 Nova Badge Desbloqueada: ${badgeData.title || 'Badge'}`;
                        text = `${badgeData.description || 'Você desbloqueou uma nova badge!'}\n\nParabéns! Confira sua conquista e exiba com orgulho.`;
                        cta = "Badge";
                        ctaUrl = "/badges";
                      } else if (notif.type === "vip") {
                        // VIP ativado — dourado
                        bg = "rgba(255,215,0,0.08)";
                        border = "1.5px solid #FFD70066";
                        color = "#FFD700";
                        text = notif.content || "Seu VIP foi ativado!";
                        cta = notif.cta || "VIP";
                        ctaUrl = notif.cta_url || "/vip";
                      } else if (notif.type === "vip_expired") {
                        // VIP expirado — âmbar escuro
                        bg = "rgba(255,160,0,0.08)";
                        border = "1.5px solid #FFA00066";
                        color = "#FFA000";
                        text = notif.content || "Seu VIP expirou.";
                        cta = notif.cta || "Renovar VIP";
                        ctaUrl = notif.cta_url || "/vip";
                      } else if (notif.type === "admin_message") {
                        // Mensagem direta do admin — roxo
                        bg = "rgba(139,92,246,0.10)";
                        border = "1.5px solid #7c3aed66";
                        color = "#c4b5fd";
                        notifTitle = notif.title || "Mensagem do admin";
                        text = notif.content || "";
                        cta = undefined;
                        ctaUrl = undefined;
                      } else {
                        // Outros tipos de notificação
                        const username = notif.meta?.username || 'Alguém';
                        text = (notif.content && notif.content.trim().length > 0)
                          ? notif.content
                          : t(`inbox.${notif.type}`, { username }) || `Notificação: ${notif.type}`;
                      }
                      // Definir CTA padrão apenas para notificações de amizade (não vip, badge_unlocked, daily_login, streak_broken, vip_expired, friend_accepted)
                      if (notif.type !== "daily_login" && notif.type !== "streak_broken" && notif.type !== "badge_unlocked" && notif.type !== "vip" && notif.type !== "vip_expired" && notif.type !== "system" && notif.type !== "friend_accepted" && notif.type !== "admin_message" && notif.cta && t(`inbox.cta_friends`)) {
                        cta = t(`inbox.cta_friends`);
                      }
                      return (
                        <div key={notif.id} style={{
                          marginBottom: 24,
                          background: bg,
                          border: border,
                          borderRadius: 12,
                          padding: 18,
                          boxShadow: "0 2px 12px #00e5ff11",
                          textAlign: "left"
                        }}>
                          <div style={{ fontSize: 13, color: "#b3eaff", fontWeight: 600, marginBottom: 2, letterSpacing: 0.2 }}>{dayStr} • {timeStr}</div>
                          {notif.title && (
                            <div style={{ fontSize: 15, color: notif.type === "vip" || notif.type === "vip_expired" ? (notif.type === "vip_expired" ? "#FFA000" : "#FFD700") : border.includes("FF7F7F") ? "#FF7F7F" : border.includes("00FFB4") ? "#00FFB4" : "#00E5FF", fontWeight: 800, marginBottom: 6, letterSpacing: 0.2 }}>{notif.title}</div>
                          )}
                          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 0 }}>
                            <span
                              style={{ fontSize: 16, fontWeight: 400, color, flex: 1, minWidth: 0, whiteSpace: "pre-line" }}
                              dangerouslySetInnerHTML={{
                                __html: (text || "")
                                  .replace(/\*\*Thorspace!?\*\*/g, '<b>Thorspace</b>')
                                  .replace(/\*\*Thorspace\*\*/g, '<b>Thorspace</b>')
                                  .replace(/Thorspace/g, match => /<b>Thorspace<\/b>/.test(text) ? match : match)
                                  .replace(/\n/g, '<br />')
                              }}
                            />
                            {cta && ctaUrl && (
                              <Link href={ctaUrl} style={{
                                background: notif.type === "vip" ? "#FFD700" : notif.type === "vip_expired" ? "#FFA000" : notif.type === "badge_unlocked" || notif.type === "friend_accepted" ? "#00FF7F" : (border.includes("FF7F7F") ? "#FF7F7F" : border.includes("00FFB4") ? "#00FFB4" : "#00E5FF"),
                                color: "#10131a",
                                border: "none",
                                borderRadius: 7,
                                padding: "7px 18px",
                                fontFamily: "'Orbitron', sans-serif",
                                fontWeight: 700,
                                fontSize: 14,
                                cursor: "pointer",
                                opacity: 1,
                                transition: "opacity 0.2s, box-shadow 0.2s",
                                boxShadow: notif.type === "vip" ? "0 0 8px #FFD70077" : notif.type === "vip_expired" ? "0 0 8px #FFA00077" : notif.type === "badge_unlocked" || notif.type === "friend_accepted" ? "0 0 8px #00FF7F99" : (border.includes("FF7F7F") ? "0 0 8px #FF7F7F55" : border.includes("00FFB4") ? "0 0 8px #00FFB455" : "0 0 8px #00e5ff55"),
                                textDecoration: "none",
                                marginLeft: 0,
                                marginTop: 12,
                                whiteSpace: "nowrap",
                                display: "inline-block",
                                verticalAlign: "middle"
                              }}>{cta}</Link>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <h2 style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 700, fontSize: 22, marginBottom: 2 }}>{t("inbox.updatesTitle") || "Game Updates"}</h2>
                <div style={{ fontSize: 14, color: "#9FF6FF", marginBottom: 18 }}>{t("inbox.updatesDesc") || "Latest news and patch notes"}</div>
                {loading ? (
                  <div style={{ fontSize: 16, opacity: 0.7, marginBottom: 24 }}>Loading…</div>
                ) : gameUpdates.length === 0 && !notifications.some(n => n.type === "admin_message" && n.meta?.show_in_game_updates) ? (
                  <div style={{
                    background: "rgba(0,229,255,0.07)",
                    border: "1px solid #00E5FF22",
                    borderRadius: 12,
                    padding: 32,
                    marginBottom: 32,
                    textAlign: "center",
                    maxWidth: 420
                  }}>
                    <div style={{ fontSize: 17, fontWeight: 700, color: "#9FF6FF", marginBottom: 6 }}>{t("inbox.noUpdates") || "No updates yet."}</div>
                    <div style={{ fontSize: 13, color: "#b3eaff", opacity: 0.7 }}>{t("inbox.noUpdatesDesc") || "Game updates and patch notes will appear here soon."}</div>
                  </div>
                ) : (
                  <div style={{ width: "100%", maxWidth: 480, marginLeft: 0, marginRight: "auto", marginBottom: 32 }}>
                    {/* Personal DMs with show_in_game_updates, sorted newest first */}
                    {notifications
                      .filter(n => n.type === "admin_message" && n.meta?.show_in_game_updates)
                      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                      .map(n => (
                        <div key={`dm-gu-${n.id}`} style={{
                          marginBottom: 24,
                          background: "rgba(139,92,246,0.10)",
                          border: "1.5px solid #7c3aed66",
                          borderRadius: 12,
                          padding: 18,
                          boxShadow: "0 2px 12px #7c3aed11",
                        }}>
                          <div style={{ fontSize: 15, color: "#c4b5fd", fontWeight: 700, marginBottom: 6 }}>{n.title}</div>
                          <div style={{ fontSize: 14, color: "#a78bfa", whiteSpace: "pre-line" }}>{n.content}</div>
                          <div style={{ fontSize: 12, color: "#7c3aed", marginTop: 8 }}>{new Date(n.created_at).toLocaleDateString("pt-BR")}</div>
                        </div>
                      ))}
                    {gameUpdates.map(n => (
                      <div key={n.id} style={{
                        marginBottom: 24,
                        background: "rgba(0,229,255,0.07)",
                        border: "1.5px solid #00E5FF33",
                        borderRadius: 12,
                        padding: 18,
                        boxShadow: "0 2px 12px #00e5ff11",
                      }}>
                        <div style={{ fontSize: 15, color: "#9FF6FF", fontWeight: 700, marginBottom: 6 }}>{n.title}</div>
                        <div style={{ fontSize: 14, color: "#b3eaff", whiteSpace: "pre-line" }}>{n.body}</div>
                        <div style={{ fontSize: 12, color: "#4dd8f0", marginTop: 8 }}>{new Date(n.created_at).toLocaleDateString("pt-BR")}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
  );
}

function SidebarTab({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        padding: "12px 0",
        fontSize: 15,
        fontFamily: "'Orbitron', sans-serif",
        fontWeight: 700,
        color: active ? "#00E5FF" : "#b3eaff",
        background: active ? "rgba(0,229,255,0.10)" : "rgba(0,229,255,0.03)",
        border: active ? "2px solid #00E5FF" : "2px solid transparent",
        borderRadius: 8,
        marginBottom: 2,
        cursor: "pointer",
        transition: "all 0.18s",
        boxShadow: active ? "0 0 8px #00e5ff33" : "none"
      }}
    >
      {label}
    </button>
  );
}
