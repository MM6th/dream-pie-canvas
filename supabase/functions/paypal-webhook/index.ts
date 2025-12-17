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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload = await req.json();
    
    console.log('PayPal Webhook received:', {
      event_type: payload.event_type,
      resource_type: payload.resource_type,
      summary: payload.summary,
    });

    // Handle different PayPal event types
    const eventType = payload.event_type;

    // Payout completed events
    if (eventType === 'PAYMENT.PAYOUTSBATCH.SUCCESS' || 
        eventType === 'PAYMENT.PAYOUTS-ITEM.SUCCEEDED') {
      
      const resource = payload.resource;
      
      // Extract payout details
      const payoutBatchId = resource.batch_header?.payout_batch_id || resource.payout_batch_id;
      const senderBatchId = resource.batch_header?.sender_batch_header?.sender_batch_id || 
                            resource.payout_item?.sender_item_id;
      
      console.log('Payout completed:', { payoutBatchId, senderBatchId });

      // If sender_batch_id contains our payout ID, update the record
      if (senderBatchId && senderBatchId.startsWith('PIE_PAYOUT_')) {
        const payoutId = senderBatchId.replace('PIE_PAYOUT_', '');
        
        const { error: updateError } = await supabaseAdmin
          .from('merchant_payouts')
          .update({
            status: 'paid',
            paid_at: new Date().toISOString(),
            payment_notes: `PayPal Batch ID: ${payoutBatchId}`,
            updated_at: new Date().toISOString(),
          })
          .eq('id', payoutId);

        if (updateError) {
          console.error('Error updating payout status:', updateError);
        } else {
          console.log('Payout marked as paid:', payoutId);

          // Get the payout details to notify the merchant
          const { data: payout } = await supabaseAdmin
            .from('merchant_payouts')
            .select('merchant_id, amount')
            .eq('id', payoutId)
            .single();

          if (payout) {
            // Notify merchant of successful payout
            await supabaseAdmin
              .from('notifications')
              .insert({
                user_id: payout.merchant_id,
                type: 'payout_completed',
                title: 'Payment Received!',
                message: `Your payout of $${payout.amount.toFixed(2)} has been successfully sent to your PayPal account.`,
              });
          }
        }
      }
    }

    // Handle payout failures
    if (eventType === 'PAYMENT.PAYOUTS-ITEM.FAILED' ||
        eventType === 'PAYMENT.PAYOUTS-ITEM.DENIED' ||
        eventType === 'PAYMENT.PAYOUTS-ITEM.BLOCKED') {
      
      const resource = payload.resource;
      const senderBatchId = resource.payout_item?.sender_item_id;
      const errorMessage = resource.errors?.message || resource.transaction_status || 'Payment failed';

      console.log('Payout failed:', { senderBatchId, errorMessage });

      if (senderBatchId && senderBatchId.startsWith('PIE_PAYOUT_')) {
        const payoutId = senderBatchId.replace('PIE_PAYOUT_', '');
        
        const { error: updateError } = await supabaseAdmin
          .from('merchant_payouts')
          .update({
            status: 'failed',
            payment_notes: `Failed: ${errorMessage}`,
            updated_at: new Date().toISOString(),
          })
          .eq('id', payoutId);

        if (updateError) {
          console.error('Error updating failed payout:', updateError);
        }

        // Get payout to notify merchant
        const { data: payout } = await supabaseAdmin
          .from('merchant_payouts')
          .select('merchant_id, amount')
          .eq('id', payoutId)
          .single();

        if (payout) {
          // Notify merchant of failed payout
          await supabaseAdmin
            .from('notifications')
            .insert({
              user_id: payout.merchant_id,
              type: 'payout_failed',
              title: 'Payment Issue',
              message: `There was an issue processing your payout of $${payout.amount.toFixed(2)}. Please verify your PayPal email is correct. Our team will retry the payment.`,
            });

          // Notify admin
          const { data: admin } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('is_admin', true)
            .limit(1)
            .single();

          if (admin) {
            await supabaseAdmin
              .from('notifications')
              .insert({
                user_id: admin.id,
                type: 'payout_failed',
                title: 'Payout Failed',
                message: `Payout failed for merchant. Error: ${errorMessage}. Please review and retry.`,
              });
          }
        }
      }
    }

    // Handle payment received (for credit purchases)
    if (eventType === 'PAYMENT.CAPTURE.COMPLETED' ||
        eventType === 'CHECKOUT.ORDER.COMPLETED') {
      
      console.log('Payment capture completed - handled by existing capture functions');
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('PayPal webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
