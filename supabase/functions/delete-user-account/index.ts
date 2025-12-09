import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('Delete user account function called');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('Supabase URL exists:', !!supabaseUrl);
    console.log('Service role key exists:', !!supabaseServiceKey);
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    // Create admin client with service role key
    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get the authenticated user from the request
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify the user's JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError) {
      console.error('User verification error:', userError);
      throw new Error(`Invalid authentication token: ${userError.message}`);
    }
    
    if (!user) {
      throw new Error('No user found for token');
    }

    console.log(`Attempting to delete user account: ${user.id} (${user.email})`);

    // Step 1: Null out contract references in submissions (preserves contract records for admin)
    console.log('Nulling out contract references in submissions...');
    
    const submissionTablesToNullContract = [
      'song_cover_submissions',
      'asmr_submissions',
      'modeling_applications',
    ];

    for (const table of submissionTablesToNullContract) {
      console.log(`Nulling contract_id in ${table} for merchant ${user.id}`);
      const { error } = await supabaseAdmin
        .from(table)
        .update({ contract_id: null })
        .eq('merchant_id', user.id);
      
      if (error) {
        console.log(`Note: Could not null contract_id in ${table}: ${error.message}`);
      }
    }

    // Step 2: Null out contract references in downloads
    const downloadTablesToNullContract = [
      'podcast_downloads',
      'asmr_downloads',
    ];

    for (const table of downloadTablesToNullContract) {
      console.log(`Nulling contract_id in ${table} for merchant ${user.id}`);
      const { error } = await supabaseAdmin
        .from(table)
        .update({ contract_id: null })
        .eq('merchant_id', user.id);
      
      if (error) {
        console.log(`Note: Could not null contract_id in ${table}: ${error.message}`);
      }
    }

    // Step 3: Delete submissions (after contract references are nulled)
    const submissionsToDelete = [
      { table: 'song_cover_submissions', column: 'merchant_id' },
      { table: 'asmr_submissions', column: 'merchant_id' },
      { table: 'modeling_applications', column: 'merchant_id' },
      { table: 'asmr_downloads', column: 'merchant_id' },
      { table: 'podcast_downloads', column: 'merchant_id' },
    ];

    for (const { table, column } of submissionsToDelete) {
      console.log(`Deleting from ${table} where ${column} = ${user.id}`);
      const { error } = await supabaseAdmin
        .from(table)
        .delete()
        .eq(column, user.id);
      
      if (error) {
        console.log(`Note: Could not delete from ${table}: ${error.message}`);
      }
    }

    // Step 4: Preserve contracts for admin records - mark as deleted but keep the record
    // We set deleted_by_merchant = true and merchant_deletion_date instead of deleting
    console.log('Marking contracts as deleted (preserving for admin records)...');
    const { error: contractsError } = await supabaseAdmin
      .from('contracts')
      .update({ 
        deleted_by_merchant: true, 
        merchant_deletion_date: new Date().toISOString(),
        merchant_signature: '[Account Deleted]'
      })
      .eq('merchant_id', user.id);
    
    if (contractsError) {
      console.log(`Note: Could not update contracts: ${contractsError.message}`);
    }

    // Step 5: Delete portfolio images first (before portfolios)
    console.log('Deleting portfolio images...');
    const { data: portfolios } = await supabaseAdmin
      .from('portfolios')
      .select('id')
      .eq('user_id', user.id);
    
    if (portfolios && portfolios.length > 0) {
      const portfolioIds = portfolios.map(p => p.id);
      const { error: portfolioImagesError } = await supabaseAdmin
        .from('portfolio_images')
        .delete()
        .in('portfolio_id', portfolioIds);
      
      if (portfolioImagesError) {
        console.log(`Note: Could not delete portfolio_images: ${portfolioImagesError.message}`);
      }

      // Delete portfolio purchases
      const { error: portfolioPurchasesError } = await supabaseAdmin
        .from('portfolio_purchases')
        .delete()
        .in('portfolio_id', portfolioIds);
      
      if (portfolioPurchasesError) {
        console.log(`Note: Could not delete portfolio_purchases: ${portfolioPurchasesError.message}`);
      }
    }

    // Step 6: Delete other related data
    const tablesToClean = [
      { table: 'user_playlists', column: 'user_id' },
      { table: 'notifications', column: 'user_id' },
      { table: 'messaging_credits', column: 'user_id' },
      { table: 'credit_transactions', column: 'user_id' },
      { table: 'messages', column: 'sender_id' },
      { table: 'messages', column: 'recipient_id' },
      { table: 'portfolios', column: 'user_id' },
      { table: 'user_birth_data', column: 'user_id' },
      { table: 'quarterly_income', column: 'user_id' },
      { table: 'profile_followers', column: 'follower_id' },
      { table: 'profile_followers', column: 'merchant_id' },
      { table: 'profile_follow_requests', column: 'requester_id' },
      { table: 'profile_follow_requests', column: 'target_merchant_id' },
      { table: 'post_likes', column: 'user_id' },
      { table: 'post_comments', column: 'user_id' },
      { table: 'bulletin_posts', column: 'merchant_id' },
      { table: 'audio_products', column: 'merchant_id' },
      { table: 'user_purchases', column: 'user_id' },
      { table: 'astrology_purchases', column: 'user_id' },
      { table: 'astrology_readings', column: 'user_id' },
      { table: 'fashion_purchases', column: 'user_id' },
      { table: 'digital_receipts', column: 'merchant_id' },
      { table: 'merchant_payouts', column: 'merchant_id' },
      { table: 'message_settings', column: 'merchant_id' },
      { table: 'product_reviews', column: 'user_id' },
    ];

    for (const { table, column } of tablesToClean) {
      console.log(`Cleaning ${table} where ${column} = ${user.id}`);
      const { error: cleanError } = await supabaseAdmin
        .from(table)
        .delete()
        .eq(column, user.id);
      
      if (cleanError) {
        console.log(`Note: Could not clean ${table}.${column}: ${cleanError.message}`);
        // Continue anyway - some tables might not have data
      }
    }

    // Step 7: Delete the profile
    console.log('Deleting profile...');
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', user.id);

    if (profileError) {
      console.error('Error deleting profile:', profileError);
      throw new Error(`Failed to delete profile: ${profileError.message}`);
    }

    // Step 8: Delete the auth user
    console.log('Deleting auth user...');
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (deleteError) {
      console.error('Error deleting auth user:', deleteError);
      throw new Error(`Failed to delete user: ${deleteError.message}`);
    }

    console.log(`Successfully deleted user: ${user.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Account deleted successfully' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in delete-user-account function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to delete account' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
