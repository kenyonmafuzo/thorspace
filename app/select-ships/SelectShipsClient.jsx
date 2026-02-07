"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ShotTypeModal from "../components/ShotTypeModal";

const PlayerStatsModal = dynamic(() => import("../components/PlayerStatsModal"), { ssr: false });

export default function SelectShipsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const matchId = searchParams.get("match");

  const [loading, setLoading] = useState(true);
  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [statsModalTabMode, setStatsModalTabMode] = useState(false);

  // Shot Type selection state
  const [shotTypeModalOpen, setShotTypeModalOpen] = useState(false);
  const [currentShipIndex, setCurrentShipIndex] = useState(null);
  const [shotPreferences, setShotPreferences] = useState({
    "1": "plasma",
    "2": "plasma",
    "3": "plasma"
  });

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

    const removeTabIndex = () => {
      document.querySelectorAll('button, [tabindex="0"]').forEach((el) => {
        el.setAttribute("tabindex", "-1");
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

      // Load shot preferences from Supabase
      if (userId) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("shot_preferences")
          .eq("id", userId)
          .single();

        if (profileData?.shot_preferences) {
          setShotPreferences(profileData.shot_preferences);
        }
      }

      setLoading(false);
    };

    checkAuth();
  }, [router, userId]);

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

  const handleShotTypeChange = async (shotType) => {
    const newPreferences = { ...shotPreferences, [currentShipIndex.toString()]: shotType };
    setShotPreferences(newPreferences);

    // Save to Supabase
    if (userId) {
      await supabase
        .from("profiles")
        .update({ shot_preferences: newPreferences })
        .eq("id", userId);
    }
  };

  const handleReadyForBattle = () => {
    // Store shot preferences in localStorage for game to read
    if (typeof window !== "undefined") {
      localStorage.setItem("thor_shot_preferences", JSON.stringify(shotPreferences));
    }
    router.push(`/play/${matchId}`);
  };

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <h1 style={titleStyle}>Select Your Ships</h1>
        <p style={subtitleStyle}>Match ID: {matchId || "N/A"}</p>

        <div style={contentStyle}>
          <p style={{ color: "#FFF", fontSize: 16 }}>🚧 Ship selection interface coming soon...</p>
          <p style={{ color: "#AAA", fontSize: 14, marginTop: 20 }}>
            This page will allow you to select your fleet configuration before the battle.
          </p>
        </div>

        {/* Shot Type Selection Button */}
        <button
          onClick={() => {
            setCurrentShipIndex(1); // Default to ship 1
            setShotTypeModalOpen(true);
          }}
          style={shotTypeButtonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,229,255,0.5)';
            e.currentTarget.style.borderColor = '#00E5FF';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,229,255,0.3)';
            e.currentTarget.style.borderColor = 'rgba(0,229,255,0.4)';
          }}
        >
          🎨 Trocar Tipo de Tiro
        </button>

        <button onClick={() => router.push("/multiplayer")} style={backButtonStyle}>
          ← Back to Multiplayer Hub
        </button>
      </div>

      {/* Shot Type Modal */}
      <ShotTypeModal
        open={shotTypeModalOpen}
        onClose={() => setShotTypeModalOpen(false)}
        shipIndex={currentShipIndex}
        currentShotType={currentShipIndex ? shotPreferences[currentShipIndex.toString()] : 'plasma'}
        onConfirm={handleShotTypeChange}
      />

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

const shotTypeButtonStyle = {
  width: '100%',
  padding: '16px 32px',
  marginBottom: 20,
  background: 'rgba(0,229,255,0.1)',
  border: '2px solid rgba(0,229,255,0.4)',
  borderRadius: 12,
  color: '#00E5FF',
  fontSize: 16,
  fontWeight: 700,
  fontFamily: "'Orbitron', sans-serif",
  cursor: 'pointer',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  transform: 'translateY(0)',
  boxShadow: '0 4px 12px rgba(0,229,255,0.3)',
  letterSpacing: 1
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
