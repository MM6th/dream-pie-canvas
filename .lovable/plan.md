
# Podcast Settings System Implementation Plan

## Overview
This plan implements two key features:
1. **Data Fix**: Update the Venus tier podcast ("Noc BeTeck Interview") from chaunceymoore9@gmail.com to have the description: "Benjiman interviews people on the website, and invites co-hosts for discussions"
2. **New Feature**: Create a "Podcast Settings" modal that allows each podcaster to define their own default settings (tier descriptions, default thumbnail, default tier) which will auto-populate when uploading new podcasts

---

## Current Architecture Understanding

The podcast system currently uses:
- `podcast_recordings` table: Stores individual podcast recordings with `subscription_tier`, `tier_description`, and `thumbnail_url`
- `audio_products` table: Stores the published store listing for podcasts
- Hardcoded tier descriptions in `SUBSCRIPTION_TIERS` constant (e.g., "Benjiman discussing dreams, topics that are mysterious, and occult")

**Problem**: All podcasters currently see the same hardcoded tier descriptions, which are specific to Benjiman/chaunceymoore9@gmail.com.

---

## Solution Architecture

### Database Changes

Create a new `podcast_settings` table to store per-merchant podcast defaults:

```sql
CREATE TABLE public.podcast_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  default_thumbnail_url TEXT,
  moon_tier_description TEXT,
  venus_tier_description TEXT,
  jupiter_tier_description TEXT,
  default_tier TEXT DEFAULT 'moon',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

RLS Policies:
- Users can view/update their own settings
- Insert allowed for authenticated users (their own row only)

---

### Component Changes

#### 1. New Component: `PodcastSettingsModal.tsx`
A modal triggered by a "Podcast Settings" button in the Podcaster Dashboard that allows merchants to configure:
- Default thumbnail (with upload capability)
- Custom tier descriptions for Moon, Venus, and Jupiter tiers
- Default subscription tier selection

#### 2. Update `PodcastRecordingsLibrary.tsx`
- Add a "Podcast Settings" button (gear icon) near the upload section
- Opens the new PodcastSettingsModal

#### 3. Update `PodcastPublishModal.tsx` and `PodcastEditModal.tsx`
- Fetch the merchant's podcast settings on modal open
- Pre-populate tier descriptions from settings instead of hardcoded `SUBSCRIPTION_TIERS`
- Pre-populate thumbnail from settings if no thumbnail exists
- Pre-select the default tier from settings

#### 4. Update `PodcastRecordingsLibrary.tsx` Upload Section
- Fetch podcast settings when opening upload dialog
- Pre-fill thumbnail and tier from saved settings

---

### Data Migration

Update the Venus tier podcast for chaunceymoore9@gmail.com:
```sql
UPDATE podcast_recordings 
SET tier_description = 'Benjiman interviews people on the website, and invites co-hosts for discussions'
WHERE id = '7de1624e-9aa1-46ea-ad7d-9ac7a5cc12af';
```

---

## Detailed Implementation Steps

### Step 1: Database Migration
- Create `podcast_settings` table with columns for each tier's custom description
- Add RLS policies for user self-management
- Run data update for the Venus tier podcast

### Step 2: Create PodcastSettingsModal Component
Location: `src/components/podcast/PodcastSettingsModal.tsx`

Features:
- Thumbnail upload with preview
- Three textarea fields for Moon/Venus/Jupiter tier descriptions with placeholders showing the intended purpose
- Tier dropdown to set default subscription tier
- Save and Cancel buttons
- Fetches existing settings on open, saves on submit

### Step 3: Integrate Settings Button
Add a Settings gear icon button in `PodcastRecordingsLibrary.tsx` header area that opens the modal

### Step 4: Modify Publishing and Edit Modals
Update `PodcastPublishModal.tsx` and `PodcastEditModal.tsx`:
- Add a query to fetch `podcast_settings` for the current user
- Replace hardcoded `SUBSCRIPTION_TIERS[tier].description` with the user's custom description (falling back to default if not set)
- Pre-populate thumbnail from settings when no thumbnail exists
- Use default tier from settings

### Step 5: Modify Upload Dialog in Library
Update the upload section in `PodcastRecordingsLibrary.tsx`:
- Fetch podcast settings when dialog opens
- Pre-fill thumbnail preview from settings
- Pre-select tier from settings

---

## Technical Details

### File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `supabase/migrations/` | New | Create podcast_settings table, RLS, update Venus podcast |
| `src/components/podcast/PodcastSettingsModal.tsx` | New | Settings modal component |
| `src/components/podcast/PodcastRecordingsLibrary.tsx` | Edit | Add settings button, integrate settings fetch in upload |
| `src/components/podcast/PodcastPublishModal.tsx` | Edit | Fetch and use custom tier descriptions |
| `src/components/podcast/PodcastEditModal.tsx` | Edit | Fetch and use custom tier descriptions |

### User Experience Flow

1. **First-time setup**: Podcaster clicks "Podcast Settings" gear icon in their dashboard
2. **Configure settings**: They enter their custom tier descriptions (e.g., "Premium interviews with industry experts") and optionally upload a default thumbnail
3. **Upload new podcast**: When recording/uploading a new podcast, the tier description field auto-populates with their custom text
4. **Publish/Edit**: The publish modal shows their custom tier descriptions instead of the default Benjiman-specific text

---

## Edge Cases Handled

- **No settings exist**: Falls back to generic tier descriptions ("Basic monthly access", "Premium monthly access", "VIP monthly access")
- **Partial settings**: Only override fields that have values; use defaults for empty fields
- **Existing podcasts**: Existing tier descriptions on published podcasts remain unchanged; only new uploads get the defaults
