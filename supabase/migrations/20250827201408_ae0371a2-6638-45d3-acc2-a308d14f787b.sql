-- Update existing ASMR submission contract with enhanced terms including 2-year exclusivity and quarterly payouts
UPDATE public.contracts 
SET contract_terms = 'ASMR SUBMISSION AGREEMENT

This agreement establishes the terms for the approved ASMR submission.

OPPORTUNITY DETAILS:
- Deal Type: PIE Exclusive (2-Year Exclusivity Period)
- Advance Fee: $50
- Back-end Royalties: Contractor receives 50% of net revenue from back-end royalties
- Exclusivity Duration: 2 years from contract execution date

REVENUE SHARING TERMS:
- Back-end Royalties: When enabled, contractor receives 50% of net revenue generated from the ASMR content after platform processing fees
- Revenue sharing applies to secondary sales, licensing, and other monetization of the approved ASMR content
- Revenue calculations exclude payment processing fees and platform operational costs
- Royalty Payout Schedule: Quarterly payments on March 30th, June 30th, September 30th, and December 30th
- Content created under this agreement is exclusive to PIE for a 2-year period from contract execution
- Contractor may not distribute identical content through other channels during the 2-year exclusivity period
- After the 2-year exclusivity period expires, contractor regains full distribution rights

TERMS AND CONDITIONS:
- The Independent Contractor grants exclusive rights to use the submitted ASMR content
- Content may be used on PIE platform and partner platforms
- Contractor retains rights to use content on their own platforms after the 2-year exclusivity period
- Payment as specified will be provided upon contract execution
- Usage rights are exclusive to PIE for 2 years from contract execution

CONTRACTOR OBLIGATIONS:
- Maintain quality standards for all submissions
- Comply with platform content guidelines and requirements
- Provide accurate information in application
- Honor 2-year exclusivity terms and refrain from distributing identical content elsewhere during this period

PLATFORM OBLIGATIONS:
- Timely payment according to agreed terms
- Accurate revenue reporting when back-end royalties apply
- Quarterly royalty payments on March 30th, June 30th, September 30th, and December 30th
- Proper attribution when required by platform
- Professional communication throughout process

By signing below, both parties agree to these terms and conditions.',
updated_at = NOW()
WHERE contract_type = 'asmr_submission' AND id = '90a6cc64-b04c-4591-844a-bfc4bc893e19'