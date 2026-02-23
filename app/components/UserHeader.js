"use client";

import React, { useEffect, useState, useRef } from "react";
import { getAvatarSrc } from "@/app/lib/avatarOptions";
import InviteRealtimeBridge from "./notifications/InviteRealtimeBridge";
import { useUnreadInvites } from "@/hooks/useUnreadInvites";
import bellStyles from "./notifications/bellBadge.module.css";
import tooltipStyles from "./UserHeaderTooltip.module.css";
import { useUnreadInboxNotifications } from "@/hooks/useUnreadInboxNotifications";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/src/hooks/useI18n";
import { useProgress } from "@/lib/ProgressContext";
import { useUserStats } from "@/app/components/stats/UserStatsProvider";
import LevelXPBadge from "./LevelXPBadge";
import RankBadge from "./RankBadge";
import { getLevelProgressFromTotalXp } from "@/lib/xpSystem";

export default function UserHeader() {
  // Todos os hooks e lógica primeiro
  const { userStats, playerProgress, isLoading, refreshUserStats } = useUserStats();
  const [userId, setUserId] = useState(null);
  const hasUnreadInvites = useUnreadInvites(userId);
  const hasUnreadInbox = useUnreadInboxNotifications(userId);
  const [notificationCount, setNotificationCount] = useState(0);
  const [isVipActive, setIsVipActive] = useState(false);
  const [vipNameColor, setVipNameColor] = useState('#FFD700');
  const [vipFrameColor, setVipFrameColor] = useState('#FFD700');
  const [vipAvatarUrl, setVipAvatarUrl] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('thor_vip_avatar') || '';
    return '';
  });
    // Tooltip state for each button
    const [hoveredBtn, setHoveredBtn] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const router = useRouter();
  const { t } = useI18n();

  // Obter userId da auth
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data?.user?.id || null);
    });
  }, []);

  // Fetch VIP status when userId is ready
  useEffect(() => {
    if (!userId) return;
    supabase.from("profiles").select("is_vip, vip_expires_at, vip_name_color, vip_frame_color").eq("id", userId).single().then(({ data, error }) => {
      // If color columns don't exist, fall back to basic VIP check
      const profile = error ? null : data;
      let basicFallback = false;
      if (error) {
        supabase.from("profiles").select("is_vip, vip_expires_at").eq("id", userId).single().then(({ data: bd }) => {
          if (!bd) return;
          const active = bd.is_vip === true && (!bd.vip_expires_at || new Date(bd.vip_expires_at) > new Date());
          setIsVipActive(active);
          try { localStorage.setItem('thor_is_vip', active ? 'true' : 'false'); } catch(e) {}
        });
        return;
      }
      if (!profile) return;
      const active = profile.is_vip === true && (!profile.vip_expires_at || new Date(profile.vip_expires_at) > new Date());
      setIsVipActive(active);
      if (active) {
        if (profile.vip_name_color) setVipNameColor(profile.vip_name_color);
        if (profile.vip_frame_color) setVipFrameColor(profile.vip_frame_color);
        try {
          localStorage.setItem('thor_is_vip', 'true');
          if (profile.vip_name_color) localStorage.setItem('thor_vip_name_color', profile.vip_name_color);
          if (profile.vip_frame_color) localStorage.setItem('thor_vip_frame_color', profile.vip_frame_color);
        } catch(e) {}
      } else {
        try { localStorage.setItem('thor_is_vip', 'false'); } catch(e) {}
      }
    });
  }, [userId]);


  // Logs removidos para evitar rebuilds constantes

  // Atualiza header imediatamente após stats/XP serem atualizados pelo jogo
  useEffect(() => {
    function handleVipAvatarChanged() {
      const url = localStorage.getItem('thor_vip_avatar') || '';
      setVipAvatarUrl(url);
    }
    function handleVipColorsChanged(e) {
      const nameColor = e.detail?.vipNameColor || localStorage.getItem('thor_vip_name_color');
      const frameColor = e.detail?.vipFrameColor || localStorage.getItem('thor_vip_frame_color');
      if (nameColor) setVipNameColor(nameColor);
      if (frameColor) setVipFrameColor(frameColor);
    }
    window.addEventListener('thor_vip_avatar_changed', handleVipAvatarChanged);
    window.addEventListener('thor_vip_colors_changed', handleVipColorsChanged);
    return () => {
      window.removeEventListener('thor_vip_avatar_changed', handleVipAvatarChanged);
      window.removeEventListener('thor_vip_colors_changed', handleVipColorsChanged);
    };
  }, []);

  useEffect(() => {
    function handleStatsUpdated() {
      refreshUserStats && refreshUserStats("thor_stats_updated");
    }
    window.addEventListener("thor_stats_updated", handleStatsUpdated);
    return () => window.removeEventListener("thor_stats_updated", handleStatsUpdated);
  }, [refreshUserStats]);

  // Só renderiza skeleton se realmente não houver dados
  // Permite renderizar header com dados do bootstrap mesmo durante loading inicial
  const hasMinimalData = userStats && playerProgress && userStats.username;
  
  if (isLoading && !hasMinimalData) {
    return (
      <div style={{ width: 180, height: 58, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 50, padding: '12px 18px', backdropFilter: 'blur(6px)' }}>
        <span style={{ width: 80, height: 18, borderRadius: 6, background: 'rgba(0,229,255,0.10)', display: 'inline-block', marginBottom: 4, animation: 'pulse 1.2s infinite alternate' }} />
      </div>
    );
  }
  
  // Se não tem dados mínimos mesmo após loading, não renderiza
  if (!hasMinimalData) {
    return null;
  }











  const handleNavigation = (path) => {
    setDropdownOpen(false);
    try {
      router.push(path);
    } catch (err) {
      // Navegação falhou
    }
  };





  const handleLogout = async () => {
    setDropdownOpen(false);
    await supabase.auth.signOut();
    try { localStorage.removeItem("thor_username"); localStorage.removeItem("thor_userid"); } catch (e) {}
    // Força atualização do contexto de stats imediatamente após logout
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("thor_stats_updated"));
    }
    router.replace("/login");
  };

    const cleanLinkStyle = {
    background: "none",
    border: "none",
    color: "#FFF",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    transition: "color 0.2s",
    padding: 0,
    fontFamily: "'Orbitron',sans-serif",
  };

  // Use xpToNext from state (loaded from DB with fallback 300)

  const headerStyle = {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    width: "100%",
    gap: 16,
    position: "fixed",
    top: 0,
    right: 0,
    zIndex: 10020,
    padding: "0px 12px 0px 0px",
  };

  return (
    <>
      <div id="userHeader" style={headerStyle}>
        {/* Logo — upper left */}
        <img
          src="/game/images/thorspace.png"
          alt="ThorSpace"
          onClick={() => handleNavigation("/mode")}
          style={{
            position: "absolute",
            left: -14,
            top: "50%",
            transform: "translateY(-50%)",
            height: 178,
            width: "auto",
            cursor: "pointer",
            objectFit: "contain",
            filter: "drop-shadow(0 0 6px rgba(0,229,255,0.35))",
            userSelect: "none",
          }}
        />
        {/* Jogar SVG Icon Button */}
        <div style={{ position: "relative", display: "inline-block" }}>
          <button
            onClick={() => handleNavigation("/mode")}
            style={{
              ...cleanLinkStyle,
              position: "relative",
              marginLeft: 4,
              marginRight: 2,
              padding: 0,
              width: 36,
              height: 36,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "50%",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(0,229,255,0.12)",
              transition: "box-shadow 0.18s, background 0.18s, border 0.18s",
              boxShadow: "0 0 0 0 #00E5FF00",
            }}
            aria-label="Jogar"
            onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 0 8px 2px #00E5FF88"; setHoveredBtn("jogar"); }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 0 0 0 #00E5FF00"; setHoveredBtn(null); }}
          >
            <img src="/game/images/jogar.svg" alt="Jogar" width={22} height={22} style={{ display: 'block', filter: 'invert(86%) sepia(13%) saturate(1162%) hue-rotate(163deg) brightness(104%) contrast(101%)' }} />
          </button>
          <span className={tooltipStyles.tooltip + (hoveredBtn === "jogar" ? ` ${tooltipStyles.tooltipVisible}` : "")}>{t('nav.play')}</span>
        </div>
        {/* Ranking SVG Icon Button */}
        <div style={{ position: "relative", display: "inline-block" }}>
          <button
            onClick={() => handleNavigation("/ranking")}
            style={{
              ...cleanLinkStyle,
              position: "relative",
              marginLeft: 4,
              marginRight: 2,
              padding: 0,
              width: 36,
              height: 36,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "50%",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(0,229,255,0.12)",
              transition: "box-shadow 0.18s, background 0.18s, border 0.18s",
              boxShadow: "0 0 0 0 #00E5FF00",
            }}
            aria-label="Ranking"
            onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 0 8px 2px #00E5FF88"; setHoveredBtn("ranking"); }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 0 0 0 #00E5FF00"; setHoveredBtn(null); }}
          >
            <img src="/game/images/ranking.svg" alt="Ranking" width={22} height={22} style={{ display: 'block', filter: 'invert(86%) sepia(13%) saturate(1162%) hue-rotate(163deg) brightness(104%) contrast(101%)' }} />
          </button>
          <span className={tooltipStyles.tooltip + (hoveredBtn === "ranking" ? ` ${tooltipStyles.tooltipVisible}` : "")}>{t('nav.ranking')}</span>
        </div>
        {/* Friends SVG Icon Button */}
        <div style={{ position: "relative", display: "inline-block" }}>
          <button
            onClick={() => handleNavigation("/friends")}
            style={{
              ...cleanLinkStyle,
              position: "relative",
              marginLeft: 4,
              marginRight: 2,
              padding: 0,
              width: 36,
              height: 36,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "50%",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(0,229,255,0.12)",
              transition: "box-shadow 0.18s, background 0.18s, border 0.18s",
              boxShadow: "0 0 0 0 #00E5FF00",
            }}
            aria-label="Friends"
            onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 0 8px 2px #00E5FF44"; setHoveredBtn("friends"); }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 0 0 0 #00E5FF00"; setHoveredBtn(null); }}
          >
            <img src="/game/images/friends.svg" alt="Friends" width={22} height={22} style={{ display: 'block', filter: 'invert(86%) sepia(13%) saturate(1162%) hue-rotate(163deg) brightness(104%) contrast(101%)' }} />
          </button>
          <span className={tooltipStyles.tooltip + (hoveredBtn === "friends" ? ` ${tooltipStyles.tooltipVisible}` : "")}>{t('inbox.cta_friends') || t('nav.friends') || 'Friends'}</span>
        </div>
        {/* VIP Crown Icon Button */}
        <div style={{ position: "relative", display: "inline-block" }}>
          <button
            onClick={() => handleNavigation("/vip")}
            style={{
              ...cleanLinkStyle,
              position: "relative",
              marginLeft: 4,
              marginRight: 2,
              padding: 0,
              width: 36,
              height: 36,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "50%",
              background: "rgba(255,215,0,0.08)",
              border: "1px solid rgba(255,215,0,0.25)",
              transition: "box-shadow 0.18s, background 0.18s, border 0.18s",
              boxShadow: "0 0 0 0 #FFD70000",
            }}
            aria-label="VIP"
            onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 0 8px 2px #FFD70088"; e.currentTarget.style.background = "rgba(255,215,0,0.15)"; setHoveredBtn("vip"); }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 0 0 0 #FFD70000"; e.currentTarget.style.background = "rgba(255,215,0,0.08)"; setHoveredBtn(null); }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ position: 'relative', top: '-3px' }}>
              <path d="M2 19h20v2H2v-2zM3 8l5 5 4-7 4 7 5-5V17H3V8z" fill="#FFD700"/>
            </svg>
          </button>
          <span className={tooltipStyles.tooltip + (hoveredBtn === "vip" ? ` ${tooltipStyles.tooltipVisible}` : "")}>VIP</span>
        </div>
        {/* Notifications Bell Icon */}
        <div style={{ position: "relative", display: "inline-block" }}>
          <button
            onClick={() => {
              handleNavigation("/inbox");
            }}
            style={{
              ...cleanLinkStyle,
              position: "relative",
              marginLeft: 4,
              marginRight: 2,
              padding: 0,
              width: 36,
              height: 36,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "50%",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(0,229,255,0.12)",
              transition: "box-shadow 0.18s, background 0.18s, border 0.18s",
              boxShadow: "0 0 0 0 #00E5FF00",
            }}
            aria-label="Notifications"
            onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 0 8px 2px #00E5FF44"; setHoveredBtn("notific"); }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 0 0 0 #00E5FF00"; setHoveredBtn(null); }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ display: 'block' }} xmlns="http://www.w3.org/2000/svg">
              <path d="M12 22c1.1 0 2-.9 2-2h-4a2 2 0 0 0 2 2Zm6-6V11c0-3.07-1.63-5.64-5-6.32V4a1 1 0 1 0-2 0v.68C7.63 5.36 6 7.92 6 11v5l-1.29 1.29A1 1 0 0 0 5 19h14a1 1 0 0 0 .71-1.71L18 16Zm-2 .99H8V11c0-2.97 1.64-5 4-5s4 2.03 4 5v5.99Z" fill="#9FF6FF"/>
            </svg>
            {/* Blue dot badge if unread inbox notifications */}
            {hasUnreadInbox && (
              <span className={bellStyles.bellDot} />
            )}
          </button>
          <span className={tooltipStyles.tooltip + (hoveredBtn === "notific" ? ` ${tooltipStyles.tooltipVisible}` : "")}>{t('inbox.notificationsTitle') || t('nav.notifications') || 'Notificações'}</span>
        </div>

        {/* Rank Badge (substitui o LV 1, LV 2) */}
        {/* Rank e User só aparecem quando stats carregados */}
        {isLoading || !userStats ? (
          <>
            <div style={{ width: 70, height: 70, borderRadius: 16, background: "rgba(0,229,255,0.08)", display: "inline-block", marginRight: 16, animation: "pulse 1.2s infinite alternate" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 50, padding: "12px 18px", backdropFilter: "blur(6px)", width: "fit-content", height: 58 }}>
              <span style={{ width: 80, height: 18, borderRadius: 6, background: "rgba(0,229,255,0.10)", display: "inline-block", marginBottom: 4, animation: "pulse 1.2s infinite alternate" }} />
            </div>
          </>
        ) : (
          (() => {
            const progress = getLevelProgressFromTotalXp(userStats.total_xp);
            return (
              <>
                <RankBadge totalXp={progress.totalXp} size={100} />
                <div
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    background: isVipActive ? "rgba(255,215,0,0.07)" : "rgba(255,255,255,0.06)",
                    border: isVipActive ? `1px solid ${vipFrameColor}66` : "1px solid rgba(255,255,255,0.15)",
                    boxShadow: isVipActive ? `0 0 12px ${vipFrameColor}33` : "none",
                    borderRadius: 50,
                    padding: "12px 18px",
                    backdropFilter: "blur(6px)",
                    width: "fit-content",
                    height: 58,
                    cursor: "pointer",
                    transition: "background 0.2s",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = isVipActive ? "rgba(255,215,0,0.12)" : "rgba(255,255,255,0.09)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = isVipActive ? "rgba(255,215,0,0.07)" : "rgba(255,255,255,0.06)"}
                >
                  {/* Ship Image */}
                  <img
                    src={isVipActive && vipAvatarUrl ? vipAvatarUrl : getAvatarSrc(userStats.avatar_preset || "normal")}
                    alt="Nave"
                    style={{ width: 24, height: "auto" }}
                    onError={e => { e.currentTarget.src = getAvatarSrc(userStats.avatar_preset || "normal"); }}
                  />
                  {/* Username Text */}
                  <span
                    style={{
                      color: isVipActive ? vipNameColor : "#FFF",
                      fontSize: 12,
                      fontWeight: 700,
                      userSelect: "none",
                      fontFamily: "'Orbitron',sans-serif",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    {isVipActive && <span style={{ fontSize: 11 }}>💎</span>}
                    {(() => {
                      let displayUsername = userStats?.username;
                      if (typeof window !== "undefined") {
                        const saved = localStorage.getItem("thor_username");
                        if (userStats?.username?.startsWith("user_") && saved) {
                          displayUsername = saved;
                        }
                      }
                      return displayUsername;
                    })()}
                  </span>
                  {/* Dropdown Menu Container */}
                  <div ref={dropdownRef} style={{ position: "relative" }}>
                    {dropdownOpen && (
                      <div
                        style={{
                          position: "absolute",
                          top: "100%",
                          right: 0,
                          marginTop: 8,
                          background: "#1a1a2e",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: 8,
                          overflow: "hidden",
                          boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                          minWidth: 160,
                          zIndex: 10001,
                        }}
                      >
                        <button
                          onClick={() => handleNavigation("/profile")}
                          style={dropdownItemStyle}
                        >
                          {t("nav.profile")}
                        </button>
                        <button
                          onClick={() => handleNavigation("/badges")}
                          style={dropdownItemStyle}
                        >
                          {t("nav.badges")}
                        </button>
                        <button
                          onClick={() => handleNavigation("/settings")}
                          style={dropdownItemStyle}
                        >
                          {t("nav.settings")}
                        </button>
                        <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }} />
                        <button
                          onClick={handleLogout}
                          style={{
                            ...dropdownItemStyle,
                            color: "#FFB3B3",
                            borderTop: "none",
                          }}
                        >
                          {t("nav.logout")}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                {/* <LevelXPBadge progress={progress} isVipActive={userStats.is_vip_active} /> */}
              </>
            );
          })()
        )}
      </div>
    </>
  );
}

const navButtonStyle = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.15)",
  color: "#FFF",
  padding: "6px 12px",
  borderRadius: 6,
  fontSize: 12,
  fontWeight: 500,
  cursor: "pointer",
  transition: "all 0.2s",
  whiteSpace: "nowrap",
};


const dropdownItemStyle = {
  background: "none",
  border: "none",
  color: "#FFF",
  padding: "10px 16px",
  fontSize: 12,
  width: "100%",
  textAlign: "left",
  cursor: "pointer",
  transition: "background 0.15s",
  fontFamily: "'Orbitron',sans-serif",
  fontWeight: 700,
};