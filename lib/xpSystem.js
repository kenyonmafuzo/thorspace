// Central AAA: retorna todos os dados de progresso a partir do totalXp
export function getLevelProgressFromTotalXp(totalXp = 0) {
  const xp = Number(totalXp || 0);
  // Level: 1000 XP por level, mínimo 1
  const level = Math.max(1, Math.floor(xp / 1000) + 1);
  const xpInLevel = xp % 1000;
  const xpToNext = 1000;
  // Tier
  let tier = "Rookie";
  if (xp < 5000) tier = "Rookie";
  else if (xp < 15000) tier = "Veteran";
  else if (xp < 30000) tier = "Elite";
  else if (xp < 60000) tier = "Master";
  else if (xp < 100000) tier = "Legendary";
  else tier = "Grandmaster";
  // Material (Bronze/Silver/Gold)
  const progress01 = xpInLevel / xpToNext;
  let material = "Bronze";
  if (progress01 < 0.34) material = "Bronze";
  else if (progress01 < 0.67) material = "Silver";
  else material = "Gold";
  const progressPercent = Math.round(progress01 * 100);
  return {
    level,
    xp: xpInLevel,
    xpToNext,
    tier,
    material,
    progress01,
    progressPercent,
    totalXp: xp,
  };
}
// /lib/xpSystem.js
// Utilitários do sistema de XP / Rank

export function getLevelFromTotalXp(totalXp = 0) {
  const xp = Number(totalXp || 0);
  // regra simples: 1000 XP = 1 nível (mínimo 1)
  return Math.max(1, Math.floor(xp / 1000) + 1);
}

export function formatRankDisplay({ tier, level, xp } = {}) {
  // Ex: "Rookie • Lv 3" ou "Veteran • Lv 12"
  const t = tier || "Rookie";
  const lv = level ?? getLevelFromTotalXp(xp ?? 0);
  return `${t} • Lv ${lv}`;
}

/**
 * Retorna o CAMINHO do asset/ícone do rank (para <img src="...">).
 * Compatível com:
 * - getRankAssetKey({ tier, xp, subTier })
 * - getRankAssetKey("rookie", "bronze")
 *
 * Espera arquivos em: /public/images/ranks/
 * Ex: /public/images/ranks/rookie_bronze.png
 */
export function getRankAssetKey(tierOrObj = {}, subTierArg) {
  let tier = "";
  let subTier = "";
  let xp = 0;

  if (typeof tierOrObj === "string") {
    tier = tierOrObj;
    subTier = subTierArg || "";
  } else {
    tier = tierOrObj?.tier || "";
    subTier = tierOrObj?.subTier || "";
    xp = Number(tierOrObj?.xp || 0);
  }

  const t = String(tier || "").toLowerCase().trim();

  // fallback por faixas (mantém sua lógica original)
  let inferredTier = t;
  if (!inferredTier) {
    if (xp < 5000) inferredTier = "rookie";
    else if (xp < 15000) inferredTier = "veteran";
    else if (xp < 30000) inferredTier = "elite";
    else if (xp < 60000) inferredTier = "master";
    else inferredTier = "legendary";
  }

  const s = String(subTier || "").toLowerCase().trim();
  const finalSubTier = s || "bronze";

  return `/images/ranks/${inferredTier}/${inferredTier}_${finalSubTier}.png`;

}
