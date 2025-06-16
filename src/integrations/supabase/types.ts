export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      albums: {
        Row: {
          created_at: string
          description: string | null
          id: string
          merchant_id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          merchant_id: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          merchant_id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      audio_products: {
        Row: {
          access_level: Database["public"]["Enums"]["access_level"] | null
          album_id: string | null
          artist_name: string | null
          audio_file_url: string
          audio_type: string
          created_at: string
          id: string
          is_free: boolean
          merchant_id: string
          price: number | null
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          access_level?: Database["public"]["Enums"]["access_level"] | null
          album_id?: string | null
          artist_name?: string | null
          audio_file_url: string
          audio_type: string
          created_at?: string
          id?: string
          is_free?: boolean
          merchant_id: string
          price?: number | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          access_level?: Database["public"]["Enums"]["access_level"] | null
          album_id?: string | null
          artist_name?: string | null
          audio_file_url?: string
          audio_type?: string
          created_at?: string
          id?: string
          is_free?: boolean
          merchant_id?: string
          price?: number | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audio_products_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums"
            referencedColumns: ["id"]
          },
        ]
      }
      bulletin_posts: {
        Row: {
          content: string
          created_at: string
          id: string
          image_url: string | null
          link_url: string | null
          merchant_id: string
          post_type: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          link_url?: string | null
          merchant_id: string
          post_type?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          link_url?: string | null
          merchant_id?: string
          post_type?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bulletin_posts_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fashion_product_images: {
        Row: {
          created_at: string
          display_order: number
          fashion_product_id: string
          id: string
          image_url: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          fashion_product_id: string
          id?: string
          image_url: string
        }
        Update: {
          created_at?: string
          display_order?: number
          fashion_product_id?: string
          id?: string
          image_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "fashion_product_images_fashion_product_id_fkey"
            columns: ["fashion_product_id"]
            isOneToOne: false
            referencedRelation: "fashion_products"
            referencedColumns: ["id"]
          },
        ]
      }
      fashion_product_variants: {
        Row: {
          color: Database["public"]["Enums"]["fashion_color"]
          created_at: string
          fashion_product_id: string
          id: string
          size: Database["public"]["Enums"]["fashion_size"]
          stock_quantity: number
          updated_at: string
        }
        Insert: {
          color: Database["public"]["Enums"]["fashion_color"]
          created_at?: string
          fashion_product_id: string
          id?: string
          size: Database["public"]["Enums"]["fashion_size"]
          stock_quantity?: number
          updated_at?: string
        }
        Update: {
          color?: Database["public"]["Enums"]["fashion_color"]
          created_at?: string
          fashion_product_id?: string
          id?: string
          size?: Database["public"]["Enums"]["fashion_size"]
          stock_quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fashion_product_variants_fashion_product_id_fkey"
            columns: ["fashion_product_id"]
            isOneToOne: false
            referencedRelation: "fashion_products"
            referencedColumns: ["id"]
          },
        ]
      }
      fashion_products: {
        Row: {
          access_level: string | null
          admin_id: string
          created_at: string
          description: string | null
          id: string
          materials: string | null
          price: number
          shipping_cost: number
          tax_rate: number
          title: string
          updated_at: string
        }
        Insert: {
          access_level?: string | null
          admin_id: string
          created_at?: string
          description?: string | null
          id?: string
          materials?: string | null
          price: number
          shipping_cost?: number
          tax_rate?: number
          title: string
          updated_at?: string
        }
        Update: {
          access_level?: string | null
          admin_id?: string
          created_at?: string
          description?: string | null
          id?: string
          materials?: string | null
          price?: number
          shipping_cost?: number
          tax_rate?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      fashion_purchases: {
        Row: {
          created_at: string
          fashion_product_id: string
          id: string
          paypal_transaction_id: string | null
          purchase_date: string
          quantity: number
          shipping_cost: number
          tax_amount: number
          total_amount: number
          unit_price: number
          user_id: string
          variant_id: string
        }
        Insert: {
          created_at?: string
          fashion_product_id: string
          id?: string
          paypal_transaction_id?: string | null
          purchase_date?: string
          quantity?: number
          shipping_cost: number
          tax_amount: number
          total_amount: number
          unit_price: number
          user_id: string
          variant_id: string
        }
        Update: {
          created_at?: string
          fashion_product_id?: string
          id?: string
          paypal_transaction_id?: string | null
          purchase_date?: string
          quantity?: number
          shipping_cost?: number
          tax_amount?: number
          total_amount?: number
          unit_price?: number
          user_id?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fashion_purchases_fashion_product_id_fkey"
            columns: ["fashion_product_id"]
            isOneToOne: false
            referencedRelation: "fashion_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fashion_purchases_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "fashion_product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      modeling_applications: {
        Row: {
          admin_notes: string | null
          application_photos: string[]
          created_at: string
          fashion_product_id: string
          id: string
          merchant_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          application_photos?: string[]
          created_at?: string
          fashion_product_id: string
          id?: string
          merchant_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          application_photos?: string[]
          created_at?: string
          fashion_product_id?: string
          id?: string
          merchant_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      post_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          post_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          post_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          post_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "bulletin_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "bulletin_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          approval_status: string | null
          avatar_url: string | null
          background_image_url: string | null
          contact_email: string | null
          created_at: string | null
          display_name: string | null
          email: string
          facebook_url: string | null
          id: string
          instagram_url: string | null
          is_admin: boolean | null
          onlyfans_url: string | null
          paypal_email: string | null
          pinterest_url: string | null
          snapchat_url: string | null
          updated_at: string | null
          user_type: string
          youtube_url: string | null
        }
        Insert: {
          approval_status?: string | null
          avatar_url?: string | null
          background_image_url?: string | null
          contact_email?: string | null
          created_at?: string | null
          display_name?: string | null
          email: string
          facebook_url?: string | null
          id: string
          instagram_url?: string | null
          is_admin?: boolean | null
          onlyfans_url?: string | null
          paypal_email?: string | null
          pinterest_url?: string | null
          snapchat_url?: string | null
          updated_at?: string | null
          user_type: string
          youtube_url?: string | null
        }
        Update: {
          approval_status?: string | null
          avatar_url?: string | null
          background_image_url?: string | null
          contact_email?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string
          facebook_url?: string | null
          id?: string
          instagram_url?: string | null
          is_admin?: boolean | null
          onlyfans_url?: string | null
          paypal_email?: string | null
          pinterest_url?: string | null
          snapchat_url?: string | null
          updated_at?: string | null
          user_type?: string
          youtube_url?: string | null
        }
        Relationships: []
      }
      song_cover_submissions: {
        Row: {
          admin_notes: string | null
          audio_product_id: string
          cover_image_url: string
          created_at: string
          id: string
          merchant_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submission_notes: string | null
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          audio_product_id: string
          cover_image_url: string
          created_at?: string
          id?: string
          merchant_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submission_notes?: string | null
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          audio_product_id?: string
          cover_image_url?: string
          created_at?: string
          id?: string
          merchant_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submission_notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_purchases: {
        Row: {
          amount_paid: number | null
          audio_product_id: string
          created_at: string
          id: string
          is_free_download: boolean | null
          paypal_transaction_id: string | null
          purchase_date: string
          user_id: string
        }
        Insert: {
          amount_paid?: number | null
          audio_product_id: string
          created_at?: string
          id?: string
          is_free_download?: boolean | null
          paypal_transaction_id?: string | null
          purchase_date?: string
          user_id: string
        }
        Update: {
          amount_paid?: number | null
          audio_product_id?: string
          created_at?: string
          id?: string
          is_free_download?: boolean | null
          paypal_transaction_id?: string | null
          purchase_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_purchases_audio_product_id_fkey"
            columns: ["audio_product_id"]
            isOneToOne: false
            referencedRelation: "audio_products"
            referencedColumns: ["id"]
          },
        ]
      }
      user_uploads: {
        Row: {
          created_at: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          storage_bucket: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id?: string
          storage_bucket?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          storage_bucket?: string | null
          user_id?: string
        }
        Relationships: []
      }
      video_products: {
        Row: {
          background_music_url: string | null
          created_at: string
          description: string | null
          id: string
          is_free: boolean
          merchant_id: string
          price: number | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_file_url: string
          video_type: string
        }
        Insert: {
          background_music_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_free?: boolean
          merchant_id: string
          price?: number | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_file_url: string
          video_type: string
        }
        Update: {
          background_music_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_free?: boolean
          merchant_id?: string
          price?: number | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_file_url?: string
          video_type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_user_upload: {
        Args: { user_uuid: string; new_file_size: number }
        Returns: boolean
      }
      get_user_storage_usage: {
        Args: { user_uuid: string }
        Returns: number
      }
      is_admin: {
        Args: { user_id: string }
        Returns: boolean
      }
      is_approved_merchant: {
        Args: { user_id: string }
        Returns: boolean
      }
      update_cover_submission_status: {
        Args: {
          submission_id: string
          new_status: string
          admin_notes_text?: string
        }
        Returns: boolean
      }
      update_merchant_approval: {
        Args: { merchant_id: string; new_status: string }
        Returns: boolean
      }
    }
    Enums: {
      access_level: "public" | "merchant_only" | "paid"
      fashion_color:
        | "black"
        | "white"
        | "nude"
        | "red"
        | "blue"
        | "pink"
        | "green"
      fashion_size: "XS" | "S" | "M" | "L" | "XL" | "2XL"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      access_level: ["public", "merchant_only", "paid"],
      fashion_color: ["black", "white", "nude", "red", "blue", "pink", "green"],
      fashion_size: ["XS", "S", "M", "L", "XL", "2XL"],
    },
  },
} as const
