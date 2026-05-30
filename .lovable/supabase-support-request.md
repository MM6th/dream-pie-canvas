# Supabase Support Request — Temporary Access to Restricted Project

**To:** support@supabase.io (or via https://supabase.com/dashboard/support/new)
**Subject:** Request temporary Storage access on restricted project `veaupehwfsbagzfuvach` to delete oversized files

---

Hello Supabase Support,

My project **`veaupehwfsbagzfuvach`** (org: PIE Studio / pie-studio.com) is currently fully restricted with `exceed_storage_size_quota`. I understand the restriction is in place until I upgrade, but I am temporarily unable to upgrade the plan right now.

The overage is caused by just **two user accounts** uploading large audio files. If I can delete those two folders, the project will be back under the free-tier quota and the restriction can be lifted without an upgrade.

**Request:** Could you please grant me **temporary read/write access to the Storage dashboard only** (or temporarily lift the restriction for ~1 hour) so I can delete these two specific folders?

The folders I need to remove (in the `audio-files` bucket, and any other buckets where they exist):

1. `bb3dbb3c-c939-45f3-834f-b82a7e50dd21/` — user `chaunceymoore9@gmail.com` (display name: ratedBenjiman), ~420 MB
2. `d31a320c-e3bd-4816-b5ea-da1b169e3a93/` — user `cryptosixth6th@gmail.com` (display name: Observer), ~14 MB

I will **not** touch any other user's files. I have an automated cleanup edge function (`cleanup-user-files`) ready to run against just these two user IDs the moment access is restored, so this can be done in minutes.

If granting dashboard access isn't possible, an alternative that would help:
- Temporarily re-enable the Storage API (read + delete only) for ~1 hour, OR
- Delete those two folders on my behalf from your side

Project details:
- Project ref: `veaupehwfsbagzfuvach`
- Region: (fill in from dashboard if known)
- Plan: Free
- Email on account: (your email)

Thank you for any help you can offer — I'm trying to avoid losing all the other users' data by being forced into a full backend migration.

Best,
(Your name)
