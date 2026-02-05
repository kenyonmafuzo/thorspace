export default {
  friends: {
    empty_friends_title: "Aún no has agregado amigos.",
    empty_friends_desc: "Agrega amigos para jugar y seguir su progreso.",
    empty_requests_title: "Aún no has recibido solicitudes de amistad.",
    empty_requests_desc: "Cuando alguien te agregue, la invitación aparecerá aquí.",
    empty_sent_title: "No has enviado ninguna solicitud de amistad.",
    empty_sent_desc: "Encuentra jugadores y envía invitaciones para comenzar.",
  },
  common: {
    save: "Guardar",
    loading: "Cargando configuraciones...",
    settings: "Configuraciones",
  },
  settings: {
    title: "Configuraciones",
    subtitle: "Preferencias del juego",
    audio: "Audio",
    master: "Sonido General",
    masterDesc: "Controla todo el audio del juego",
    music: "Música",
    musicDesc: "Música de fondo",
    sfx: "Efectos de Sonido (SFX)",
    sfxDesc: "Efectos de sonido del juego",
    game: "Juego",
    tutorial: "Mostrar Tutorial al Iniciar",
    tutorialDesc: "Mostrar instrucciones al comenzar",
    animations: "Animaciones",
    animationsDesc: "Activar animaciones en transiciones",
    confirmActions: "Confirmar Acciones Importantes",
    confirmActionsDesc: "Pedir confirmación antes de acciones críticas",
    interface: "Interfaz",
    language: "Idioma",
    languageDesc: "Elige el idioma de la interfaz",
  },
  nav: {
    play: "Jugar",
    ranking: "Ranking",
    profile: "Perfil",
    badges: "Insignias",
    settings: "Configuración",
    logout: "Cerrar Sesión",
    loadingError: "Error al cargar",
  },
  chat: {
    battleStarted: "¡Batalla comenzada!",
    accepted: "aceptó",
  },
  multiplayer: {
    title: "Multijugador",
    back: "Volver",
    onlineNow: "En Línea Ahora",
    you: "tú",
    loading: "Cargando...",
    notAuthenticated: "No autenticado",
    typeMessage: "Escribir mensaje...",
    send: "Enviar",
    challenge: "Desafiar",
    victory: "Victoria",
    defeat: "Derrota",
    draw: "🤝 Empate",
    vs: "vs",
    won: "ganó contra",
    drew: "empató con",
    victoryResult: "VICTORIA",
    defeatResult: "DERROTA",
    drawResult: "EMPATE",
    challengeReceived: "¡Desafío Recibido!",
    challengeSent: "✓ Desafío Enviado",
    info: "ℹ Info",
    challengePending: "⏳ Desafío Pendiente",
    challengeReceivedPending: "📩 Desafío Recibido",
    youHavePendingFrom: "Tienes un desafío pendiente de",
    youAlreadySentTo: "Ya enviaste un desafío a",
    waitingResponse: "Esperando su respuesta...",
    challengedYou: "te desafió a una batalla!",
    decline: "Rechazar",
    accept: "Aceptar",
    processing: "Procesando...",
    cancelChallenge: "Cancelar Desafío",
    failedToSend: "Error al enviar desafío",
    challengeSentTo: "Desafío enviado a",
  },
  mode: {
    chooseMode: "Elige modo de juego",
    practice: "Práctica",
    multiplayer: "Multijugador",
    campaign: "Modo Campaña",
  },
  ranking: {
    title: "Clasificación",
    multiplayer: "Multijugador",
    global: "Global",
    loadingRanking: "Cargando clasificación...",
    noPlayers: "¡Aún no hay jugadores en la clasificación. Sé el primero!",
    player: "Jugador",
    level: "NV",
    xp: "XP",
    wins: "G",
    losses: "P",
    winRate: "G%",
    ships: "Naves",
    globalComingSoon: "Clasificación global en construcción",
  },
  inbox: {
    notificationsTitle: "Notificaciones",
    notificationsDesc: "Todas tus notificaciones y actividad de amistad",
    notificationsTab: "Notificaciones",
    updatesTab: "Actualizaciones del Juego",
    updatesTitle: "Actualizaciones del Juego",
    updatesDesc: "Novedades y notas de actualización",
    noNotifications: "Aún no hay notificaciones.",
    noNotificationsDesc: "No tienes notificaciones. Las solicitudes de amistad y novedades aparecerán aquí.",
    noUpdates: "Aún no hay actualizaciones.",
    noUpdatesDesc: "Las actualizaciones y notas del juego aparecerán aquí pronto.",
    friend_accepted_self: "Tú y {username} ahora son amigos.",
    friend_accepted_other: "Ahora tú y {username} son amigos.",
    friend_removed_title: "Amistad terminada",
    friend_removed_by_other: "{username} te eliminó de su lista de amigos.",
    friend_removed_title_self: "Amistad eliminada",
    friend_removed_by_self: "Eliminaste a {username} de tu lista de amigos.",
    cta_friends: "Amigos",
    friend_request_received: "{username} te envió una solicitud de amistad.",
    friend_request_declined: "{username} rechazó tu solicitud de amistad.",
    // RECIBIDAS
    friend_request_received_you: "Has recibido una solicitud de amistad de {username}.",
    friend_accepted_you: "{username} aceptó tu solicitud de amistad.",
    friend_declined_you: "{username} rechazó tu solicitud de amistad.",
    friend_removed_you: "{username} te eliminó de su lista de amigos.",
    streak_broken: "⚠️ ¡Racha Perdida! No te conectaste ayer y tu racha de {days} días se ha reiniciado. ¡Comienza una nueva racha iniciando sesión todos los días!",
  },
  badges: {
    title: "Insignias",
    loading: "Cargando...",
    unlocked: "Desbloqueada",
    locked: "Bloqueada",
    categories: {
      progression: "PROGRESIÓN",
      victories: "VICTORIAS Y COMBATE",
      engagement: "COMPROMISO",
      special: "ESPECIALES"
    },
    categoryDesc: {
      progression: "Insignias relacionadas con tu evolución de nivel",
      victories: "Insignias de logros en batalla",
      engagement: "Insignias de dedicación y consistencia",
      special: "Insignias raras y únicas"
    },
    list: {
      rookie_pilot: {
        title: "Piloto Novato",
        description: "Alcanzó el nivel 5 y dio los primeros pasos en el campo de batalla.",
        requirement: "Alcanza el nivel 5"
      },
      veteran_pilot: {
        title: "Piloto Veterano",
        description: "Alcanzó el nivel 15 y demostró que domina los fundamentos de la guerra espacial.",
        requirement: "Alcanza el nivel 15"
      },
      elite_pilot: {
        title: "Piloto de Elite",
        description: "Alcanzó el nivel 30. Solo pilotos de elite llegan tan lejos.",
        requirement: "Alcanza el nivel 30"
      },
      first_blood: {
        title: "Primera Sangre",
        description: "Ganó su primera victoria en una batalla multijugador.",
        requirement: "Gana 1 partida multijugador"
      },
      ace_commander: {
        title: "Comandante As",
        description: "Ganó 10 partidas multijugador y mostró liderazgo en combate.",
        requirement: "Gana 10 partidas multijugador"
      },
      unstoppable: {
        title: "Imparable",
        description: "Logró una racha de 3 victorias consecutivas sin ser derrotado.",
        requirement: "Gana 3 victorias consecutivas"
      },
      daily_recruit: {
        title: "Recluta Diario",
        description: "Ingresó al juego en 3 días diferentes. El viaje apenas comienza.",
        requirement: "Ingresa al juego en 3 días diferentes"
      },
      daily_soldier: {
        title: "Soldado Diario",
        description: "Ingresó al juego durante 7 días seguidos. La disciplina es el camino a la victoria.",
        requirement: "Ingresa al juego durante 7 días consecutivos"
      },
      strategist: {
        title: "Estratega",
        description: "Ganó usando 3 tipos diferentes de nave en partidas separadas.",
        requirement: "Gana 3 partidas, cada una con un tipo de nave diferente"
      },
      iron_mind: {
        title: "Mente de Hierro",
        description: "Dio la vuelta al juego y ganó una batalla incluso estando en desventaja.",
        requirement: "Gana una partida estando en desventaja"
      }
    }
  },
};
