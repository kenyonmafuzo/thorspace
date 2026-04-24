"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/src/hooks/useI18n";
import { useUserStats } from "@/app/components/stats/UserStatsProvider";
import { supabase } from "@/lib/supabase";
import { useGuest } from "@/src/hooks/useGuest";


export default function ModePage() {
    const [showWelcomeModal, setShowWelcomeModal] = useState(false);
    const [adminModals, setAdminModals] = useState([]); // queue of admin_news modal items
    const [adminModalIdx, setAdminModalIdx] = useState(0);
    const { userId, isLoading: statsLoading } = useUserStats();
    const { isGuest } = useGuest();
    const router = useRouter();
    const { t, lang } = useI18n();
    
    // Reload automático após signup, só na primeira visita
    useEffect(() => {
      if (typeof window !== "undefined") {
        const needsReload = localStorage.getItem("thor_needs_reload");
        if (needsReload === "1") {
          localStorage.removeItem("thor_needs_reload");
          localStorage.setItem("thor_show_welcome", "1");
          window.location.reload();
          return;
        }
        
        // NÃO mostrar welcome modal imediatamente - esperar evento após daily XP fechar
        // Isso garante sequência: Daily XP → Welcome
      }
    }, []);
    
    // Listener para abrir welcome modal após daily XP fechar
    useEffect(() => {
      const handleOpenWelcome = () => {
        console.log('[Mode] Evento thor_open_welcome recebido');
        const showWelcome = localStorage.getItem("thor_show_welcome");
        console.log('[Mode] showWelcome flag:', showWelcome);
        if (showWelcome === "1") {
          console.log('[Mode] Abrindo welcome modal...');
          setShowWelcomeModal(true);
        }
      };
      
      window.addEventListener("thor_open_welcome", handleOpenWelcome);
      
      // Fallback: Se daily XP não disparar evento (já foi mostrado hoje), 
      // abrir welcome após 2s
      const fallbackTimer = setTimeout(() => {
        const showWelcome = localStorage.getItem("thor_show_welcome");
        console.log('[Mode] Fallback timer (2s) - showWelcome:', showWelcome, 'showWelcomeModal:', showWelcomeModal);
        if (showWelcome === "1" && !showWelcomeModal) {
          console.log('[Mode] Abrindo welcome modal via fallback (daily XP não mostrado)...');
          setShowWelcomeModal(true);
        }
      }, 2000);
      
      return () => {
        window.removeEventListener("thor_open_welcome", handleOpenWelcome);
        clearTimeout(fallbackTimer);
      };
    }, [showWelcomeModal]);
    
    const handleCloseWelcome = () => {
      setShowWelcomeModal(false);
      localStorage.removeItem("thor_show_welcome");
      // Show first admin modal (if any) right after welcome
      setAdminModalIdx(0);
    };

    // Load admin_news login modals on mount
    useEffect(() => {
      if (typeof window === "undefined") return;
      const seenRaw = localStorage.getItem("thor_seen_news") || "[]";
      let seen = [];
      try { seen = JSON.parse(seenRaw); } catch {}
      fetch(`/api/news?delivery=modal&lang=${lang}`)
        .then(r => r.json())
        .then(({ news }) => {
          const unseen = (news || []).filter(n => !seen.includes(n.id));
          setAdminModals(unseen);
        })
        .catch(() => {});
    }, [lang]);

    // Load DM inbox items that should show as modal (admin_message with show_as_login_modal in meta)
    useEffect(() => {
      if (!userId) return;
      const seenRaw = localStorage.getItem("thor_seen_news") || "[]";
      let seen = [];
      try { seen = JSON.parse(seenRaw); } catch {}
      supabase
        .from("inbox")
        .select("id, title, content, meta")
        .eq("user_id", userId)
        .eq("type", "admin_message")
        .then(({ data }) => {
          const dmModals = (data || [])
            .filter(item => {
              const meta = typeof item.meta === "string" ? JSON.parse(item.meta) : (item.meta ?? {});
              return meta?.show_as_login_modal === true && !seen.includes(`dm_${item.id}`);
            })
            .map(item => ({ id: `dm_${item.id}`, title: item.title, body: item.content }));
          if (dmModals.length > 0) {
            setAdminModals(prev => [...prev, ...dmModals]);
          }
        })
        .catch(() => {});
    }, [userId]);

    const handleCloseAdminModal = () => {
      const current = adminModals[adminModalIdx];
      if (current) {
        // Mark as seen
        const seenRaw = localStorage.getItem("thor_seen_news") || "[]";
        let seen = [];
        try { seen = JSON.parse(seenRaw); } catch {}
        seen.push(current.id);
        localStorage.setItem("thor_seen_news", JSON.stringify(seen));
      }
      setAdminModalIdx(i => i + 1);
    };

    const currentAdminModal = !showWelcomeModal && adminModals[adminModalIdx] || null;

  // Auth guard via context — sem network call, instantâneo após hydration
  useEffect(() => {
    if (statsLoading) return;
    if (!userId && !isGuest) {
      router.replace("/login");
      return;
    }
    if (!isGuest) {
      const username = localStorage.getItem("thor_username");
      if (!username) {
        router.replace("/username");
      }
    }
  }, [userId, statsLoading, isGuest, router]);

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&display=swap" rel="stylesheet" />

      {/* Mobile-only: desktop required message */}
      <style>{`
        .mobile-only-notice { display: none; }
        .mode-desktop-content { display: block; }
        /* Scale down content on smaller desktops so nothing clips or crowds the header */
        @media (min-width: 769px) and (max-width: 1100px) {
          #modeSelectionScreen h2 { font-size: 22px !important; margin-bottom: 32px !important; }
          .mode-btn { width: 200px !important; font-size: 14px !important; padding: 10px 20px !important; }
        }
        @media (min-width: 769px) and (max-width: 900px) {
          #modeSelectionScreen h2 { font-size: 18px !important; margin-bottom: 24px !important; }
          .mode-btn { width: 180px !important; font-size: 13px !important; padding: 9px 16px !important; }
        }
        @media (max-width: 768px) {
          #modeTitle { font-size: 18px !important; margin-bottom: 28px !important; text-align: center !important; }
        }
      `}</style>


      <div className="mode-desktop-content">
      
      {/* � MODAL DE BOAS-VINDAS */}
      {showWelcomeModal && (
        <div
          onClick={handleCloseWelcome}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
            animation: 'fadeIn 0.3s ease',
            cursor: 'pointer'
          }}
        >
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes slideUp {
              from { 
                transform: translateY(30px);
                opacity: 0;
              }
              to { 
                transform: translateY(0);
                opacity: 1;
              }
            }
          `}</style>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'linear-gradient(135deg, rgba(0,229,255,0.15) 0%, rgba(0,114,255,0.10) 100%)',
              border: '2px solid rgba(0,229,255,0.4)',
              borderRadius: 16,
              padding: '32px',
              maxWidth: 600,
              width: '100%',
              animation: 'slideUp 0.4s ease',
              cursor: 'default',
              boxShadow: '0 8px 32px rgba(0,229,255,0.2)'
            }}
          >
            <div style={{
              fontSize: 28,
              fontWeight: 700,
              color: '#00E5FF',
              marginBottom: 20,
              fontFamily: "'Orbitron', sans-serif",
              textAlign: 'center',
              textShadow: '0 0 20px rgba(0,229,255,0.5)'
            }}>
              Bem-vindo(a) ao Thorspace!
            </div>
            
            <div style={{
              fontSize: 15,
              lineHeight: 1.2,
              color: 'rgba(255,255,255,0.9)',
              marginBottom: 24,
              whiteSpace: 'pre-line'
            }}>
              {`Thorspace é um jogo de batalhas espaciais por turnos, focado em estratégia.

Antes de cada partida, você escolhe 3 naves, cada uma com sua especialidade. A escolha certa depende da sua estratégia de jogo.

Durante a partida, o jogo acontece em turnos:

Primeiro você escolhe qual nave vai se mover, depois define para onde ela vai e onde irá mirar.
Repita esse processo até concluir as 3 jogadas do turno.

Você pode jogar contra o computador para treinar ou enfrentar outros jogadores no modo multiplayer.

Ganhe batalhas para acumular XP, subir de nível, conquistar badges e avançar no ranking.

Boas batalhas!`}
            </div>

            <button
              onClick={handleCloseWelcome}
              style={{
                width: '100%',
                padding: '12px 24px',
                background: 'linear-gradient(90deg, #00E5FF, #0072FF)',
                color: '#001018',
                border: 'none',
                borderRadius: 10,
                fontFamily: "'Orbitron', sans-serif",
                fontWeight: 700,
                fontSize: 16,
                cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(0,229,255,0.3)',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,229,255,0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,229,255,0.3)';
              }}
            >
              Começar
            </button>
          </div>
        </div>
      )}

      {/* ADMIN NEWS MODAL */}
      {currentAdminModal && (
        <div
          onClick={handleCloseAdminModal}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, padding: '20px', cursor: 'pointer',
            animation: 'fadeIn 0.3s ease'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'linear-gradient(135deg, rgba(99,102,241,0.18) 0%, rgba(0,114,255,0.10) 100%)',
              border: '2px solid rgba(99,102,241,0.5)',
              borderRadius: 16, padding: '32px', maxWidth: 600, width: '100%',
              animation: 'slideUp 0.4s ease', cursor: 'default',
              boxShadow: '0 8px 32px rgba(99,102,241,0.25)'
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>📢 Anúncio</div>
            <div style={{
              fontSize: 24, fontWeight: 700, color: '#e0e7ff', marginBottom: 16,
              fontFamily: "'Orbitron', sans-serif", textShadow: '0 0 20px rgba(99,102,241,0.5)'
            }}>
              {currentAdminModal.title}
            </div>
            <div style={{ fontSize: 15, lineHeight: 1.7, color: 'rgba(255,255,255,0.85)', marginBottom: 24, whiteSpace: 'pre-line' }}>
              {currentAdminModal.body}
            </div>
            <button
              onClick={handleCloseAdminModal}
              style={{
                width: '100%', padding: '12px 24px',
                background: 'linear-gradient(90deg, #6366f1, #818cf8)',
                color: '#fff', border: 'none', borderRadius: 10,
                fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: 16,
                cursor: 'pointer', boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              OK
            </button>
          </div>
        </div>
      )}
      
      {/* 🌌 FUNDO DA GALÁXIA */}
      <div
        id="galaxyBg"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          zIndex: 0,
          backgroundImage: "url('/game/images/galaxiaintro.png'), radial-gradient(ellipse at bottom, #01030a 0%, #000016 40%, #000000 100%)",
          backgroundSize: "cover, cover",
          backgroundRepeat: "no-repeat, no-repeat",
          backgroundPosition: "center center, center center",
          opacity: 0.35,
          pointerEvents: "none",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      />

      {/* 🎮 TELA DE MODOS */}
      <div
        id="modeSelectionScreen"
        style={{
          position: "fixed",
          top: 58,
          left: 0,
          width: "100vw",
          height: "calc(100vh - 58px)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "transparent",
          zIndex: 2,
          overflow: "hidden",
        }}
      >
        <h2
          id="modeTitle"
          style={{
            fontFamily: "'Orbitron',sans-serif",
            fontWeight: 700,
            color: "#0ff",
            fontSize: "clamp(18px, 5vw, 32px)",
            textShadow: "0 0 16px #0ff9",
            marginBottom: 50,
            textAlign: "center",
            width: "100%",
            padding: "0 24px",
            boxSizing: "border-box",
          }}
        >
          {t('mode.chooseMode')}
        </h2>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 20,
          }}
        >
          <button 
            id="practiceBtn" 
            className="mode-btn"
            onClick={() => {
              localStorage.setItem("thor_selected_mode", "practice");
              localStorage.removeItem("thor_match_id");
              router.push("/game");
            }}
          >
            {t('mode.practice')}
          </button>

          <button
            id="multiplayerBtn"
            className="mode-btn"
            onClick={() => {
              if (isGuest) {
                router.push("/login");
                return;
              }
              router.push("/multiplayer");
            }}
            title={isGuest ? "Crie sua conta para jogar multiplayer" : undefined}
          >
            {t('mode.multiplayer')}
          </button>

          <button id="campaignBtn" className="mode-btn" disabled>
            {t('mode.campaign')}
          </button>
        </div>
      </div>
      </div> {/* end mode-desktop-content */}
    </>
  );
}
