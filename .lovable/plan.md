
# Make Astrology Delivery UI Match Product Type (Audio vs Video)

## Problem
When an astrology product is purchased, the admin delivery card always shows video recording and video uploading components -- even when the purchased product is an audio-type reading. The system needs to differentiate between audio and video delivery types and show the appropriate upload interface.

## Solution
Since the `astrology_products` table already stores `delivery_type` (which can be `telephone`, `audio_file`, or `video_file`), we just need to:
1. Fetch the `delivery_type` from the joined `astrology_products` in the delivery query
2. Show audio upload UI for `audio_file` products and video record/upload UI for `video_file` products
3. Create an audio file uploader component for audio deliveries
4. Update the buyer-side library to handle audio playback vs video playback

No database migration is needed -- the data is already there.

## Changes

### 1. Update `AstrologyDeliveryManager.tsx` (Admin Side)
- Expand the `astrology_products` join to include `delivery_type` alongside `title`
- Update the `Delivery` interface to include `delivery_type` from the product
- For `audio_file` products: show "Record Audio" / "Upload Audio" buttons instead of video buttons
- For `video_file` products: keep existing video recording and uploading UI
- For `telephone` products: show a simpler "Mark as Completed" flow (no file upload needed)

### 2. Create new `AudioFileUploader.tsx` component
- Similar to `VideoFileUploader.tsx` but for audio files
- Accepts MP3, WAV, M4A, OGG formats
- Shows audio preview player instead of video player
- Uses TUS resumable upload with progress tracking
- Has "Save as Draft" and "Submit to Buyer" buttons
- Includes Cancel button to return to the delivery card

### 3. Update `BuyerAstrologyLibrary.tsx` (Buyer Side)
- Fetch `delivery_type` from the joined `astrology_products`
- For audio deliveries: show an audio player (`<audio>` tag) instead of a video player
- Update download to use appropriate file extension (.mp3 vs .mp4)
- Update labels: "Listen to Reading" vs "Watch Reading"

### 4. Update `AstrologyDeliveryManager.tsx` button labels
- Change "Record Video" / "Upload Video" to "Record Audio" / "Upload Audio" for audio products
- Change "Watch Complete Reading" to "Listen to Complete Reading" for audio products
- Ensure draft preview uses `<audio>` tag for audio products

## Technical Details

### Delivery interface update
```text
astrology_products: {
  title: string;
  delivery_type: string;  // <-- add this
}
```

### Conditional UI logic (simplified)
```text
if delivery_type === 'audio_file':
  Show AudioFileUploader (new component)
  Show audio player for previews
else if delivery_type === 'video_file':
  Show VideoRecorder / VideoFileUploader (existing)
  Show video player for previews
else (telephone):
  Show simplified completion UI
```

### AudioFileUploader component
- Mirrors `VideoFileUploader` structure
- Accepted formats: MP3, WAV, M4A, OGG, AAC
- Max file size: 100MB (same as video for non-admins)
- Uses same TUS upload mechanism to `user-media` bucket
- Saves to `astrology-deliveries/` path with audio file extension
- Updates same `astrology_deliveries` table fields (`admin_video_url`, `draft_video_url`, etc.)
