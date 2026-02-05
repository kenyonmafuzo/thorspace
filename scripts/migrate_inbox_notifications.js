// Script para migrar notificações antigas da tabela 'inbox' para tipos corretos e meta.username preenchido
// Execute com: node migrate_inbox_notifications.js

const { createClient } = require('@supabase/supabase-js');

// Configure suas variáveis de ambiente ou coloque as chaves diretamente aqui
const SUPABASE_URL = process.env.SUPABASE_URL || 'COLOQUE_AQUI_O_URL';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'COLOQUE_AQUI_O_SERVICE_ROLE_KEY';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function migrate() {
  // Busca notificações antigas com tipos errados
  const { data: notifs, error } = await supabase
    .from('inbox')
    .select('*')
    .in('type', ['friend_accepted', 'friend_removed_by_self']);

  if (error) {
    console.error('Erro ao buscar notificações:', error);
    return;
  }

  for (const notif of notifs) {
    let newType = notif.type;
    let newMeta = notif.meta || {};
    let username = '';
    // Extrai username do content se possível
    const match = notif.content && notif.content.match(/([\w\d_]+)\s+agora|da sua lista|da sua lista de amigos|now|from your friends list|are now friends/);
    if (match && match[1]) username = match[1];
    // Tenta extrair do meta antigo
    if (!username && notif.meta && notif.meta.username) username = notif.meta.username;
    // Ajusta tipo
    if (notif.type === 'friend_accepted') newType = 'friend_accepted_self';
    if (notif.type === 'friend_removed_by_self') newType = 'friend_removed_by_self';
    // Atualiza meta
    newMeta = { ...newMeta, username };
    // Atualiza registro
    const { error: updateErr } = await supabase
      .from('inbox')
      .update({ type: newType, meta: newMeta })
      .eq('id', notif.id);
    if (updateErr) {
      console.error(`Erro ao atualizar notificação ${notif.id}:`, updateErr);
    } else {
      console.log(`Notificação ${notif.id} migrada para tipo ${newType} com username ${username}`);
    }
  }
  console.log('Migração concluída.');
}

migrate();
