

## Plan: Live Challenge Test Page (Admin Only)

### What we're building
A standalone test page that replicates the contest split-screen wireframe layout without connecting to LiveKit or real contest data. Accessible only via a "Test Challenge UI" button next to the "Go Live" button on the admin dashboard. Hidden from all navigation bars.

### Steps

1. **Create `/src/pages/ContestTestPage.tsx`**
   - Static replica of the ContestSession split-screen layout (timer, challenge label, champion/challenger video panels with placeholder backgrounds, chat placeholders, tip meter placeholders, camera/mic/end buttons)
   - No LiveKit connection, no Supabase queries — purely visual wireframe with dummy data
   - "Back to Dashboard" button (top-left) that navigates to `/`
   - Full-height layout matching the real contest page

2. **Add route in `src/App.tsx`**
   - Add `/contest-test` route pointing to the new page
   - No nav bar link — only reachable via the dashboard button

3. **Update `src/components/dashboard/GoLiveCard.tsx`**
   - Add a "Test Challenge UI" button next to the existing "Go Live" button (admin-only)
   - Pass `isAdmin` prop down from `DashboardWidgets` → `GoLiveCard`
   - Button navigates to `/contest-test`

4. **Update `src/components/dashboard/merchant/DashboardWidgets.tsx`**
   - Pass `isAdmin` prop through to `GoLiveCard`

### Files affected
- **New**: `src/pages/ContestTestPage.tsx`
- **Edit**: `src/App.tsx` (add route)
- **Edit**: `src/components/dashboard/GoLiveCard.tsx` (add test button, accept `isAdmin` prop)
- **Edit**: `src/components/dashboard/merchant/DashboardWidgets.tsx` (pass `isAdmin` to GoLiveCard)

