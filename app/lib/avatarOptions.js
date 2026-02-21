// Centralized avatar options for the entire app
// Add new avatars here to make them available everywhere

export const AVATAR_OPTIONS = [
  {
    name: "Normal",
    value: "normal",
    src: "/game/images/nave_normal.png",
    type: "ship",
    featured: true,
  },
  {
    name: "Proteção",
    value: "protecao",
    src: "/game/images/nave_protecao.png",
    type: "ship",
  },
  {
    name: "Alcance",
    value: "alcance",
    src: "/game/images/nave_alcance.png",
    type: "ship",
  },
  // Exemplo de expansão:
  // {
  //   name: "Nova Nave",
  //   value: "nova",
  //   src: "/game/images/nave_nova.png",
  //   type: "ship",
  //   rarity: "event",
  // },
];

// Helper: get avatar src by value
export function getAvatarSrc(value) {
  // If value is already a full path (VIP custom avatar), use it directly
  if (value && value.startsWith('/')) return value;
  const found = AVATAR_OPTIONS.find(a => a.value === value);
  return found ? found.src : AVATAR_OPTIONS[0].src;
}

// Helper: get avatar name by value
export function getAvatarName(value) {
  const found = AVATAR_OPTIONS.find(a => a.value === value);
  return found ? found.name : AVATAR_OPTIONS[0].name;
}
