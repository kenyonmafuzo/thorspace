import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Bot ship presets: 5 possible fleets for variety
const BOT_SHIP_PRESETS = [
  [1, 2, 3],
  [1, 2, 4],
  [1, 3, 5],
  [2, 3, 4],
  [2, 4, 5],
];

export async function POST(request) {
  try {
    const body = await request.json();
    const { matchId, botUserId, accessToken, refreshToken } = body;

    if (!matchId || !botUserId || !accessToken || !refreshToken) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate user identity with their token
    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    await anonClient.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    const { data: { user }, error: authError } = await anonClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      serviceKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify match belongs to this user and targets the bot
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('id, player1_id, player2_id, state')
      .eq('id', matchId)
      .single();

    if (matchError || !match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    if (match.player1_id !== user.id || match.player2_id !== botUserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (match.state !== 'pending') {
      return NextResponse.json({ error: 'Match not in pending state' }, { status: 409 });
    }

    // Pick random bot ships
    const botShips = BOT_SHIP_PRESETS[Math.floor(Math.random() * BOT_SHIP_PRESETS.length)];

    // Accept the match and pre-set bot ships + ready_red
    const { error: updateError } = await supabase
      .from('matches')
      .update({
        state: 'accepted',
        player2_ships: botShips,
        ready_red: true,
        countdown_started_at: new Date().toISOString(),
      })
      .eq('id', matchId);

    if (updateError) {
      console.error('[BOT-MATCH] Error accepting match:', updateError);
      return NextResponse.json({ error: 'Failed to accept match' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, botShips });
  } catch (err) {
    console.error('[BOT-MATCH] Exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
