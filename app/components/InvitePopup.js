"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/src/hooks/useI18n";

/**
 * InvitePopup - Modal de convite recebido
 * Mostra popup quando recebe um challenge e permite Accept/Decline
 */
export default function InvitePopup({ currentUserId, currentUsername }) {
  const router = useRouter();
  const { t } = useI18n();
  const [invite, setInvite] = useState(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [processing, setProcessing] = useState(false);

  // Adicionar keyframes para animação
  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      @keyframes slideIn {
        from {
          transform: translateY(-50px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  // Timer de expiração
  useEffect(() => {
    if (!invite) return;

    setTimeLeft(30);
    const startTime = Date.now();
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = 30 - elapsed;

      if (remaining <= 0) {
        handleExpire();
        clearInterval(timer);
      } else {
        setTimeLeft(remaining);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [invite]);

  // Realtime subscription para matches
  useEffect(() => {
    if (!currentUserId) return;

    // Buscar matches pendentes ao montar, mas só exibir se não houver popup igual já aberto
    const checkPendingMatches = async () => {
      const { data: match, error } = await supabase
        .from("matches")
        .select("*")
        .eq("invite_to", currentUserId)
        .eq("state", "pending")
        .eq("mode", "multiplayer")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (match && !error) {
        // Buscar username do invite_from separadamente
        const { data: profile } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", match.invite_from)
          .single();

        setInvite(prev => {
          if (prev && prev.id === match.id) return prev;
          return {
            id: match.id,
            fromUserId: match.invite_from,
            fromUsername: profile?.username || "Unknown",
            isFake: false,
          };
        });
      }
    };

    checkPendingMatches();

    // Subscribe para novos matches
    const channel = supabase
      .channel(`matches:${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matches",
          filter: `invite_to=eq.${currentUserId}`,
        },
        async (payload) => {
          if (
            payload.new &&
            payload.new.state === "pending" &&
            payload.new.mode === "multiplayer"
          ) {
            // Buscar username antes
            const { data: profile } = await supabase
              .from("profiles")
              .select("username")
              .eq("id", payload.new.invite_from)
              .single();
            // Evita duplicidade: só seta se não for o mesmo convite já exibido
            setInvite(prev => {
              if (prev && prev.id === payload.new.id) return prev;
              return {
                id: payload.new.id,
                fromUserId: payload.new.invite_from,
                fromUsername: profile?.username || "Unknown",
                isFake: false,
              };
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  const handleExpire = async () => {
    if (!invite || invite.isFake) {
      setInvite(null);
      return;
    }

    // Marcar como cancelled no banco
    await supabase
      .from("matches")
      .update({ state: "cancelled" })
      .eq("id", invite.id);

    setInvite(null);
  };

  const handleAccept = async () => {
    if (!invite || processing) return;
    setProcessing(true);

    try {
      if (invite.isFake) {
        // Convite fake - criar match fake
        const fakeMatchId = `fake-${Date.now()}`;

        // Detectar idioma: thor_settings_v1 > profiles.language > en
        let userLang = 'en';
        try {
          const settings = localStorage.getItem('thor_settings_v1');
          if (settings) {
            userLang = JSON.parse(settings)?.ui?.language || 'en';
          }
        } catch (e) {
          // Se falhar, buscar do perfil
          const { data: profileData } = await supabase
            .from('profiles')
            .select('language')
            .eq('id', currentUserId)
            .single();
          userLang = profileData?.language || 'en';
        }

        // Preparar traduções antes do insert usando o idioma do usuário
        const translations = {
          en: { accepted: 'accepted', battleStarted: 'Battle started!' },
          pt: { accepted: 'aceitou', battleStarted: 'Batalha começou!' },
          es: { accepted: 'aceptó', battleStarted: '¡Batalla comenzada!' }
        };
        const texts = translations[userLang] || translations.en;
        const chatMessage = `⚔️ ${currentUsername} ${texts.accepted} ${invite.fromUsername}. ${texts.battleStarted}`;

        // Inserir mensagem system no chat
        await supabase.from("chat_messages").insert({
          user_id: currentUserId,
          username: currentUsername,
          avatar: null,
          message: chatMessage,
          type: "system",
          meta: {
            match_id: fakeMatchId,
            from_user: invite.fromUserId,
            to_user: currentUserId,
          } || {},
        });

        // Salvar match_id e modo no localStorage
        localStorage.setItem("thor_match_id", fakeMatchId);
        localStorage.setItem("thor_match_opponent_name", invite.fromUsername);
        localStorage.setItem("thor_match_opponent_id", invite.fromUserId);
        localStorage.setItem("thor_match_source", "multiplayer");
        localStorage.setItem("thor_selected_mode", "multiplayer");

        // Ir para seleção de naves antes do jogo
        router.push(`/select-ships?match=${fakeMatchId}`);
        setInvite(null);
      } else {
        // Convite real - atualizar match existente
        const now = new Date().toISOString();

        // Atualizar match para accepted e definir started_at
        const { error: updateError } = await supabase
          .from("matches")
          .update({
            state: "accepted",
            started_at: now,
          })
          .eq("id", invite.id);

        if (updateError) {
          console.error("Error accepting match:", updateError);
          alert("Failed to accept challenge");
          setProcessing(false);
          return;
        }

        // Detectar idioma: thor_settings_v1 > profiles.language > en
        let userLang = 'en';
        try {
          const settings = localStorage.getItem('thor_settings_v1');
          if (settings) {
            userLang = JSON.parse(settings)?.ui?.language || 'en';
          }
        } catch (e) {
          // Se falhar, buscar do perfil
          const { data: profileData } = await supabase
            .from('profiles')
            .select('language')
            .eq('id', currentUserId)
            .single();
          userLang = profileData?.language || 'en';
        }

        // Preparar traduções antes do insert usando o idioma do usuário
        const translations = {
          en: { accepted: 'accepted', battleStarted: 'Battle started!' },
          pt: { accepted: 'aceitou', battleStarted: 'Batalha começou!' },
          es: { accepted: 'aceptó', battleStarted: '¡Batalla comenzada!' }
        };
        const texts = translations[userLang] || translations.en;
        const chatMessage = `⚔️ ${currentUsername} ${texts.accepted} ${invite.fromUsername}. ${texts.battleStarted}`;

        // Inserir mensagem system no chat
        await supabase.from("chat_messages").insert({
          user_id: currentUserId,
          username: currentUsername,
          avatar: null,
          message: chatMessage,
          type: "system",
          meta: {
            match_id: invite.id,
            from_user: invite.fromUserId,
            to_user: currentUserId,
          } || {},
        });

        // Salvar match_id e modo no localStorage
        localStorage.setItem("thor_match_id", invite.id);
        localStorage.setItem("thor_match_opponent_name", invite.fromUsername);
        localStorage.setItem("thor_match_opponent_id", invite.fromUserId);
        localStorage.setItem("thor_match_source", "multiplayer");
        localStorage.setItem("thor_selected_mode", "multiplayer");

        // Ir para seleção de naves antes do jogo
        router.push(`/select-ships?match=${invite.id}`);
        setInvite(null);
      }
    } catch (err) {
      console.error("Exception accepting invite:", err);
      alert("Failed to accept challenge");
    } finally {
      setProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (!invite || processing) return;
    setProcessing(true);

    try {
      if (!invite.isFake) {
        // Atualizar match como cancelled
        await supabase
          .from("matches")
          .update({
            state: "cancelled",
          })
          .eq("id", invite.id);
      }

      setInvite(null);
    } catch (err) {
      console.error("Exception declining invite:", err);
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!invite || processing) return;
    setProcessing(true);

    try {
      // Atualizar match como cancelled
      await supabase
        .from("matches")
        .update({
          state: "cancelled",
        })
        .eq("id", invite.id);

      setInvite(null);
    } catch (err) {
      console.error("Exception cancelling invite:", err);
    } finally {
      setProcessing(false);
    }
  };

  // Método exposto para simular convite fake
  const receiveFakeInvite = (fromUserId, fromUsername) => {
    setInvite({
      id: null,
      fromUserId,
      fromUsername,
      isFake: true,
    });
  };

  // Método para receber convite real
  const receiveInvite = ({ matchId, fromUserId, fromUsername }) => {
    setInvite({
      id: matchId,
      fromUserId,
      fromUsername,
      isFake: false,
    });
  };

  // Método para mostrar mensagem informativa
  const showInfo = (message) => {
    setInvite({
      id: null,
      fromUserId: null,
      fromUsername: null,
      message,
      type: "info",
      isFake: true,
    });
    // Auto-fechar após 3 segundos
    setTimeout(() => {
      setInvite(null);
    }, 3000);
  };

  // Método para mostrar mensagem de envio
  const showSent = (message) => {
    setInvite({
      id: null,
      fromUserId: null,
      fromUsername: null,
      message,
      type: "sent",
      isFake: true,
    });
    // Auto-fechar após 2 segundos
    setTimeout(() => {
      setInvite(null);
    }, 2000);
  };

  // Método para mostrar convite pending (já enviado/recebido)
  const showPendingInvite = ({ matchId, otherUserId, otherUsername, direction }) => {
    const message = direction === "received"
      ? `${t('multiplayer.youHavePendingFrom')} ${otherUsername}`
      : `${t('multiplayer.youAlreadySentTo')} ${otherUsername}`;
    
    setInvite({
      id: matchId,
      fromUserId: otherUserId,
      fromUsername: otherUsername,
      message,
      type: "pending",
      direction,
      isFake: false,
    });
  };

  // Expor métodos via ref
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.__invitePopup = { 
        receiveFakeInvite, 
        receiveInvite,
        showInfo,
        showSent,
        showPendingInvite,
        clearInvite: () => setInvite(null), // fecha o popup de "aguardando" quando oponente recusa
      };
    }
  }, []);

  if (!invite) return null;

  // Render para mensagens info/sent
  if (invite.type === "info" || invite.type === "sent") {
    return (
      <div style={overlayStyle}>
        <div style={popupStyle}>
          <div style={headerStyle}>
            <h3 style={{ margin: 0, fontSize: 18, color: invite.type === "sent" ? "#00FF88" : "#00E5FF", fontFamily: "'Orbitron', sans-serif" }}>
              {invite.type === "sent" ? t('multiplayer.challengeSent') : t('multiplayer.info')}
            </h3>
          </div>

          <div style={bodyStyle}>
            <p style={{ margin: 0, fontSize: 16, color: "#FFF" }}>
              {invite.message}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Render para convite pending (já enviado, aguardando resposta)
  if (invite.type === "pending") {
    const isReceived = invite.direction === "received";
    
    return (
      <div style={overlayStyle}>
        <div style={popupStyle}>
          <div style={headerStyle}>
            <h3 style={{ margin: 0, fontSize: 18, color: isReceived ? "#00E5FF" : "#FFB84D", fontFamily: "'Orbitron', sans-serif" }}>
              {isReceived ? t('multiplayer.challengeReceivedPending') : t('multiplayer.challengePending')}
            </h3>
          </div>

          <div style={bodyStyle}>
            <p style={{ margin: 0, fontSize: 16, color: "#FFF" }}>
              {invite.message}
            </p>
            {!isReceived && (
              <p style={{ margin: "12px 0 0 0", fontSize: 14, color: "#AAA" }}>
                {t('multiplayer.waitingResponse')}
              </p>
            )}
          </div>

          <div style={actionsStyle}>
            {isReceived ? (
              <>
                <button
                  onClick={handleDecline}
                  disabled={processing}
                  style={{
                    ...buttonStyle,
                    background: "rgba(255, 255, 255, 0.1)",
                    color: "#FFF",
                    opacity: processing ? 0.5 : 1,
                  }}
                >
                  {t('multiplayer.decline')}
                </button>
                <button
                  onClick={handleAccept}
                  disabled={processing}
                  style={{
                    ...buttonStyle,
                    background: "linear-gradient(135deg, #00D4FF 0%, #0099FF 100%)",
                    color: "#FFF",
                    opacity: processing ? 0.5 : 1,
                  }}
                >
                  {t('multiplayer.accept')}
                </button>
              </>
            ) : (
              <button
                onClick={handleCancel}
                disabled={processing}
                style={{
                  ...buttonStyle,
                  background: "rgba(255, 80, 80, 0.2)",
                  color: "#FF5050",
                  opacity: processing ? 0.5 : 1,
                }}
              >
                {t('multiplayer.cancelChallenge')}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Render para convites normais
  return (
    <div style={overlayStyle}>
      <div style={popupStyle}>
        <div style={headerStyle}>
          <h3 style={{ margin: 0, fontSize: 18, color: "#00E5FF", fontFamily: "'Orbitron', sans-serif" }}>
            {t('multiplayer.challengeReceived')}
          </h3>
          <div style={timerStyle}>{timeLeft}s</div>
        </div>

        <div style={bodyStyle}>
          <p style={{ margin: 0, fontSize: 16, color: "#FFF" }}>
            <strong>{invite.fromUsername || "Player"}</strong> {t('multiplayer.challengedYou')}
          </p>
        </div>

        <div style={actionsStyle}>
          <button
            onClick={handleDecline}
            disabled={processing}
            style={{
              ...buttonStyle,
              background: "rgba(255, 255, 255, 0.1)",
              color: "#FFF",
              opacity: processing ? 0.5 : 1,
            }}
          >
            {t('multiplayer.decline')}
          </button>
          <button
            onClick={handleAccept}
            disabled={processing}
            style={{
              ...buttonStyle,
              background: "linear-gradient(90deg, #00E5FF, #0072FF)",
              color: "#001018",
              opacity: processing ? 0.5 : 1,
            }}
          >
            {processing ? t('multiplayer.processing') : t('multiplayer.accept')}
          </button>
        </div>
      </div>
    </div>
  );
}

// Styles
const overlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  background: "rgba(0, 0, 0, 0.7)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 99999,
  backdropFilter: "blur(4px)",
};

const popupStyle = {
  width: "90%",
  maxWidth: 400,
  background: "linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)",
  border: "2px solid #00E5FF",
  borderRadius: 16,
  boxShadow: "0 0 40px rgba(0, 229, 255, 0.3)",
  overflow: "hidden",
  animation: "slideIn 0.3s ease-out",
};

const headerStyle = {
  padding: "20px 24px",
  background: "rgba(0, 229, 255, 0.1)",
  borderBottom: "1px solid rgba(0, 229, 255, 0.3)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const timerStyle = {
  fontSize: 14,
  fontWeight: 700,
  color: "#FFD700",
  background: "rgba(255, 215, 0, 0.1)",
  padding: "4px 12px",
  borderRadius: 8,
  border: "1px solid rgba(255, 215, 0, 0.3)",
};

const bodyStyle = {
  padding: "24px",
  textAlign: "center",
};

const actionsStyle = {
  padding: "0 24px 24px 24px",
  display: "flex",
  gap: 12,
};

const buttonStyle = {
  flex: 1,
  padding: "12px 24px",
  fontSize: 14,
  fontWeight: 700,
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  transition: "transform 0.2s, opacity 0.2s",
  fontFamily: "'Orbitron',sans-serif",
};
