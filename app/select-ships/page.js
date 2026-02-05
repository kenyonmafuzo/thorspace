"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const PlayerStatsModal = dynamic(() => import("../components/PlayerStatsModal"), { ssr: false });
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function SelectShipsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const matchId = searchParams.get("match");
  const [loading, setLoading] = useState(true);
  // TAB popup state
  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [statsModalTabMode, setStatsModalTabMode] = useState(false);
  // Pega userId/username do localStorage (ajuste conforme seu auth)
  const userId = typeof window !== "undefined" ? localStorage.getItem("thor_user_id") : null;
  const username = typeof window !== "undefined" ? localStorage.getItem("thor_username") : "";

  useEffect(() => {
    const handleTabDown = (e) => {
      if (e.key === "Tab") {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (!statsModalOpen) {
          setStatsModalTabMode(true);
          setStatsModalOpen(true);
        }
      }
    };
    const handleTabUp = (e) => {
      if (e.key === "Tab") {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (statsModalOpen) {
          setStatsModalOpen(false);
          setStatsModalTabMode(false);
        }
      }
    };
    window.addEventListener("keydown", handleTabDown, true);
    window.addEventListener("keyup", handleTabUp, true);
    // Remove tabIndex de todos os botões
    const removeTabIndex = () => {
      document.querySelectorAll('button, [tabindex="0"]').forEach(el => {
        el.setAttribute('tabindex', '-1');
      });
    };
    removeTabIndex();
    return () => {
      window.removeEventListener("keydown", handleTabDown, true);
      window.removeEventListener("keyup", handleTabUp, true);
    };
  }, [statsModalOpen]);
  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data?.session) {
        router.replace("/login");
        return;
      }
      setLoading(false);
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={{ textAlign: "center", color: "#999" }}>Loading...</div>
        <PlayerStatsModal
          open={statsModalOpen}
          onClose={() => setStatsModalOpen(false)}
          userId={userId}
          username={username}
          tabMode={statsModalTabMode}
        />
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <h1 style={titleStyle}>Select Your Ships</h1>
        <p style={subtitleStyle}>Match ID: {matchId || "N/A"}</p>
        <div style={contentStyle}>
          <p style={{ color: "#FFF", fontSize: 16 }}>
            🚧 Ship selection interface coming soon...
          </p>
          <p style={{ color: "#AAA", fontSize: 14, marginTop: 20 }}>
            This page will allow you to select your fleet configuration before the battle.
          </p>
        </div>
        <button
          onClick={() => router.push("/multiplayer")}
          style={backButtonStyle}
        >
          ← Back to Multiplayer Hub
        </button>
      </div>
      <PlayerStatsModal
        open={statsModalOpen}
        onClose={() => setStatsModalOpen(false)}
        userId={userId}
        username={username}
        tabMode={statsModalTabMode}
      />
    </div>
  );
}

const pageStyle = {
  width: "100%",
  minHeight: "100vh",
  background: "radial-gradient(ellipse at bottom, #01030a 0%, #000016 40%, #000000 100%)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
};

const containerStyle = {
  maxWidth: 800,
  width: "100%",
  background: "rgba(0, 0, 0, 0.4)",
  border: "1px solid rgba(0, 229, 255, 0.3)",
  borderRadius: 16,
  padding: 40,
  textAlign: "center",
};

const titleStyle = {
  margin: 0,
  fontSize: 32,
  fontWeight: 700,
  color: "#00E5FF",
  textShadow: "0 0 20px rgba(0, 229, 255, 0.5)",
  marginBottom: 10,
};

const subtitleStyle = {
  margin: 0,
  fontSize: 14,
  color: "#888",
  marginBottom: 40,
};

const contentStyle = {
  padding: 40,
  background: "rgba(255, 255, 255, 0.02)",
  borderRadius: 12,
  marginBottom: 30,
};

const backButtonStyle = {
  padding: "12px 24px",
  fontSize: 14,
  fontWeight: 600,
  color: "#FFF",
  background: "rgba(255, 255, 255, 0.1)",
  border: "1px solid rgba(255, 255, 255, 0.2)",
  borderRadius: 8,
  cursor: "pointer",
  transition: "all 0.2s",
};
