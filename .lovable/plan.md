

## Plan: Token Economics Calculator Skeleton (Admin Only)

### What
Create a new card component for a digital token/coin calculator with placeholder fields, placed directly beneath the quarterly income / SE Tax Calculator section in the admin dashboard header area.

### Implementation

1. **Create `src/components/TokenCalculatorCard.tsx`**
   - A Card with title "Token Economics Calculator" styled consistently with existing dashboard cards (dark theme: `bg-gray-800/50 border-gray-700`)
   - Six read-only placeholder fields in descending order:
     - Tokens Purchased
     - Initial Price Per Token
     - Full Market Cap
     - Circulating Supply
     - Tokens Left
     - New Price Per Token
   - Each field: a label + an input (disabled, with placeholder value like "$0.00" or "0")
   - No calculations wired up yet — pure skeleton

2. **Integrate in `src/components/dashboard/DashboardHeader.tsx`**
   - Import `TokenCalculatorCard`
   - Render it directly beneath the existing financial reports / SE Calculator green banner
   - Wrap in `isAdmin` conditional so only the admin sees it

