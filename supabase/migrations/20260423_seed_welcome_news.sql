-- Seed: insert the existing hardcoded welcome news into admin_news
-- Run this once in the Supabase SQL editor.
-- This creates the "Bem-vindo ao Thorspace" announcement that was previously
-- only hardcoded in the site code, making it editable from the admin panel.

INSERT INTO admin_news (
  title,
  body,
  published,
  published_at,
  show_as_login_modal,
  show_in_notifications,
  show_in_game_updates
)
VALUES (
  'Bem-vindo(a) ao Thorspace!',
  'Thorspace é um jogo de batalhas espaciais por turnos, focado em estratégia.

Antes de cada partida, você escolhe 3 naves, cada uma com sua especialidade. A escolha certa depende da sua estratégia de jogo.

Durante a partida, o jogo acontece em turnos:

Primeiro você escolhe qual nave vai se mover, depois define para onde ela vai e onde irá mirar.
Repita esse processo até concluir as 3 jogadas do turno.

Você pode jogar contra o computador para treinar ou enfrentar outros jogadores no modo multiplayer.

Ganhe batalhas para acumular XP, subir de nível, conquistar badges e avançar no ranking.

Boas batalhas!',
  true,
  now(),
  false,       -- show_as_login_modal: false por ora — o modal hardcoded ainda existe
  false,       -- show_in_notifications
  false        -- show_in_game_updates
);
