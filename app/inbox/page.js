"use client";


import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import UserHeader from "@/app/components/UserHeader";
import { useI18n } from "@/src/hooks/useI18n";


export default function InboxPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState(null);
  const [tab, setTab] = useState("notifications");
  const { t, lang } = useI18n();
  // Import getDailyLoginText at top level
  const { getDailyLoginText } = require("@/lib/i18n/dailyLogin");

  useEffect(() => {
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
        // Busca notificações da tabela inbox
        const { data: notifs, error: notifErr } = await supabase
          .from("inbox")
          .select("id, type, title, content, cta, cta_url, created_at, lang, meta")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        if (notifErr) throw notifErr;
        if (mounted) setNotifications(notifs || []);
        
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
  }, []);

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
    <div style={{ minHeight: "100vh", background: "#000010", position: "relative" }}>
      <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 0, backgroundImage: "url('/game/images/galaxiaintro.png'), radial-gradient(ellipse at bottom, #01030a 0%, #000016 40%, #000000 100%)", backgroundSize: "cover, cover", backgroundRepeat: "no-repeat, no-repeat", backgroundPosition: "center center, center center", opacity: 0.35, pointerEvents: "none", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }} />
      <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;800&display=swap" rel="stylesheet" />
      <UserHeader />
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
      }}>
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
        <div style={{ minWidth: 180, maxWidth: 220, width: "100%", display: "flex", flexDirection: "column", gap: 8, marginTop: 32 }}>
          <SidebarTab label={t("inbox.notificationsTab") || "Notifications"} active={tab === "notifications"} onClick={() => setTab("notifications")}/>
          <SidebarTab label={t("inbox.updatesTab") || "Game Updates"} active={tab === "updates"} onClick={() => setTab("updates")}/>
        </div>
        {/* Content */}
        <div style={{ flex: 1, minWidth: 0, marginTop: 32, position: "relative", zIndex: 2 }}>
          {tab === "notifications" ? (
              <div>
                <h2 style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 700, fontSize: 22, marginBottom: 2 }}>{t("inbox.notificationsTitle") || "Notifications"}</h2>
                <div style={{ fontSize: 14, color: "#9FF6FF", marginBottom: 18 }}>{t("inbox.notificationsDesc") || "All your notifications and friend activity"}</div>
                {loading ? (
                  <div style={{ fontSize: 16, opacity: 0.7, marginBottom: 24 }}>Loading…</div>
                ) : error ? (
                  <div style={{ color: "#FFB3B3", marginBottom: 24 }}>{error}</div>
                ) : notifications.length === 0 ? (
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
                    {notifications.map((notif, idx) => {
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
                        cta = notif.cta || "Entendi";
                        ctaUrl = notif.cta_url || "/";
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
                      } else {
                        // Outros tipos de notificação
                        const username = notif.meta?.username || 'Alguém';
                        text = (notif.content && notif.content.trim().length > 0)
                          ? notif.content
                          : t(`inbox.${notif.type}`, { username }) || `Notificação: ${notif.type}`;
                      }
                      // Definir CTA padrão apenas para notificações de amizade (não badge_unlocked, daily_login, streak_broken)
                      if (notif.type !== "daily_login" && notif.type !== "streak_broken" && notif.type !== "badge_unlocked" && notif.type !== "system" && notif.cta && t(`inbox.cta_friends`)) {
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
                            <div style={{ fontSize: 15, color: border.includes("FF7F7F") ? "#FF7F7F" : border.includes("00FFB4") ? "#00FFB4" : "#00E5FF", fontWeight: 800, marginBottom: 6, letterSpacing: 0.2 }}>{notif.title}</div>
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
                                background: notif.type === "badge_unlocked" ? "#00FF7F" : (border.includes("FF7F7F") ? "#FF7F7F" : border.includes("00FFB4") ? "#00FFB4" : "#00E5FF"),
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
                                boxShadow: notif.type === "badge_unlocked" ? "0 0 8px #00FF7F99" : (border.includes("FF7F7F") ? "0 0 8px #FF7F7F55" : border.includes("00FFB4") ? "0 0 8px #00FFB455" : "0 0 8px #00e5ff55"),
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
