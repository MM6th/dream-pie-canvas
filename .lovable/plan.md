

## Fix Portfolio Profile Layout

### Problems Identified
1. **Inconsistent media dimensions** -- `aspect-[4/5]` with `object-contain` leaves uneven sizing and black bars
2. **Horizontal scrollbar** -- the side-by-side `flex` layout with `w-1/2` can overflow the grid container
3. **Too much empty space on the right** -- the 50/50 split wastes space when the "Most Recent Post" card is small

### Plan

#### 1. Fix PortfolioCard media (PortfolioCard.tsx)
- Change media container from `aspect-[4/5]` to `aspect-square` for uniform card sizes
- Switch `object-contain` to `object-cover` on both images and videos (user chose "fill frame")
- Keep `bg-black` and `rounded-lg overflow-hidden`

#### 2. Fix profile page layout (ProfilePage.tsx)
- Replace the `flex gap-6` + `w-1/2` side-by-side layout with a proper CSS grid: `grid grid-cols-1 lg:grid-cols-2 gap-6`
- Add `overflow-hidden` to the portfolio and post columns to prevent horizontal overflow
- Add `overflow-x-hidden` is already on the root div (line 279) which is good
- Ensure on mobile it stacks naturally as `grid-cols-1`

These two changes will make the media uniform, eliminate the horizontal scrollbar, and distribute space evenly between portfolio and posts.

