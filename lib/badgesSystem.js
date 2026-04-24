// Sistema de Badges - Configuração e Lógica

export const BADGE_CATEGORIES = {
  PROGRESSION: 'progression',
  VICTORIES: 'victories',
  ENGAGEMENT: 'engagement',
  SPECIAL: 'special'
};

export const BADGES_CONFIG = {
  [BADGE_CATEGORIES.PROGRESSION]: {
    title: 'PROGRESSÃO',
    description: 'Badges relacionadas à evolução do seu nível',
    badges: [
      {
        id: 'rookie_pilot',
        title: 'Rookie Pilot',
        description: 'Alcançou o nível 5 e deu os primeiros passos no campo de batalha.',
        requirement: 'Alcance o nível 5',
        icon: '/game/images/badges/badge_progress_rookie_pilot.png',
        checkUnlocked: (userData) => userData.level >= 5
      },
      {
        id: 'veteran_pilot',
        title: 'Veteran Pilot',
        description: 'Chegou ao nível 15 e provou que já domina os fundamentos da guerra espacial.',
        requirement: 'Alcance o nível 15',
        icon: '/game/images/badges/badge_progress_veteran_pilot.png',
        checkUnlocked: (userData) => userData.level >= 15
      },
      {
        id: 'elite_pilot',
        title: 'Elite Pilot',
        description: 'Alcançou o nível 30. Apenas pilotos de elite chegam até aqui.',
        requirement: 'Alcance o nível 30',
        icon: '/game/images/badges/badge_progress_elite_pilot.png',
        checkUnlocked: (userData) => userData.level >= 30
      }
    ]
  },
  
  [BADGE_CATEGORIES.VICTORIES]: {
    title: 'VITÓRIAS & COMBATE',
    description: 'Badges de conquistas em batalha',
    badges: [
      {
        id: 'first_blood',
        title: 'First Blood',
        description: 'Conquistou sua primeira vitória em uma batalha multiplayer.',
        requirement: 'Vença 1 partida multiplayer',
        icon: '/game/images/badges/badge_victory_first_blood.png',
        checkUnlocked: (userData) => userData.multiplayer_wins >= 1
      },
      {
        id: 'ace_commander',
        title: 'Ace Commander',
        description: 'Venceu 10 partidas multiplayer e mostrou liderança em combate.',
        requirement: 'Vença 10 partidas multiplayer',
        icon: '/game/images/badges/badge_victory_acecommander.png',
        checkUnlocked: (userData) => userData.multiplayer_wins >= 10
      },
      {
        id: 'unstoppable',
        title: 'Unstoppable',
        description: 'Alcançou uma sequência de 3 vitórias consecutivas sem ser derrotado.',
        requirement: 'Ganhe 3 vitórias consecutivas',
        icon: '/game/images/badges/badge_victory_unstoppable.png',
        checkUnlocked: (userData) => userData.max_win_streak >= 3
      },
      {
        id: 'duel_initiate',
        title: 'Duel Initiate',
        description: 'Enfrentou o mesmo adversário 3 vezes. Uma rivalidade começa a surgir.',
        requirement: 'Enfrente o mesmo adversário 3 vezes',
        icon: '/game/images/badges/badge_rivalidade_duelinitiate3.png',
        checkUnlocked: (userData) => (userData.max_matches_vs_same_opponent || 0) >= 3
      },
      {
        id: 'rival_forming',
        title: 'Rival Forming',
        description: 'Disputou 10 batalhas contra o mesmo oponente. O confronto já virou hábito.',
        requirement: 'Enfrente o mesmo adversário 10 vezes',
        icon: '/game/images/badges/badge_rivalidade_rivalforming10.png',
        checkUnlocked: (userData) => (userData.max_matches_vs_same_opponent || 0) >= 10
      },
      {
        id: 'rivalry_established',
        title: 'Rivalry Established',
        description: 'Enfrentou o mesmo adversário 50 vezes. Uma rivalidade consolidada.',
        requirement: 'Enfrente o mesmo adversário 50 vezes',
        icon: '/game/images/badges/badge_rivalidade_rivalryestablished50.png',
        checkUnlocked: (userData) => (userData.max_matches_vs_same_opponent || 0) >= 50
      },
      {
        id: 'eternal_rival',
        title: 'Eternal Rival',
        description: 'Disputou 100 batalhas contra o mesmo oponente. Uma rivalidade lendária.',
        requirement: 'Enfrente o mesmo adversário 100 vezes',
        icon: '/game/images/badges/badge_rivalidade_eternalrival100.png',
        checkUnlocked: (userData) => (userData.max_matches_vs_same_opponent || 0) >= 100
      },
      {
        id: 'first_dominance',
        title: 'First Dominance',
        description: 'Venceu o mesmo adversário 3 vezes. Primeiros sinais de superioridade.',
        requirement: 'Vença o mesmo adversário 3 vezes',
        icon: '/game/images/badges/badge_dominio_firstdominance3.png',
        checkUnlocked: (userData) => (userData.max_wins_vs_same_opponent || 0) >= 3
      },
      {
        id: 'tactical_advantage',
        title: 'Tactical Advantage',
        description: 'Conquistou 10 vitórias contra o mesmo oponente. Controle da disputa.',
        requirement: 'Vença o mesmo adversário 10 vezes',
        icon: '/game/images/badges/badge_dominio_tactical10.png',
        checkUnlocked: (userData) => (userData.max_wins_vs_same_opponent || 0) >= 10
      },
      {
        id: 'absolute_control',
        title: 'Absolute Control',
        description: 'Venceu 50 vezes o mesmo adversário. Domínio quase incontestável.',
        requirement: 'Vença o mesmo adversário 50 vezes',
        icon: '/game/images/badges/badge_dominio_absolutecontrol50.png',
        checkUnlocked: (userData) => (userData.max_wins_vs_same_opponent || 0) >= 50
      },
      {
        id: 'total_domination',
        title: 'Total Domination',
        description: 'Alcançou 100 vitórias contra o mesmo jogador. Supremacia absoluta.',
        requirement: 'Vença o mesmo adversário 100 vezes',
        icon: '/game/images/badges/badge_dominio_totaldomination100.png',
        checkUnlocked: (userData) => (userData.max_wins_vs_same_opponent || 0) >= 100
      }
    ]
  },
  
  [BADGE_CATEGORIES.ENGAGEMENT]: {
    title: 'ENGAJAMENTO',
    description: 'Badges de dedicação e consistência',
    badges: [
      {
        id: 'daily_recruit',
        title: 'Daily Recruit',
        description: 'Entrou no jogo em 3 dias diferentes. A jornada está apenas começando.',
        requirement: 'Entre no jogo em 3 dias diferentes',
        icon: '/game/images/badges/badge_engajamento_dailyrecruit.png',
        checkUnlocked: (userData) => userData.login_days >= 3
      },
      {
        id: 'daily_soldier',
        title: 'Daily Soldier',
        description: 'Entrou no jogo por 7 dias seguidos. Disciplina é o caminho da vitória.',
        requirement: 'Entre no jogo por 7 dias consecutivos',
        icon: '/game/images/badges/badge_engajamento_dailysoldier.png',
        checkUnlocked: (userData) => userData.login_streak >= 7
      }
    ]
  },
  
  [BADGE_CATEGORIES.SPECIAL]: {
    title: 'ESPECIAIS',
    description: 'Badges raras e únicas',
    badges: [
      {
        id: 'strategist',
        title: 'Strategist',
        description: 'Venceu usando 3 tipos diferentes de nave em partidas separadas.',
        requirement: 'Vença 3 partidas, cada uma com um tipo de nave diferente',
        icon: '/game/images/badges/badge_especial_strategist.png',
        checkUnlocked: (userData) => userData.has_diverse_victory === true
      },
      {
        id: 'iron_mind',
        title: 'Iron Mind',
        description: 'Virou o jogo e venceu uma batalha mesmo estando em desvantagem.',
        requirement: 'Vença uma partida estando em desvantagem',
        icon: '/game/images/badges/badge_especial_ironmind.png',
        checkUnlocked: (userData) => userData.has_comeback_victory === true
      }
    ]
  }
};

