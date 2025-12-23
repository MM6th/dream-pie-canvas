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
    const authHeader = req.headers.get('Authorization');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader ?? '' } } }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { targetId, intentMessage } = await req.json();

    if (!targetId || typeof targetId !== 'string') {
      throw new Error('Missing targetId');
    }

    if (!intentMessage || typeof intentMessage !== 'string') {
      throw new Error('Missing intentMessage');
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Basic safety: prevent messaging yourself
    if (targetId === user.id) {
      throw new Error('You cannot send a follow request to yourself');
    }

    // Get requester display name
    const { data: requesterProfile, error: requesterError } = await supabaseAdmin
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single();

    if (requesterError) throw requesterError;

    const requesterName = requesterProfile?.display_name || 'Someone';

    // Check if already following
    const { data: existingFollower } = await supabaseAdmin
      .from('profile_followers')
      .select('id')
      .eq('follower_id', user.id)
      .eq('merchant_id', targetId)
      .maybeSingle();

    if (existingFollower) {
      throw new Error('You are already following this profile');
    }

    // Create or update follow request
    const { data: existingRequest } = await supabaseAdmin
      .from('profile_follow_requests')
      .select('id, status')
      .eq('requester_id', user.id)
      .eq('target_merchant_id', targetId)
      .maybeSingle();

    let status: 'created' | 'updated' = 'created';

    if (!existingRequest) {
      const { error: insertError } = await supabaseAdmin
        .from('profile_follow_requests')
        .insert({
          requester_id: user.id,
          target_merchant_id: targetId,
          intent_message: intentMessage,
          status: 'pending',
        });

      if (insertError) throw insertError;
    } else {
      // If it was approved already, treat as no-op
      if (existingRequest.status === 'approved') {
        throw new Error('This follow request was already approved');
      }

      status = 'updated';
      const { error: updateError } = await supabaseAdmin
        .from('profile_follow_requests')
        .update({
          intent_message: intentMessage,
          status: 'pending',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingRequest.id);

      if (updateError) throw updateError;
    }

    // Create notification
    const { error: notifError } = await supabaseAdmin.from('notifications').insert({
      user_id: targetId,
      type: 'follow_request',
      title: 'New Follow Request',
      message: `${requesterName} sent you a follow request. Open your dashboard to approve or decline.`,
    });

    if (notifError) throw notifError;

    // Create message in inbox (free, tied to follow request)
    const subject = `Follow Request Intent from ${requesterName}`;
    const body = intentMessage;

    const { error: messageError } = await supabaseAdmin.from('messages').insert({
      sender_id: user.id,
      recipient_id: targetId,
      subject,
      body,
    });

    if (messageError) throw messageError;

    return new Response(JSON.stringify({ success: true, status }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in send-follow-request:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
