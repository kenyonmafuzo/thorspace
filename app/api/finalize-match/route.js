import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// 🎮 AAA ARCHITECTURE: Server-side match finalization with idempotent RPC
// Uses finalize_match_once() RPC with match_results table (PK on match_id)
// - Auth validation uses user token (anon key + session)
// - DB writes use service role key (bypasses RLS, reliable for all result types)

export async function POST(request) {
  try {
    const body = await request.json();
    const { matchId, myLost, oppLost, accessToken, refreshToken } = body;

    // Validate required fields
    if (!matchId || myLost === undefined || oppLost === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: matchId, myLost, oppLost' },
        { status: 400 }
      );
    }

    if (!accessToken || !refreshToken) {
      return NextResponse.json(
        { error: 'Missing authentication tokens' },
        { status: 401 }
      );
    }

    // ── Step 1: Validate user identity with their token ──────────────────────
    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    await anonClient.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // ── Step 2: Service role client for all DB operations ────────────────────
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
      console.error('[API] SUPABASE_SERVICE_ROLE_KEY not set');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      serviceKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 🛡️ SECURITY: Fetch match and validate ownership
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('id, player1_id, player2_id, status')
      .eq('id', matchId)
      .single();

    if (matchError || !match) {
      console.error('[API] Match not found:', matchId, matchError);
      return NextResponse.json(
        { error: 'Match not found' },
        { status: 404 }
      );
    }

    // 🛡️ ANTI-CHEAT: Only Player1 (HOST) can finalize
    if (user.id !== match.player1_id) {
      return NextResponse.json(
        { error: 'Only host (Player1) can finalize match' },
        { status: 403 }
      );
    }

    // Determine winner / draw
    let winner_id = null;
    let loser_id = null;
    let winner_score = 0;
    let loser_score = 0;
    let is_draw = false;

    if (oppLost > myLost) {
      // Host won — host killed more opponent ships
      winner_id = match.player1_id;
      loser_id  = match.player2_id;
      winner_score = oppLost;
      loser_score  = myLost;
    } else if (myLost > oppLost) {
      // Opponent won
      winner_id = match.player2_id;
      loser_id  = match.player1_id;
      winner_score = myLost;
      loser_score  = oppLost;
    } else {
      // Draw — equal ships destroyed
      is_draw      = true;
      winner_score = oppLost; // player1 (host) kills
      loser_score  = myLost;  // player2 kills
    }

    console.log('[API] Finalizing match:', { matchId, is_draw, myLost, oppLost, winner_id, loser_id });

    // 🎯 CALL IDEMPOTENT RPC via service role (bypasses RLS, no token issues)
    let rpcResult, rpcError;
    if (is_draw) {
      ({ data: rpcResult, error: rpcError } = await supabase.rpc('finalize_match_once', {
        p_match_id:     matchId,
        p_winner_id:    match.player1_id,
        p_loser_id:     match.player2_id,
        p_winner_score: winner_score,
        p_loser_score:  loser_score,
        p_winner_xp:    0,
        p_loser_xp:     0,
        p_player1_id:   match.player1_id,
        p_player2_id:   match.player2_id,
        p_is_draw:      true,
      }));
    } else {
      ({ data: rpcResult, error: rpcError } = await supabase.rpc('finalize_match_once', {
        p_match_id:     matchId,
        p_winner_id:    winner_id,
        p_loser_id:     loser_id,
        p_winner_score: winner_score,
        p_loser_score:  loser_score,
        p_winner_xp:    0,
        p_loser_xp:     0,
      }));
    }

    if (rpcError) {
      console.error('[API] RPC error:', JSON.stringify(rpcError));
      return NextResponse.json(
        { error: 'Failed to finalize match', details: rpcError },
        { status: 500 }
      );
    }

    // RPC returns { ok: true, already_finalized: true/false }
    const alreadyFinalized = rpcResult?.already_finalized || false;

    console.log('[API] ✅ Match finalization result:', {
      matchId,
      winner_id,
      loser_id,
      is_draw,
      winner_score,
      loser_score,
      alreadyFinalized,
      rpcResult,
    });

    return NextResponse.json({
      success: true,
      matchId,
      winner_id,
      is_draw,
      alreadyFinalized
    });

  } catch (error) {
    console.error('[API] Exception in finalize-match:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
