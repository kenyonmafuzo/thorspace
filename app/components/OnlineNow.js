"use client";

import { useEffect, useState, useRef } from "react";
import { getAvatarSrc } from "@/app/lib/avatarOptions";
import { supabase } from "@/lib/supabase";
// import { searchProfiles } from "@/lib/friends";
import { useI18n } from "@/src/hooks/useI18n";

/**
 * OnlineNow - Lista de jogadores online usando Realtime Presence
 * Mostra usuários com presença ativa
 * Permite desafiar jogadores disponíveis
 */
export default function OnlineNow({ currentUserId, currentUsername, currentAvatar, onChallenge, onUserClick }) {
  if (typeof window !== "undefined") {
    console.log("[OnlineNow] MOUNTED", { currentUserId, currentUsername, currentAvatar });
  }
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const presenceChannelRef = useRef(null);
  const isTrackedRef = useRef(false);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    if (!search || !search.trim()) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    // Filtra apenas usuários online pelo username (case-insensitive, prefixo)
    const filtered = onlineUsers.filter(u =>
      u.username && u.username.toLowerCase().startsWith(search.trim().toLowerCase()) && u.userId !== currentUserId
    );
    setTimeout(() => {
      setSearchResults(filtered);
      setSearchLoading(false);
    }, 200);
  }, [search, onlineUsers, currentUserId]);

  useEffect(() => {
    if (!currentUserId || !currentUsername) return;

    const startPresence = () => {
      console.log("=== STARTING PRESENCE ===");
      console.log("Attempt:", reconnectAttemptsRef.current + 1, "/", maxReconnectAttempts);
      console.log("Current User:", currentUserId, currentUsername);
      console.log("========================");

      // Remover canal anterior se existir
      if (presenceChannelRef.current) {
        console.log("⚠️ Removing existing presence channel");
        supabase.removeChannel(presenceChannelRef.current);
        presenceChannelRef.current = null;
        isTrackedRef.current = false;
      }

      console.log("Creating new presence channel...");
      
      const presenceChannel = supabase.channel("presence:online-users", {
        config: {
          presence: {
            key: currentUserId,
          },
        },
      });

      // Função para reconstruir lista de usuários online
      const rebuildOnlineUsers = () => {
        console.log("=== REBUILDING ONLINE USERS ===");
        const state = presenceChannel.presenceState();
        console.log("Presence state:", state);
        console.log("State keys:", Object.keys(state));
        
        const users = [];

        // Construir lista de usuários únicos a partir do presence state
        Object.keys(state).forEach((key) => {
          const presences = state[key];
          console.log(`Key: ${key}, Presences:`, presences);
          
          if (presences && presences.length > 0) {
            const presence = presences[0];
            console.log("Adding user:", presence.user_id, presence.username);
            users.push({
              userId: presence.user_id,
              username: presence.username || "Unknown",
              avatar: presence.avatar || "normal",
              status: "online",
            });
          }
        });

        console.log("Users before fake players:", users.length);

        // Adicionar fake players se a flag estiver ativada
        if (process.env.NEXT_PUBLIC_FAKE_PLAYERS === "1") {
          console.log("Adding fake players");
          users.push(
            {
              userId: "fake-1",
              status: "online",
              username: "BotAlpha",
              avatar: "normal",
              isFake: true,
            },
            {
              userId: "fake-2",
              status: "idle",
              username: "BotBeta",
              avatar: "normal",
              isFake: true,
            }
          );
        }

        console.log("Total users after fake players:", users.length);
        console.log("Users list:", users);
        setOnlineUsers(users);
        if (typeof window !== "undefined") {
          window.__onlineUserIds = users.map(u => u.userId);
          console.log("[OnlineNow] window.__onlineUserIds:", window.__onlineUserIds);
        }
        console.log("===============================");
      };

      // Registrar handlers de presence
      presenceChannel.on("presence", { event: "sync" }, () => {
        console.log("🔄 Presence event: SYNC");
        rebuildOnlineUsers();
      });

      presenceChannel.on("presence", { event: "join" }, ({ key, newPresences }) => {
        console.log("👋 Presence event: JOIN", key, newPresences);
        rebuildOnlineUsers();
      });

      presenceChannel.on("presence", { event: "leave" }, ({ key, leftPresences }) => {
        console.log("👋 Presence event: LEAVE", key, leftPresences);
        rebuildOnlineUsers();
      });

      // Subscribe e track
      presenceChannel.subscribe(async (status) => {
        console.log("=== PRESENCE SUBSCRIPTION STATUS ===");
        console.log("Status:", status);
        console.log("===================================");
        
        if (status === "SUBSCRIBED") {
          console.log("✅ Presence subscribed successfully");
          // Reset contador de tentativas após sucesso
          reconnectAttemptsRef.current = 0;
          
          if (!isTrackedRef.current) {
            console.log("Tracking user...");
            isTrackedRef.current = true;
            
            await presenceChannel.track({
              user_id: currentUserId,
              username: currentUsername,
              avatar: currentAvatar || "normal",
              online_at: new Date().toISOString(),
            });
            
            console.log("✅ User tracked successfully");
            setLoading(false);
            
            // Rebuild inicial após subscribe e track
            setTimeout(() => {
              console.log("Calling initial rebuildOnlineUsers...");
              rebuildOnlineUsers();
            }, 500);
          }
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.error("❌ PRESENCE FAIL - Status:", status);
          
          // Remover canal com erro
          if (presenceChannelRef.current) {
            supabase.removeChannel(presenceChannelRef.current);
            presenceChannelRef.current = null;
            isTrackedRef.current = false;
          }
          
          // Tentar reconectar com backoff exponencial
          reconnectAttemptsRef.current++;
          
          if (reconnectAttemptsRef.current <= maxReconnectAttempts) {
            // Backoff: 1.2s, 2s, 3s, 4.2s, 5.8s
            const backoffDelay = Math.min(1200 * reconnectAttemptsRef.current, 6000);
            console.log(
              `⏳ Agendando reconexão Presence em ${backoffDelay}ms (tentativa ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`
            );
            
            reconnectTimeoutRef.current = setTimeout(() => {
              startPresence();
            }, backoffDelay);
          } else {
            console.error("❌ Máximo de tentativas de reconexão Presence atingido");
            setErrorMessage("Erro de conexão. Por favor, recarregue a página.");
            setLoading(false);
          }
        }
      });

      presenceChannelRef.current = presenceChannel;
      console.log("✅ Presence channel created and stored in ref");
    };

    // Iniciar presence
    startPresence();

    // Cleanup no unmount
    return () => {
      console.log("=== PRESENCE CLEANUP (unmount) ===");
      
      // Limpar timeout de reconexão
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      // Remover canal
      if (presenceChannelRef.current) {
        supabase.removeChannel(presenceChannelRef.current);
        presenceChannelRef.current = null;
        isTrackedRef.current = false;
        console.log("Presence channel removed");
      }
      
      // Reset contador
      reconnectAttemptsRef.current = 0;
      
      console.log("==================================");
    };
  }, [currentUserId, currentUsername, currentAvatar]);

  const getStatusColor = (status) => {
    switch (status) {
      case "online":
        return "#00FF88";
      case "playing":
        return "#FFA500";
      case "idle":
        return "#888888";
      default:
        return "#666666";
    }
  };



  if (loading) {
    return (
      <div style={containerStyle}>
        <h3 style={titleStyle}>{t('multiplayer.onlineNow')}</h3>
        <div style={{ padding: 20, textAlign: "center", color: "#999" }}>
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <h3 style={titleStyle}>
        {t('multiplayer.onlineNow')} <span style={{ color: "#00FF88" }}>({onlineUsers.length})</span>
      </h3>
      {/* Barra de busca */}
      <div style={{ padding: "12px 16px 0 16px" }}>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar..."
          style={{
            width: "100%",
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #00E5FF44",
            fontSize: 14,
            background: "rgba(0,229,255,0.07)",
            color: "#E6E6E6",
            marginBottom: 8,
            outline: "none",
            fontFamily: "'Orbitron',sans-serif",
          }}
        />
      </div>
      {/* Resultados da busca (apenas online) */}
      {search && (
        <div style={{ padding: "0 16px 8px 16px" }}>
          {searchLoading ? (
            <div style={{ color: "#00E5FF", fontSize: 13, padding: "8px 0" }}>Buscando…</div>
          ) : searchResults.length === 0 ? (
            <div style={{ color: "#b3eaff", fontSize: 13, padding: "8px 0" }}>Nenhum jogador online encontrado.</div>
          ) : (
            searchResults.map(user => (
              <div
                key={user.userId}
                style={{
                  ...userItemStyle,
                  cursor: "pointer",
                  background: "rgba(0,229,255,0.04)",
                }}
                onClick={() => onUserClick?.(user)}
              >
                <img
                  src={getAvatarSrc(user.avatar)}
                  alt="avatar"
                  style={{ width: 24, height: 24, objectFit: "contain" }}
                />
                <span style={usernameStyle}>{user.username}</span>
              </div>
            ))
          )}
        </div>
      )}
      {/* Error message */}
      {errorMessage && (
        <div style={{
          padding: "8px 12px",
          margin: "8px 12px",
          background: "rgba(255, 107, 107, 0.15)",
          border: "1px solid rgba(255, 107, 107, 0.3)",
          borderRadius: 8,
          fontSize: 12,
          color: "#FF6B6B",
          textAlign: "center",
        }}>
          {errorMessage}
        </div>
      )}
      <div style={listContainerStyle}>
        {onlineUsers.length === 0 ? (
          <div style={{ padding: 20, textAlign: "center", color: "#999" }}>
            No players online
          </div>
        ) : (
          onlineUsers.map((user) => {
            const isCurrentUser = user.userId === currentUserId;
            const isPlaying = user.status === "playing";
            const canChallenge = !isCurrentUser && !isPlaying;

            return (
              <div
                key={user.userId}
                style={{
                  ...userItemStyle,
                  cursor: isCurrentUser ? "default" : "pointer",
                }}
                onClick={() => {
                  if (isCurrentUser) return;
                  onUserClick?.(user);
                }}
              >
                {/* Status indicator */}
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    backgroundColor: getStatusColor(user.status),
                    flexShrink: 0,
                  }}
                />
                {/* Avatar */}
                <img
                  src={getAvatarSrc(user.avatar)}
                  alt="avatar"
                  style={{ width: 24, height: 24, objectFit: "contain" }}
                />
                {/* Username */}
                <span style={usernameStyle}>
                  {user.username || "Player"}
                  {isCurrentUser && <span style={{ color: "#FFD700" }}> ({t('multiplayer.you')})</span>}
                </span>
                {/* Challenge button */}
                {!isCurrentUser && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // ⬅️ IMPORTANTE: não dispara o clique do item
                      if (user.isFake) {
                        onChallenge(user.userId, user.username, { fake: true });
                      } else {
                        onChallenge(user.userId, user.username);
                      }
                    }}
                    disabled={!canChallenge}
                    style={{
                      ...challengeButtonStyle,
                      opacity: canChallenge ? 1 : 0.4,
                      cursor: canChallenge ? "pointer" : "not-allowed",
                    }}
                  >
                    {isPlaying ? "Playing" : t("multiplayer.challenge")}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// Styles
const containerStyle = {
  width: "100%",
  height: "100%",
  background: "rgba(0, 0, 0, 0.4)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  borderRadius: 12,
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
};

const titleStyle = {
  padding: "16px 20px",
  margin: 0,
  fontSize: 16,
  fontWeight: 700,
  color: "#FFF",
  borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
  background: "rgba(0, 0, 0, 0.3)",
  fontFamily: "'Orbitron',sans-serif",
};

const listContainerStyle = {
  flex: 1,
  overflowY: "auto",
  padding: "8px 0",
};

const userItemStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 16px",
  borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
  transition: "background 0.2s",
};

const usernameStyle = {
  flex: 1,
  fontSize: 13,
  color: "#E6E6E6",
  fontWeight: 500,
};

const challengeButtonStyle = {
  padding: "4px 12px",
  fontSize: 11,
  fontWeight: 700,
  color: "#001018",
  background: "linear-gradient(90deg, #00E5FF, #0072FF)",
  border: "none",
  borderRadius: 6,
  transition: "transform 0.2s",
  fontFamily: "'Orbitron',sans-serif",
};
