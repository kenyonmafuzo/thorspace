"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import UserHeader from "@/app/components/UserHeader";
import { supabase } from "@/lib/supabase";
import { BADGES_CONFIG, checkUnlockedBadges } from "@/lib/badgesSystem";
import { getLevelProgressFromTotalXp } from "@/lib/xpSystem";
import { useI18n } from "@/src/hooks/useI18n";

// Modal de zoom da badge
function BadgeZoomModal({ badge, onClose }) {
  const { t } = useI18n();
  
  return (
    <div
      onClick={onClose}
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
        animation: 'fadeIn 0.3s ease',
        cursor: 'pointer'
      }}
    >
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes zoomIn {
          from { 
            transform: scale(0.5);
            opacity: 0;
          }
          to { 
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'rgba(20,255,255,0.1)',
          border: '2px solid rgba(20,255,255,0.4)',
          borderRadius: 24,
          padding: 40,
          textAlign: 'center',
          maxWidth: 500,
          animation: 'zoomIn 0.3s ease'
        }}
      >
        <div style={{
          width: 250,
          height: 250,
          borderRadius: '50%',
          background: 'rgb(0 0 0 / 43%)',
          border: '2px solid rgba(20,255,255,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
          overflow: 'hidden'
        }}>
          <img 
            src={badge.icon} 
            alt={badge.title}
            style={{ width: '80%', height: '80%', objectFit: 'contain' }}
          />
        </div>
        <h2 style={{ 
          fontSize: 28, 
          fontWeight: 700, 
          marginBottom: 12,
          color: '#14ffff',
          fontFamily: "'Orbitron', sans-serif"
        }}>
          {t(`badges.list.${badge.id}.title`)}
        </h2>
        <p style={{
          fontSize: 16,
          color: 'rgba(255,255,255,0.8)',
          lineHeight: 1.6
        }}>
          {t(`badges.list.${badge.id}.description`)}
        </p>
      </div>
    </div>
  );
}

export default function BadgesPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [badgesByCategory, setBadgesByCategory] = useState({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const session = data?.session;
      if (!session) {
        router.replace("/login");
        return;
      }

      // Buscar dados do usuário
      const userId = session.user.id;
      
      const [profileRes, statsRes, progressRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).single(),
        supabase.from("player_stats").select("*").eq("user_id", userId).single(),
        supabase.from("player_progress").select("*").eq("user_id", userId).single()
      ]);

      const profile = profileRes.data || {};
      const stats = statsRes.data || {};
      const progress = progressRes.data || {};
      
      const totalXp = progress.total_xp || 0;
      const levelInfo = getLevelProgressFromTotalXp(totalXp);

      // Dados consolidados do usuário
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

      setUserData(user);

      // Organizar badges por categoria
      const organized = {};
      Object.entries(BADGES_CONFIG).forEach(([categoryId, category]) => {
        organized[categoryId] = {
          ...category,
          badges: category.badges.map(badge => ({
            ...badge,
            unlocked: badge.checkUnlocked(user),
            hasInProfile: user.badges.includes(badge.id)
          }))
        };
      });

      setBadgesByCategory(organized);
      setLoading(false);
    })();
  }, [router]);

  if (loading) {
    return <div style={{ color: "#FFF", minHeight: "100vh", background: "#000010" }}><div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 0, backgroundImage: "url('/game/images/galaxiaintro.png'), radial-gradient(ellipse at bottom, #01030a 0%, #000016 40%, #000000 100%)", backgroundSize: "cover, cover", backgroundRepeat: "no-repeat, no-repeat", backgroundPosition: "center center, center center", opacity: 0.35, pointerEvents: "none", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }} />{t('badges.loading')}</div>;
  }

  return (
    <div style={{ color: "#FFF", minHeight: "100vh", padding: "40px 20px", background: "#000010" }}>
      <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 0, backgroundImage: "url('/game/images/galaxiaintro.png'), radial-gradient(ellipse at bottom, #01030a 0%, #000016 40%, #000000 100%)", backgroundSize: "cover, cover", backgroundRepeat: "no-repeat, no-repeat", backgroundPosition: "center center, center center", opacity: 0.35, pointerEvents: "none", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }} />
      <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;800&display=swap" rel="stylesheet" />
      <div style={{ position: "fixed", top: 12, right: 12, zIndex: 10 }}>
        <UserHeader />
      </div>

      <main style={{ maxWidth: 1200, margin: "80px auto 0", position: "relative", zIndex: 1 }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start",
          gap: 16,
          padding: "0 0 24px 0",
          width: "100%",
          margin: 0,
          position: "relative",
          zIndex: 1,
        }}>
          <h2 style={{
            margin: 0,
            fontSize: 28,
            fontWeight: 800,
            color: "#00E5FF",
            fontFamily: "'Orbitron',sans-serif",
            letterSpacing: 1,
          }}>{t('badges.title')}</h2>
        </div>

        {Object.entries(badgesByCategory).map(([categoryId, category]) => (
          <div key={categoryId} style={{ marginBottom: 60 }}>
            <h2 style={{ 
              fontSize: 24, 
              fontWeight: 600, 
              marginBottom: 8,
              color: '#14ffff',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              fontFamily: "'Orbitron', sans-serif"
            }}>
              {t(`badges.categories.${categoryId}`)}
            </h2>
            <p style={{ 
              fontSize: 14, 
              color: 'rgba(255,255,255,0.5)', 
              marginBottom: 24 
            }}>
              {t(`badges.categoryDesc.${categoryId}`)}
            </p>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 20
            }}>
              {category.badges.map(badge => (
                <BadgeCard 
                  key={badge.id} 
                  badge={badge}
                />
              ))}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}

