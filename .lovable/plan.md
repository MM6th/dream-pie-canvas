

## Fix: Portfolio Edit Modal Black Screen

### Root Cause

The `PortfolioEditModal` uses `<SelectItem value="">` for the "No music" option in the background music selector (line 576 of PortfolioEditModal.tsx). **Radix UI's `Select` component does not allow empty strings as values** — this causes the component to crash on render. The dialog overlay (dark background) appears, but the content crashes and unmounts, leaving a black screen.

The same issue also exists in `EditVideoModal.tsx` (line 251).

### Fix

1. **PortfolioEditModal.tsx** — Change `<SelectItem value="">` to `<SelectItem value="none">` and update the `onValueChange` handler and the `value` prop to map `null`/empty to `"none"` and `"none"` back to `null`.

2. **EditVideoModal.tsx** — Apply the same fix for consistency and to prevent the same crash there.

### Specific Changes

**PortfolioEditModal.tsx:**
- Line 570: Change `value={image.background_music_url || ""}` to `value={image.background_music_url || "none"}`
- Line 571: Change `onValueChange={(value) => handleBackgroundMusicChange(image.id, value)}` to `onValueChange={(value) => handleBackgroundMusicChange(image.id, value === "none" ? "" : value)}`
- Line 576: Change `<SelectItem value="">` to `<SelectItem value="none">`

**EditVideoModal.tsx:**
- Apply the same pattern: replace `value=""` with `value="none"` and adjust the handler.

