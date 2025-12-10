import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { postId } = await req.json();

    if (!postId) {
      throw new Error('Missing post ID');
    }

    // Use admin client for database operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the bulletin post with new fields
    const { data: post, error: postError } = await supabaseAdmin
      .from('bulletin_posts')
      .select('id, title, merchant_id, is_paid_livestream, livestream_credits_per_minute, link_url, room_id, scheduled_at, session_ended_at')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      throw new Error('Livestream not found');
    }

    if (!post.is_paid_livestream) {
      throw new Error('This is not a paid livestream');
    }

    // Check if session has ended
    if (post.session_ended_at) {
      return new Response(
        JSON.stringify({ 
          error: 'This livestream session has ended.',
          sessionEnded: true,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user already has an entry
    const { data: existingEntry } = await supabaseAdmin
      .from('livestream_entries')
      .select('id')
      .eq('bulletin_post_id', postId)
      .eq('user_id', user.id)
      .single();

    // Determine the room URL
    const roomUrl = post.room_id 
      ? `/livestream/room/${post.room_id}` 
      : post.link_url;

    if (existingEntry) {
      // Already entered, allow re-entry without charging
      console.log('User already has entry, allowing re-entry:', { userId: user.id, postId });
      return new Response(
        JSON.stringify({ 
          success: true, 
          alreadyEntered: true,
          creditsSpent: 0,
          linkUrl: roomUrl,
          roomId: post.room_id,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get livestream settings for the merchant
    const { data: settings } = await supabaseAdmin
      .from('livestream_settings')
      .select('credits_per_minute, session_duration_minutes')
      .eq('merchant_id', post.merchant_id)
      .single();

    const creditsPerMinute = post.livestream_credits_per_minute || settings?.credits_per_minute || 5;
    const sessionDuration = settings?.session_duration_minutes || 20;
    const totalCreditsRequired = creditsPerMinute * sessionDuration;

    // Check user's credit balance
    const { data: credits, error: creditsError } = await supabaseAdmin
      .from('messaging_credits')
      .select('balance, total_spent')
      .eq('user_id', user.id)
      .single();

    if (creditsError || !credits) {
      return new Response(
        JSON.stringify({ 
          error: 'No credits found. Please purchase credits first.',
          needsCredits: true,
          creditsRequired: totalCreditsRequired,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (credits.balance < totalCreditsRequired) {
      return new Response(
        JSON.stringify({ 
          error: `Insufficient credits. You need ${totalCreditsRequired} credits but only have ${credits.balance}.`,
          needsCredits: true,
          creditsRequired: totalCreditsRequired,
          currentBalance: credits.balance,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Deduct credits
    const { error: deductError } = await supabaseAdmin
      .from('messaging_credits')
      .update({
        balance: credits.balance - totalCreditsRequired,
        total_spent: credits.total_spent + totalCreditsRequired,
      })
      .eq('user_id', user.id);

    if (deductError) throw deductError;

    // Record entry
    const { error: entryError } = await supabaseAdmin
      .from('livestream_entries')
      .insert({
        bulletin_post_id: postId,
        user_id: user.id,
        credits_spent: totalCreditsRequired,
      });

    if (entryError) throw entryError;

    // Record transaction
    await supabaseAdmin
      .from('credit_transactions')
      .insert({
        user_id: user.id,
        type: 'spent',
        amount: totalCreditsRequired,
        description: `Livestream entry: ${post.title}`,
      });

    // Track revenue for merchant
    const merchantRevenue = totalCreditsRequired * 0.10;
    await supabaseAdmin.rpc('update_quarterly_income', {
      p_user_id: post.merchant_id,
      p_income_type: 'merchant_revenue',
      p_amount: merchantRevenue,
    });

    // Check payout threshold
    try {
      await supabaseAdmin.rpc('check_merchant_payout_threshold', {
        p_merchant_id: post.merchant_id,
      });
    } catch (e) {
      console.error('Error checking payout threshold:', e);
    }

    // Get user display name for notification
    const { data: userProfile } = await supabaseAdmin
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single();

    // Notify merchant
    await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: post.merchant_id,
        type: 'livestream_entry',
        title: 'New Livestream Entry',
        message: `${userProfile?.display_name || 'A user'} paid ${totalCreditsRequired} credits to enter "${post.title}" ($${merchantRevenue.toFixed(2)} earned)`,
      });

    console.log('Livestream entry successful:', {
      userId: user.id,
      postId,
      creditsSpent: totalCreditsRequired,
      merchantRevenue,
      roomId: post.room_id,
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        creditsSpent: totalCreditsRequired,
        linkUrl: roomUrl,
        roomId: post.room_id,
        remainingBalance: credits.balance - totalCreditsRequired,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in enter-livestream:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: error.message.includes('Unauthorized') ? 401 : 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
