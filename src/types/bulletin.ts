
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
  profiles: {
    display_name: string;
    avatar_url: string;
  };
}