function BadgeCard({ badge }) {
  const { t } = useI18n();
  const isLocked = !badge.unlocked;
  const [showZoom, setShowZoom] = useState(false);

  return (
    <>
      {showZoom && badge.unlocked && (
        <BadgeZoomModal badge={badge} onClose={() => setShowZoom(false)} />
      )}
      
      <div style={{
        background: isLocked ? 'rgba(255,255,255,0.02)' : 'rgba(20,255,255,0.05)',
        border: isLocked ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(20,255,255,0.3)',
        borderRadius: 12,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        position: 'relative',
        opacity: isLocked ? 0.5 : 1,
        transition: 'all 0.3s ease'
      }}>
        {/* Ícone da Badge */}
        <div 
          onClick={() => badge.unlocked && setShowZoom(true)}
          style={{
            width: 110,
            height: 110,
            borderRadius: '50%',
            background: 'rgb(0 0 0 / 43%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
            border: '1px solid rgba(20, 255, 255, 0.4)',
            position: 'relative',
            overflow: 'hidden',
            cursor: badge.unlocked ? 'pointer' : 'default',
            transition: 'transform 0.3s ease, box-shadow 0.3s ease'
          }}
          onMouseEnter={(e) => {
            if (badge.unlocked) {
              e.currentTarget.style.transform = 'scale(1.1)';
              e.currentTarget.style.boxShadow = '0 0 20px rgba(20, 255, 255, 0.6)';
            }
          }}
          onMouseLeave={(e) => {
            if (badge.unlocked) {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = 'none';
            }
          }}
        >
          {badge.unlocked ? (
            <img 
              src={badge.icon} 
              alt={badge.title}
              style={{ 
                width: '80%', 
                height: '80%', 
                objectFit: 'contain'
              }}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.parentElement.innerHTML = '<span style="font-size: 32px">🏆</span>';
              }}
            />
          ) : (
            <div style={{ fontSize: 40, filter: 'grayscale(1)' }}>🔒</div>
          )}
        </div>

        {/* Título */}
        <h3 style={{
          fontSize: 18,
          fontWeight: 600,
          marginBottom: 8,
          color: isLocked ? 'rgba(255,255,255,0.4)' : '#14ffff',
          fontFamily: "'Orbitron', sans-serif"
        }}>
          {t(`badges.list.${badge.id}.title`)}
        </h3>

        {/* Descrição ou Requisito */}
        <p style={{
          fontSize: 13,
          color: 'rgba(255,255,255,0.6)',
          lineHeight: 1.5,
          marginBottom: 0
        }}>
          {badge.unlocked ? t(`badges.list.${badge.id}.description`) : t(`badges.list.${badge.id}.requirement`)}
        </p>

        {/* Badge de Status */}
        {badge.unlocked && (
          <div style={{
            position: 'absolute',
            top: 12,
            right: 12,
            background: 'rgba(20,255,255,0.2)',
            color: '#14ffff',
            padding: '4px 8px',
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            fontFamily: "'Orbitron', sans-serif"
          }}>
            {t('badges.unlocked')}
          </div>
        )}
      </div>
    </>
  );
}
