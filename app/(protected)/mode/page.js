"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/src/hooks/useI18n";


export default function ModePage() {
    const [showWelcomeModal, setShowWelcomeModal] = useState(false);
    
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
        const showWelcome = localStorage.getItem("thor_show_welcome");
        if (showWelcome === "1") {
          setShowWelcomeModal(true);
        }
      };
      
      window.addEventListener("thor_open_welcome", handleOpenWelcome);
      
      // Se não houver daily XP (usuário já reclamou hoje), abrir welcome imediatamente
      setTimeout(() => {
        const showWelcome = localStorage.getItem("thor_show_welcome");
        if (showWelcome === "1" && !showWelcomeModal) {
          setShowWelcomeModal(true);
        }
      }, 1000);
      
      return () => window.removeEventListener("thor_open_welcome", handleOpenWelcome);
    }, [showWelcomeModal]);
    
    const handleCloseWelcome = () => {
      setShowWelcomeModal(false);
      localStorage.removeItem("thor_show_welcome");
    };
  const router = useRouter();
  const { t } = useI18n();

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const session = data?.session;

      if (!session) {
        router.replace("/login");
        return;
      }

      const username = localStorage.getItem("thor_username");
      if (!username) {
        router.replace("/username");
        return;
      }
    })();
  }, [router]);

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&display=swap" rel="stylesheet" />
      
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
      
      {/* �🌌 FUNDO DA GALÁXIA */}
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
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
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
          style={{
            fontFamily: "'Orbitron',sans-serif",
            fontWeight: 700,
            color: "#0ff",
            fontSize: 32,
            textShadow: "0 0 16px #0ff9",
            marginBottom: 50,
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
          <button id="practiceBtn" className="mode-btn" disabled>
            {t('mode.practice')}
          </button>

          <button
            id="multiplayerBtn"
            className="mode-btn"
            onClick={() => {
              router.push("/multiplayer");
            }}
          >
            {t('mode.multiplayer')}
          </button>

          <button id="campaignBtn" className="mode-btn" disabled>
            {t('mode.campaign')}
          </button>
        </div>
      </div>
    </>
  );
}
