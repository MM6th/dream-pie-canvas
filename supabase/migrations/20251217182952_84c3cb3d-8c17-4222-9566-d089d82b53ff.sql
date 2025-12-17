-- Create notification for existing pending follow request
INSERT INTO notifications (user_id, type, title, message)
VALUES (
  '4516ab9a-6452-4cfe-96e0-32f3d3eeb77c',
  'follow_request',
  'New Follow Request',
  'Chauncey Moore wants to follow you. Check your dashboard to accept or decline.'
);