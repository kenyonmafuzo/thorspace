export const dailyLoginI18n = {
  pt: {
    streak1_title: "Dia 1! Bônus diário recebido!",
    streak1_body: "Você ganhou 20 XP por fazer login hoje.",
    streak2_title: "Dia 2! Boa sequência!",
    streak2_body: "Você ganhou 30 XP por voltar ao jogo.",
    streak3_title: "Dia 3! Ritmo mantido!",
    streak3_body: "Você ganhou 40 XP por logar três dias seguidos.",
    streak4_title: "Dia 4! Sequência em evolução!",
    streak4_body: "Você ganhou 50 XP por manter seu login diário.",
    streak5_title: "Dia 5! Constância recompensada!",
    streak5_body: "Você ganhou 60 XP por continuar sua sequência.",
    streak6_title: "Dia 6! Quase no máximo!",
    streak6_body: "Você ganhou 80 XP por manter sua sequência ativa.",
    streak7_title: "Dia 7! Sequência perfeita!",
    streak7_body: "Você ganhou 100 XP por completar 7 dias consecutivos de login.",
  },
  en: {
    streak1_title: "Day 1! Daily bonus received!",
    streak1_body: "You earned 20 XP for logging in today.",
    streak2_title: "Day 2! Nice streak!",
    streak2_body: "You earned 30 XP for returning to the game.",
    streak3_title: "Day 3! Keeping the pace!",
    streak3_body: "You earned 40 XP for logging in three days in a row.",
    streak4_title: "Day 4! Streak evolving!",
    streak4_body: "You earned 50 XP for keeping your daily login streak.",
    streak5_title: "Day 5! Consistency rewarded!",
    streak5_body: "You earned 60 XP for continuing your streak.",
    streak6_title: "Day 6! Almost max!",
    streak6_body: "You earned 80 XP for keeping your streak active.",
    streak7_title: "Day 7! Perfect streak!",
    streak7_body: "You earned 100 XP for completing 7 consecutive days of login.",
  },
  es: {
    streak1_title: "¡Día 1! ¡Bono diario recibido!",
    streak1_body: "Ganaste 20 XP por iniciar sesión hoy.",
    streak2_title: "¡Día 2! ¡Buena racha!",
    streak2_body: "Ganaste 30 XP por volver al juego.",
    streak3_title: "¡Día 3! ¡Ritmo mantenido!",
    streak3_body: "Ganaste 40 XP por iniciar sesión tres días seguidos.",
    streak4_title: "¡Día 4! ¡Racha en evolución!",
    streak4_body: "Ganaste 50 XP por mantener tu inicio de sesión diario.",
    streak5_title: "¡Día 5! ¡Constancia recompensada!",
    streak5_body: "Ganaste 60 XP por continuar tu racha.",
    streak6_title: "¡Día 6! ¡Casi al máximo!",
    streak6_body: "Ganaste 80 XP por mantener tu racha activa.",
    streak7_title: "¡Día 7! ¡Racha perfecta!",
    streak7_body: "Ganaste 100 XP por completar 7 días consecutivos de inicio de sesión.",
  },
};

export function getDailyLoginText(key: string, lang: string, vars: Record<string, any> = {}) {
  const dict = dailyLoginI18n[lang] || dailyLoginI18n['en'];
  let text = dict[key] || key;
  Object.entries(vars).forEach(([k, v]) => {
    text = text.replaceAll(`{${k}}`, String(v));
  });
  return text;
}
