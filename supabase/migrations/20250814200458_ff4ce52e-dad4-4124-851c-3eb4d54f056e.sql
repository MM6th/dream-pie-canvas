-- Update the Dairy Queen download contract and any other old contract terms
UPDATE public.contracts 
SET contract_terms = CASE 
  WHEN contract_terms LIKE '%Dance to Dairy Queen%' THEN 
    'EXCLUSIVE PIE INDEPENDENT CONTRACT

This agreement establishes the terms for exclusive content creation for PIE and related platforms.

OPPORTUNITY DETAILS:
- Title: Dance to Dairy Queen
- Target Platform: TIKTOK
- Cash Advance Payment: $100
- Audio Type: MUSIC

EXCLUSIVE CONTENT TERMS:
- The Independent Contractor agrees to create content exclusively for PIE and PIE-related channels
- Content will be distributed across PIE platforms including YouTube, TikTok, Facebook, OnlyFans, and other PIE-affiliated channels
- All content created under this agreement is exclusive to PIE for initial distribution

REVENUE SHARING TERMS:
- Cash Advance: $100 (paid upon contract execution)
- Platform Revenue Share: 50% of net revenues generated from TIKTOK (after platform transaction fees)
- Revenue sharing applies to all monetization from the target platform including ad revenue, subscriptions, and direct payments
- Transaction fees (platform fees, payment processing) are deducted before revenue split calculation

CONTRACTOR OBLIGATIONS:
- Create high-quality video content using provided audio materials
- Maintain professional standards for all PIE-distributed content
- Comply with all platform content guidelines and requirements
- Provide content exclusively to PIE for initial distribution period
- Meet agreed-upon deadlines and specifications
- Maintain professional communication throughout the project

PLATFORM OBLIGATIONS:
- Provide cash advance payment upon contract execution
- Distribute content across PIE-affiliated channels and platforms
- Provide transparent monthly revenue reporting for TIKTOK
- Process revenue sharing payments according to platform payout schedules
- Maintain professional project management and support

EXCLUSIVITY TERMS:
- Content created under this agreement is exclusive to PIE for initial distribution
- Contractor may not distribute identical content through other channels during exclusivity period
- PIE retains exclusive rights for cross-platform distribution and monetization
- Usage rights are exclusive to PIE for commercial distribution

By signing below, both parties agree to these terms and conditions for exclusive PIE content creation.'
  ELSE contract_terms
END,
updated_at = NOW()
WHERE contract_terms LIKE '%Dance to Dairy Queen%' 
   OR contract_terms LIKE '%TuneCore%' 
   OR contract_terms LIKE '%publishing%'
   OR contract_terms LIKE '%VIDEO ADVERTISING OPPORTUNITY%';