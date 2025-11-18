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
      album_tracks: {
        Row: {
          album_id: string
          audio_product_id: string
          created_at: string | null
          featuring_artist_name: string | null
          featuring_artist_paypal: string | null
          featuring_artist_user_id: string | null
          featuring_percentage: number | null
          id: string
          track_number: number
          updated_at: string | null
        }
        Insert: {
          album_id: string
          audio_product_id: string
          created_at?: string | null
          featuring_artist_name?: string | null
          featuring_artist_paypal?: string | null
          featuring_artist_user_id?: string | null
          featuring_percentage?: number | null
          id?: string
          track_number: number
          updated_at?: string | null
        }
        Update: {
          album_id?: string
          audio_product_id?: string
          created_at?: string | null
          featuring_artist_name?: string | null
          featuring_artist_paypal?: string | null
          featuring_artist_user_id?: string | null
          featuring_percentage?: number | null
          id?: string
          track_number?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "album_tracks_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "album_tracks_audio_product_id_fkey"
            columns: ["audio_product_id"]
            isOneToOne: false
            referencedRelation: "audio_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "album_tracks_featuring_artist_user_id_fkey"
            columns: ["featuring_artist_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
        Relationships: [
          {
            foreignKeyName: "asmr_downloads_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
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
      astrology_deliveries: {
        Row: {
          admin_id: string
          admin_video_url: string | null
          astrology_product_id: string
          buyer_id: string
          buyer_video_url: string | null
          created_at: string
          delivered_at: string | null
          delivery_deadline: string
          id: string
          is_overdue: boolean | null
          overdue_message_sent: boolean | null
          purchase_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_id: string
          admin_video_url?: string | null
          astrology_product_id: string
          buyer_id: string
          buyer_video_url?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_deadline: string
          id?: string
          is_overdue?: boolean | null
          overdue_message_sent?: boolean | null
          purchase_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_id?: string
          admin_video_url?: string | null
          astrology_product_id?: string
          buyer_id?: string
          buyer_video_url?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_deadline?: string
          id?: string
          is_overdue?: boolean | null
          overdue_message_sent?: boolean | null
          purchase_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "astrology_deliveries_astrology_product_id_fkey"
            columns: ["astrology_product_id"]
            isOneToOne: false
            referencedRelation: "astrology_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "astrology_deliveries_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "astrology_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      astrology_products: {
        Row: {
          access_level: Database["public"]["Enums"]["access_level"] | null
          admin_id: string
          advertisement_video_url: string | null
          base_price: number
          buyer_email: string | null
          created_at: string
          delivery_type: Database["public"]["Enums"]["delivery_type"]
          description: string | null
          discount_percentage: number | null
          hours_selected: number | null
          id: string
          is_adult_content: boolean | null
          product_type: Database["public"]["Enums"]["astrology_product_type"]
          sale_end_date: string | null
          thumbnail_url: string | null
          title: string
          total_price: number
          updated_at: string
        }
        Insert: {
          access_level?: Database["public"]["Enums"]["access_level"] | null
          admin_id: string
          advertisement_video_url?: string | null
          base_price: number
          buyer_email?: string | null
          created_at?: string
          delivery_type: Database["public"]["Enums"]["delivery_type"]
          description?: string | null
          discount_percentage?: number | null
          hours_selected?: number | null
          id?: string
          is_adult_content?: boolean | null
          product_type: Database["public"]["Enums"]["astrology_product_type"]
          sale_end_date?: string | null
          thumbnail_url?: string | null
          title: string
          total_price: number
          updated_at?: string
        }
        Update: {
          access_level?: Database["public"]["Enums"]["access_level"] | null
          admin_id?: string
          advertisement_video_url?: string | null
          base_price?: number
          buyer_email?: string | null
          created_at?: string
          delivery_type?: Database["public"]["Enums"]["delivery_type"]
          description?: string | null
          discount_percentage?: number | null
          hours_selected?: number | null
          id?: string
          is_adult_content?: boolean | null
          product_type?: Database["public"]["Enums"]["astrology_product_type"]
          sale_end_date?: string | null
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
          featuring_artist_name: string | null
          featuring_artist_paypal: string | null
          featuring_artist_user_id: string | null
          featuring_percentage: number | null
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
          preview_duration: number | null
          preview_start_time: number | null
          preview_url: string | null
          price: number | null
          published_at: string | null
          status: string
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
          featuring_artist_name?: string | null
          featuring_artist_paypal?: string | null
          featuring_artist_user_id?: string | null
          featuring_percentage?: number | null
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
          preview_duration?: number | null
          preview_start_time?: number | null
          preview_url?: string | null
          price?: number | null
          published_at?: string | null
          status?: string
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
          featuring_artist_name?: string | null
          featuring_artist_paypal?: string | null
          featuring_artist_user_id?: string | null
          featuring_percentage?: number | null
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
          preview_duration?: number | null
          preview_start_time?: number | null
          preview_url?: string | null
          price?: number | null
          published_at?: string | null
          status?: string
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
          {
            foreignKeyName: "audio_products_featuring_artist_user_id_fkey"
            columns: ["featuring_artist_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      credit_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          paypal_order_id: string | null
          related_message_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          id?: string
          paypal_order_id?: string | null
          related_message_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          paypal_order_id?: string | null
          related_message_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      message_settings: {
        Row: {
          created_at: string
          credits_per_message: number
          enabled: boolean
          id: string
          merchant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          credits_per_message?: number
          enabled?: boolean
          id?: string
          merchant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          credits_per_message?: number
          enabled?: boolean
          id?: string
          merchant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_settings_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          created_at: string
          id: string
          read_at: string | null
          recipient_id: string
          sender_id: string
          subject: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id: string
          sender_id: string
          subject: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messaging_credits: {
        Row: {
          balance: number
          created_at: string
          id: string
          total_purchased: number
          total_spent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          total_purchased?: number
          total_spent?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          total_purchased?: number
          total_spent?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messaging_credits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
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
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean | null
          related_delivery_id: string | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean | null
          related_delivery_id?: string | null
          title: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean | null
          related_delivery_id?: string | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_revenue: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          metadata: Json | null
          revenue_type: string
          source_transaction_id: string | null
          source_user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          metadata?: Json | null
          revenue_type: string
          source_transaction_id?: string | null
          source_user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          metadata?: Json | null
          revenue_type?: string
          source_transaction_id?: string | null
          source_user_id?: string | null
        }
        Relationships: []
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
        Relationships: [
          {
            foreignKeyName: "podcast_downloads_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_images: {
        Row: {
          created_at: string
          display_order: number
          id: string
          image_path: string
          is_blurred: boolean
          media_type: string | null
          portfolio_id: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          image_path: string
          is_blurred?: boolean
          media_type?: string | null
          portfolio_id: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          image_path?: string
          is_blurred?: boolean
          media_type?: string | null
          portfolio_id?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_images_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_purchases: {
        Row: {
          amount_paid: number
          created_at: string
          id: string
          paypal_transaction_id: string | null
          portfolio_id: string
          purchase_date: string
          user_id: string
        }
        Insert: {
          amount_paid: number
          created_at?: string
          id?: string
          paypal_transaction_id?: string | null
          portfolio_id: string
          purchase_date?: string
          user_id: string
        }
        Update: {
          amount_paid?: number
          created_at?: string
          id?: string
          paypal_transaction_id?: string | null
          portfolio_id?: string
          purchase_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_purchases_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolios: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_for_sale: boolean
          price: number | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_for_sale?: boolean
          price?: number | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_for_sale?: boolean
          price?: number | null
          title?: string
          updated_at?: string
          user_id?: string
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
      profile_follow_requests: {
        Row: {
          created_at: string
          id: string
          intent_message: string
          requester_id: string
          status: string
          target_merchant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          intent_message: string
          requester_id: string
          status?: string
          target_merchant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          intent_message?: string
          requester_id?: string
          status?: string
          target_merchant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_follow_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_follow_requests_target_merchant_id_fkey"
            columns: ["target_merchant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_followers: {
        Row: {
          followed_at: string
          follower_id: string
          id: string
          merchant_id: string
        }
        Insert: {
          followed_at?: string
          follower_id: string
          id?: string
          merchant_id: string
        }
        Update: {
          followed_at?: string
          follower_id?: string
          id?: string
          merchant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_followers_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_followers_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          is_private: boolean | null
          last_name: string | null
          onlyfans_url: string | null
          paypal_email: string | null
          pinterest_url: string | null
          playlist_public: boolean | null
          profile_complete: boolean | null
          skills: string[] | null
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
          is_private?: boolean | null
          last_name?: string | null
          onlyfans_url?: string | null
          paypal_email?: string | null
          pinterest_url?: string | null
          playlist_public?: boolean | null
          profile_complete?: boolean | null
          skills?: string[] | null
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
          is_private?: boolean | null
          last_name?: string | null
          onlyfans_url?: string | null
          paypal_email?: string | null
          pinterest_url?: string | null
          playlist_public?: boolean | null
          profile_complete?: boolean | null
          skills?: string[] | null
          snapchat_url?: string | null
          updated_at?: string | null
          user_type?: string
          website?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      quarterly_income: {
        Row: {
          created_at: string
          id: string
          income_type: string
          quarter: number
          source_count: number
          total_income: number
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          income_type: string
          quarter: number
          source_count?: number
          total_income?: number
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          income_type?: string
          quarter?: number
          source_count?: number
          total_income?: number
          updated_at?: string
          user_id?: string
          year?: number
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
        Relationships: [
          {
            foreignKeyName: "fk_user_playlists_audio_product"
            columns: ["audio_product_id"]
            isOneToOne: false
            referencedRelation: "audio_products"
            referencedColumns: ["id"]
          },
        ]
      }
      user_purchases: {
        Row: {
          amount_paid: number | null
          audio_product_id: string
          created_at: string
          id: string
          is_free_download: boolean | null
          merchant_revenue_after_referral: number | null
          paypal_transaction_id: string | null
          purchase_date: string
          referrer_commission: number | null
          referrer_user_id: string | null
          user_id: string
        }
        Insert: {
          amount_paid?: number | null
          audio_product_id: string
          created_at?: string
          id?: string
          is_free_download?: boolean | null
          merchant_revenue_after_referral?: number | null
          paypal_transaction_id?: string | null
          purchase_date?: string
          referrer_commission?: number | null
          referrer_user_id?: string | null
          user_id: string
        }
        Update: {
          amount_paid?: number | null
          audio_product_id?: string
          created_at?: string
          id?: string
          is_free_download?: boolean | null
          merchant_revenue_after_referral?: number | null
          paypal_transaction_id?: string | null
          purchase_date?: string
          referrer_commission?: number | null
          referrer_user_id?: string | null
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
      user_roles: {
        Row: {
          granted_at: string | null
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
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
        Relationships: [
          {
            foreignKeyName: "video_ad_downloads_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
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
      can_view_private_profile: {
        Args: { profile_id: string; viewer_id: string }
        Returns: boolean
      }
      check_overdue_deliveries: { Args: never; Returns: undefined }
      clean_expired_astrology_cache: { Args: never; Returns: undefined }
      delete_audio_product_cascade: {
        Args: { p_merchant_id: string; p_product_id: string }
        Returns: boolean
      }
      distribute_featuring_artist_revenue: {
        Args: {
          p_album_id?: string
          p_audio_product_id: string
          p_purchase_id: string
          p_total_net_revenue: number
        }
        Returns: undefined
      }
      generate_receipt_number: { Args: never; Returns: string }
      get_user_storage_usage: { Args: { user_uuid: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { user_id: string }; Returns: boolean }
      is_approved_merchant: { Args: { user_id: string }; Returns: boolean }
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
      update_quarterly_income: {
        Args: { p_amount: number; p_income_type: string; p_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      access_level: "public" | "merchant_only" | "paid"
      app_role: "admin" | "merchant" | "supporter" | "moderator"
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
      app_role: ["admin", "merchant", "supporter", "moderator"],
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
