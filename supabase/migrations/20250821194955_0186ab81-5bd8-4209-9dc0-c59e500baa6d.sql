-- Update existing ASMR submission contracts with new 50% back-end royalty terms
UPDATE public.contracts 
SET contract_terms = 'ASMR SUBMISSION AGREEMENT

This agreement establishes the terms for the approved ASMR submission.

OPPORTUNITY DETAILS:
- Advance Fee: $0
- Back-end Royalties: Contractor receives 50% of net revenue from back-end royalties

REVENUE SHARING TERMS:
- Back-end Royalties: When enabled, contractor receives 50% of net revenue generated from the ASMR content after platform processing fees
- Revenue sharing applies to secondary sales, licensing, and other monetization of the approved ASMR content
- Revenue calculations exclude payment processing fees and platform operational costs

TERMS AND CONDITIONS:
- The Independent Contractor grants non-exclusive rights to use the submitted ASMR content
- Content may be used on PIE platform and partner platforms
- Contractor retains rights to use content on their own platforms
- Payment as specified will be provided upon contract execution
- Usage rights are non-exclusive, allowing contractor personal use

CONTRACTOR OBLIGATIONS:
- Maintain quality standards for all submissions
- Comply with platform content guidelines and requirements
- Provide accurate information in application

PLATFORM OBLIGATIONS:
- Timely payment according to agreed terms
- Accurate revenue reporting when back-end royalties apply
- Proper attribution when required by platform
- Professional communication throughout process

By signing below, both parties agree to these terms and conditions.',
updated_at = NOW()
WHERE contract_type = 'asmr_submission' 
AND status = 'pending';