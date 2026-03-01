

## Plan: NFT Registry for Audio Products + Asset Ledger Page

### Overview
Three main deliverables: (1) make thumbnail mandatory in the audio upload modal, (2) register each audio product as an in-app NFT with SIXTH token valuation, and (3) build a dedicated "My Assets" ledger page for users to view their owned NFTs and token holdings.

### To your question
Yes -- virtually every Web3 platform has a dedicated asset/portfolio page. OpenSea has "My Collection," MetaMask has "NFTs," and exchanges like Coinbase Wallet show a full ledger. We should absolutely implement one. It will reinforce the financial literacy mission and give users a tangible view of what they own and its value in SIXTH tokens.

---

### 1. Make Thumbnail Mandatory in Audio Upload Modal

**File:** `src/components/AudioUploadModal.tsx`

- Change the thumbnail label from "Thumbnail Image (Optional)" to "Thumbnail Image (Required) *" for all audio types (not just albums)
- Add `required` attribute to the thumbnail input for single uploads
- Add validation in `handleSubmit` for single uploads: if no thumbnail, show error toast and block submission
- This ensures every audio product has artwork that can serve as its NFT visual

### 2. Database: Create `audio_nfts` Registry Table

**Migration SQL:**
- New table `audio_nfts` with columns:
  - `id` (uuid, PK)
  - `audio_product_id` (uuid, FK to audio_products, unique)
  - `owner_id` (uuid, FK to profiles) -- current owner
  - `minted_by` (uuid, FK to profiles) -- original creator
  - `token_id` (serial, unique) -- sequential NFT token ID for display
  - `minted_at` (timestamptz)
  - `sixth_value_at_mint` (numeric) -- spot price when minted
  - `metadata` (jsonb) -- title, artist, thumbnail_url snapshot
  - `created_at`, `updated_at`
- RLS: users can read all NFTs, only system (via trigger) can insert
- Database trigger on `audio_products` INSERT: when `status = 'published'` and `thumbnail_url IS NOT NULL`, auto-create an `audio_nfts` record with the current SIXTH spot price
- Also create a trigger for existing products that get a thumbnail added via UPDATE

### 3. NFT Detail Modal Component

**New file:** `src/components/NFTDetailModal.tsx`

- Dialog modal showing:
  - Large thumbnail image
  - NFT token ID (e.g., "SIXTH-NFT #42")
  - Title, artist name
  - Current SIXTH value (calculated from spot price at mint vs. current spot price)
  - Value at mint vs. current value comparison
  - Owner info
  - Minted date

### 4. Add NFT Link Under Thumbnails in Audio Players

**Files:** `src/components/AudioPlayer.tsx`, `src/components/MusicPlayer.tsx`

- Below the thumbnail in the track info section, add a small clickable link: "View NFT"
- Clicking opens the `NFTDetailModal` with the current track's NFT data
- Fetch NFT data from `audio_nfts` table by `audio_product_id`
- Only show the link if an NFT record exists for that track

### 5. "My Assets" Ledger Page

**New file:** `src/pages/MyAssets.tsx`

A dedicated page accessible from the dashboard with:
- **Token Holdings Card**: SIXTH balance, current spot price, total USD value
- **NFT Collection Table/Grid**: All audio NFTs owned by the user
  - Thumbnail, title, artist, NFT ID, minted date
  - Value at mint (SIXTH), current value (SIXTH), gain/loss indicator
  - Click any row to open `NFTDetailModal`
- **Transaction History Section**: Pull from `user_purchases` and `platform_revenue` to show buy/sell history

**Route:** Add `/my-assets` route in `src/App.tsx`

**Navigation:** Add a link to My Assets from the supporter/merchant dashboard (button or sidebar link)

### 6. Backfill Existing Audio Products

- Run a one-time migration to create `audio_nfts` records for all existing `audio_products` that have `thumbnail_url IS NOT NULL` and `status = 'published'`
- Use the current spot price as their mint value

---

### Technical Notes
- The NFT valuation uses the same bonding curve math from `useSpotPrice.tsx` -- value = (current spot price / spot price at mint) ratio applied to the original
- No actual blockchain interaction yet -- this is the in-app NFT registry that prepares for future Web3 migration
- The `audio_nfts` table structure mirrors what would map to an ERC-721 token when the platform transitions to on-chain

