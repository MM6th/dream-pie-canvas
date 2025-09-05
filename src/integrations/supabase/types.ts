export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
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
      asmr_downloads: {
        Row: {
          audio_product_id: string
          contract_generated: boolean | null
          contract_id: string | null
          created_at: string
          downloaded_at: string
          id: string
          merchant_id: string
          negotiation_message: string | null
          why_me_text: string | null
        }
        Insert: {
          audio_product_id: string
          contract_generated?: boolean | null
          contract_id?: string | null
          created_at?: string
          downloaded_at?: string
          id?: string
          merchant_id: string
          negotiation_message?: string | null
          why_me_text?: string | null
        }
        Update: {
          audio_product_id?: string
          contract_generated?: boolean | null
          contract_id?: string | null
          created_at?: string
          downloaded_at?: string
          id?: string
          merchant_id?: string
          negotiation_message?: string | null
          why_me_text?: string | null
        }
        Relationships: []
      }
      asmr_submissions: {
        Row: {
          admin_notes: string | null
          audio_product_id: string
          contract_generated_at: string | null
          contract_id: string | null
          cover_photos: string[] | null
          created_at: string
          id: string
          merchant_id: string
          negotiation_text: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submission_audio_url: string
          updated_at: string
          why_me_text: string | null
        }
        Insert: {
          admin_notes?: string | null
          audio_product_id: string
          contract_generated_at?: string | null
          contract_id?: string | null
          cover_photos?: string[] | null
          created_at?: string
          id?: string
          merchant_id: string
          negotiation_text?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submission_audio_url: string
          updated_at?: string
          why_me_text?: string | null
        }
        Update: {
          admin_notes?: string | null
          audio_product_id?: string
          contract_generated_at?: string | null
          contract_id?: string | null
          cover_photos?: string[] | null
          created_at?: string
          id?: string
          merchant_id?: string
          negotiation_text?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submission_audio_url?: string
          updated_at?: string
          why_me_text?: string | null
        }
        Relationships: []
      }
      astrology_cache: {
        Row: {
          cache_key: string
          created_at: string
          expires_at: string
          id: string
          response_data: Json
        }
        Insert: {
          cache_key: string
          created_at?: string
          expires_at: string
          id?: string
          response_data: Json
        }
        Update: {
          cache_key?: string
          created_at?: string
          expires_at?: string
          id?: string
          response_data?: Json
        }
        Relationships: []
      }
      astrology_products: {
        Row: {
          access_level: Database["public"]["Enums"]["access_level"] | null
          admin_id: string
          base_price: number
          buyer_email: string | null
          created_at: string
          delivery_type: Database["public"]["Enums"]["delivery_type"]
          description: string | null
          hours_selected: number | null
          id: string
          is_adult_content: boolean | null
          product_type: Database["public"]["Enums"]["astrology_product_type"]
          thumbnail_url: string | null
          title: string
          total_price: number
          updated_at: string
        }
        Insert: {
          access_level?: Database["public"]["Enums"]["access_level"] | null
          admin_id: string
          base_price: number
          buyer_email?: string | null
          created_at?: string
          delivery_type: Database["public"]["Enums"]["delivery_type"]
          description?: string | null
          hours_selected?: number | null
          id?: string
          is_adult_content?: boolean | null
          product_type: Database["public"]["Enums"]["astrology_product_type"]
          thumbnail_url?: string | null
          title: string
          total_price: number
          updated_at?: string
        }
        Update: {
          access_level?: Database["public"]["Enums"]["access_level"] | null
          admin_id?: string
          base_price?: number
          buyer_email?: string | null
          created_at?: string
          delivery_type?: Database["public"]["Enums"]["delivery_type"]
          description?: string | null
          hours_selected?: number | null
          id?: string
          is_adult_content?: boolean | null
          product_type?: Database["public"]["Enums"]["astrology_product_type"]
          thumbnail_url?: string | null
          title?: string
          total_price?: number
          updated_at?: string
        }
        Relationships: []
      }
      astrology_purchases: {
        Row: {
          amount_paid: number
          astrology_product_id: string
          buyer_email: string
          created_at: string
          delivery_type: Database["public"]["Enums"]["delivery_type"]
          hours_purchased: number | null
          id: string
          paypal_transaction_id: string | null
          purchase_date: string
          status: string | null
          user_id: string
        }
        Insert: {
          amount_paid: number
          astrology_product_id: string
          buyer_email: string
          created_at?: string
          delivery_type: Database["public"]["Enums"]["delivery_type"]
          hours_purchased?: number | null
          id?: string
          paypal_transaction_id?: string | null
          purchase_date?: string
          status?: string | null
          user_id: string
        }
        Update: {
          amount_paid?: number
          astrology_product_id?: string
          buyer_email?: string
          created_at?: string
          delivery_type?: Database["public"]["Enums"]["delivery_type"]
          hours_purchased?: number | null
          id?: string
          paypal_transaction_id?: string | null
          purchase_date?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "astrology_purchases_astrology_product_id_fkey"
            columns: ["astrology_product_id"]
            isOneToOne: false
            referencedRelation: "astrology_products"
            referencedColumns: ["id"]
          },
        ]
      }
      astrology_readings: {
        Row: {
          astrology_product_id: string
          birth_data_id: string
          charts_data: Json | null
          generated_at: string
          id: string
          is_purchased: boolean
          purchase_id: string | null
          reading_content: Json
          reading_type: string
          user_id: string
        }
        Insert: {
          astrology_product_id: string
          birth_data_id: string
          charts_data?: Json | null
          generated_at?: string
          id?: string
          is_purchased?: boolean
          purchase_id?: string | null
          reading_content: Json
          reading_type: string
          user_id: string
        }
        Update: {
          astrology_product_id?: string
          birth_data_id?: string
          charts_data?: Json | null
          generated_at?: string
          id?: string
          is_purchased?: boolean
          purchase_id?: string | null
          reading_content?: Json
          reading_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_astrology_readings_birth_data_id"
            columns: ["birth_data_id"]
            isOneToOne: false
            referencedRelation: "user_birth_data"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_astrology_readings_product_id"
            columns: ["astrology_product_id"]
            isOneToOne: false
            referencedRelation: "astrology_products"
            referencedColumns: ["id"]
          },
        ]
      }
      audio_products: {
        Row: {
          access_level: Database["public"]["Enums"]["access_level"] | null
          advance_fee_rate: number | null
          album_id: string | null
          artist_name: string | null
          audio_file_url: string
          audio_type: string
          back_end_royalties: boolean | null
          cover_photos: string[] | null
          created_at: string
          description: string | null
          id: string
          is_adult_content: boolean | null
          is_free: boolean
          is_pie_exclusive: boolean | null
          max_downloads: number | null
          merchant_id: string
          number_of_opportunities: number | null
          opportunities_exhausted: boolean | null
          pie_photo_editing: boolean | null
          pie_video_price: number | null
          podcast_contract_generated: boolean | null
          price: number | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          youtube_membership_fee: number | null
        }
        Insert: {
          access_level?: Database["public"]["Enums"]["access_level"] | null
          advance_fee_rate?: number | null
          album_id?: string | null
          artist_name?: string | null
          audio_file_url: string
          audio_type: string
          back_end_royalties?: boolean | null
          cover_photos?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          is_adult_content?: boolean | null
          is_free?: boolean
          is_pie_exclusive?: boolean | null
          max_downloads?: number | null
          merchant_id: string
          number_of_opportunities?: number | null
          opportunities_exhausted?: boolean | null
          pie_photo_editing?: boolean | null
          pie_video_price?: number | null
          podcast_contract_generated?: boolean | null
          price?: number | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          youtube_membership_fee?: number | null
        }
        Update: {
          access_level?: Database["public"]["Enums"]["access_level"] | null
          advance_fee_rate?: number | null
          album_id?: string | null
          artist_name?: string | null
          audio_file_url?: string
          audio_type?: string
          back_end_royalties?: boolean | null
          cover_photos?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          is_adult_content?: boolean | null
          is_free?: boolean
          is_pie_exclusive?: boolean | null
          max_downloads?: number | null
          merchant_id?: string
          number_of_opportunities?: number | null
          opportunities_exhausted?: boolean | null
          pie_photo_editing?: boolean | null
          pie_video_price?: number | null
          podcast_contract_generated?: boolean | null
          price?: number | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          youtube_membership_fee?: number | null
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
          contract_generated: boolean | null
          contract_type: string | null
          created_at: string
          id: string
          image_url: string | null
          is_adult_content: boolean | null
          link_url: string | null
          media_type: string | null
          merchant_id: string
          number_of_opportunities: number | null
          pie_contractor_share: number | null
          pie_episode_cost: number | null
          post_type: string | null
          title: string
          updated_at: string
          uploaded_image_url: string | null
          video_url: string | null
          youtube_contractor_share: number | null
        }
        Insert: {
          content: string
          contract_generated?: boolean | null
          contract_type?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_adult_content?: boolean | null
          link_url?: string | null
          media_type?: string | null
          merchant_id: string
          number_of_opportunities?: number | null
          pie_contractor_share?: number | null
          pie_episode_cost?: number | null
          post_type?: string | null
          title: string
          updated_at?: string
          uploaded_image_url?: string | null
          video_url?: string | null
          youtube_contractor_share?: number | null
        }
        Update: {
          content?: string
          contract_generated?: boolean | null
          contract_type?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_adult_content?: boolean | null
          link_url?: string | null
          media_type?: string | null
          merchant_id?: string
          number_of_opportunities?: number | null
          pie_contractor_share?: number | null
          pie_episode_cost?: number | null
          post_type?: string | null
          title?: string
          updated_at?: string
          uploaded_image_url?: string | null
          video_url?: string | null
          youtube_contractor_share?: number | null
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
      contracts: {
        Row: {
          admin_signature: string | null
          contract_terms: string
          contract_type: string
          cover_submission_id: string | null
          created_at: string
          deleted_by_merchant: boolean | null
          id: string
          merchant_deletion_date: string | null
          merchant_id: string
          merchant_signature: string | null
          modeling_application_id: string | null
          signed_at: string | null
          status: string
          tunecore_terms_accepted: boolean | null
          updated_at: string
          video_ad_opportunity_id: string | null
          video_ad_submission_id: string | null
        }
        Insert: {
          admin_signature?: string | null
          contract_terms: string
          contract_type: string
          cover_submission_id?: string | null
          created_at?: string
          deleted_by_merchant?: boolean | null
          id?: string
          merchant_deletion_date?: string | null
          merchant_id: string
          merchant_signature?: string | null
          modeling_application_id?: string | null
          signed_at?: string | null
          status?: string
          tunecore_terms_accepted?: boolean | null
          updated_at?: string
          video_ad_opportunity_id?: string | null
          video_ad_submission_id?: string | null
        }
        Update: {
          admin_signature?: string | null
          contract_terms?: string
          contract_type?: string
          cover_submission_id?: string | null
          created_at?: string
          deleted_by_merchant?: boolean | null
          id?: string
          merchant_deletion_date?: string | null
          merchant_id?: string
          merchant_signature?: string | null
          modeling_application_id?: string | null
          signed_at?: string | null
          status?: string
          tunecore_terms_accepted?: boolean | null
          updated_at?: string
          video_ad_opportunity_id?: string | null
          video_ad_submission_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_cover_submission_id_fkey"
            columns: ["cover_submission_id"]
            isOneToOne: false
            referencedRelation: "song_cover_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_modeling_application_id_fkey"
            columns: ["modeling_application_id"]
            isOneToOne: false
            referencedRelation: "modeling_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_receipts: {
        Row: {
          admin_id: string
          contract_id: string
          created_at: string
          generated_at: string
          id: string
          merchant_id: string
          receipt_data: Json
          receipt_number: string
          sent_to_admin: boolean | null
          sent_to_merchant: boolean | null
        }
        Insert: {
          admin_id: string
          contract_id: string
          created_at?: string
          generated_at?: string
          id?: string
          merchant_id: string
          receipt_data: Json
          receipt_number: string
          sent_to_admin?: boolean | null
          sent_to_merchant?: boolean | null
        }
        Update: {
          admin_id?: string
          contract_id?: string
          created_at?: string
          generated_at?: string
          id?: string
          merchant_id?: string
          receipt_data?: Json
          receipt_number?: string
          sent_to_admin?: boolean | null
          sent_to_merchant?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "digital_receipts_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_receipts_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_receipts_merchant_id_fkey"
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
          access_level: Database["public"]["Enums"]["access_level"] | null
          admin_id: string
          created_at: string
          description: string | null
          id: string
          is_adult_content: boolean | null
          materials: string | null
          price: number
          shipping_cost: number
          tax_rate: number
          title: string
          updated_at: string
        }
        Insert: {
          access_level?: Database["public"]["Enums"]["access_level"] | null
          admin_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_adult_content?: boolean | null
          materials?: string | null
          price: number
          shipping_cost?: number
          tax_rate?: number
          title: string
          updated_at?: string
        }
        Update: {
          access_level?: Database["public"]["Enums"]["access_level"] | null
          admin_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_adult_content?: boolean | null
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
          contract_generated_at: string | null
          contract_id: string | null
          created_at: string
          fashion_product_id: string
          id: string
          merchant_id: string
          requires_contract: boolean | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          application_photos?: string[]
          contract_generated_at?: string | null
          contract_id?: string | null
          created_at?: string
          fashion_product_id: string
          id?: string
          merchant_id: string
          requires_contract?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          application_photos?: string[]
          contract_generated_at?: string | null
          contract_id?: string | null
          created_at?: string
          fashion_product_id?: string
          id?: string
          merchant_id?: string
          requires_contract?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_modeling_applications_fashion_product"
            columns: ["fashion_product_id"]
            isOneToOne: false
            referencedRelation: "fashion_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_modeling_applications_merchant"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_modeling_applications_reviewer"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modeling_applications_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      podcast_downloads: {
        Row: {
          audio_product_id: string
          contract_generated: boolean | null
          contract_id: string | null
          created_at: string
          downloaded_at: string
          id: string
          merchant_id: string
        }
        Insert: {
          audio_product_id: string
          contract_generated?: boolean | null
          contract_id?: string | null
          created_at?: string
          downloaded_at?: string
          id?: string
          merchant_id: string
        }
        Update: {
          audio_product_id?: string
          contract_generated?: boolean | null
          contract_id?: string | null
          created_at?: string
          downloaded_at?: string
          id?: string
          merchant_id?: string
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
      product_reviews: {
        Row: {
          astrology_product_id: string
          created_at: string
          id: string
          rating: number
          review_text: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          astrology_product_id: string
          created_at?: string
          id?: string
          rating: number
          review_text?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          astrology_product_id?: string
          created_at?: string
          id?: string
          rating?: number
          review_text?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_product_reviews_astrology_product"
            columns: ["astrology_product_id"]
            isOneToOne: false
            referencedRelation: "astrology_products"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          adult_content_restricted: boolean | null
          approval_status: string | null
          avatar_url: string | null
          background_image_url: string | null
          business_description: string | null
          business_name: string | null
          contact_email: string | null
          created_at: string | null
          display_name: string | null
          email: string
          facebook_url: string | null
          first_name: string | null
          id: string
          instagram_url: string | null
          is_admin: boolean | null
          is_adult_creator: boolean | null
          last_name: string | null
          onlyfans_url: string | null
          paypal_email: string | null
          pinterest_url: string | null
          snapchat_url: string | null
          updated_at: string | null
          user_type: string
          website: string | null
          youtube_url: string | null
        }
        Insert: {
          adult_content_restricted?: boolean | null
          approval_status?: string | null
          avatar_url?: string | null
          background_image_url?: string | null
          business_description?: string | null
          business_name?: string | null
          contact_email?: string | null
          created_at?: string | null
          display_name?: string | null
          email: string
          facebook_url?: string | null
          first_name?: string | null
          id: string
          instagram_url?: string | null
          is_admin?: boolean | null
          is_adult_creator?: boolean | null
          last_name?: string | null
          onlyfans_url?: string | null
          paypal_email?: string | null
          pinterest_url?: string | null
          snapchat_url?: string | null
          updated_at?: string | null
          user_type: string
          website?: string | null
          youtube_url?: string | null
        }
        Update: {
          adult_content_restricted?: boolean | null
          approval_status?: string | null
          avatar_url?: string | null
          background_image_url?: string | null
          business_description?: string | null
          business_name?: string | null
          contact_email?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string
          facebook_url?: string | null
          first_name?: string | null
          id?: string
          instagram_url?: string | null
          is_admin?: boolean | null
          is_adult_creator?: boolean | null
          last_name?: string | null
          onlyfans_url?: string | null
          paypal_email?: string | null
          pinterest_url?: string | null
          snapchat_url?: string | null
          updated_at?: string | null
          user_type?: string
          website?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      song_cover_submissions: {
        Row: {
          admin_notes: string | null
          audio_product_id: string
          contract_generated_at: string | null
          contract_id: string | null
          cover_image_url: string
          created_at: string
          id: string
          merchant_id: string
          requires_contract: boolean | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submission_notes: string | null
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          audio_product_id: string
          contract_generated_at?: string | null
          contract_id?: string | null
          cover_image_url: string
          created_at?: string
          id?: string
          merchant_id: string
          requires_contract?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submission_notes?: string | null
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          audio_product_id?: string
          contract_generated_at?: string | null
          contract_id?: string | null
          cover_image_url?: string
          created_at?: string
          id?: string
          merchant_id?: string
          requires_contract?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submission_notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "song_cover_submissions_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_birth_data: {
        Row: {
          birth_city: string
          birth_country: string
          birth_date: string
          birth_state: string | null
          birth_time: string
          created_at: string
          id: string
          latitude: number
          longitude: number
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          birth_city: string
          birth_country: string
          birth_date: string
          birth_state?: string | null
          birth_time: string
          created_at?: string
          id?: string
          latitude: number
          longitude: number
          timezone: string
          updated_at?: string
          user_id: string
        }
        Update: {
          birth_city?: string
          birth_country?: string
          birth_date?: string
          birth_state?: string | null
          birth_time?: string
          created_at?: string
          id?: string
          latitude?: number
          longitude?: number
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_playlists: {
        Row: {
          audio_product_id: string
          created_at: string
          display_order: number
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          audio_product_id: string
          created_at?: string
          display_order?: number
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          audio_product_id?: string
          created_at?: string
          display_order?: number
          id?: string
          updated_at?: string
          user_id?: string
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
      video_ad_downloads: {
        Row: {
          contract_generated: boolean | null
          contract_id: string | null
          created_at: string
          downloaded_at: string
          id: string
          merchant_id: string
          video_ad_opportunity_id: string
        }
        Insert: {
          contract_generated?: boolean | null
          contract_id?: string | null
          created_at?: string
          downloaded_at?: string
          id?: string
          merchant_id: string
          video_ad_opportunity_id: string
        }
        Update: {
          contract_generated?: boolean | null
          contract_id?: string | null
          created_at?: string
          downloaded_at?: string
          id?: string
          merchant_id?: string
          video_ad_opportunity_id?: string
        }
        Relationships: []
      }
      video_ad_opportunities: {
        Row: {
          access_level: Database["public"]["Enums"]["access_level"] | null
          admin_id: string
          artist_name: string | null
          audio_file_url: string
          audio_type: Database["public"]["Enums"]["audio_type_enum"]
          available_spots: number
          created_at: string
          description: string | null
          id: string
          is_adult_content: boolean | null
          payment_amount: number
          target_platform: Database["public"]["Enums"]["social_media_platform"]
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          access_level?: Database["public"]["Enums"]["access_level"] | null
          admin_id: string
          artist_name?: string | null
          audio_file_url: string
          audio_type: Database["public"]["Enums"]["audio_type_enum"]
          available_spots?: number
          created_at?: string
          description?: string | null
          id?: string
          is_adult_content?: boolean | null
          payment_amount: number
          target_platform: Database["public"]["Enums"]["social_media_platform"]
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          access_level?: Database["public"]["Enums"]["access_level"] | null
          admin_id?: string
          artist_name?: string | null
          audio_file_url?: string
          audio_type?: Database["public"]["Enums"]["audio_type_enum"]
          available_spots?: number
          created_at?: string
          description?: string | null
          id?: string
          is_adult_content?: boolean | null
          payment_amount?: number
          target_platform?: Database["public"]["Enums"]["social_media_platform"]
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      video_ad_submissions: {
        Row: {
          admin_notes: string | null
          audio_sync_offset: number | null
          background_audio_volume: number | null
          contract_generated_at: string | null
          contract_id: string | null
          created_at: string
          id: string
          merchant_id: string
          mixing_preferences: Json | null
          negotiation_text: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          video_ad_opportunity_id: string
          video_audio_volume: number | null
          video_file_url: string
          why_me_text: string | null
        }
        Insert: {
          admin_notes?: string | null
          audio_sync_offset?: number | null
          background_audio_volume?: number | null
          contract_generated_at?: string | null
          contract_id?: string | null
          created_at?: string
          id?: string
          merchant_id: string
          mixing_preferences?: Json | null
          negotiation_text?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          video_ad_opportunity_id: string
          video_audio_volume?: number | null
          video_file_url: string
          why_me_text?: string | null
        }
        Update: {
          admin_notes?: string | null
          audio_sync_offset?: number | null
          background_audio_volume?: number | null
          contract_generated_at?: string | null
          contract_id?: string | null
          created_at?: string
          id?: string
          merchant_id?: string
          mixing_preferences?: Json | null
          negotiation_text?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          video_ad_opportunity_id?: string
          video_audio_volume?: number | null
          video_file_url?: string
          why_me_text?: string | null
        }
        Relationships: []
      }
      video_products: {
        Row: {
          access_level: Database["public"]["Enums"]["access_level"] | null
          background_music_url: string | null
          created_at: string
          description: string | null
          id: string
          is_adult_content: boolean | null
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
          access_level?: Database["public"]["Enums"]["access_level"] | null
          background_music_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_adult_content?: boolean | null
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
          access_level?: Database["public"]["Enums"]["access_level"] | null
          background_music_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_adult_content?: boolean | null
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
        Args: { new_file_size: number; user_uuid: string }
        Returns: boolean
      }
      clean_expired_astrology_cache: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      generate_receipt_number: {
        Args: Record<PropertyKey, never>
        Returns: string
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
          admin_notes_text?: string
          new_status: string
          submission_id: string
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
      astrology_product_type:
        | "natal_chart_reading"
        | "solar_return_reading"
        | "north_node_reading"
        | "career_path_reading"
      audio_type_enum: "music" | "podcast" | "asmr" | "spoken"
      delivery_type: "telephone" | "audio_file" | "video_file"
      fashion_color:
        | "black"
        | "white"
        | "nude"
        | "red"
        | "blue"
        | "pink"
        | "green"
      fashion_size: "XS" | "S" | "M" | "L" | "XL" | "2XL"
      social_media_platform:
        | "facebook"
        | "instagram"
        | "youtube"
        | "x"
        | "tiktok"
        | "onlyfans"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      access_level: ["public", "merchant_only", "paid"],
      astrology_product_type: [
        "natal_chart_reading",
        "solar_return_reading",
        "north_node_reading",
        "career_path_reading",
      ],
      audio_type_enum: ["music", "podcast", "asmr", "spoken"],
      delivery_type: ["telephone", "audio_file", "video_file"],
      fashion_color: ["black", "white", "nude", "red", "blue", "pink", "green"],
      fashion_size: ["XS", "S", "M", "L", "XL", "2XL"],
      social_media_platform: [
        "facebook",
        "instagram",
        "youtube",
        "x",
        "tiktok",
        "onlyfans",
      ],
    },
  },
} as const
