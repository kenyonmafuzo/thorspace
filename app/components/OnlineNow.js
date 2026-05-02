"use client";

import { useEffect, useState, useRef } from "react";
import { getAvatarSrc } from "@/app/lib/avatarOptions";
import { supabase } from "@/lib/supabase";
// import { searchProfiles } from "@/lib/friends";
import { useI18n } from "@/src/hooks/useI18n";
import { fetchFriends } from "@/lib/friends";

/**
 * OnlineNow - Lista de jogadores online usando Realtime Presence
 * Mostra usuários com presença ativa
 * Permite desafiar jogadores disponíveis
 */
export default function OnlineNow({ currentUserId, currentUsername, currentAvatar, onChallenge, onUserClick }) {
  if (typeof window !== "undefined") {
  }
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [friendIds, setFriendIds] = useState(new Set());
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
  const [botUsers, setBotUsers] = useState([]);
  const botRotateRef = useRef(null);
  const botUsersRef = useRef([]);  // always-current ref for use inside closures

  // Fetch bot profiles once and rotate a random subset every 45s
  useEffect(() => {
    let mounted = true;
    supabase
      .from("profiles")
      .select("id, username, avatar_preset")
      .eq("is_bot", true)
      .then(({ data }) => {
        if (!mounted || !data || data.length === 0) return;
        const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);
        const pickBots = () => {
          const count = 3 + Math.floor(Math.random() * 4); // 3–6 bots online
          const subset = shuffle(data).slice(0, count);
          if (mounted) {
            botUsersRef.current = subset;
            setBotUsers(subset);
          }
        };
        pickBots();
        botRotateRef.current = setInterval(pickBots, 45000);
      });
    return () => {
      mounted = false;
      if (botRotateRef.current) clearInterval(botRotateRef.current);
    };
  }, []);

  // When bot roster rotates, re-trigger presence rebuild so the list updates
  useEffect(() => {
    const ch = presenceChannelRef.current;
    if (!ch) return;
    // Rebuild using the latest presence state + new bots
    const state = ch.presenceState();
    const users = [];
    Object.keys(state).forEach((key) => {
      const presences = state[key];
      if (presences && presences.length > 0) {
        const p = presences[0];
        users.push({
          userId: p.user_id,
          username: p.username || "Unknown",
          avatar: p.avatar || "normal",
          status: p.status || "online",
          isVip: p.is_vip || false,
          vipNameColor: p.vip_name_color || "#FFD700",
          vipFrameColor: p.vip_frame_color || "#FFD700",
          vipAvatar: p.vip_avatar || null,
        });
      }
    });
    botUsers.forEach(bot => {
      users.push({ userId: bot.id, username: bot.username, avatar: bot.avatar_preset || "normal", status: "online", isBot: true });
    });
    setOnlineUsers(users);
    if (typeof window !== "undefined") window.__onlineUserIds = users.map(u => u.userId);
  }, [botUsers]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch friend IDs so we can sort friends to the top of the list
  useEffect(() => {
    if (!currentUserId) return;
    fetchFriends(currentUserId).then(({ data }) => {
      if (!data) return;
      const ids = new Set(data.map(r =>
        r.from_user_id === currentUserId ? r.to_user_id : r.from_user_id
      ));
      setFriendIds(ids);
    });
  }, [currentUserId]);

  // Safety net: never show loading forever — unblock after 15s at most
  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => setLoading(false), 15000);
    return () => clearTimeout(t);
  }, [loading]);

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

  // When we're about to navigate to the game, flip our own presence status
  // to "playing" so others see the battle icon before we leave the channel.
  useEffect(() => {
    const handleGoingToGame = async () => {
      const ch = presenceChannelRef.current;
      if (!ch || !isTrackedRef.current) return;
      await ch.track({
        user_id: currentUserId,
        username: currentUsername,
        avatar: currentAvatar || 'normal',
        online_at: new Date().toISOString(),
        status: 'playing',
        is_vip: localStorage.getItem('thor_is_vip') === 'true',
        vip_name_color: localStorage.getItem('thor_vip_name_color') || '#FFD700',
        vip_frame_color: localStorage.getItem('thor_vip_frame_color') || '#FFD700',
        vip_avatar: localStorage.getItem('thor_vip_avatar') || null,
      });
    };
    window.addEventListener('thor:going_to_game', handleGoingToGame);
    return () => window.removeEventListener('thor:going_to_game', handleGoingToGame);
  }, [currentUserId, currentUsername, currentAvatar]);

  useEffect(() => {
    if (!currentUserId || !currentUsername) return;

    const startPresence = () => {

      // Remover apenas o canal anterior deste componente
      if (presenceChannelRef.current) {
        supabase.removeChannel(presenceChannelRef.current);
        presenceChannelRef.current = null;
        isTrackedRef.current = false;
      }

      
      const presenceChannel = supabase.channel("presence:online-users", {
        config: {
          presence: {
            key: currentUserId,
          },
          broadcast: { self: false }, // Reduzir tráfego
        },
      });

      // Função para reconstruir lista de usuários online
      const rebuildOnlineUsers = () => {
        const state = presenceChannel.presenceState();
        
        const users = [];

        // Construir lista de usuários únicos a partir do presence state
        Object.keys(state).forEach((key) => {
          const presences = state[key];
          
          if (presences && presences.length > 0) {
            const presence = presences[0];
            users.push({
              userId: presence.user_id,
              username: presence.username || "Unknown",
              avatar: presence.avatar || "normal",
              status: presence.status || "online",
              isVip: presence.is_vip || false,
              vipNameColor: presence.vip_name_color || "#FFD700",
              vipFrameColor: presence.vip_frame_color || "#FFD700",
              vipAvatar: presence.vip_avatar || null,
            });
          }
        });


        // Adicionar bots como jogadores online (sempre lê do ref, nunca stale)
        const currentBots = botUsersRef.current;
        if (currentBots && currentBots.length > 0) {
          currentBots.forEach(bot => {
            users.push({
              userId: bot.id,
              username: bot.username,
              avatar: bot.avatar_preset || "normal",
              status: "online",
              isBot: true,
            });
          });
        }

        // Adicionar fake players se a flag estiver ativada (desenvolvimento)
        if (process.env.NEXT_PUBLIC_FAKE_PLAYERS === "1") {
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

        setOnlineUsers(users);
        if (typeof window !== "undefined") {
          window.__onlineUserIds = users.map(u => u.userId);
        }
      };

      // Registrar handlers de presence
      presenceChannel.on("presence", { event: "sync" }, () => {
        rebuildOnlineUsers();
      });

      presenceChannel.on("presence", { event: "join" }, ({ key, newPresences }) => {
        rebuildOnlineUsers();
      });

      presenceChannel.on("presence", { event: "leave" }, ({ key, leftPresences }) => {
        rebuildOnlineUsers();
      });

      // Subscribe e track com timeout aumentado
      const subscribeTimeout = setTimeout(() => {
        if (presenceChannelRef.current) {
          supabase.removeChannel(presenceChannelRef.current);
          presenceChannelRef.current = null;
          isTrackedRef.current = false;
        }
        // Treat as CHANNEL_ERROR — trigger reconnect or stop with error
        reconnectAttemptsRef.current++;
        if (reconnectAttemptsRef.current <= maxReconnectAttempts) {
          const backoffDelay = Math.min(1200 * reconnectAttemptsRef.current, 6000);
          reconnectTimeoutRef.current = setTimeout(() => {
            startPresence();
          }, backoffDelay);
        } else {
          setErrorMessage("Erro de conexão. Por favor, recarregue a página.");
          setLoading(false);
        }
      }, 10000); // 10 segundos timeout
      
      presenceChannel.subscribe(async (status) => {
        
        if (status === "SUBSCRIBED") {
          clearTimeout(subscribeTimeout);
          // Reset contador de tentativas após sucesso
          reconnectAttemptsRef.current = 0;
          
          if (!isTrackedRef.current) {
            isTrackedRef.current = true;
            
            await presenceChannel.track({
              user_id: currentUserId,
              username: currentUsername,
              avatar: currentAvatar || "normal",
              online_at: new Date().toISOString(),
              status: "online",
              // VIP data from localStorage (set by UserHeader on load)
              is_vip: localStorage.getItem("thor_is_vip") === "true",
              vip_name_color: localStorage.getItem("thor_vip_name_color") || "#FFD700",
              vip_frame_color: localStorage.getItem("thor_vip_frame_color") || "#FFD700",
              vip_avatar: localStorage.getItem("thor_vip_avatar") || null,
            });
            
            setLoading(false);
            
            // Rebuild inicial após subscribe e track
            setTimeout(() => {
              rebuildOnlineUsers();
            }, 500);
          }
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          clearTimeout(subscribeTimeout);
          console.error("❌ PRESENCE FAIL - Status:", status);
          
          // Remover apenas este canal com erro
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
    };

    // Iniciar presence
    startPresence();

    // Cleanup no unmount
    return () => {
      
      // Limpar timeout de reconexão
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      // Remover apenas o canal deste componente
      if (presenceChannelRef.current) {
        supabase.removeChannel(presenceChannelRef.current);
        presenceChannelRef.current = null;
        isTrackedRef.current = false;
      }
      
      // Reset contador
      reconnectAttemptsRef.current = 0;
      
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
                  src={user.isVip && user.vipAvatar ? user.vipAvatar : getAvatarSrc(user.avatar)}
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
          [...onlineUsers].sort((a, b) => {
            const aIsFriend = friendIds.has(a.userId) ? 0 : 1;
            const bIsFriend = friendIds.has(b.userId) ? 0 : 1;
            return aIsFriend - bIsFriend;
          }).map((user) => {
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
                {isPlaying ? (
                  <span title="Em batalha" style={{ fontSize: 14, flexShrink: 0, lineHeight: 1 }}>⚔️</span>
                ) : (
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      backgroundColor: getStatusColor(user.status),
                      flexShrink: 0,
                    }}
                  />
                )}
                {/* Avatar */}
                <img
                  src={user.isVip && user.vipAvatar ? user.vipAvatar : getAvatarSrc(user.avatar)}
                  alt="avatar"
                  style={{
                    width: 24, height: 24, objectFit: "contain",
                    borderRadius: "50%",
                    border: "none",
                    boxShadow: "none",
                  }}
                />
                {/* Username */}
                <span style={{
                  ...usernameStyle,
                  color: user.isVip ? user.vipNameColor : undefined,
                  display: "inline-flex", alignItems: "center", gap: 3,
                }}>
                  {user.isVip && <span style={{ fontSize: 9, lineHeight: 1 }}>💎</span>}
                  {user.isBot && <span style={{ fontSize: 9, lineHeight: 1 }} title="Bot">🤖</span>}
                  {user.username || "Player"}
                  {isCurrentUser && <span style={{ color: "#FFD700" }}> ({t('multiplayer.you')})</span>}
                </span>
                {/* Challenge button */}
                {!isCurrentUser && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
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
  flex: 1,
  minHeight: 0,
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
