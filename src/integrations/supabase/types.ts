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
          {
            foreignKeyName: "album_tracks_featuring_artist_user_id_fkey"
            columns: ["featuring_artist_user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_data"
            referencedColumns: ["id"]
          },
        ]
      }
      albums: {
        Row: {
          access_level: Database["public"]["Enums"]["access_level"] | null
          audio_type: string | null
          created_at: string
          description: string | null
          id: string
          is_adult_content: boolean | null
          is_free: boolean
          merchant_id: string
          name: string
          preview_track_id: string | null
          price: number | null
          published_at: string | null
          status: string
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          access_level?: Database["public"]["Enums"]["access_level"] | null
          audio_type?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_adult_content?: boolean | null
          is_free?: boolean
          merchant_id: string
          name: string
          preview_track_id?: string | null
          price?: number | null
          published_at?: string | null
          status?: string
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          access_level?: Database["public"]["Enums"]["access_level"] | null
          audio_type?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_adult_content?: boolean | null
          is_free?: boolean
          merchant_id?: string
          name?: string
          preview_track_id?: string | null
          price?: number | null
          published_at?: string | null
          status?: string
          thumbnail_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "albums_preview_track_id_fkey"
            columns: ["preview_track_id"]
            isOneToOne: false
            referencedRelation: "audio_products"
            referencedColumns: ["id"]
          },
        ]
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
          attachment_filename: string | null
          attachment_url: string | null
          buyer_id: string
          buyer_video_url: string | null
          created_at: string
          delivered_at: string | null
          delivery_deadline: string
          draft_saved_at: string | null
          draft_video_url: string | null
          id: string
          is_overdue: boolean | null
          overdue_message_sent: boolean | null
          purchase_id: string | null
          status: string
          updated_at: string
          video_segments: Json | null
        }
        Insert: {
          admin_id: string
          admin_video_url?: string | null
          astrology_product_id: string
          attachment_filename?: string | null
          attachment_url?: string | null
          buyer_id: string
          buyer_video_url?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_deadline: string
          draft_saved_at?: string | null
          draft_video_url?: string | null
          id?: string
          is_overdue?: boolean | null
          overdue_message_sent?: boolean | null
          purchase_id?: string | null
          status?: string
          updated_at?: string
          video_segments?: Json | null
        }
        Update: {
          admin_id?: string
          admin_video_url?: string | null
          astrology_product_id?: string
          attachment_filename?: string | null
          attachment_url?: string | null
          buyer_id?: string
          buyer_video_url?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_deadline?: string
          draft_saved_at?: string | null
          draft_video_url?: string | null
          id?: string
          is_overdue?: boolean | null
          overdue_message_sent?: boolean | null
          purchase_id?: string | null
          status?: string
          updated_at?: string
          video_segments?: Json | null
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
      audio_nfts: {
        Row: {
          audio_product_id: string
          created_at: string
          id: string
          metadata: Json | null
          minted_at: string
          minted_by: string
          owner_id: string
          sixth_value_at_mint: number
          token_id: number
          updated_at: string
        }
        Insert: {
          audio_product_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          minted_at?: string
          minted_by: string
          owner_id: string
          sixth_value_at_mint?: number
          token_id?: number
          updated_at?: string
        }
        Update: {
          audio_product_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          minted_at?: string
          minted_by?: string
          owner_id?: string
          sixth_value_at_mint?: number
          token_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audio_nfts_audio_product_id_fkey"
            columns: ["audio_product_id"]
            isOneToOne: true
            referencedRelation: "audio_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audio_nfts_minted_by_fkey"
            columns: ["minted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audio_nfts_minted_by_fkey"
            columns: ["minted_by"]
            isOneToOne: false
            referencedRelation: "public_profile_data"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audio_nfts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audio_nfts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "public_profile_data"
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
          {
            foreignKeyName: "audio_products_featuring_artist_user_id_fkey"
            columns: ["featuring_artist_user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_data"
            referencedColumns: ["id"]
          },
        ]
      }
      bulletin_posts: {
        Row: {
          challenge_time_limit_minutes: number | null
          challenge_type: string | null
          challenger1_purse: number | null
          challenger2_purse: number | null
          champion_purse: number | null
          champion_user_id: string | null
          content: string
          contract_generated: boolean | null
          contract_type: string | null
          created_at: string
          id: string
          image_url: string | null
          is_adult_content: boolean | null
          is_paid_livestream: boolean | null
          link_url: string | null
          livestream_credits_per_minute: number | null
          media_type: string | null
          merchant_id: string
          number_of_opportunities: number | null
          pie_contractor_share: number | null
          pie_episode_cost: number | null
          post_type: string | null
          room_id: string | null
          scheduled_at: string | null
          session_ended_at: string | null
          timezone: string | null
          title: string
          title_on_the_line: boolean | null
          updated_at: string
          uploaded_image_url: string | null
          video_url: string | null
          youtube_contractor_share: number | null
        }
        Insert: {
          challenge_time_limit_minutes?: number | null
          challenge_type?: string | null
          challenger1_purse?: number | null
          challenger2_purse?: number | null
          champion_purse?: number | null
          champion_user_id?: string | null
          content: string
          contract_generated?: boolean | null
          contract_type?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_adult_content?: boolean | null
          is_paid_livestream?: boolean | null
          link_url?: string | null
          livestream_credits_per_minute?: number | null
          media_type?: string | null
          merchant_id: string
          number_of_opportunities?: number | null
          pie_contractor_share?: number | null
          pie_episode_cost?: number | null
          post_type?: string | null
          room_id?: string | null
          scheduled_at?: string | null
          session_ended_at?: string | null
          timezone?: string | null
          title: string
          title_on_the_line?: boolean | null
          updated_at?: string
          uploaded_image_url?: string | null
          video_url?: string | null
          youtube_contractor_share?: number | null
        }
        Update: {
          challenge_time_limit_minutes?: number | null
          challenge_type?: string | null
          challenger1_purse?: number | null
          challenger2_purse?: number | null
          champion_purse?: number | null
          champion_user_id?: string | null
          content?: string
          contract_generated?: boolean | null
          contract_type?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_adult_content?: boolean | null
          is_paid_livestream?: boolean | null
          link_url?: string | null
          livestream_credits_per_minute?: number | null
          media_type?: string | null
          merchant_id?: string
          number_of_opportunities?: number | null
          pie_contractor_share?: number | null
          pie_episode_cost?: number | null
          post_type?: string | null
          room_id?: string | null
          scheduled_at?: string | null
          session_ended_at?: string | null
          timezone?: string | null
          title?: string
          title_on_the_line?: boolean | null
          updated_at?: string
          uploaded_image_url?: string | null
          video_url?: string | null
          youtube_contractor_share?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bulletin_posts_champion_user_id_fkey"
            columns: ["champion_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bulletin_posts_champion_user_id_fkey"
            columns: ["champion_user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_data"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bulletin_posts_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bulletin_posts_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "public_profile_data"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_acceptances: {
        Row: {
          accepted_at: string
          bulletin_post_id: string
          created_at: string
          id: string
          slot: string
          user_id: string
        }
        Insert: {
          accepted_at?: string
          bulletin_post_id: string
          created_at?: string
          id?: string
          slot: string
          user_id: string
        }
        Update: {
          accepted_at?: string
          bulletin_post_id?: string
          created_at?: string
          id?: string
          slot?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_acceptances_bulletin_post_id_fkey"
            columns: ["bulletin_post_id"]
            isOneToOne: false
            referencedRelation: "bulletin_posts"
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
            foreignKeyName: "contracts_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "public_profile_data"
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
          {
            foreignKeyName: "credit_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_data"
            referencedColumns: ["id"]
          },
        ]
      }
      dance_product_images: {
        Row: {
          created_at: string
          dance_product_id: string
          display_order: number
          id: string
          image_url: string
          is_blurred: boolean | null
          media_type: string | null
        }
        Insert: {
          created_at?: string
          dance_product_id: string
          display_order?: number
          id?: string
          image_url: string
          is_blurred?: boolean | null
          media_type?: string | null
        }
        Update: {
          created_at?: string
          dance_product_id?: string
          display_order?: number
          id?: string
          image_url?: string
          is_blurred?: boolean | null
          media_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dance_product_images_dance_product_id_fkey"
            columns: ["dance_product_id"]
            isOneToOne: false
            referencedRelation: "dance_products"
            referencedColumns: ["id"]
          },
        ]
      }
      dance_products: {
        Row: {
          access_level: Database["public"]["Enums"]["access_level"] | null
          created_at: string
          description: string | null
          id: string
          is_adult_content: boolean | null
          is_free: boolean
          merchant_id: string
          price: number | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          access_level?: Database["public"]["Enums"]["access_level"] | null
          created_at?: string
          description?: string | null
          id?: string
          is_adult_content?: boolean | null
          is_free?: boolean
          merchant_id: string
          price?: number | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          access_level?: Database["public"]["Enums"]["access_level"] | null
          created_at?: string
          description?: string | null
          id?: string
          is_adult_content?: boolean | null
          is_free?: boolean
          merchant_id?: string
          price?: number | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dance_products_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dance_products_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "public_profile_data"
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
            foreignKeyName: "digital_receipts_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "public_profile_data"
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
          {
            foreignKeyName: "digital_receipts_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "public_profile_data"
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
      film_downloads: {
        Row: {
          created_at: string
          downloaded_at: string
          film_product_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          downloaded_at?: string
          film_product_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          downloaded_at?: string
          film_product_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "film_downloads_film_product_id_fkey"
            columns: ["film_product_id"]
            isOneToOne: false
            referencedRelation: "film_products"
            referencedColumns: ["id"]
          },
        ]
      }
      film_products: {
        Row: {
          access_level: Database["public"]["Enums"]["access_level"] | null
          cover_photo_url: string | null
          created_at: string
          description: string | null
          download_count: number | null
          full_video_url: string | null
          genres: string[] | null
          id: string
          is_adult_content: boolean | null
          is_free: boolean
          merchant_id: string
          meter_reset_count: number | null
          ownership_confirmed: boolean
          price: number | null
          sales_count: number | null
          stars: string[] | null
          status: string
          thumbnail_url: string | null
          title: string
          trailer_url: string | null
          updated_at: string
        }
        Insert: {
          access_level?: Database["public"]["Enums"]["access_level"] | null
          cover_photo_url?: string | null
          created_at?: string
          description?: string | null
          download_count?: number | null
          full_video_url?: string | null
          genres?: string[] | null
          id?: string
          is_adult_content?: boolean | null
          is_free?: boolean
          merchant_id: string
          meter_reset_count?: number | null
          ownership_confirmed?: boolean
          price?: number | null
          sales_count?: number | null
          stars?: string[] | null
          status?: string
          thumbnail_url?: string | null
          title: string
          trailer_url?: string | null
          updated_at?: string
        }
        Update: {
          access_level?: Database["public"]["Enums"]["access_level"] | null
          cover_photo_url?: string | null
          created_at?: string
          description?: string | null
          download_count?: number | null
          full_video_url?: string | null
          genres?: string[] | null
          id?: string
          is_adult_content?: boolean | null
          is_free?: boolean
          merchant_id?: string
          meter_reset_count?: number | null
          ownership_confirmed?: boolean
          price?: number | null
          sales_count?: number | null
          stars?: string[] | null
          status?: string
          thumbnail_url?: string | null
          title?: string
          trailer_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "film_products_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "film_products_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "public_profile_data"
            referencedColumns: ["id"]
          },
        ]
      }
      film_purchases: {
        Row: {
          amount_paid: number
          created_at: string | null
          film_product_id: string
          id: string
          paypal_transaction_id: string | null
          purchase_date: string | null
          user_id: string
        }
        Insert: {
          amount_paid: number
          created_at?: string | null
          film_product_id: string
          id?: string
          paypal_transaction_id?: string | null
          purchase_date?: string | null
          user_id: string
        }
        Update: {
          amount_paid?: number
          created_at?: string | null
          film_product_id?: string
          id?: string
          paypal_transaction_id?: string | null
          purchase_date?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "film_purchases_film_product_id_fkey"
            columns: ["film_product_id"]
            isOneToOne: false
            referencedRelation: "film_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "film_purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "film_purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_data"
            referencedColumns: ["id"]
          },
        ]
      }
      film_reviews: {
        Row: {
          created_at: string | null
          film_product_id: string
          id: string
          rating: number
          review_text: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          film_product_id: string
          id?: string
          rating: number
          review_text?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          film_product_id?: string
          id?: string
          rating?: number
          review_text?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "film_reviews_film_product_id_fkey"
            columns: ["film_product_id"]
            isOneToOne: false
            referencedRelation: "film_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "film_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "film_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_data"
            referencedColumns: ["id"]
          },
        ]
      }
      film_scripts: {
        Row: {
          created_at: string
          id: string
          merchant_id: string
          script_content: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          merchant_id: string
          script_content?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          merchant_id?: string
          script_content?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "film_scripts_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "film_scripts_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "public_profile_data"
            referencedColumns: ["id"]
          },
        ]
      }
      food_product_images: {
        Row: {
          created_at: string
          display_order: number
          food_product_id: string
          id: string
          image_url: string
          media_type: string | null
        }
        Insert: {
          created_at?: string
          display_order?: number
          food_product_id: string
          id?: string
          image_url: string
          media_type?: string | null
        }
        Update: {
          created_at?: string
          display_order?: number
          food_product_id?: string
          id?: string
          image_url?: string
          media_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "food_product_images_food_product_id_fkey"
            columns: ["food_product_id"]
            isOneToOne: false
            referencedRelation: "food_products"
            referencedColumns: ["id"]
          },
        ]
      }
      food_products: {
        Row: {
          access_level: Database["public"]["Enums"]["access_level"] | null
          created_at: string
          description: string | null
          id: string
          is_adult_content: boolean | null
          merchant_id: string
          price: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          access_level?: Database["public"]["Enums"]["access_level"] | null
          created_at?: string
          description?: string | null
          id?: string
          is_adult_content?: boolean | null
          merchant_id: string
          price: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          access_level?: Database["public"]["Enums"]["access_level"] | null
          created_at?: string
          description?: string | null
          id?: string
          is_adult_content?: boolean | null
          merchant_id?: string
          price?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_products_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_products_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "public_profile_data"
            referencedColumns: ["id"]
          },
        ]
      }
      live_chat_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          stream_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          stream_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          stream_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_chat_messages_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
        ]
      }
      live_stream_signals: {
        Row: {
          created_at: string
          id: string
          sender_id: string
          signal_data: Json
          signal_type: string
          stream_id: string
          target_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          sender_id: string
          signal_data: Json
          signal_type: string
          stream_id: string
          target_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          sender_id?: string
          signal_data?: Json
          signal_type?: string
          stream_id?: string
          target_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "live_stream_signals_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
        ]
      }
      live_stream_tips: {
        Row: {
          amount: number
          created_at: string
          id: string
          recipient_id: string
          stream_id: string
          tipper_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          recipient_id: string
          stream_id: string
          tipper_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          recipient_id?: string
          stream_id?: string
          tipper_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_stream_tips_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
        ]
      }
      live_streams: {
        Row: {
          created_at: string
          credits_per_minute: number | null
          description: string | null
          ended_at: string | null
          id: string
          is_paid: boolean
          merchant_id: string
          started_at: string | null
          status: string
          thumbnail_url: string | null
          title: string
          updated_at: string
          viewer_count: number
        }
        Insert: {
          created_at?: string
          credits_per_minute?: number | null
          description?: string | null
          ended_at?: string | null
          id?: string
          is_paid?: boolean
          merchant_id: string
          started_at?: string | null
          status?: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          viewer_count?: number
        }
        Update: {
          created_at?: string
          credits_per_minute?: number | null
          description?: string | null
          ended_at?: string | null
          id?: string
          is_paid?: boolean
          merchant_id?: string
          started_at?: string | null
          status?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          viewer_count?: number
        }
        Relationships: []
      }
      livestream_entries: {
        Row: {
          bulletin_post_id: string
          credits_spent: number
          entered_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          bulletin_post_id: string
          credits_spent: number
          entered_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          bulletin_post_id?: string
          credits_spent?: number
          entered_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "livestream_entries_bulletin_post_id_fkey"
            columns: ["bulletin_post_id"]
            isOneToOne: false
            referencedRelation: "bulletin_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "livestream_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "livestream_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_data"
            referencedColumns: ["id"]
          },
        ]
      }
      livestream_settings: {
        Row: {
          created_at: string | null
          credits_per_minute: number | null
          enabled: boolean | null
          id: string
          merchant_id: string
          session_duration_minutes: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          credits_per_minute?: number | null
          enabled?: boolean | null
          id?: string
          merchant_id: string
          session_duration_minutes?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          credits_per_minute?: number | null
          enabled?: boolean | null
          id?: string
          merchant_id?: string
          session_duration_minutes?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "livestream_settings_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "livestream_settings_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: true
            referencedRelation: "public_profile_data"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_payouts: {
        Row: {
          amount: number
          created_at: string
          id: string
          merchant_id: string
          paid_at: string | null
          payment_due_date: string
          payment_notes: string | null
          status: string
          threshold_reached_at: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          merchant_id: string
          paid_at?: string | null
          payment_due_date?: string
          payment_notes?: string | null
          status?: string
          threshold_reached_at?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          merchant_id?: string
          paid_at?: string | null
          payment_due_date?: string
          payment_notes?: string | null
          status?: string
          threshold_reached_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_payouts_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_payouts_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "public_profile_data"
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
          {
            foreignKeyName: "message_settings_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: true
            referencedRelation: "public_profile_data"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_url: string | null
          audio_attachment_url: string | null
          body: string
          created_at: string
          id: string
          parent_message_id: string | null
          read_at: string | null
          recipient_id: string
          sender_id: string
          subject: string
          video_attachment_url: string | null
        }
        Insert: {
          attachment_url?: string | null
          audio_attachment_url?: string | null
          body: string
          created_at?: string
          id?: string
          parent_message_id?: string | null
          read_at?: string | null
          recipient_id: string
          sender_id: string
          subject: string
          video_attachment_url?: string | null
        }
        Update: {
          attachment_url?: string | null
          audio_attachment_url?: string | null
          body?: string
          created_at?: string
          id?: string
          parent_message_id?: string | null
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
          subject?: string
          video_attachment_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "public_profile_data"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "public_profile_data"
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
          {
            foreignKeyName: "messaging_credits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_profile_data"
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
            foreignKeyName: "fk_modeling_applications_merchant"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "public_profile_data"
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
            foreignKeyName: "fk_modeling_applications_reviewer"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "public_profile_data"
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
      one_on_one_chat_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          room_name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          room_name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          room_name?: string
          user_id?: string
        }
        Relationships: []
      }
      one_on_one_requests: {
        Row: {
          created_at: string
          credits_charged: number
          expires_at: string
          host_id: string
          id: string
          responded_at: string | null
          room_name: string | null
          status: string
          stream_id: string
          updated_at: string
          viewer_id: string
        }
        Insert: {
          created_at?: string
          credits_charged?: number
          expires_at?: string
          host_id: string
          id?: string
          responded_at?: string | null
          room_name?: string | null
          status?: string
          stream_id: string
          updated_at?: string
          viewer_id: string
        }
        Update: {
          created_at?: string
          credits_charged?: number
          expires_at?: string
          host_id?: string
          id?: string
          responded_at?: string | null
          room_name?: string | null
          status?: string
          stream_id?: string
          updated_at?: string
          viewer_id?: string
        }
        Relationships: []
      }
      one_on_one_tips: {
        Row: {
          amount: number
          created_at: string
          id: string
          recipient_id: string
          room_name: string
          tipper_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          recipient_id: string
          room_name: string
          tipper_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          recipient_id?: string
          room_name?: string
          tipper_id?: string
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
      podcast_cast_members: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          podcast_recording_id: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          podcast_recording_id: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          podcast_recording_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "podcast_cast_members_podcast_recording_id_fkey"
            columns: ["podcast_recording_id"]
            isOneToOne: false
            referencedRelation: "podcast_recordings"
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
      podcast_invitations: {
        Row: {
          accepted_at: string | null
          contract_id: string | null
          created_at: string
          declined_at: string | null
          guest_user_id: string
          host_user_id: string
          id: string
          message_id: string | null
          session_title: string
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          contract_id?: string | null
          created_at?: string
          declined_at?: string | null
          guest_user_id: string
          host_user_id: string
          id?: string
          message_id?: string | null
          session_title: string
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          contract_id?: string | null
          created_at?: string
          declined_at?: string | null
          guest_user_id?: string
          host_user_id?: string
          id?: string
          message_id?: string | null
          session_title?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "podcast_invitations_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "podcast_invitations_guest_user_id_fkey"
            columns: ["guest_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "podcast_invitations_guest_user_id_fkey"
            columns: ["guest_user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_data"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "podcast_invitations_host_user_id_fkey"
            columns: ["host_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "podcast_invitations_host_user_id_fkey"
            columns: ["host_user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_data"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "podcast_invitations_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      podcast_recordings: {
        Row: {
          audio_url: string
          created_at: string
          description: string | null
          duration_seconds: number | null
          file_size_bytes: number | null
          id: string
          merchant_id: string
          paypal_plan_id: string | null
          status: string
          subscription_enabled: boolean | null
          subscription_tier: string | null
          thumbnail_url: string | null
          tier_description: string | null
          title: string
          trailer_url: string | null
          updated_at: string
        }
        Insert: {
          audio_url: string
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          file_size_bytes?: number | null
          id?: string
          merchant_id: string
          paypal_plan_id?: string | null
          status?: string
          subscription_enabled?: boolean | null
          subscription_tier?: string | null
          thumbnail_url?: string | null
          tier_description?: string | null
          title: string
          trailer_url?: string | null
          updated_at?: string
        }
        Update: {
          audio_url?: string
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          file_size_bytes?: number | null
          id?: string
          merchant_id?: string
          paypal_plan_id?: string | null
          status?: string
          subscription_enabled?: boolean | null
          subscription_tier?: string | null
          thumbnail_url?: string | null
          tier_description?: string | null
          title?: string
          trailer_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "podcast_recordings_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "podcast_recordings_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "public_profile_data"
            referencedColumns: ["id"]
          },
        ]
      }
      podcast_session_participants: {
        Row: {
          created_at: string
          id: string
          is_muted: boolean | null
          joined_at: string | null
          left_at: string | null
          role: string
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_muted?: boolean | null
          joined_at?: string | null
          left_at?: string | null
          role?: string
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_muted?: boolean | null
          joined_at?: string | null
          left_at?: string | null
          role?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "podcast_session_participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "podcast_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "podcast_session_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "podcast_session_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_data"
            referencedColumns: ["id"]
          },
        ]
      }
      podcast_session_signals: {
        Row: {
          created_at: string
          from_user_id: string
          id: string
          session_id: string
          signal_data: Json | null
          signal_type: string
          to_user_id: string | null
        }
        Insert: {
          created_at?: string
          from_user_id: string
          id?: string
          session_id: string
          signal_data?: Json | null
          signal_type: string
          to_user_id?: string | null
        }
        Update: {
          created_at?: string
          from_user_id?: string
          id?: string
          session_id?: string
          signal_data?: Json | null
          signal_type?: string
          to_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "podcast_session_signals_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "podcast_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      podcast_sessions: {
        Row: {
          created_at: string
          description: string | null
          ended_at: string | null
          host_id: string
          id: string
          invite_token: string
          started_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          ended_at?: string | null
          host_id: string
          id?: string
          invite_token?: string
          started_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          ended_at?: string | null
          host_id?: string
          id?: string
          invite_token?: string
          started_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "podcast_sessions_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "podcast_sessions_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "public_profile_data"
            referencedColumns: ["id"]
          },
        ]
      }
      podcast_settings: {
        Row: {
          created_at: string | null
          default_thumbnail_url: string | null
          default_tier: string | null
          id: string
          jupiter_tier_description: string | null
          merchant_id: string
          moon_tier_description: string | null
          updated_at: string | null
          venus_tier_description: string | null
        }
        Insert: {
          created_at?: string | null
          default_thumbnail_url?: string | null
          default_tier?: string | null
          id?: string
          jupiter_tier_description?: string | null
          merchant_id: string
          moon_tier_description?: string | null
          updated_at?: string | null
          venus_tier_description?: string | null
        }
        Update: {
          created_at?: string | null
          default_thumbnail_url?: string | null
          default_tier?: string | null
          id?: string
          jupiter_tier_description?: string | null
          merchant_id?: string
          moon_tier_description?: string | null
          updated_at?: string | null
          venus_tier_description?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "podcast_settings_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "podcast_settings_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: true
            referencedRelation: "public_profile_data"
            referencedColumns: ["id"]
          },
        ]
      }
      podcast_subscriptions: {
        Row: {
          amount: number
          cancelled_at: string | null
          created_at: string
          id: string
          merchant_id: string
          next_billing_date: string | null
          paypal_subscription_id: string
          podcast_recording_id: string
          started_at: string
          status: string
          subscriber_id: string
          tier: string
          updated_at: string
        }
        Insert: {
          amount: number
          cancelled_at?: string | null
          created_at?: string
          id?: string
          merchant_id: string
          next_billing_date?: string | null
          paypal_subscription_id: string
          podcast_recording_id: string
          started_at?: string
          status?: string
          subscriber_id: string
          tier: string
          updated_at?: string
        }
        Update: {
          amount?: number
          cancelled_at?: string | null
          created_at?: string
          id?: string
          merchant_id?: string
          next_billing_date?: string | null
          paypal_subscription_id?: string
          podcast_recording_id?: string
          started_at?: string
          status?: string
          subscriber_id?: string
          tier?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "podcast_subscriptions_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "podcast_subscriptions_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "public_profile_data"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "podcast_subscriptions_podcast_recording_id_fkey"
            columns: ["podcast_recording_id"]
            isOneToOne: false
            referencedRelation: "podcast_recordings"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_images: {
        Row: {
          background_music_url: string | null
          created_at: string
          display_order: number
          id: string
          image_path: string
          is_blurred: boolean
          is_video_muted: boolean | null
          media_type: string | null
          portfolio_id: string
          video_url: string | null
        }
        Insert: {
          background_music_url?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_path: string
          is_blurred?: boolean
          is_video_muted?: boolean | null
          media_type?: string | null
          portfolio_id: string
          video_url?: string | null
        }
        Update: {
          background_music_url?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_path?: string
          is_blurred?: boolean
          is_video_muted?: boolean | null
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
          {
            foreignKeyName: "post_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_data"
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
      post_tips: {
        Row: {
          amount: number
          created_at: string
          id: string
          post_id: string
          recipient_id: string
          tipper_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          post_id: string
          recipient_id: string
          tipper_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          post_id?: string
          recipient_id?: string
          tipper_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_tips_post_id_fkey"
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
            foreignKeyName: "profile_follow_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "public_profile_data"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_follow_requests_target_merchant_id_fkey"
            columns: ["target_merchant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_follow_requests_target_merchant_id_fkey"
            columns: ["target_merchant_id"]
            isOneToOne: false
            referencedRelation: "public_profile_data"
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
            foreignKeyName: "profile_followers_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "public_profile_data"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_followers_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_followers_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "public_profile_data"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active_film_id: string | null
          adult_content_restricted: boolean | null
          approval_status: string | null
          avatar_url: string | null
          background_image_url: string | null
          business_description: string | null
          business_name: string | null
          can_publish_film: boolean | null
          contact_email: string | null
          created_at: string | null
          current_film_sales: number | null
          date_of_birth: string | null
          disable_film_publish_lock: boolean | null
          display_name: string | null
          email: string
          facebook_url: string | null
          first_name: string | null
          free_films_published: number | null
          google_voice_number: string | null
          id: string
          industry: string | null
          instagram_url: string | null
          is_admin: boolean | null
          is_adult_creator: boolean | null
          is_live_stream_artist: boolean | null
          is_private: boolean | null
          last_name: string | null
          onlyfans_url: string | null
          paypal_email: string | null
          pinterest_url: string | null
          playlist_public: boolean | null
          portfolios_public: boolean | null
          profile_complete: boolean | null
          show_age: boolean | null
          show_zodiac_sign: boolean | null
          skills: string[] | null
          snapchat_url: string | null
          social_links_public: boolean | null
          updated_at: string | null
          user_type: string
          website: string | null
          youtube_url: string | null
        }
        Insert: {
          active_film_id?: string | null
          adult_content_restricted?: boolean | null
          approval_status?: string | null
          avatar_url?: string | null
          background_image_url?: string | null
          business_description?: string | null
          business_name?: string | null
          can_publish_film?: boolean | null
          contact_email?: string | null
          created_at?: string | null
          current_film_sales?: number | null
          date_of_birth?: string | null
          disable_film_publish_lock?: boolean | null
          display_name?: string | null
          email: string
          facebook_url?: string | null
          first_name?: string | null
          free_films_published?: number | null
          google_voice_number?: string | null
          id: string
          industry?: string | null
          instagram_url?: string | null
          is_admin?: boolean | null
          is_adult_creator?: boolean | null
          is_live_stream_artist?: boolean | null
          is_private?: boolean | null
          last_name?: string | null
          onlyfans_url?: string | null
          paypal_email?: string | null
          pinterest_url?: string | null
          playlist_public?: boolean | null
          portfolios_public?: boolean | null
          profile_complete?: boolean | null
          show_age?: boolean | null
          show_zodiac_sign?: boolean | null
          skills?: string[] | null
          snapchat_url?: string | null
          social_links_public?: boolean | null
          updated_at?: string | null
          user_type: string
          website?: string | null
          youtube_url?: string | null
        }
        Update: {
          active_film_id?: string | null
          adult_content_restricted?: boolean | null
          approval_status?: string | null
          avatar_url?: string | null
          background_image_url?: string | null
          business_description?: string | null
          business_name?: string | null
          can_publish_film?: boolean | null
          contact_email?: string | null
          created_at?: string | null
          current_film_sales?: number | null
          date_of_birth?: string | null
          disable_film_publish_lock?: boolean | null
          display_name?: string | null
          email?: string
          facebook_url?: string | null
          first_name?: string | null
          free_films_published?: number | null
          google_voice_number?: string | null
          id?: string
          industry?: string | null
          instagram_url?: string | null
          is_admin?: boolean | null
          is_adult_creator?: boolean | null
          is_live_stream_artist?: boolean | null
          is_private?: boolean | null
          last_name?: string | null
          onlyfans_url?: string | null
          paypal_email?: string | null
          pinterest_url?: string | null
          playlist_public?: boolean | null
          portfolios_public?: boolean | null
          profile_complete?: boolean | null
          show_age?: boolean | null
          show_zodiac_sign?: boolean | null
          skills?: string[] | null
          snapchat_url?: string | null
          social_links_public?: boolean | null
          updated_at?: string | null
          user_type?: string
          website?: string | null
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_active_film_id_fkey"
            columns: ["active_film_id"]
            isOneToOne: false
            referencedRelation: "film_products"
            referencedColumns: ["id"]
          },
        ]
      }
      quarterly_income: {
        Row: {
          created_at: string
          id: string
          income_type: string
          is_test_data: boolean | null
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
          is_test_data?: boolean | null
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
          is_test_data?: boolean | null
          quarter?: number
          source_count?: number
          total_income?: number
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      quarterly_tax_settings: {
        Row: {
          business_expenses: number | null
          created_at: string
          filing_status: string | null
          id: string
          previous_year_agi: number | null
          quarter: number
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          business_expenses?: number | null
          created_at?: string
          filing_status?: string | null
          id?: string
          previous_year_agi?: number | null
          quarter: number
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          business_expenses?: number | null
          created_at?: string
          filing_status?: string | null
          id?: string
          previous_year_agi?: number | null
          quarter?: number
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      script_invitations: {
        Row: {
          credits_spent: number
          id: string
          invited_at: string
          invitee_id: string
          inviter_id: string
          responded_at: string | null
          script_id: string
          status: string
        }
        Insert: {
          credits_spent?: number
          id?: string
          invited_at?: string
          invitee_id: string
          inviter_id: string
          responded_at?: string | null
          script_id: string
          status?: string
        }
        Update: {
          credits_spent?: number
          id?: string
          invited_at?: string
          invitee_id?: string
          inviter_id?: string
          responded_at?: string | null
          script_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "script_invitations_invitee_id_fkey"
            columns: ["invitee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "script_invitations_invitee_id_fkey"
            columns: ["invitee_id"]
            isOneToOne: false
            referencedRelation: "public_profile_data"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "script_invitations_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "script_invitations_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "public_profile_data"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "script_invitations_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "film_scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      song_cover_submissions: {
        Row: {
          admin_notes: string | null
          audio_product_id: string
          contract_generated_at: string | null
          contract_id: string | null
          cover_image_url: string
          cover_photos: string[] | null
          created_at: string
          id: string
          merchant_id: string
          negotiation_text: string | null
          requested_advance_price: number | null
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
          cover_photos?: string[] | null
          created_at?: string
          id?: string
          merchant_id: string
          negotiation_text?: string | null
          requested_advance_price?: number | null
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
          cover_photos?: string[] | null
          created_at?: string
          id?: string
          merchant_id?: string
          negotiation_text?: string | null
          requested_advance_price?: number | null
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
      support_tickets: {
        Row: {
          created_at: string
          description: string
          id: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_data"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_replies: {
        Row: {
          admin_id: string
          created_at: string
          id: string
          read_at: string | null
          reply_text: string
          ticket_id: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          reply_text: string
          ticket_id: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          reply_text?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_replies_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_replies_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "public_profile_data"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_replies_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      token_balances: {
        Row: {
          balance: number
          created_at: string
          id: string
          total_buy_tax_paid: number
          total_purchased: number
          total_spent_usd: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          total_buy_tax_paid?: number
          total_purchased?: number
          total_spent_usd?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          total_buy_tax_paid?: number
          total_purchased?: number
          total_spent_usd?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "token_balances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "token_balances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_profile_data"
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
      user_free_resources: {
        Row: {
          accepted_at: string | null
          created_at: string
          id: string
          rejected_at: string | null
          resource_key: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          rejected_at?: string | null
          resource_key: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          rejected_at?: string | null
          resource_key?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_free_resources_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_free_resources_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_data"
            referencedColumns: ["id"]
          },
        ]
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
          content_category: string | null
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
          content_category?: string | null
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
          content_category?: string | null
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
      webrtc_signals: {
        Row: {
          created_at: string
          from_user_id: string
          id: string
          room_id: string
          signal_data: Json | null
          signal_type: string
          to_user_id: string | null
        }
        Insert: {
          created_at?: string
          from_user_id: string
          id?: string
          room_id: string
          signal_data?: Json | null
          signal_type: string
          to_user_id?: string | null
        }
        Update: {
          created_at?: string
          from_user_id?: string
          id?: string
          room_id?: string
          signal_data?: Json | null
          signal_type?: string
          to_user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      public_film_playlist_items: {
        Row: {
          cover_photo_url: string | null
          description: string | null
          film_product_id: string | null
          genres: string[] | null
          is_free: boolean | null
          merchant_id: string | null
          price: number | null
          purchase_date: string | null
          stars: string[] | null
          status: string | null
          thumbnail_url: string | null
          title: string | null
          trailer_url: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "film_products_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "film_products_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "public_profile_data"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "film_purchases_film_product_id_fkey"
            columns: ["film_product_id"]
            isOneToOne: false
            referencedRelation: "film_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "film_purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "film_purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_data"
            referencedColumns: ["id"]
          },
        ]
      }
      public_playlist_items: {
        Row: {
          audio_product_id: string | null
          created_at: string | null
          id: string | null
          is_free_download: boolean | null
          purchase_date: string | null
          user_id: string | null
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
      public_profile_data: {
        Row: {
          adult_content_restricted: boolean | null
          approval_status: string | null
          avatar_url: string | null
          background_image_url: string | null
          business_name: string | null
          created_at: string | null
          display_name: string | null
          facebook_url: string | null
          id: string | null
          industry: string | null
          instagram_url: string | null
          is_admin: boolean | null
          is_adult_creator: boolean | null
          is_live_stream_artist: boolean | null
          is_private: boolean | null
          onlyfans_url: string | null
          pinterest_url: string | null
          playlist_public: boolean | null
          portfolios_public: boolean | null
          profile_complete: boolean | null
          skills: string[] | null
          snapchat_url: string | null
          social_links_public: boolean | null
          updated_at: string | null
          user_type: string | null
          website: string | null
          youtube_url: string | null
        }
        Insert: {
          adult_content_restricted?: boolean | null
          approval_status?: string | null
          avatar_url?: string | null
          background_image_url?: string | null
          business_name?: string | null
          created_at?: string | null
          display_name?: string | null
          facebook_url?: never
          id?: string | null
          industry?: string | null
          instagram_url?: never
          is_admin?: boolean | null
          is_adult_creator?: boolean | null
          is_live_stream_artist?: boolean | null
          is_private?: boolean | null
          onlyfans_url?: never
          pinterest_url?: never
          playlist_public?: boolean | null
          portfolios_public?: boolean | null
          profile_complete?: boolean | null
          skills?: string[] | null
          snapchat_url?: never
          social_links_public?: boolean | null
          updated_at?: string | null
          user_type?: string | null
          website?: never
          youtube_url?: never
        }
        Update: {
          adult_content_restricted?: boolean | null
          approval_status?: string | null
          avatar_url?: string | null
          background_image_url?: string | null
          business_name?: string | null
          created_at?: string | null
          display_name?: string | null
          facebook_url?: never
          id?: string | null
          industry?: string | null
          instagram_url?: never
          is_admin?: boolean | null
          is_adult_creator?: boolean | null
          is_live_stream_artist?: boolean | null
          is_private?: boolean | null
          onlyfans_url?: never
          pinterest_url?: never
          playlist_public?: boolean | null
          portfolios_public?: boolean | null
          profile_complete?: boolean | null
          skills?: string[] | null
          snapchat_url?: never
          social_links_public?: boolean | null
          updated_at?: string | null
          user_type?: string | null
          website?: never
          youtube_url?: never
        }
        Relationships: []
      }
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
      can_view_profile_content: {
        Args: { content_type: string; profile_id: string; viewer_id: string }
        Returns: boolean
      }
      check_merchant_payout_threshold: {
        Args: { p_merchant_id: string }
        Returns: boolean
      }
      check_overdue_deliveries: { Args: never; Returns: undefined }
      clean_expired_astrology_cache: { Args: never; Returns: undefined }
      delete_album_cascade: {
        Args: { p_album_id: string; p_merchant_id: string }
        Returns: boolean
      }
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
      fix_delivery_video_segments: {
        Args: { p_delivery_id: string }
        Returns: boolean
      }
      generate_receipt_number: { Args: never; Returns: string }
      get_user_max_storage: { Args: { user_uuid: string }; Returns: number }
      get_user_storage_usage: { Args: { user_uuid: string }; Returns: number }
      has_active_podcast_subscription: {
        Args: { p_merchant_id: string; p_user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { user_id: string }; Returns: boolean }
      is_approved_merchant: { Args: { user_id: string }; Returns: boolean }
      tip_live_stream: {
        Args: { p_amount?: number; p_recipient_id: string; p_stream_id: string }
        Returns: boolean
      }
      tip_one_on_one: {
        Args: { p_amount?: number; p_recipient_id: string; p_room_name: string }
        Returns: boolean
      }
      tip_post: {
        Args: { p_amount?: number; p_post_id: string; p_recipient_id: string }
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
      update_quarterly_income: {
        Args: {
          p_amount: number
          p_income_type: string
          p_is_test_data?: boolean
          p_user_id: string
        }
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
        | "horoscope_reading"
        | "venus_value_reading"
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
        "horoscope_reading",
        "venus_value_reading",
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
