import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// 🎮 AAA ARCHITECTURE: Server-side match finalization with validation
// This is the SINGLE SOURCE OF TRUTH for match finalization
// - Validates match ownership
// - Prevents cheating
// - Atomic stats updates via RPC
// - Host-authoritative (only Player1 should call this)

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

    // Create authenticated Supabase client
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

    // Prevent double-processing
    if (match.status === 'finished') {
      return NextResponse.json(
        { error: 'Match already finalized', alreadyProcessed: true },
        { status: 409 }
      );
    }

    // Determine winner
    let winner_id = null;
    if (oppLost > myLost) {
      winner_id = match.player1_id; // Host won
    } else if (myLost > oppLost) {
      winner_id = match.player2_id; // Opponent won
    }
    // If equal, it's a draw (winner_id stays null)

    // 🎯 UPDATE STATS FOR PLAYER 1 (HOST)
    const player1Result = oppLost > myLost ? 'win' : myLost > oppLost ? 'loss' : 'draw';
    const { error: stats1Error } = await supabase.rpc('update_player_stats_atomic', {
      p_user_id: match.player1_id,
      p_matches_played: 1,
      p_wins: player1Result === 'win' ? 1 : 0,
      p_losses: player1Result === 'loss' ? 1 : 0,
      p_draws: player1Result === 'draw' ? 1 : 0,
      p_ships_destroyed: Number(oppLost),
      p_ships_lost: Number(myLost)
    });

    if (stats1Error) {
      console.error('[API] Error updating Player1 stats:', stats1Error);
      return NextResponse.json(
        { error: 'Failed to update Player1 stats', details: stats1Error },
        { status: 500 }
      );
    }

    // 🎯 UPDATE STATS FOR PLAYER 2 (OPPONENT)
    const player2Result = myLost > oppLost ? 'win' : oppLost > myLost ? 'loss' : 'draw';
    const { error: stats2Error } = await supabase.rpc('update_player_stats_atomic', {
      p_user_id: match.player2_id,
      p_matches_played: 1,
      p_wins: player2Result === 'win' ? 1 : 0,
      p_losses: player2Result === 'loss' ? 1 : 0,
      p_draws: player2Result === 'draw' ? 1 : 0,
      p_ships_destroyed: Number(myLost), // From opponent's perspective
      p_ships_lost: Number(oppLost)
    });

    if (stats2Error) {
      console.error('[API] Error updating Player2 stats:', stats2Error);
      return NextResponse.json(
        { error: 'Failed to update Player2 stats', details: stats2Error },
        { status: 500 }
      );
    }

    // 🏁 UPDATE MATCH STATUS
    const { error: updateError } = await supabase
      .from('matches')
      .update({
        status: 'finished',
        winner_id,
        finished_at: new Date().toISOString()
      })
      .eq('id', matchId);

    if (updateError) {
      console.error('[API] Error updating match status:', updateError);
      return NextResponse.json(
        { error: 'Failed to update match status', details: updateError },
        { status: 500 }
      );
    }

    console.log('[API] ✅ Match finalized successfully:', {
      matchId,
      winner_id,
      player1Result,
      player2Result,
      myLost,
      oppLost
    });

    return NextResponse.json({
      success: true,
      matchId,
      winner_id,
      player1Result,
      player2Result
    });

  } catch (error) {
    console.error('[API] Exception in finalize-match:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
