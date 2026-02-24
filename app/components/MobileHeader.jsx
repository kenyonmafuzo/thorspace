"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/src/hooks/useI18n";
import { useUserStats } from "@/app/components/stats/UserStatsProvider";
import { useUnreadInboxNotifications } from "@/hooks/useUnreadInboxNotifications";
import RankBadge from "./RankBadge";
import { getLevelProgressFromTotalXp } from "@/lib/xpSystem";
import { getAvatarSrc } from "@/app/lib/avatarOptions";
import bellStyles from "./notifications/bellBadge.module.css";

export default function MobileHeader() {
  const { userStats, isLoading } = useUserStats();
  const router = useRouter();
  const { t } = useI18n();

  const [userId, setUserId] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isVipActive, setIsVipActive] = useState(false);
  const [vipNameColor, setVipNameColor] = useState("#FFD700");
  const [vipFrameColor, setVipFrameColor] = useState("#FFD700");
  const [vipAvatarUrl, setVipAvatarUrl] = useState("");

  const hasUnreadInbox = useUnreadInboxNotifications(userId);
  const profileRef = useRef(null);
  const drawerRef = useRef(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data?.user?.id || null));
  }, []);

  useEffect(() => {
    if (!userId) return;
    supabase.from("profiles")
      .select("is_vip, vip_expires_at, vip_name_color, vip_frame_color")
      .eq("id", userId).single()
      .then(({ data }) => {
        if (!data) return;
        const active = data.is_vip && data.vip_expires_at && new Date(data.vip_expires_at) > new Date();
        setIsVipActive(!!active);
        if (active) {
          if (data.vip_name_color) setVipNameColor(data.vip_name_color);
          if (data.vip_frame_color) setVipFrameColor(data.vip_frame_color);
        }
        const saved = typeof window !== "undefined" ? localStorage.getItem("thor_vip_avatar") : "";
        if (saved) setVipAvatarUrl(saved);
      });
  }, [userId]);

  // Listen for VIP color changes
  useEffect(() => {
    function onColors(e) {
      if (e.detail?.vipNameColor) setVipNameColor(e.detail.vipNameColor);
      if (e.detail?.vipFrameColor) setVipFrameColor(e.detail.vipFrameColor);
    }
    function onAvatar() {
      const url = localStorage.getItem("thor_vip_avatar") || "";
      setVipAvatarUrl(url);
    }
    window.addEventListener("thor_vip_colors_changed", onColors);
    window.addEventListener("thor_vip_avatar_changed", onAvatar);
    return () => {
      window.removeEventListener("thor_vip_colors_changed", onColors);
      window.removeEventListener("thor_vip_avatar_changed", onAvatar);
    };
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
      if (drawerRef.current && !drawerRef.current.contains(e.target) && !e.target.closest("[data-hamburger]")) {
        setDrawerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("touchstart", handleClick);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("touchstart", handleClick);
    };
  }, []);

  const nav = (path) => {
    setDrawerOpen(false);
    setProfileOpen(false);
    router.push(path);
  };

  const handleLogout = async () => {
    setProfileOpen(false);
    await supabase.auth.signOut();
    try { localStorage.removeItem("thor_username"); localStorage.removeItem("thor_userid"); } catch (e) {}
    router.replace("/login");
  };

  const hasMinData = userStats && userStats.username;

  let displayUsername = userStats?.username;
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("thor_username");
    if (displayUsername?.startsWith("user_") && saved) displayUsername = saved;
  }

  const progress = hasMinData ? getLevelProgressFromTotalXp(userStats.total_xp) : null;

  const navItems = [
    {
      key: "ranking", label: t("nav.ranking") || "Ranking", path: "/ranking",
      icon: <img src="/game/images/ranking.svg" alt="" width={20} height={20} style={{ filter: "invert(86%) sepia(13%) saturate(1162%) hue-rotate(163deg) brightness(104%) contrast(101%)" }} />,
    },
    {
      key: "friends", label: t("inbox.cta_friends") || t("nav.friends") || "Amigos", path: "/friends",
      icon: <img src="/game/images/friends.svg" alt="" width={20} height={20} style={{ filter: "invert(86%) sepia(13%) saturate(1162%) hue-rotate(163deg) brightness(104%) contrast(101%)" }} />,
    },
    {
      key: "vip", label: "VIP", path: "/vip",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M2 19h20v2H2v-2zM3 8l5 5 4-7 4 7 5-5V17H3V8z" fill="#FFD700"/>
        </svg>
      ),
    },
    {
      key: "inbox", label: t("inbox.notificationsTitle") || "Notificações", path: "/inbox",
      icon: (
        <div style={{ position: "relative" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 22c1.1 0 2-.9 2-2h-4a2 2 0 0 0 2 2Zm6-6V11c0-3.07-1.63-5.64-5-6.32V4a1 1 0 1 0-2 0v.68C7.63 5.36 6 7.92 6 11v5l-1.29 1.29A1 1 0 0 0 5 19h14a1 1 0 0 0 .71-1.71L18 16Zm-2 .99H8V11c0-2.97 1.64-5 4-5s4 2.03 4 5v5.99Z" fill="#9FF6FF"/>
          </svg>
          {hasUnreadInbox && (
            <span style={{
              position: "absolute", top: -2, right: -2,
              width: 8, height: 8, borderRadius: "50%",
              background: "#00E5FF", border: "1px solid #000",
            }} />
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <style>{`
        .mobile-header { display: none; }
        @media (max-width: 768px) { .mobile-header { display: flex; } }
      `}</style>

      {/* ── TOP BAR (2 rows) ── */}
      <div className="mobile-header" style={{
        position: "fixed", top: 0, left: 0, right: 0,
        height: 88,
        background: "rgba(4,6,20,0.97)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(0,229,255,0.1)",
        zIndex: 10020,
        flexDirection: "column",
        alignItems: "stretch",
        overflow: "hidden",
      }}>

        {/* Row 1 — Logo centered */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          height: 52, width: "100%",
        }}>
          <img
            src="/game/images/thorspace.png"
            alt="ThorSpace"
            onClick={() => nav("/mode")}
            style={{
              height: 46, width: "auto", cursor: "pointer",
              objectFit: "contain",
              filter: "drop-shadow(0 0 8px rgba(0,229,255,0.45))",
            }}
          />
        </div>

        {/* Row 2 — Tier + Pill | Hamburger */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          height: 36, paddingLeft: 10, paddingRight: 10,
        }}>
          {/* LEFT — Tier + Username pill */}
          <div ref={profileRef} style={{ position: "relative", display: "flex", alignItems: "center", gap: 5 }}>
            {progress && <RankBadge totalXp={progress.totalXp} size={36} />}
            <button
              onClick={() => setProfileOpen((o) => !o)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                background: isVipActive ? "rgba(255,215,0,0.08)" : "rgba(255,255,255,0.06)",
                border: isVipActive ? `1px solid ${vipFrameColor}66` : "1px solid rgba(255,255,255,0.15)",
                borderRadius: 50,
                padding: "5px 10px",
                cursor: "pointer",
                color: "#fff",
                fontFamily: "'Orbitron',sans-serif",
                fontSize: 10,
                fontWeight: 700,
              }}
            >
              <img
                src={isVipActive && vipAvatarUrl ? vipAvatarUrl : getAvatarSrc(userStats?.avatar_preset || "normal")}
                alt="nave"
                style={{ width: 16, height: "auto" }}
              />
              <span style={{ color: isVipActive ? vipNameColor : "#fff", display: "flex", alignItems: "center", gap: 3 }}>
                {isVipActive && <span style={{ fontSize: 9 }}>💎</span>}
                {displayUsername || "..."}
              </span>
            </button>

            {/* Profile dropdown */}
            {profileOpen && (
              <div style={{
                position: "absolute", top: "calc(100% + 6px)", left: 0,
                background: "#1a1a2e",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 10, overflow: "hidden",
                boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                minWidth: 160, zIndex: 10100,
              }}>
                {[
                  { label: t("nav.profile") || "Perfil", path: "/profile" },
                  { label: t("nav.badges") || "Badges", path: "/badges" },
                  { label: t("nav.settings") || "Configurações", path: "/settings" },
                ].map((item) => (
                  <button key={item.path} onClick={() => nav(item.path)} style={ddStyle}>{item.label}</button>
                ))}
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }} />
                <button onClick={handleLogout} style={{ ...ddStyle, color: "#FFB3B3" }}>{t("nav.logout") || "Sair"}</button>
              </div>
            )}
          </div>

          {/* RIGHT — Hamburger */}
          <button
            data-hamburger="true"
            onClick={() => setDrawerOpen((o) => !o)}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 8,
              width: 34, height: 34,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 4,
              cursor: "pointer",
            }}
          >
            <span style={{ width: 16, height: 2, background: "#9FF6FF", borderRadius: 2 }} />
            <span style={{ width: 16, height: 2, background: "#9FF6FF", borderRadius: 2 }} />
            <span style={{ width: 16, height: 2, background: "#9FF6FF", borderRadius: 2 }} />
          </button>
        </div>
      </div>

      {/* ── DRAWER OVERLAY ── */}
      {drawerOpen && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 10050,
            background: "rgba(0,0,0,0.5)",
          }}
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* ── DRAWER PANEL ── */}
      <div
        ref={drawerRef}
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0,
          width: 240,
          background: "linear-gradient(180deg, rgba(6,10,30,0.98) 0%, rgba(2,4,16,0.98) 100%)",
          borderLeft: "1px solid rgba(0,229,255,0.15)",
          zIndex: 10060,
          transform: drawerOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.28s cubic-bezier(.4,0,.2,1)",
          display: "flex", flexDirection: "column",
          paddingTop: 72,
        }}
      >
        {navItems.map((item) => (
          <button key={item.key} onClick={() => nav(item.path)} style={{
            display: "flex", alignItems: "center", gap: 14,
            background: "none", border: "none",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
            padding: "18px 24px",
            color: item.key === "vip" ? "#FFD700" : "#e0f7ff",
            fontFamily: "'Orbitron',sans-serif",
            fontSize: 12, fontWeight: 700,
            cursor: "pointer",
            textAlign: "left",
            letterSpacing: 0.5,
          }}>
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>
    </>
  );
}

const ddStyle = {
  background: "none", border: "none", color: "#FFF",
  padding: "11px 16px", fontSize: 11, width: "100%",
  textAlign: "left", cursor: "pointer",
  fontFamily: "'Orbitron',sans-serif", fontWeight: 700,
  display: "block",
};
