"use client";

import { useEffect, useState } from "react";
import UserHeader from "../components/UserHeader";
import MobileHeader from "../components/MobileHeader";
import NotificationsClientRoot from "../components/notifications/NotificationsClientRoot";
import NotificationProvider from "../components/notifications/NotificationProvider";
import OnlineNow from "../components/OnlineNow";
import { useUserStats } from "../components/stats/UserStatsProvider";

// Hard-reload failsafe: if the page is still in a broken state after this many
// milliseconds (e.g. Chrome cached a stale shell), show a recovery button.
const HARD_RELOAD_TIMEOUT_MS = 10_000;

function hardReload() {
  try {
    localStorage.clear();
    sessionStorage.clear();
    if (typeof window !== "undefined" && window.caches) {
      window.caches.keys().then((keys) => keys.forEach((k) => window.caches.delete(k)));
    }
  } finally {
    // force=true bypasses the browser's HTTP cache for this reload
    window.location.reload();
  }
}

export default function ProtectedClientLayout({ children }) {
  const { userStats, isLoading } = useUserStats();
  const isReady = !!(userStats && (userStats.user_id || userStats.id) && userStats.username);

  // Show a "reload" button if the page is still loading after HARD_RELOAD_TIMEOUT_MS.
  // This recovers Chrome users who hit the infinite-spinner-on-refresh bug.
  const [showReloadBtn, setShowReloadBtn] = useState(false);
  useEffect(() => {
    // Once the user data is ready, cancel — no button needed.
    if (isReady) return;
    const t = setTimeout(() => setShowReloadBtn(true), HARD_RELOAD_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [isReady]);

  return (
    <NotificationProvider>
      <NotificationsClientRoot>
        {/* Mantém presença global invisível para amigos */}
        {isReady && (
          <OnlineNow
            currentUserId={userStats.user_id}
            currentUsername={userStats.username}
            currentAvatar={userStats.avatar_preset}
          />
        )}
        {/* Desktop header */}
        <UserHeader />
        {/* Mobile header — only visible on ≤768px via CSS */}
        <MobileHeader />
        <main className="mobile-page-content">{children}</main>

        {/* Hard-reload recovery overlay — appears after 10 s of infinite loading.
            Clears all local caches and forces a fresh page load. Targets the
            Chrome "infinite spinner on Ctrl+R" bug caused by stale cached HTML. */}
        {showReloadBtn && (
          <div
            style={{
              position: "fixed",
              bottom: 24,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 99999,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              background: "rgba(0,0,0,0.82)",
              border: "1px solid rgba(0,229,255,0.25)",
              borderRadius: 12,
              padding: "14px 22px",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              boxShadow: "0 4px 32px rgba(0,0,0,0.6)",
            }}
          >
            <span style={{ color: "rgba(230,251,255,0.7)", fontSize: 13 }}>
              Página demorando para carregar?
            </span>
            <button
              onClick={hardReload}
              style={{
                background: "linear-gradient(90deg,#00e5ff,#007aff)",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "8px 22px",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
                letterSpacing: "0.5px",
              }}
            >
              Recarregar
            </button>
          </div>
        )}
      </NotificationsClientRoot>
    </NotificationProvider>
  );
}
