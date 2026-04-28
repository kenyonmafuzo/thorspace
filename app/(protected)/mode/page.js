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
          setAdminModals(unseen.map(n => {
            const tr = n.meta?.translations?.[lang];
            return { ...n, title: tr?.title || n.title, body: tr?.body || n.body };
          }));
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

        /* ── Home card grid ── */
        .home-grid {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0px;
        }
        .home-row {
          display: flex;
          gap: 20px;
          justify-content: center;
          align-items: flex-end;
        }
        .home-row-top { gap: 0px; }

        /* Primary cards (row 1) */
        .home-card {
          position: relative;
          width: 270px;
          height: 277px;
          cursor: pointer;
          border-radius: 16px;
          overflow: visible;
          user-select: none;
          transition: transform 0.22s cubic-bezier(.22,.68,0,1.4), filter 0.22s;
        }
        .home-card:hover { transform: translateY(-6px) scale(1.03); filter: brightness(1.08); }
        .home-card.disabled { cursor: default; opacity: 0.6; pointer-events: none; }
        .home-card.disabled:hover { transform: none; filter: none; }

        .home-card-bg {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          border-radius: 16px;
          /* bg is absolutely positioned so the card itself can clip it */
          position: absolute;
          inset: 0;
          z-index: 0;
        }
        .home-card-img {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          object-fit: contain;
          object-position: center;
          pointer-events: none;
          z-index: 2;
          transition: transform 0.32s cubic-bezier(.22,.68,0,1.4);
        }
        .home-card:hover .home-card-img {
          transform: translateX(-50%) translateY(-8px) scale(1.06);
        }
        .home-card-label {
          position: absolute;
          bottom: 71px;
          left: 0; right: 0;
          z-index: 3;
          text-align: center;
          font-family: 'Orbitron', sans-serif;
          font-weight: 700;
          font-size: 13px;
          letter-spacing: 2.5px;
          text-shadow: 0 0 14px currentColor, 0 2px 8px #000c;
          text-transform: uppercase;
        }

        /* Secondary cards (row 2) */
        .home-subcard {
          position: relative;
          width: 140px;
          cursor: pointer;
          border-radius: 14px;
          overflow: hidden;
          user-select: none;
          transition: transform 0.22s cubic-bezier(.22,.68,0,1.4), filter 0.22s;
        }
        .home-subcard:hover { transform: translateY(-5px) scale(1.04); filter: brightness(1.1); }

        .home-subcard-img {
          display: block;
          width: 100%;
          border-radius: 14px;
        }
        .home-subcard-label {
          position: absolute;
          bottom: 12px;
          left: 0; right: 0;
          z-index: 3;
          text-align: center;
          font-family: 'Orbitron', sans-serif;
          font-weight: 700;
          font-size: 9px;
          letter-spacing: 1.5px;
          text-shadow: 0 0 10px currentColor, 0 2px 6px #000c;
          text-transform: uppercase;
        }

        @media (max-width: 900px) {
          .home-card { width: 210px; height: 216px; }
          .home-subcard { width: 112px; }
          .home-card-label { font-size: 12px; bottom: 50px; }
          .home-subcard-label { font-size: 10px; }
        }
        @media (max-width: 680px) {
          .home-row { gap: 10px; }
          .home-card { width: 160px; height: 164px; }
          .home-subcard { width: 90px; }
          .home-card-label { font-size: 10px; letter-spacing: 1.5px; bottom: 38px; }
        }
        /* iPhone e telas muito pequenas — evita corte lateral */
        @media (max-width: 480px) {
          .home-grid { padding: 0 8px; width: 100%; box-sizing: border-box; }
          .home-row { gap: 4px; width: 100%; justify-content: center; }
          .home-row-top { gap: 4px; }
          .home-card { width: calc((100vw - 40px) / 3); height: calc((100vw - 40px) / 3 * 1.03); }
          .home-subcard { width: calc((100vw - 40px) / 4); }
          .home-card-label { font-size: 9px; letter-spacing: 1px; bottom: calc((100vw - 40px) / 3 * 0.22); }
          .home-subcard-label { font-size: 8px; }
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
        style={{
          position: "fixed",
          top: 0, left: 0,
          width: "100vw", height: "100vh",
          zIndex: 0,
          backgroundImage: "url('/game/images/galaxiaintro.png'), radial-gradient(ellipse at bottom, #01030a 0%, #000016 40%, #000000 100%)",
          backgroundSize: "cover, cover",
          backgroundRepeat: "no-repeat, no-repeat",
          backgroundPosition: "center center, center center",
          opacity: 0.35,
          pointerEvents: "none",
        }}
      />

      {/* 🏠 HOME — grid de cards */}
      <div
        style={{
          position: "fixed",
          top: 58, left: 0,
          width: "100vw",
          height: "calc(100vh - 58px)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 2,
          overflow: "hidden",
        }}
      >
        <div className="home-grid">

          {/* ── Linha 1: Praticar, Multiplayer, Campanha ── */}
          <div className="home-row home-row-top">

            {/* PRATICAR */}
            <div
              className="home-card"
              role="button"
              tabIndex={0}
              onClick={() => {
                localStorage.setItem("thor_selected_mode", "practice");
                localStorage.removeItem("thor_match_id");
                router.push("/game");
              }}
              onKeyDown={e => e.key === "Enter" && (() => { localStorage.setItem("thor_selected_mode","practice"); localStorage.removeItem("thor_match_id"); router.push("/game"); })()}
            >
              <img className="home-card-bg" src="/game/images/menu/menu_praticar_card.png" alt="" draggable={false} />
              <img className="home-card-img" src="/game/images/menu/menu_praticar_img.png?v=2" alt="Praticar" draggable={false} style={{ top: '3%', left: '62%', width: '70%', height: '70%' }} />
              <span className="home-card-label" style={{ color: '#53b2f7' }}>{t('mode.practice')}</span>
            </div>

            {/* MULTIPLAYER */}
            <div
              className="home-card"
              role="button"
              tabIndex={0}
              onClick={() => {
                if (isGuest) { router.push("/login"); return; }
                router.push("/multiplayer");
              }}
              onKeyDown={e => e.key === "Enter" && (() => { if (isGuest) { router.push("/login"); return; } router.push("/multiplayer"); })()}
            >
              <img className="home-card-bg" src="/game/images/menu/menu_multiplayer_card.png" alt="" draggable={false} />
              <img className="home-card-img" src="/game/images/menu/menu_multiplayer_img.png" alt="Multiplayer" draggable={false} style={{ top: '-3%', width: '100%', height: '100%' }} />
              <span className="home-card-label" style={{ color: '#e2abde' }}>{t('mode.multiplayer')}</span>
            </div>

            {/* CAMPANHA — desativado */}
            <div className="home-card disabled" role="button" aria-disabled="true">
              <img className="home-card-bg" src="/game/images/menu/menu_campanha.png?v=3" alt="Campanha" draggable={false} />
              <span className="home-card-label" style={{ color: '#707070' }}>{t('mode.campaign')}</span>
            </div>
          </div>

          {/* ── Linha 2: Ranking, Badges, Amigos, VIP ── */}
          <div className="home-row">

            <div className="home-subcard" role="button" tabIndex={0}
              onClick={() => router.push("/ranking")}
              onKeyDown={e => e.key === "Enter" && router.push("/ranking")}
            >
              <img className="home-subcard-img" src="/game/images/menu/submenu_ranking.png" alt="Ranking" draggable={false} />
              <span className="home-subcard-label" style={{ color: '#a27326' }}>{t('mode.ranking')}</span>
            </div>

            <div className="home-subcard" role="button" tabIndex={0}
              onClick={() => router.push("/badges")}
              onKeyDown={e => e.key === "Enter" && router.push("/badges")}
            >
              <img className="home-subcard-img" src="/game/images/menu/submenu_badges.png" alt="Badges" draggable={false} />
              <span className="home-subcard-label" style={{ color: '#763db5' }}>{t('mode.badges')}</span>
            </div>

            <div className="home-subcard" role="button" tabIndex={0}
              onClick={() => router.push("/friends")}
              onKeyDown={e => e.key === "Enter" && router.push("/friends")}
            >
              <img className="home-subcard-img" src="/game/images/menu/submenu_amigos.png" alt="Amigos" draggable={false} />
              <span className="home-subcard-label" style={{ color: '#2c68a9' }}>{t('mode.friends')}</span>
            </div>

            <div className="home-subcard" role="button" tabIndex={0}
              onClick={() => router.push("/vip")}
              onKeyDown={e => e.key === "Enter" && router.push("/vip")}
            >
              <img className="home-subcard-img" src="/game/images/menu/submenu_vip.png?v=2" alt="VIP" draggable={false} />
              <span className="home-subcard-label" style={{ color: '#ecb756' }}>{t('mode.vip')}</span>
            </div>

          </div>
        </div>
      </div>
      </div> {/* end mode-desktop-content */}
    </>
  );
}
