
export interface BulletinPost {
  id: string;
  title: string;
  content: string;
  image_url?: string;
  link_url?: string;
  post_type?: string;
  created_at: string;
  merchant_id: string;
  uploaded_image_url?: string;
  video_url?: string;
  media_type?: string;
  is_paid_livestream?: boolean;
  livestream_credits_per_minute?: number;
  scheduled_at?: string;
  timezone?: string;
  room_id?: string;
  session_ended_at?: string;
  contract_type?: string;
  profiles: {
    display_name: string;
    avatar_url: string;
    is_admin?: boolean;
    user_type?: string;
  };
}
