-- Update existing video ad contracts to use TikTok-specific terms
UPDATE public.contracts 
SET contract_terms = 'EXCLUSIVE PIE INDEPENDENT CONTRACT

This agreement establishes the terms for exclusive content creation for PIE and related platforms.

OPPORTUNITY DETAILS:
- Target Platform: TIKTOK
- Cash Advance Payment: $' || (
  SELECT payment_amount::text 
  FROM public.video_ad_opportunities 
  WHERE id = contracts.video_ad_opportunity_id
) || '
- Audio Type: ' || UPPER((
  SELECT audio_type::text 
  FROM public.video_ad_opportunities 
  WHERE id = contracts.video_ad_opportunity_id
)) || '

EXCLUSIVE CONTENT TERMS:
- The Independent Contractor agrees to create content exclusively for PIE for the target platform
- Content will be distributed on the specified target platform: TIKTOK
- All content created under this agreement is exclusive to PIE for the target platform

REVENUE SHARING TERMS:
- Cash Advance: $' || (
  SELECT payment_amount::text 
  FROM public.video_ad_opportunities 
  WHERE id = contracts.video_ad_opportunity_id
) || ' (paid upon contract execution)
- TIKTOK Revenue Share: 50% of net advertisement revenues (after platform transaction fees)
- Revenue sharing applies to advertisement revenue from TIKTOK
- Transaction fees (platform fees, payment processing) are deducted before revenue split calculation

CONTRACTOR OBLIGATIONS:
- Create high-quality video content using provided audio materials
- Maintain professional standards for all content distributed on TIKTOK
- Comply with TIKTOK content guidelines and requirements
- Provide content exclusively to PIE for the target platform
- Meet agreed-upon deadlines and specifications
- Maintain professional communication throughout the project

PLATFORM OBLIGATIONS:
- Provide cash advance payment upon contract execution
- Distribute content on the specified target platform: TIKTOK
- Provide transparent monthly revenue reporting for TIKTOK advertisement revenue
- Process revenue sharing payments according to platform payout schedules
- Maintain professional project management and support

EXCLUSIVITY TERMS:
- Content created under this agreement is exclusive to PIE for the target platform
- Contractor may not distribute identical content through other channels during exclusivity period
- PIE retains exclusive rights for the specified target platform distribution and monetization
- Usage rights are exclusive to PIE for the target platform only

By signing below, both parties agree to these terms and conditions for exclusive PIE content creation.'
WHERE contract_type = 'video_ad_opportunity';