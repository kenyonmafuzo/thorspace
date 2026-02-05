
import RankBadge from "./RankBadge";
import React from "react";
import { getLevelProgressFromTotalXp } from "@/lib/xpSystem";

export default function TierInfo({ totalXp }) {
  const progress = getLevelProgressFromTotalXp(totalXp);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
      <RankBadge totalXp={progress.totalXp} size={150} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
        <div style={{ fontWeight: 800, fontSize: 18, color: '#FFD700', textShadow: '0 2px 8px #000', fontFamily: "'Orbitron', sans-serif", textAlign: 'left' }}>{progress.level} - {progress.tier} - {progress.material}</div>
        <div style={{ fontSize: 15, color: '#00E5FF', fontWeight: 700, textShadow: '0 2px 8px #000', fontFamily: 'Orbitron,sans-serif' }}>
          XP: {progress.totalXp?.toLocaleString('pt-BR') ?? '\u2014'}
        </div>
        <div style={{ fontSize: 13, color: '#aaa', marginTop: 2 }}>
          Progresso: {progress.xp} / {progress.xpToNext}
        </div>
        <div style={{ width: 120, height: 7, background: 'rgba(255,255,255,0.18)', borderRadius: 999, marginTop: 4, overflow: 'hidden' }}>
          <div style={{ width: `${progress.progressPercent}%`, height: '100%', background: '#4ade80', transition: 'width 0.25s ease' }} />
        </div>
        <div style={{ fontSize: 11, color: '#9aa', marginTop: 2 }}>{progress.progressPercent}%</div>
      </div>
    </div>
  );
}
