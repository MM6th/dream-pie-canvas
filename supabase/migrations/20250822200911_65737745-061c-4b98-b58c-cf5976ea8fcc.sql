-- Update the ASMR product to be PIE exclusive so it shows the advance fee
UPDATE public.audio_products 
SET is_pie_exclusive = true 
WHERE id = 'd56dccaf-5bd7-4ae4-bd04-e93aa9c70da9';

-- Regenerate the contract with the correct terms
UPDATE public.contracts 
SET contract_terms = 'ASMR SUBMISSION AGREEMENT

This agreement establishes the terms for the approved ASMR submission.

OPPORTUNITY DETAILS:
- Deal Type: PIE Exclusive
- Advance Fee: $50
- Back-end Royalties: Contractor receives 50% of net revenue from back-end royalties

REVENUE SHARING TERMS:
- Back-end Royalties: When enabled, contractor receives 50% of net revenue generated from the ASMR content after platform processing fees
- Revenue sharing applies to secondary sales, licensing, and other monetization of the approved ASMR content
- Revenue calculations exclude payment processing fees and platform operational costs
- Content created under this agreement is exclusive to PIE for the agreed exclusivity period
- Contractor may not distribute identical content through other channels during exclusivity period

TERMS AND CONDITIONS:
- The Independent Contractor grants exclusive rights to use the submitted ASMR content
- Content may be used on PIE platform and partner platforms
- Contractor retains rights to use content on their own platforms after exclusivity period
- Payment as specified will be provided upon contract execution
- Usage rights are exclusive to PIE during agreed period

CONTRACTOR OBLIGATIONS:
- Maintain quality standards for all submissions
- Comply with platform content guidelines and requirements
- Provide accurate information in application
- Honor exclusivity terms for the agreed period

PLATFORM OBLIGATIONS:
- Timely payment according to agreed terms
- Accurate revenue reporting when back-end royalties apply
- Proper attribution when required by platform
- Professional communication throughout process

By signing below, both parties agree to these terms and conditions.',
updated_at = NOW()
WHERE id = '90a6cc64-b04c-4591-844a-bfc4bc893e19';