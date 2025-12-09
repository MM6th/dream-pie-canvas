-- Delete the test user from profiles (the auth.users entry will need to be deleted via Supabase dashboard)
DELETE FROM profiles WHERE email = 'chaunceymoore9@gmail.com';