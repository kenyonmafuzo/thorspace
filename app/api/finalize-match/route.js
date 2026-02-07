import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// 🎮 AAA ARCHITECTURE: Server-side match finalization with idempotent RPC
// Uses finalize_match_once() RPC with match_results table (PK on match_id)
// - Single database call with atomic guarantees
// - Prevents duplicate finalization via ON CONFLICT
// - Service role (backend authoritative)

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

    // Create authenticated Supabase client for validation
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 🛡️ SECURITY: Fetch match and validate ownership
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('id, player1_id, player2_id, status')
      .eq('id', matchId)
      .single();

    if (matchError || !match) {
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

    // Determine winner
    let winner_id = null;
    let loser_id = null;
    let winner_score = 0;
    let loser_score = 0;

    if (oppLost > myLost) {
      // Host won
      winner_id = match.player1_id;
      loser_id = match.player2_id;
      winner_score = oppLost;
      loser_score = myLost;
    } else if (myLost > oppLost) {
      // Opponent won
      winner_id = match.player2_id;
      loser_id = match.player1_id;
      winner_score = myLost;
      loser_score = oppLost;
    } else {
      // Draw - não tem winner/loser
      return NextResponse.json(
        { error: 'Draw not supported yet' },
        { status: 400 }
      );
    }

    // 🎯 CALL IDEMPOTENT RPC (authenticated client with RLS)
    // RPC deve ter GRANT EXECUTE para authenticated users no Supabase
    const { data: rpcResult, error: rpcError } = await supabase.rpc('finalize_match_once', {
      p_match_id: matchId,
      p_winner_id: winner_id,
      p_loser_id: loser_id,
      p_winner_score: winner_score,
      p_loser_score: loser_score,
      p_winner_xp: 0, // XP será calculado no frontend
      p_loser_xp: 0
    });

    if (rpcError) {
      console.error('[API] RPC error:', rpcError);
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
      winner_score,
      loser_score,
      alreadyFinalized
    });

    return NextResponse.json({
      success: true,
      matchId,
      winner_id,
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