// Obter todas as badges em array plano
export function getAllBadges() {
  const allBadges = [];
  Object.values(BADGES_CONFIG).forEach(category => {
    category.badges.forEach(badge => {
      allBadges.push({
        ...badge,
        categoryId: Object.keys(BADGES_CONFIG).find(
          key => BADGES_CONFIG[key] === category
        )
      });
    });
  });
  return allBadges;
}

// Verificar badges desbloqueadas do usuário
export function checkUnlockedBadges(userData, userBadges = []) {
  const unlockedBadges = [];
  const allBadges = getAllBadges();
  
  allBadges.forEach(badge => {
    const isUnlocked = badge.checkUnlocked(userData);
    const alreadyHas = userBadges.includes(badge.id);
    
    if (isUnlocked) {
      unlockedBadges.push({
        ...badge,
        unlocked: true,
        newlyUnlocked: isUnlocked && !alreadyHas
      });
    }
  });
  
  return unlockedBadges;
}

// Obter badge por ID
export function getBadgeById(badgeId) {
  const allBadges = getAllBadges();
  return allBadges.find(b => b.id === badgeId);
}

// Verificar e conceder novas badges ao usuário
export async function checkAndGrantBadges(supabase, userId, userData) {
  try {
    // Buscar badges atuais do perfil
    const { data: profile } = await supabase
      .from("profiles")
      .select("badges")
      .eq("id", userId)
      .single();

    const currentBadges = profile?.badges || [];
    const allBadges = getAllBadges();
    const newlyUnlocked = [];

    // Verificar cada badge
    for (const badge of allBadges) {
      const isUnlocked = badge.checkUnlocked(userData);
      const alreadyHas = currentBadges.includes(badge.id);

      if (isUnlocked && !alreadyHas) {
        newlyUnlocked.push(badge);
      }
    }

    // Se houver novas badges, atualizar perfil e criar notificações
    if (newlyUnlocked.length > 0) {
      const updatedBadges = [...currentBadges, ...newlyUnlocked.map(b => b.id)];

      // Atualizar badges no perfil
      await supabase
        .from("profiles")
        .update({ badges: updatedBadges })
        .eq("id", userId);

      // Criar notificação no inbox para cada nova badge
      for (const badge of newlyUnlocked) {
        await supabase.from("inbox").insert({
          user_id: userId,
          type: "badge_unlocked",
          content: JSON.stringify({
            badge_id: badge.id,
            title: badge.title,
            description: badge.description,
            icon: badge.icon
          }),
          meta: { badge_id: badge.id, icon: badge.icon },
          cta: "Ver Badges",
          cta_url: "/badges",
          lang: "all",
          created_at: new Date().toISOString()
        });
      }

      console.log(`[BADGES] ✅ ${newlyUnlocked.length} nova(s) badge(s) desbloqueada(s) para ${userId}`);
      return newlyUnlocked;
    }

    return [];
  } catch (error) {
    console.error("[BADGES] Erro ao verificar badges:", error);
    return [];
  }
}
