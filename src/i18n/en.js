export default {
  friends: {
    title: "Friends",
    tab_friends: "Friends",
    tab_requests: "Requests",
    tab_sent: "Sent",
    search_placeholder: "Search players...",
    searching: "Searching...",
    no_results: "No results",
    loading: "Loading...",
    pending: "Pending",
    friend_tag: "Friend",
    empty_friends_title: "No friends added yet.",
    empty_friends_desc: "Add friends to play and track their progress.",
    empty_requests_title: "You haven't received any friend requests yet.",
    empty_requests_desc: "When someone adds you, the invite will appear here.",
    empty_sent_title: "You haven't sent any friend requests.",
    empty_sent_desc: "Find players and send invites to get started.",
  },
  common: {
    save: "Save",
    loading: "Loading settings...",
    settings: "Settings",
  },
  settings: {
    title: "Settings",
    subtitle: "Game preferences",
    audio: "Audio",
    master: "Master Sound",
    masterDesc: "Controls all game audio",
    music: "Music",
    musicDesc: "Background music",
    sfx: "Sound Effects (SFX)",
    sfxDesc: "Game sound effects",
    game: "Game",
    tutorial: "Show Tutorial on Start",
    tutorialDesc: "Display instructions when starting",
    animations: "Animations",
    animationsDesc: "Enable animations on transitions",
    confirmActions: "Confirm Important Actions",
    confirmActionsDesc: "Ask for confirmation before critical actions",
    interface: "Interface",
    language: "Language",
    languageDesc: "Choose your interface language",
  },
  nav: {
    play: "Play",
    ranking: "Ranking",
    profile: "Profile",
    badges: "Badges",
    settings: "Settings",
    logout: "Logout",
    loadingError: "Loading Error",
  },
  chat: {
    battleStarted: "Battle started!",
    accepted: "accepted",
  },
  multiplayer: {
    title: "Multiplayer",
    back: "Back",
    onlineNow: "Online Now",
    you: "you",
    loading: "Loading...",
    notAuthenticated: "Not authenticated",
    typeMessage: "Type message...",
    send: "Send",
    challenge: "Challenge",
    victory: "Victory",
    defeat: "Defeat",
    draw: "🤝 Draw",
    vs: "vs",
    won: "won against",
    drew: "drew with",
    victoryResult: "VICTORY",
    defeatResult: "DEFEAT",
    drawResult: "DRAW",
    challengeReceived: "Challenge Received!",
    challengeSent: "✓ Challenge Sent",
    info: "ℹ Info",
    challengePending: "⏳ Challenge Pending",
    challengeReceivedPending: "📩 Challenge Received",
    youHavePendingFrom: "You have a pending challenge from",
    youAlreadySentTo: "You already sent a challenge to",
    waitingResponse: "Waiting for their response...",
    challengedYou: "challenged you to a battle!",
    decline: "Decline",
    accept: "Accept",
    processing: "Processing...",
    cancelChallenge: "Cancel Challenge",
    failedToSend: "Failed to send challenge",
    challengeSentTo: "Challenge sent to",
  },
  mode: {
    chooseMode: "Choose game mode",
    practice: "Practice",
    multiplayer: "Multiplayer",
    campaign: "Campaign Mode",
  },
  ranking: {
    title: "Ranking",
    multiplayer: "Multiplayer",
    global: "Global",
    loadingRanking: "Loading ranking...",
    noPlayers: "No players in the ranking yet. Be the first!",
    player: "Player",
    level: "LV",
    xp: "XP",
    wins: "W",
    losses: "L",
    winRate: "Win%",
    ships: "Ships",
    globalComingSoon: "Global ranking under construction",
  },
  inbox: {
    notificationsTitle: "Notifications",
    notificationsDesc: "All your notifications and friend activity",
    notificationsTab: "Notifications",
    updatesTab: "Game Updates",
    updatesTitle: "Game Updates",
    updatesDesc: "Latest news and patch notes",
    noNotifications: "No notifications yet.",
    noNotificationsDesc: "You have no notifications. Friend requests and news will appear here.",
    noUpdates: "No updates yet.",
    noUpdatesDesc: "Game updates and patch notes will appear here soon.",
    friend_accepted_self: "You and {username} are now friends.",
    friend_accepted_other: "Now you and {username} are friends.",
    friend_removed_title: "Friendship ended",
    friend_removed_by_other: "{username} removed you from their friends list.",
    friend_removed_title_self: "Friendship removed",
    friend_removed_by_self: "You removed {username} from your friends list.",
    cta_friends: "Friends",
    friend_request_received: "{username} sent you a friend request.",
    friend_request_declined: "{username} declined your friend request.",
    // RECEIVED
    friend_request_received_you: "You received a friend request from {username}.",
    friend_accepted_you: "{username} accepted your friend request.",
    friend_declined_you: "{username} declined your friend request.",
    friend_removed_you: "{username} removed you from their friends list.",
    streak_broken: "⚠️ Streak Lost! You didn't connect yesterday and your {days}-day streak has been reset. Start a new streak by logging in every day!",
  },
  badges: {
    title: "Badges",
    loading: "Loading...",
    unlocked: "Unlocked",
    locked: "Locked",
    categories: {
      progression: "PROGRESSION",
      victories: "VICTORIES & COMBAT",
      engagement: "ENGAGEMENT",
      special: "SPECIAL"
    },
    categoryDesc: {
      progression: "Badges related to your level progression",
      victories: "Battle achievement badges",
      engagement: "Dedication and consistency badges",
      special: "Rare and unique badges"
    },
    list: {
      rookie_pilot: {
        title: "Rookie Pilot",
        description: "Reached level 5 and took your first steps on the battlefield.",
        requirement: "Reach level 5"
      },
      veteran_pilot: {
        title: "Veteran Pilot",
        description: "Reached level 15 and proved you master the fundamentals of space warfare.",
        requirement: "Reach level 15"
      },
      elite_pilot: {
        title: "Elite Pilot",
        description: "Reached level 30. Only elite pilots make it this far.",
        requirement: "Reach level 30"
      },
      first_blood: {
        title: "First Blood",
        description: "Won your first victory in a multiplayer battle.",
        requirement: "Win 1 multiplayer match"
      },
      ace_commander: {
        title: "Ace Commander",
        description: "Won 10 multiplayer matches and showed leadership in combat.",
        requirement: "Win 10 multiplayer matches"
      },
      unstoppable: {
        title: "Unstoppable",
        description: "Achieved a 3-win streak without being defeated.",
        requirement: "Win 3 consecutive victories"
      },
      duel_initiate: {
        title: "Duel Initiate",
        description: "Faced the same opponent 3 times. A rivalry is starting to emerge.",
        requirement: "Face the same opponent 3 times"
      },
      rival_forming: {
        title: "Rival Forming",
        description: "Played 10 battles against the same opponent. The clash has become a habit.",
        requirement: "Face the same opponent 10 times"
      },
      rivalry_established: {
        title: "Rivalry Established",
        description: "Faced the same opponent 50 times. A rivalry fully established.",
        requirement: "Face the same opponent 50 times"
      },
      eternal_rival: {
        title: "Eternal Rival",
        description: "Played 100 battles against the same opponent. A legendary rivalry.",
        requirement: "Face the same opponent 100 times"
      },
      first_dominance: {
        title: "First Dominance",
        description: "Defeated the same opponent 3 times. First signs of superiority.",
        requirement: "Defeat the same opponent 3 times"
      },
      tactical_advantage: {
        title: "Tactical Advantage",
        description: "Earned 10 victories against the same opponent. Control of the rivalry.",
        requirement: "Defeat the same opponent 10 times"
      },
      absolute_control: {
        title: "Absolute Control",
        description: "Defeated the same opponent 50 times. Near-uncontested dominance.",
        requirement: "Defeat the same opponent 50 times"
      },
      total_domination: {
        title: "Total Domination",
        description: "Reached 100 victories against the same player. Absolute supremacy.",
        requirement: "Defeat the same opponent 100 times"
      },
      daily_recruit: {
        title: "Daily Recruit",
        description: "Logged into the game on 3 different days. The journey is just beginning.",
        requirement: "Log in on 3 different days"
      },
      daily_soldier: {
        title: "Daily Soldier",
        description: "Logged into the game for 7 consecutive days. Discipline is the path to victory.",
        requirement: "Log in for 7 consecutive days"
      },
      strategist: {
        title: "Strategist",
        description: "Won using 3 different ship types in separate matches.",
        requirement: "Win 3 matches, each with a different ship type"
      },
      iron_mind: {
        title: "Iron Mind",
        description: "Turned the game around and won a battle even when at a disadvantage.",
        requirement: "Win a match while at a disadvantage"
      }
    }
  },
  vip: {
    pageTitle: "THORSPACE VIP",
    hero: "Become VIP",
    heroVip: "You're VIP, Pilot. The galaxy is yours.",
    heroSub: "100% cosmetic exclusive benefits. Dominate the looks without changing the game.",
    heroSubVip: "Customize your experience and show the universe who rules.",
    statusActive: "VIP ACTIVE",
    statusExpires: "Expires on",
    sectionBenefits: "✨ Your VIP Benefits",
    sectionPlans: "💎 Choose Your Plan",
    sectionPayment: "💳 Payment Method",
    orderSummary: "Order Summary",
    payNow: "ACTIVATE VIP NOW",
    securePayment: "Secure payment. No auto-renewal.",
    back: "Back",
    day: "day",
    days: "days",
    creditLabel: "Credit Card",
    creditSub: "Visa, Master, Amex",
    debitLabel: "Debit",
    debitSub: "Visa, Master",
    viaPayment: "via",
    comingSoon: "COMING SOON",
    comingSoonMsg: "The payment system is being integrated. Soon you'll be able to activate VIP.",
    selectedPlan: "Selected plan",
    ok: "GOT IT",
    confirmTitle: "VIP Confirmation",
    bestDeal: "BEST DEAL",
    plans: [
      { id: "1day",  label: "VIP 1 Day",   sublabel: "Try it now",                    price: "$0.99", days: 1  },
      { id: "7days", label: "VIP 7 Days",  sublabel: "One epic week",                 price: "$2.99", days: 7  },
      { id: "15days",label: "VIP 15 Days", sublabel: "Half a month of dominance",     price: "$4.99", days: 15 },
      { id: "30days",label: "VIP 30 Days", sublabel: "Best value",                    price: "$7.99", days: 30, best: true }
    ],
    benefits: [
      { icon: "💬", title: "VIP Chat Color",   desc: "Choose your name color in the global chat and stand out among all players" },
      { icon: "🖼️", title: "Exclusive Frame",  desc: "Special frame displayed on your level and tier, showing your status among elite pilots" },
      { icon: "💎", title: "Diamond Icon",     desc: "A premium diamond icon appears next to your name, instantly identifying your VIP status" },
      { icon: "🚀", title: "Premium Ships",    desc: "Unlock exclusive ship skins with unique visuals to stand out in battles" },
      { icon: "🎨", title: "Profile Icons",    desc: "Collection of exclusive avatars and icons available only for VIP players" },
      { icon: "😎", title: "Special Emojis",   desc: "Use exclusive emojis in chat" }
    ]
  },
};
