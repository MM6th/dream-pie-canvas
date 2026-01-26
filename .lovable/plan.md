

## Plan: Track and Display Past Due Tax Amounts in Quarterly Due Dates Cards

### Overview
Create a system to automatically calculate and display tax liability amounts for each quarter in the Quarterly Due Dates section. For past due quarters (like Q4 2025), the card will show the estimated tax owed based on the user's income for that period.

---

### Current State Analysis

**What exists today:**
- `quarterly_income` table stores income totals by user, year, quarter, and income_type
- `QuarterlyDueDates` component displays static due dates with "Past Due" badges
- `SECalculatorModal` calculates taxes in real-time but does NOT persist results
- `useQuarterlyIncome` hook fetches only the CURRENT quarter's income

**What's missing:**
- No storage of calculated tax liabilities
- No ability to fetch historical quarter income
- No display of tax amounts on the quarterly due date cards

---

### Implementation Approach

I recommend a **hybrid approach**: 

1. **Automatic tax calculation** based on stored quarterly income (no manual save required)
2. **Optional persistence** of user-entered business expenses for more accurate calculations

This way, past due cards will always show an estimated tax amount based on actual income, even if the user never opened the calculator.

---

### Database Changes

**New Table: `quarterly_tax_settings`**
Stores user preferences for tax calculations (business expenses, filing status) that persist across sessions.

```text
+--------------------------------+
| quarterly_tax_settings         |
+--------------------------------+
| id (uuid, PK)                  |
| user_id (uuid, FK)             |
| year (integer)                 |
| quarter (integer)              |
| business_expenses (numeric)    |
| filing_status (text)           |
| previous_year_agi (numeric)    |
| created_at (timestamptz)       |
| updated_at (timestamptz)       |
+--------------------------------+
```

**RLS Policies:**
- Users can view/create/update their own settings
- Unique constraint on (user_id, year, quarter)

---

### File Changes

#### 1. Create New Hook: `src/hooks/useHistoricalQuarterlyIncome.tsx`

**Purpose:** Fetch income data for ALL quarters (not just current), enabling tax calculations for past periods.

**Key Features:**
- Fetches all quarterly_income records for a user
- Groups by year and quarter
- Calculates total income per quarter
- Fetches processing fees from platform_revenue for each quarter

**Returns:**
```typescript
{
  quarters: Array<{
    year: number;
    quarter: number;
    totalIncome: number;
    processingFees: number;
    incomeTypes: string[];
  }>;
  loading: boolean;
}
```

---

#### 2. Update Component: `src/components/QuarterlyDueDates.tsx`

**Changes:**
- Accept `userId` prop
- Import and use `useHistoricalQuarterlyIncome` hook
- Import tax calculation logic (extract from SECalculatorModal)
- For each quarter card, calculate and display:
  - Total income for that quarter
  - Estimated SE tax owed
  - Only show tax amount if income > 0

**New UI for Past Due Cards:**
```text
┌─────────────────────────────────────┐
│ Q4 2025                [Past Due]   │
│ Period: Oct 1 - Dec 31, 2025        │
│ Due: January 15, 2026               │
│                                     │
│ Income: $100.86                     │
│ Estimated Tax Due: $14.29           │
└─────────────────────────────────────┘
```

---

#### 3. Extract Tax Calculation Utility: `src/utils/taxCalculations.ts`

**Purpose:** Centralize tax calculation logic so it can be reused by both SECalculatorModal and QuarterlyDueDates.

**Functions:**
```typescript
export const calculateSelfEmploymentTax = (
  income: number,
  businessExpenses: number,
  processingFees: number
) => { ... }

export const calculateNYStateTax = (netEarnings: number) => { ... }

export const calculateQuarterlyTaxLiability = (
  income: number,
  businessExpenses: number,
  processingFees: number
) => {
  const netEarnings = Math.max(0, income + processingFees - businessExpenses);
  const seTax = calculateSelfEmploymentTax(netEarnings);
  const nyTax = calculateNYStateTax(netEarnings);
  return { netEarnings, seTax, nyTax, totalDue: seTax + nyTax };
}
```

---

#### 4. Update Component: `src/components/SECalculatorModal.tsx`

**Changes:**
- Import shared tax calculation utilities
- Optionally save business expenses to `quarterly_tax_settings` when user calculates
- Add "Save Settings" button to persist expenses/filing status for future calculations

---

#### 5. Update Parent Components

**Files:** `src/components/dashboard/DashboardHeader.tsx`, `src/components/dashboard/merchant/ContentManagement.tsx`

**Changes:**
- Pass `userId` to QuarterlyDueDates component
- Ensure QuarterlyDueDates has access to user context

---

### Dynamic Year Support

To ensure the system works moving forward:

1. **Generate due dates dynamically** based on current year + 1 year ahead
2. **Fetch historical income** for past 2 years to cover all visible quarters
3. **Due date calculation logic:**
   - Q1 due: April 15
   - Q2 due: June 15 (or next business day)
   - Q3 due: September 15 (or next business day)
   - Q4 due: January 15 of next year

---

### Technical Details

**Tax Calculation Formula (for reference):**
```text
Net Earnings = Income + Processing Fees - Business Expenses
SE Tax = Net Earnings * 0.9235 * 0.153
NY State Tax = Progressive rate based on annualized income
Total Quarterly Due = SE Tax + NY State Tax
```

**Data Flow:**
```text
quarterly_income (DB)
       ↓
useHistoricalQuarterlyIncome (Hook)
       ↓
QuarterlyDueDates (Component)
       ↓
taxCalculations (Utility)
       ↓
Display in UI
```

---

### Summary of Changes

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/...` | CREATE | New `quarterly_tax_settings` table |
| `src/utils/taxCalculations.ts` | CREATE | Shared tax calculation functions |
| `src/hooks/useHistoricalQuarterlyIncome.tsx` | CREATE | Hook for fetching all quarters' income |
| `src/components/QuarterlyDueDates.tsx` | UPDATE | Add income/tax display, accept userId prop |
| `src/components/SECalculatorModal.tsx` | UPDATE | Use shared utilities, optional save |
| `src/components/dashboard/DashboardHeader.tsx` | UPDATE | Pass userId to QuarterlyDueDates |
| `src/integrations/supabase/types.ts` | AUTO-UPDATE | Types for new table |

---

### User Experience After Implementation

1. **Admin opens dashboard** - sees Q4 2025 card with "Past Due" badge AND the estimated $14.29 tax owed
2. **As new quarters complete** - tax amounts automatically appear on past due cards
3. **If user wants more accurate calculation** - they can open the SE Calculator, enter business expenses, and save those settings
4. **Settings persist** - next time they view past due cards, business expenses are factored in

