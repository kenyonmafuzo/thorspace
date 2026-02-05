"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/src/hooks/useI18n";

const DEFAULT_SETTINGS = {
  audio: { master: true, music: true, sfx: true },
  game: { tutorial: true, animations: true, confirmActions: true },
  ui: { language: "pt" },
};

export default function SettingsPage() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState("");
  const [session, setSession] = useState(null);
  const { t } = useI18n();
  const debounceTimer = useRef(null);

  const mergeSettings = (remoteSettings) => {
    const merged = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    if (!remoteSettings) return merged;
    return {
      audio: { ...merged.audio, ...(remoteSettings.audio || {}) },
      game: { ...merged.game, ...(remoteSettings.game || {}) },
      ui: { ...merged.ui, ...(remoteSettings.ui || {}) },
    };
  };

  useEffect(() => {
    // Timeout de segurança
    const safetyTimeout = setTimeout(() => {
      console.warn("[Settings] Loading timeout - forçando loading=false");
      setLoading(false);
    }, 5000);
    
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const sess = data?.session;
        setSession(sess);

        const stored = localStorage.getItem("thor_settings_v1");
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            setSettings(mergeSettings(parsed));
          } catch (e) {
            setSettings(DEFAULT_SETTINGS);
          }
        } else {
          setSettings(DEFAULT_SETTINGS);
        }

        if (sess?.user?.id) {
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("settings")
            .eq("id", sess.user.id)
            .maybeSingle();

          if (profileError) {
            console.warn("Erro ao buscar profile settings:", profileError);
          } else if (profile?.settings) {
            const merged = mergeSettings(profile.settings);
            setSettings(merged);
            localStorage.setItem("thor_settings_v1", JSON.stringify(merged));
          }
        }
      } catch (e) {
        setSettings(DEFAULT_SETTINGS);
      } finally {
        clearTimeout(safetyTimeout);
        setLoading(false);
      }
    })();
    
    return () => {
      clearTimeout(safetyTimeout);
    };
  }, []);

  const saveToSupabase = (newSettings) => {
    if (!session?.user?.id) return;

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(async () => {
      try {
        await supabase
          .from("profiles")
          .update({ settings: newSettings })
          .eq("id", session.user.id);

        setSaveStatus("Salvo");
        setTimeout(() => setSaveStatus(""), 1500);
      } catch (e) {
        setSaveStatus("Erro ao salvar");
        setTimeout(() => setSaveStatus(""), 2000);
      }
    }, 600);
  };

  const updateSetting = (path, value) => {
    const newSettings = JSON.parse(JSON.stringify(settings));
    const keys = path.split(".");
    let current = newSettings;
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;

    setSettings(newSettings);
    localStorage.setItem("thor_settings_v1", JSON.stringify(newSettings));
    
    // Dispatch language change event if language setting changed
    if (path === "ui.language") {
      window.dispatchEvent(new CustomEvent("THOR:LANG_CHANGED"));
    }
    
    saveToSupabase(newSettings);
    setSaveStatus("Salvo");
    setTimeout(() => setSaveStatus(""), 1500);
  };

  if (loading) {
    return (
      <div style={{ background: "#0f0f1e", color: "#FFF", minHeight: "100vh", padding: "40px 20px" }}>
        <main style={{ maxWidth: 700, margin: "80px auto 0" }}>
          <p>{t("common.loading")}</p>
        </main>
      </div>
    );
  }

  const masterOn = settings.audio.master;

  return (
    <div style={{ background: "#0f0f1e", color: "#FFF", minHeight: "100vh", padding: "40px 20px" }}>
      <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <main style={{ maxWidth: 680, margin: "80px auto 0" }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 40, fontFamily: "'Orbitron', sans-serif" }}>{t("settings.title")}</h1>

        {/* ÁUDIO */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20, fontFamily: "'Orbitron', sans-serif" }}>{t("settings.audio")}</h2>

          <SettingRow label={t("settings.master")} description={t("settings.masterDesc")}>
            <Toggle
              checked={settings.audio.master}
              onChange={(checked) => updateSetting("audio.master", checked)}
            />
          </SettingRow>

          <SettingRow
            label={t("settings.music")}
            description={t("settings.musicDesc")}
            labelColor={masterOn ? "#FFF" : "rgba(255,255,255,0.4)"}
            hasBorder={true}
          >
            <Toggle
              checked={settings.audio.music}
              onChange={(checked) => updateSetting("audio.music", checked)}
              disabled={!masterOn}
            />
          </SettingRow>

          <SettingRow
            label={t("settings.sfx")}
            description={t("settings.sfxDesc")}
            labelColor={masterOn ? "#FFF" : "rgba(255,255,255,0.4)"}
            hasBorder={false}
          >
            <Toggle
              checked={settings.audio.sfx}
              onChange={(checked) => updateSetting("audio.sfx", checked)}
              disabled={!masterOn}
            />
          </SettingRow>
        </div>

        {/* JOGO */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20, fontFamily: "'Orbitron', sans-serif" }}>{t("settings.game")}</h2>

          <SettingRow label={t("settings.tutorial")} description={t("settings.tutorialDesc")} hasBorder={true}>
            <Toggle
              checked={settings.game.tutorial}
              onChange={(checked) => updateSetting("game.tutorial", checked)}
            />
          </SettingRow>

          <SettingRow label={t("settings.animations")} description={t("settings.animationsDesc")} hasBorder={true}>
            <Toggle
              checked={settings.game.animations}
              onChange={(checked) => updateSetting("game.animations", checked)}
            />
          </SettingRow>

          <SettingRow
            label={t("settings.confirmActions")}
            description={t("settings.confirmActionsDesc")}
            hasBorder={false}
          >
            <Toggle
              checked={settings.game.confirmActions}
              onChange={(checked) => updateSetting("game.confirmActions", checked)}
            />
          </SettingRow>
        </div>

        {/* INTERFACE */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20, fontFamily: "'Orbitron', sans-serif" }}>{t("settings.interface")}</h2>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 500 }}>{t("settings.language")}</p>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>{t("settings.languageDesc")}</p>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <div
                onClick={() => updateSetting("ui.language", "pt")}
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  fontSize: 32,
                  border: settings.ui.language === "pt" ? "3px solid #00D9FF" : "3px solid rgba(255,255,255,0.2)",
                  transition: "all 0.2s",
                  opacity: settings.ui.language === "pt" ? 1 : 0.6,
                }}
              >
                🇧🇷
              </div>
              <div
                onClick={() => updateSetting("ui.language", "en")}
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  fontSize: 32,
                  border: settings.ui.language === "en" ? "3px solid #00D9FF" : "3px solid rgba(255,255,255,0.2)",
                  transition: "all 0.2s",
                  opacity: settings.ui.language === "en" ? 1 : 0.6,
                }}
              >
                🇺🇸
              </div>
              <div
                onClick={() => updateSetting("ui.language", "es")}
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  fontSize: 32,
                  border: settings.ui.language === "es" ? "3px solid #00D9FF" : "3px solid rgba(255,255,255,0.2)",
                  transition: "all 0.2s",
                  opacity: settings.ui.language === "es" ? 1 : 0.6,
                }}
              >
                🇪🇸
              </div>
            </div>
          </div>
        </div>

        {/* Status */}
        {saveStatus && (
          <div
            style={{
              textAlign: "center",
              marginTop: 20,
              fontSize: 12,
              color: saveStatus === "Salvo" ? "#90EE90" : "#FFB3B3",
            }}
          >
            {saveStatus}
          </div>
        )}
      </main>
    </div>
  );
}

function SettingRow({ label, description, children, labelColor = "#FFF", hasBorder = false }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        paddingBottom: 16,
        marginBottom: 16,
        borderBottom: hasBorder ? "1px solid rgba(255,255,255,0.08)" : "none",
      }}
    >
      <div>
        <p style={{ fontSize: 14, fontWeight: 500, color: labelColor }}>{label}</p>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>{description}</p>
      </div>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange, disabled = false }) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      style={{
        width: 48,
        height: 28,
        borderRadius: 14,
        border: "none",
        background: checked
          ? disabled
            ? "rgba(150,150,150,0.4)"
            : "rgba(255,215,0,0.3)"
          : "rgba(255,255,255,0.1)",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 0.2s",
        position: "relative",
        flexShrink: 0,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div
        style={{
          position: "absolute",
          width: 22,
          height: 22,
          borderRadius: 11,
          background: checked ? "#FFD700" : "#666",
          top: 3,
          left: checked ? 23 : 3,
          transition: "all 0.2s",
        }}
      />
    </button>
  );
}

const cardStyle = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 12,
  padding: 20,
  marginBottom: 24,
};
