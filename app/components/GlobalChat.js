"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/src/hooks/useI18n";
import dynamic from "next/dynamic";
import { BADGES_CONFIG } from "@/lib/badgesSystem";
import { getLevelProgressFromTotalXp } from "@/lib/xpSystem";

/**
 * GlobalChat - Chat global do multiplayer hub
 * Mostra últimas 50 mensagens
 * Suporta mensagens de usuário e sistema
 * Suporta badges nas mensagens
 */
import PlayerProfileModal from "@/app/components/PlayerProfileModal";

export default function GlobalChat({ currentUserId, currentUsername, currentAvatar }) {
    // HOOKS: manter apenas UM bloco de declarações
    const { t } = useI18n();
    const [messages, setMessages] = useState([]);
    const [statsModalOpen, setStatsModalOpen] = useState(false);
    const [statsModalUserId, setStatsModalUserId] = useState(null);
    const [statsModalUsername, setStatsModalUsername] = useState("");
    const [statsModalTabMode, setStatsModalTabMode] = useState(false);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const messagesEndRef = useRef(null);
    const lastMessageTimeRef = useRef(0);
    const channelRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const reconnectAttemptsRef = useRef(0);
    const maxReconnectAttempts = 5;
    const [badgePickerOpen, setBadgePickerOpen] = useState(false);
    const [userBadges, setUserBadges] = useState([]);
    const [selectedBadge, setSelectedBadge] = useState(null);
    const [badgeModalOpen, setBadgeModalOpen] = useState(false);
    const [badgeModalData, setBadgeModalData] = useState(null);

    // VIP state
    const [currentUserIsVip, setCurrentUserIsVip] = useState(false);
    const [currentVipNameColor, setCurrentVipNameColor] = useState("#FFD700");
    const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

    // Permitir abrir stats modal com TAB (deve vir DEPOIS dos states E hooks)
    useEffect(() => {
      const handleTabDown = (e) => {
        if (e.key === "Tab") {
          e.preventDefault();
          if (!statsModalOpen) {
            setStatsModalUserId(currentUserId);
            setStatsModalUsername(currentUsername || "Unknown");
            setStatsModalTabMode(true);
            setStatsModalOpen(true);
          }
        }
      };
      const handleTabUp = (e) => {
        if (e.key === "Tab") {
          e.preventDefault();
          if (statsModalOpen) {
            setStatsModalOpen(false);
            setStatsModalTabMode(false);
          }
        }
      };
      window.addEventListener("keydown", handleTabDown);
      window.addEventListener("keyup", handleTabUp);
      return () => {
        window.removeEventListener("keydown", handleTabDown);
        window.removeEventListener("keyup", handleTabUp);
      };
    }, [statsModalOpen, currentUserId, currentUsername]);

  // Carregar badges do usuário
  useEffect(() => {
    const loadUserBadges = async () => {
      if (!currentUserId) return;
      
      try {
        const [profileRes, statsRes, progressRes] = await Promise.all([
          supabase.from("profiles").select("badges, is_vip, vip_name_color, vip_expires_at").eq("id", currentUserId).single().then(r => r.error
            ? supabase.from("profiles").select("badges, is_vip").eq("id", currentUserId).single()
            : r
          ),
          supabase.from("player_stats").select("*").eq("user_id", currentUserId).single(),
          supabase.from("player_progress").select("total_xp").eq("user_id", currentUserId).single()
        ]);

        const profile = profileRes.data || {};
        const stats = statsRes.data || {};
        const progress = progressRes.data || {};
        const totalXp = progress.total_xp || 0;
        const levelInfo = getLevelProgressFromTotalXp(totalXp);

        const user = {
          level: levelInfo.level,
          multiplayer_wins: stats.multiplayer_wins || 0,
          max_win_streak: stats.max_win_streak || 0,
          login_days: stats.login_days || 0,
          login_streak: stats.login_streak || 0,
          has_diverse_victory: stats.has_diverse_victory || false,
          has_comeback_victory: stats.has_comeback_victory || false,
          badges: profile.badges || []
        };

        // Pegar todas as badges e verificar quais estão desbloqueadas
        const allBadges = [];
        Object.values(BADGES_CONFIG).forEach(category => {
          category.badges.forEach(badge => {
            if (badge.checkUnlocked(user)) {
              allBadges.push({
                ...badge,
                unlocked: true
              });
            }
          });
        });

        setUserBadges(allBadges);

        // VIP status
        const vipActive = profile.is_vip === true &&
          (!profile.vip_expires_at || new Date(profile.vip_expires_at) > new Date());
        setCurrentUserIsVip(vipActive);
        const storedColor = typeof window !== "undefined" ? localStorage.getItem("thor_vip_name_color") : null;
        setCurrentVipNameColor(storedColor || profile.vip_name_color || "#FFD700");
      } catch (error) {
        console.error("Error loading badges:", error);
      }
    };

    loadUserBadges();
  }, [currentUserId]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "auto", block: "end" });
    }
  };

  const fetchMessages = async () => {
    try {
      // Buscar últimas 50 mensagens (mais recentes primeiro, depois invertemos)
      const { data, error } = await supabase
        .from("chat_messages")
        .select("id, user_id, username, avatar, type, message, meta, created_at")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Error fetching messages:", error);
        return;
      }

      // Inverter para ordem cronológica (mais antiga primeiro)
      setMessages((data || []).reverse());
      setLoading(false);

      // Scroll to bottom after messages load
      setTimeout(scrollToBottom, 100);
    } catch (err) {
      console.error("Exception fetching messages:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();

    // ✅ Re-busca mensagens quando o vencedor insere o resultado da partida
    // (evita race condition: insert termina depois do fetch inicial)
    const handleRefreshChat = () => {
      setTimeout(fetchMessages, 300);
    };
    window.addEventListener("refresh_chat", handleRefreshChat);

    const startRealtime = () => {
      // Realtime: escuta inserts na tabela chat_messages
      const channel = supabase.channel('chat_messages_realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
          },
          (payload) => {
            const msg = payload.new;
            setMessages((prev) => {
              // Evitar duplicatas
              if (prev.some((m) => m.id === msg.id)) return prev;
              const updated = [...prev, msg];
              // Scroll to bottom
              setTimeout(scrollToBottom, 100);
              return updated;
            });
          }
        )
        .subscribe();
      channelRef.current = channel;
    };

    startRealtime();

    return () => {
      window.removeEventListener("refresh_chat", handleRefreshChat);
      console.log("=== REALTIME CLEANUP ===");
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      reconnectAttemptsRef.current = 0;
      console.log("Channel removed successfully");
      console.log("========================");
    };
  }, []);

  // Helper functions for profanity filter
  const normalizeText = (text) => {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove acentos
      .replace(/[^a-z0-9\s]/g, ""); // Remove pontuação
  };

  const containsBadWords = (text) => {
    const badWords = [
      // Português
      "porra", "caralho", "puta", "merda", "bosta", "foda", "fodase", "foda-se",
      "fdp", "pqp", "cu", "cacete", "puta que pariu", "arrombado", "viado",
      "bicha", "cuzao", "porra", "carai", "buceta", "piroca", "pau no cu",
      // Inglês
      "fuck", "shit", "bitch", "asshole", "motherfucker", "cunt", "bastard",
      "dick", "pussy", "whore", "slut", "damn", "hell", "nigger", "fag"
    ];

    const normalized = normalizeText(text);
    
    // Create regex pattern that matches whole words or with numbers/special chars
    const pattern = badWords
      .map(word => {
        // Escape special regex characters
        const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        // Replace letters with patterns that allow numbers/special chars
        const flexible = escaped
          .split("")
          .map(char => {
            if (/[a-z]/.test(char)) {
              return `[${char}0-9@#$%&*]+`;
            }
            return char;
          })
          .join("");
        return flexible;
      })
      .join("|");

    const regex = new RegExp(`\\b(${pattern})\\b`, "i");
    return regex.test(normalized);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    // Clear previous error
    setErrorMessage("");

    // Validate user data
    if (!currentUserId || !currentUsername) {
      console.error("Missing user data:", { currentUserId, currentUsername });
      setErrorMessage("Erro: dados de usuário inválidos");
      setTimeout(() => setErrorMessage(""), 3000);
      return;
    }

    // Trim whitespace
    const messageText = newMessage.trim();
    
    // Check if empty
    if (!messageText) return;

    // Rate limit: 1500ms between messages
    const now = Date.now();
    const timeSinceLastMessage = now - lastMessageTimeRef.current;
    if (timeSinceLastMessage < 1500) {
      setErrorMessage("Aguarde um instante...");
      setTimeout(() => setErrorMessage(""), 2000);
      return;
    }

    // Check length (max 200 characters)
    if (messageText.length > 200) {
      setErrorMessage("Mensagem muito longa (máximo 200 caracteres)");
      setTimeout(() => setErrorMessage(""), 3000);
      return;
    }

    // Check for profanity
    if (containsBadWords(messageText)) {
      setErrorMessage("Mensagem contém linguagem não permitida");
      setTimeout(() => setErrorMessage(""), 3000);
      return;
    }

    // Sanitize: remove HTML tags
    const sanitizedMessage = messageText.replace(/<[^>]*>/g, "");
    
    // If sanitization removed everything, block
    if (!sanitizedMessage.trim()) {
      setErrorMessage("Mensagem inválida");
      setTimeout(() => setErrorMessage(""), 2000);
      return;
    }

    setSending(true);
    lastMessageTimeRef.current = now;

    try {
      const vipAvatarUrl = currentUserIsVip
        ? (typeof window !== "undefined" ? localStorage.getItem("thor_vip_avatar") : null)
        : null;
      const payload = {
        user_id: currentUserId,
        username: currentUsername ?? localStorage.getItem("thor_username") ?? "Unknown",
        avatar: vipAvatarUrl || currentAvatar || null,
        type: "user",
        message: sanitizedMessage,
        meta: { ...(selectedBadge ? { badge: selectedBadge } : {}), ...(currentUserIsVip ? { is_vip: true, vip_name_color: currentVipNameColor } : {}) },
      };

      const { data, error } = await supabase
        .from("chat_messages")
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error("=== CHAT INSERT ERROR ===");
        console.error("Status:", error?.status);
        console.error("Code:", error?.code);
        console.error("Message:", error?.message);
        console.error("Details:", error?.details);
        console.error("Hint:", error?.hint);
        console.error("Full error object:", error);
        console.error("Payload that failed:", payload);
        console.error("========================");

        // Mensagem amigável baseada no tipo de erro
        let userMessage = "Falha ao enviar mensagem";
        if (error?.code === "42501" || error?.message?.includes("RLS") || error?.message?.includes("policy")) {
          userMessage = "Sem permissão para enviar mensagem (RLS). Verifique as policies do Supabase.";
        } else if (error?.code === "42703") {
          userMessage = "Erro de schema do banco de dados. Verifique as colunas da tabela.";
        }

        setErrorMessage(userMessage);
        setTimeout(() => setErrorMessage(""), 4000);
      } else {
        setNewMessage("");
        setSelectedBadge(null); // Limpar badge selecionado
        
        // Adicionar mensagem imediatamente no state
        if (data) {
          setMessages((prev) => {
            const exists = prev.some((msg) => msg.id === data.id);
            if (exists) return prev;
            const updated = [...prev, data];
            // Scroll to bottom
            setTimeout(scrollToBottom, 100);
            return updated;
          });
        }
      }
    } catch (e) {
      console.error("=== CHAT SEND EXCEPTION ===");
      console.error("Exception:", e);
      console.error("Message:", e?.message);
      console.error("Stack:", e?.stack);
      console.error("==========================");
      setErrorMessage("Erro ao enviar mensagem");
      setTimeout(() => setErrorMessage(""), 3000);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  const getAvatarImage = (avatar) => {
    // If already a URL (VIP custom avatar or absolute path), use directly
    if (avatar && (avatar.startsWith("/") || avatar.startsWith("http"))) {
      return avatar;
    }
    const avatarMap = {
      normal: "/game/images/nave_normal.png",
      protecao: "/game/images/nave_protecao.png",
      alcance: "/game/images/nave_alcance.png",
    };
    return avatarMap[avatar] || avatarMap.normal;
  };

  if (loading) {
    return (
      <div style={containerStyle}>
        <h3 style={titleStyle}>Global Chat</h3>
        <div style={{ padding: 20, textAlign: "center", color: "#999" }}>
          Loading messages...
        </div>
      </div>
    );
  }

    return (
    <>
      <div style={containerStyle}>
        <h3 style={titleStyle}>Global Chat</h3>

        {/* Messages list */}
        <div style={messagesContainerStyle}>
          {messages.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: "#999" }}>
              No messages yet. Be the first to say hello!
            </div>
          ) : (
            messages.map((msg) => {
              const isSystem = msg.type === "system" || msg.type === "system_result";
              const isCurrentUser = msg.user_id === currentUserId;

              if (isSystem) {
                const isResult = msg.type === "system_result";
                return (
                  <div
                    key={msg.id}
                    style={{
                      ...systemMessageStyle,
                      ...(isResult && {
                        background: "rgba(0, 229, 255, 0.08)",
                        borderLeft: "3px solid rgba(0, 229, 255, 0.5)",
                      }),
                    }}
                  >
                    <span style={{ fontSize: 11, opacity: 0.6 }}>
                      {formatTime(msg.created_at)}
                    </span>
                    <span
                      style={{
                        fontSize: isResult ? 13 : 12,
                        opacity: isResult ? 0.9 : 0.7,
                        fontWeight: isResult ? 500 : 400,
                      }}
                    >
                      {msg.message}
                    </span>
                  </div>
                );
              }

              return (
                <div key={msg.id} style={{
                  ...messageItemStyle,
                  ...(msg.meta?.is_vip ? {
                    background: `linear-gradient(90deg, rgba(255,215,0,0.06) 0%, transparent 40%)`,
                    borderLeft: `2px solid ${msg.meta.vip_name_color || '#FFD700'}55`,
                    borderRadius: 8,
                    paddingLeft: 8,
                    marginLeft: -8,
                  } : {})
                }}>
                  {/* Avatar */}
                  <img
                    src={getAvatarImage(msg.avatar)}
                    alt="avatar"
                    style={{ width: 28, height: 28, objectFit: "contain", flexShrink: 0 }}
                  />

                  {/* Message content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: msg.meta?.is_vip
                            ? (msg.meta.vip_name_color || "#FFD700")
                            : "#ccc",
                          cursor: "pointer",
                          textDecoration: "underline dotted",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                        title={t("multiplayer.viewStats")}
                        onClick={() => {
                          if (msg.user_id) {
                            setStatsModalUserId(msg.user_id);
                            setStatsModalUsername(msg.username || "Unknown");
                            setStatsModalTabMode(false);
                            setStatsModalOpen(true);
                          }
                        }}
                      >
                        {msg.meta?.is_vip && <span style={{ fontSize: 11 }}>💎</span>}
                        {msg.username || "Unknown"}
                      </span>
                      <span style={{ fontSize: 10, color: "#999" }}>
                        {formatTime(msg.created_at)}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                      <p style={{ margin: 0, fontSize: 13, color: "#E6E6E6", flex: 1 }}>
                        {msg.message}
                      </p>
                      {/* Badge na mensagem */}
                      {msg.meta?.badge && (
                        <div
                          onClick={() => {
                            setBadgeModalData(msg.meta.badge);
                            setBadgeModalOpen(true);
                          }}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            background: 'rgba(20,255,255,0.1)',
                            border: '1px solid rgba(20,255,255,0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            flexShrink: 0,
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.1)';
                            e.currentTarget.style.borderColor = 'rgba(20,255,255,0.6)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.borderColor = 'rgba(20,255,255,0.3)';
                          }}
                        >
                          <img 
                            src={msg.meta.badge.icon} 
                            alt={msg.meta.badge.title}
                            style={{ width: '70%', height: '70%', objectFit: 'contain' }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input form */}
        <form onSubmit={handleSendMessage} style={inputContainerStyle}>
          {/* Badge picker button */}
          <button
            type="button"
            onClick={() => setBadgePickerOpen(!badgePickerOpen)}
            disabled={userBadges.length === 0}
            style={{
              background: userBadges.length > 0 ? 'rgba(20,255,255,0.1)' : 'rgba(100,100,100,0.1)',
              border: `1px solid ${userBadges.length > 0 ? 'rgba(20,255,255,0.3)' : 'rgba(100,100,100,0.3)'}`,
              borderRadius: 8,
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: userBadges.length > 0 ? 'pointer' : 'not-allowed',
              opacity: userBadges.length > 0 ? 1 : 0.4,
              transition: 'all 0.2s',
              flexShrink: 0,
              position: 'relative'
            }}
            title={userBadges.length > 0 ? "Enviar badge" : "Sem badges desbloqueados"}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" 
                    fill={userBadges.length > 0 ? "#14ffff" : "#666"} 
                    opacity="0.6"/>
            </svg>
            {selectedBadge && (
              <div style={{
                position: 'absolute',
                top: -2,
                right: -2,
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#00ff00',
                border: '1px solid #fff'
              }} />
            )}
          </button>

          {/* Badge picker panel */}
          {badgePickerOpen && (
            <div style={{
              position: 'absolute',
              bottom: '100%',
              left: 0,
              marginBottom: 8,
              background: 'rgba(15,15,30,0.98)',
              border: '1px solid rgba(20,255,255,0.3)',
              borderRadius: 12,
              padding: 12,
              minWidth: 280,
              maxWidth: 320,
              maxHeight: 360,
              overflowY: 'auto',
              boxShadow: '0 -4px 20px rgba(0,0,0,0.5)',
              zIndex: 100
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                marginBottom: 12,
                paddingBottom: 8,
                borderBottom: '1px solid rgba(20,255,255,0.2)'
              }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#14ffff' }}>
                  {userBadges.length} {userBadges.length === 1 ? 'Badge' : 'Badges'}
                </span>
                <button
                  type="button"
                  onClick={() => setBadgePickerOpen(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#999',
                    cursor: 'pointer',
                    fontSize: 18,
                    padding: 0,
                    width: 24,
                    height: 24
                  }}
                >
                  ×
                </button>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))',
                gap: 10,
                justifyItems: 'center'
              }}>
                {userBadges.map(badge => (
                  <div
                    key={badge.id}
                    onClick={() => {
                      setSelectedBadge(selectedBadge?.id === badge.id ? null : badge);
                      setBadgePickerOpen(false);
                    }}
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: '50%',
                      background: selectedBadge?.id === badge.id ? 'rgba(0,255,0,0.2)' : 'rgba(20,255,255,0.1)',
                      border: `2px solid ${selectedBadge?.id === badge.id ? '#00ff00' : 'rgba(20,255,255,0.3)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      overflow: 'hidden'
                    }}
                    title={badge.title}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.1)';
                      e.currentTarget.style.borderColor = '#14ffff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.borderColor = selectedBadge?.id === badge.id ? '#00ff00' : 'rgba(20,255,255,0.3)';
                    }}
                  >
                    <img 
                      src={badge.icon} 
                      alt={badge.title}
                      style={{ width: '70%', height: '70%', objectFit: 'contain' }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VIP Emoji Picker Button - only for VIP users */}
          {currentUserIsVip && (
            <button
              type="button"
              onClick={() => setEmojiPickerOpen(!emojiPickerOpen)}
              style={{
                background: emojiPickerOpen ? 'rgba(255,215,0,0.2)' : 'rgba(255,215,0,0.08)',
                border: `1px solid ${emojiPickerOpen ? 'rgba(255,215,0,0.7)' : 'rgba(255,215,0,0.3)'}`,
                borderRadius: 8,
                width: 40,
                height: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                flexShrink: 0,
                fontSize: 18,
                position: 'relative',
              }}
              title="Emojis VIP"
            >
              💎
            </button>
          )}

          {/* VIP Emoji Panel */}
          {emojiPickerOpen && currentUserIsVip && (
            <div style={{
              position: 'absolute',
              bottom: '100%',
              left: 50,
              marginBottom: 8,
              background: 'rgba(10,10,25,0.98)',
              border: '1px solid rgba(255,215,0,0.4)',
              borderRadius: 12,
              padding: 12,
              minWidth: 250,
              boxShadow: '0 -4px 20px rgba(255,215,0,0.15)',
              zIndex: 100
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 10,
                paddingBottom: 8,
                borderBottom: '1px solid rgba(255,215,0,0.2)'
              }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#FFD700', fontFamily: "'Orbitron',sans-serif" }}>
                  💎 VIP Emojis
                </span>
                <button type="button" onClick={() => setEmojiPickerOpen(false)}
                  style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: 16, padding: 0 }}>
                  ×
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {['🔥','⚡','🌟','👾','💥','🌀','☄️','🎯','💫','🛸','🏆','💣','🎮','🌈','🦄','👑','🔮','⚔️','🛡️','🎆'].map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      setNewMessage(prev => prev + emoji);
                      setEmojiPickerOpen(false);
                    }}
                    style={{
                      background: 'rgba(255,215,0,0.08)',
                      border: '1px solid rgba(255,215,0,0.2)',
                      borderRadius: 8,
                      width: 38,
                      height: 38,
                      fontSize: 20,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,215,0,0.2)'; e.currentTarget.style.transform = 'scale(1.15)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,215,0,0.08)'; e.currentTarget.style.transform = 'scale(1)'; }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, position: 'relative' }}>
            {selectedBadge && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 8px',
                background: 'rgba(0,255,0,0.1)',
                border: '1px solid rgba(0,255,0,0.3)',
                borderRadius: 6,
                fontSize: 11,
                color: '#00ff00'
              }}>
                <img src={selectedBadge.icon} alt="" style={{ width: 16, height: 16 }} />
                <span>{selectedBadge.title}</span>
                <button
                  type="button"
                  onClick={() => setSelectedBadge(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#00ff00',
                    cursor: 'pointer',
                    marginLeft: 'auto',
                    padding: 0,
                    fontSize: 14
                  }}
                >
                  ×
                </button>
              </div>
            )}
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={t("multiplayer.typeMessage")}
              disabled={sending}
              style={inputStyle}
              maxLength={200}
              onKeyDown={e => {
                if (e.key === "Tab") {
                  e.preventDefault();
                }
              }}
            />
            {errorMessage && (
              <span style={{ fontSize: 11, color: "#FF6B6B", paddingLeft: 4 }}>
                {errorMessage}
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={sending || !newMessage.trim()}
            style={{
              ...sendButtonStyle,
              opacity: (sending || !newMessage.trim()) ? 0.4 : 1,
              cursor: (sending || !newMessage.trim()) ? 'not-allowed' : 'pointer'
            }}
            onMouseEnter={(e) => {
              if (!sending && newMessage.trim()) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 0 20px rgba(0,229,255,0.5), 0 6px 16px rgba(0,114,255,0.3)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
            tabIndex={-1}
          >
            {sending ? "..." : t("multiplayer.send")}
          </button>
        </form>
      </div>

      {/* Player Stats Modal */}
      <PlayerProfileModal
        open={statsModalOpen}
        onClose={() => setStatsModalOpen(false)}
        player={statsModalUserId ? { id: statsModalUserId, username: statsModalUsername } : null}
        currentUserId={currentUserId}
      />

      {/* Badge Info Modal */}
      {badgeModalOpen && badgeModalData && (
        <div
          onClick={() => setBadgeModalOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            cursor: 'pointer'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'rgba(20,255,255,0.1)',
              border: '2px solid rgba(20,255,255,0.4)',
              borderRadius: 24,
              padding: 40,
              textAlign: 'center',
              maxWidth: 500,
              cursor: 'default'
            }}
          >
            <div style={{
              width: 200,
              height: 200,
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.4)',
              border: '2px solid rgba(20,255,255,0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              overflow: 'hidden'
            }}>
              <img 
                src={badgeModalData.icon} 
                alt={badgeModalData.title}
                style={{ width: '80%', height: '80%', objectFit: 'contain' }}
              />
            </div>
            <h2 style={{ 
              fontSize: 24, 
              fontWeight: 700, 
              marginBottom: 12,
              color: '#14ffff',
              fontFamily: "'Orbitron', sans-serif"
            }}>
              {t(`badges.list.${badgeModalData.id}.title`)}
            </h2>
            <p style={{
              fontSize: 14,
              color: 'rgba(255,255,255,0.8)',
              lineHeight: 1.6,
              margin: 0
            }}>
              {t(`badges.list.${badgeModalData.id}.description`)}
            </p>
          </div>
        </div>
      )}
    </>
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

const messagesContainerStyle = {
  flex: 1,
  overflowY: "auto",
  padding: "12px 16px",
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const messageItemStyle = {
  display: "flex",
  gap: 12,
  alignItems: "flex-start",
};

const systemMessageStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 4,
  padding: "8px 12px",
  background: "rgba(255, 255, 255, 0.03)",
  borderRadius: 8,
  textAlign: "center",
  color: "#999",
};

const inputContainerStyle = {
  display: "flex",
  gap: 8,
  padding: 16,
  borderTop: "1px solid rgba(255, 255, 255, 0.1)",
  background: "rgba(0, 0, 0, 0.3)",
  position: "relative",
};

const inputStyle = {
  flex: 1,
  padding: "10px 14px",
  fontSize: 13,
  color: "#FFF",
  background: "rgba(0, 0, 0, 0.4)",
  border: "1px solid rgba(255, 255, 255, 0.15)",
  borderRadius: 8,
  outline: "none",
};

const sendButtonStyle = {
  padding: "10px 20px",
  fontSize: 13,
  fontWeight: 700,
  color: "#001018",
  background: "linear-gradient(90deg, #00E5FF, #0072FF)",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  transform: "translateY(0)",
  fontFamily: "'Orbitron',sans-serif",
};
