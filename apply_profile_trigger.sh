#!/bin/bash

# Script para aplicar a migration de auto-criação de profile
# Execute: chmod +x apply_profile_trigger.sh && ./apply_profile_trigger.sh

echo "🚀 Aplicando migration: auto_create_profile_on_signup"
echo ""

# Você precisa ter o Supabase CLI instalado e configurado
# Instale com: npm install -g supabase

# Link o projeto se ainda não estiver linkado
# supabase link --project-ref SEU_PROJECT_REF

# Aplica a migration
supabase db push

echo ""
echo "✅ Migration aplicada com sucesso!"
echo ""
echo "📝 O que foi criado:"
echo "  - Função: handle_new_user()"
echo "  - Trigger: on_auth_user_created"
echo ""
echo "🎯 Agora quando um usuário confirmar o email:"
echo "  - Profile é criado automaticamente"
echo "  - player_stats é criado automaticamente"
echo "  - player_progress é criado automaticamente"
echo ""
