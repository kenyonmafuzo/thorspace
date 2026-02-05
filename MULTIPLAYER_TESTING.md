# Sistema de Convites Multiplayer - Guia de Teste

## Como Ativar os Fake Players

1. Edite o arquivo `.env.local`
2. Descomente a linha:
   ```
   NEXT_PUBLIC_FAKE_PLAYERS=1
   ```
3. Reinicie o servidor: `npm run dev`

## Como Testar

### Teste com Fake Players (sozinho)

1. Acesse `/mode` e clique em "Multiplayer"
2. Na lista "Online Now", você verá:
   - BotAlpha (online)
   - BotBeta (idle)
3. Clique no botão "Challenge" ao lado de BotAlpha
4. Um popup aparecerá: "BotAlpha challenged you"
5. Você tem 30 segundos para responder
6. Clique em "Accept":
   - Uma mensagem aparece no chat: "⚔️ [seu nome] accepted BotAlpha. Battle started!"
   - Você será redirecionado para `/game` (seleção de naves integrada)
   - O `match_id` é salvo no localStorage como `thor_match_id`
7. Ou clique em "Decline" para recusar

### Teste com Conta Real (duas abas/navegadores)

**Navegador 1 (Jogador A):**
1. Faça login como Jogador A
2. Acesse `/multiplayer`

**Navegador 2 (Jogador B):**
1. Faça login como Jogador B
2. Acesse `/multiplayer`
3. Você verá Jogador A na lista "Online Now"
4. Clique em "Challenge" ao lado de Jogador A

**Navegador 1 (Jogador A):**
- Um popup aparecerá automaticamente (realtime!)
- "Jogador B challenged you"
- Aceite ou recuse o convite

## Estrutura Técnica

### Componentes Criados

- **`/app/components/InvitePopup.js`**: Modal de convite com timer de 30s
- **`/app/select-ships/page.js`**: Página placeholder (não usada no fluxo principal)

### Modificações

- **`/app/(protected)/multiplayer/page.js`**:
  - Integrado `InvitePopup`
  - Ajustado `handleChallenge` para suportar fake invites

- **`/app/components/OnlineNow.js`**:
  - Adiciona fake players quando `NEXT_PUBLIC_FAKE_PLAYERS=1`
  - Passa parâmetro `{ fake: true }` no callback

- **`/app/components/InvitePopup.js`**:
  - Redireciona para `/game` (tela real de seleção de naves)
  - Salva `match_id` no localStorage como `thor_match_id`
  - Define modo como "multiplayer" no localStorage

### Fluxo de Dados

1. **Enviar Convite Real**:
   - Insert na tabela `invites` com `status='pending'`

2. **Receber Convite (Realtime)**:
   - Subscription em `invites` filtrando por `to_user`
   - Popup aparece automaticamente

3. **Aceitar Convite**:
   - Update `invites`: `status='accepted'`, gera `match_id`
   - Insert em `chat_messages`: mensagem system
   - Salva `match_id` no localStorage
   - Define modo "multiplayer" no localStorage
   - Navegação para `/game` (que carrega thor.html com seleção de naves)

4. **Recusar/Expirar**:
   - Update `invites`: `status='declined'` ou `'expired'`

### Tabelas Usadas

- `public.invites`: gerenciamento de convites
- `public.chat_messages`: mensagens do chat (incluindo system messages)
- `public.profiles`: busca de username/avatar

## Próximos Passos

- [ ] Implementar interface de seleção de naves em `/select-ships`
- [ ] Notificação para quem enviou o convite (quando aceito/recusado)
- [ ] Som/vibração quando receber convite
- [ ] Histórico de partidas
