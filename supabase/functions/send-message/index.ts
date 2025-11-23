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

    const { recipientId, subject, body, parentMessageId } = await req.json();

    // Validate input
    if (!recipientId || !subject || !body) {
      throw new Error('Missing required fields');
    }

    if (subject.length < 5) {
      throw new Error('Subject must be at least 5 characters');
    }

    if (body.length < 20) {
      throw new Error('Message must be at least 20 characters');
    }

    if (body.length > 1000) {
      throw new Error('Message must be less than 1000 characters');
    }

    // Use admin client for database operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get sender profile
    const { data: senderProfile, error: senderError } = await supabaseAdmin
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .single();

    if (senderError || !senderProfile) {
      throw new Error('Sender profile not found');
    }

    // Get recipient profile
    const { data: recipientProfile, error: recipientError } = await supabaseAdmin
      .from('profiles')
      .select('user_type, display_name')
      .eq('id', recipientId)
      .single();

    if (recipientError || !recipientProfile) {
      throw new Error('Recipient not found');
    }

    // Block supporter-to-supporter messaging
    if (senderProfile.user_type === 'supporter' && recipientProfile.user_type === 'supporter') {
      throw new Error('Cannot send messages to other supporters');
    }

    // Determine if message is free
    const isMerchantToMerchant = senderProfile.user_type === 'merchant' && recipientProfile.user_type === 'merchant';
    
    // Check if this is a merchant replying to a supporter's message
    let isMerchantReplyToSupporter = false;
    if (parentMessageId && senderProfile.user_type === 'merchant') {
      const { data: parentMessage } = await supabaseAdmin
        .from('messages')
        .select('sender_id')
        .eq('id', parentMessageId)
        .single();
      
      if (parentMessage) {
        const { data: parentSenderProfile } = await supabaseAdmin
          .from('profiles')
          .select('user_type')
          .eq('id', parentMessage.sender_id)
          .single();
        
        isMerchantReplyToSupporter = parentSenderProfile?.user_type === 'supporter';
      }
    }
    
    let creditsRequired = 0;
    let isFree = false;
    
    // Determine if message should be free
    if (isMerchantToMerchant || isMerchantReplyToSupporter) {
      isFree = true;
    }
    
    // Only check credits and settings for paid messages
    if (!isFree) {
      // Get merchant's message settings (default to 1 credit if not set)
      const { data: messageSettings } = await supabaseAdmin
        .from('message_settings')
        .select('credits_per_message, enabled')
        .eq('merchant_id', recipientId)
        .single();

      creditsRequired = messageSettings?.credits_per_message || 1;
      const messagingEnabled = messageSettings?.enabled !== false;

      if (!messagingEnabled) {
        throw new Error('This merchant has disabled messaging');
      }

      // Check sender's credit balance
      const { data: senderCredits, error: creditsError } = await supabaseAdmin
        .from('messaging_credits')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      if (creditsError || !senderCredits) {
        throw new Error('No credits found. Please purchase credits first.');
      }

      if (senderCredits.balance < creditsRequired) {
        throw new Error(`Insufficient credits. You need ${creditsRequired} credit(s), but have ${senderCredits.balance}.`);
      }
    }

    // Rate limiting: check messages sent in last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentMessages, error: rateLimitError } = await supabaseAdmin
      .from('messages')
      .select('id')
      .eq('sender_id', user.id)
      .gte('created_at', oneHourAgo);

    if (rateLimitError) {
      console.error('Rate limit check error:', rateLimitError);
    }

    if (recentMessages && recentMessages.length >= 10) {
      throw new Error('Rate limit exceeded. Maximum 10 messages per hour.');
    }

    // Insert message
    const { data: newMessage, error: messageError } = await supabaseAdmin
      .from('messages')
      .insert({
        sender_id: user.id,
        recipient_id: recipientId,
        subject,
        body,
        parent_message_id: parentMessageId || null,
      })
      .select()
      .single();

    if (messageError) throw messageError;

    // Deduct credits and record transaction only if not free
    if (!isFree) {
      const { error: deductError } = await supabaseAdmin
        .from('messaging_credits')
        .update({
          balance: senderCredits.balance - creditsRequired,
          total_spent: (await supabaseAdmin
            .from('messaging_credits')
            .select('total_spent')
            .eq('user_id', user.id)
            .single()
          ).data!.total_spent + creditsRequired,
        })
        .eq('user_id', user.id);

      if (deductError) throw deductError;

      // Record transaction
      const { error: transactionError } = await supabaseAdmin
        .from('credit_transactions')
        .insert({
          user_id: user.id,
          type: 'spent',
          amount: creditsRequired,
          description: `Message to ${recipientProfile.display_name || 'merchant'}`,
          related_message_id: newMessage.id,
        });

      if (transactionError) {
        console.error('Error recording transaction:', transactionError);
      }
    }

    // Get updated balance
    const { data: updatedCredits } = await supabaseAdmin
      .from('messaging_credits')
      .select('balance')
      .eq('user_id', user.id)
      .single();

    console.log('Message sent:', { 
      message_id: newMessage.id, 
      from: user.id, 
      to: recipientId,
      credits_spent: creditsRequired,
      is_free: isFree,
      is_reply: !!parentMessageId,
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: newMessage.id,
        creditsSpent: creditsRequired,
        remainingBalance: updatedCredits?.balance || 0,
        isFree,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-message:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: error.message.includes('Unauthorized') ? 401 : 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});