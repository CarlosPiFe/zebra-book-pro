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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      api_rate_limits: {
        Row: {
          business_id: string
          created_at: string
          endpoint: string
          id: string
          request_count: number
          window_start: string
        }
        Insert: {
          business_id: string
          created_at?: string
          endpoint: string
          id?: string
          request_count?: number
          window_start?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          endpoint?: string
          id?: string
          request_count?: number
          window_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_rate_limits_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_slots: {
        Row: {
          business_id: string
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          slot_duration_minutes: number
          start_time: string
        }
        Insert: {
          business_id: string
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          slot_duration_minutes?: number
          start_time: string
        }
        Update: {
          business_id?: string
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          slot_duration_minutes?: number
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_slots_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          booking_date: string
          business_confirmation_token: string | null
          business_id: string
          business_phone: string | null
          client_confirmation_token: string | null
          client_email: string | null
          client_id: string | null
          client_name: string
          client_phone: string
          created_at: string
          end_time: string
          id: string
          notes: string | null
          party_size: number
          rejection_reason: string | null
          room_id: string | null
          start_time: string
          status: string
          table_id: string | null
          time_slot_id: string
          updated_at: string
        }
        Insert: {
          booking_date: string
          business_confirmation_token?: string | null
          business_id: string
          business_phone?: string | null
          client_confirmation_token?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name?: string
          client_phone?: string
          created_at?: string
          end_time: string
          id?: string
          notes?: string | null
          party_size?: number
          rejection_reason?: string | null
          room_id?: string | null
          start_time: string
          status?: string
          table_id?: string | null
          time_slot_id: string
          updated_at?: string
        }
        Update: {
          booking_date?: string
          business_confirmation_token?: string | null
          business_id?: string
          business_phone?: string | null
          client_confirmation_token?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name?: string
          client_phone?: string
          created_at?: string
          end_time?: string
          id?: string
          notes?: string | null
          party_size?: number
          rejection_reason?: string | null
          room_id?: string | null
          start_time?: string
          status?: string
          table_id?: string | null
          time_slot_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "business_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_time_slot_id_fkey"
            columns: ["time_slot_id"]
            isOneToOne: false
            referencedRelation: "time_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      business_photos: {
        Row: {
          business_id: string
          created_at: string
          display_order: number
          id: string
          is_main: boolean
          photo_url: string
        }
        Insert: {
          business_id: string
          created_at?: string
          display_order?: number
          id?: string
          is_main?: boolean
          photo_url: string
        }
        Update: {
          business_id?: string
          created_at?: string
          display_order?: number
          id?: string
          is_main?: boolean
          photo_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_photos_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_rooms: {
        Row: {
          business_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          time_slots: Json
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          time_slots?: Json
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          time_slots?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_rooms_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          address: string | null
          api_token: string | null
          auto_complete_delayed: boolean | null
          auto_complete_in_progress: boolean | null
          auto_mark_in_progress: boolean | null
          average_rating: number | null
          booking_additional_message: string | null
          booking_mode: string
          booking_slot_duration_minutes: number
          confirmation_mode: string
          created_at: string
          cuisine_type: string | null
          description: string | null
          dietary_options: string[] | null
          dish_specialties: string[] | null
          email: string | null
          id: string
          image_url: string | null
          is_active: boolean
          mark_delayed_as_no_show: boolean | null
          name: string
          owner_id: string
          phone: string | null
          price_range: string | null
          schedule_view_mode: string
          service_types: string[] | null
          social_media: Json | null
          special_offer: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          api_token?: string | null
          auto_complete_delayed?: boolean | null
          auto_complete_in_progress?: boolean | null
          auto_mark_in_progress?: boolean | null
          average_rating?: number | null
          booking_additional_message?: string | null
          booking_mode?: string
          booking_slot_duration_minutes?: number
          confirmation_mode?: string
          created_at?: string
          cuisine_type?: string | null
          description?: string | null
          dietary_options?: string[] | null
          dish_specialties?: string[] | null
          email?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          mark_delayed_as_no_show?: boolean | null
          name: string
          owner_id: string
          phone?: string | null
          price_range?: string | null
          schedule_view_mode?: string
          service_types?: string[] | null
          social_media?: Json | null
          special_offer?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          api_token?: string | null
          auto_complete_delayed?: boolean | null
          auto_complete_in_progress?: boolean | null
          auto_mark_in_progress?: boolean | null
          average_rating?: number | null
          booking_additional_message?: string | null
          booking_mode?: string
          booking_slot_duration_minutes?: number
          confirmation_mode?: string
          created_at?: string
          cuisine_type?: string | null
          description?: string | null
          dietary_options?: string[] | null
          dish_specialties?: string[] | null
          email?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          mark_delayed_as_no_show?: boolean | null
          name?: string
          owner_id?: string
          phone?: string | null
          price_range?: string | null
          schedule_view_mode?: string
          service_types?: string[] | null
          social_media?: Json | null
          special_offer?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "businesses_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          business_id: string
          color: string
          created_at: string
          description: string | null
          event_date: string
          event_time: string | null
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          business_id: string
          color?: string
          created_at?: string
          description?: string | null
          event_date: string
          event_time?: string | null
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          color?: string
          created_at?: string
          description?: string | null
          event_date?: string
          event_time?: string | null
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_notifications: {
        Row: {
          business_id: string
          created_at: string
          employee_id: string
          id: string
          message: string
          payload: Json | null
          read: boolean | null
          title: string
          type: string
        }
        Insert: {
          business_id: string
          created_at?: string
          employee_id: string
          id?: string
          message: string
          payload?: Json | null
          read?: boolean | null
          title: string
          type: string
        }
        Update: {
          business_id?: string
          created_at?: string
          employee_id?: string
          id?: string
          message?: string
          payload?: Json | null
          read?: boolean | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_notifications_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_notifications_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "waiters"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_schedules: {
        Row: {
          created_at: string
          day_of_week: number
          employee_id: string
          end_time: string
          id: string
          start_time: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          employee_id: string
          end_time: string
          id?: string
          start_time: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          employee_id?: string
          end_time?: string
          id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_schedules_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "waiters"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_vacations: {
        Row: {
          created_at: string
          employee_id: string
          end_date: string
          id: string
          notes: string | null
          start_date: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          end_date: string
          id?: string
          notes?: string | null
          start_date: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          end_date?: string
          id?: string
          notes?: string | null
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_vacations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "waiters"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_weekly_schedules: {
        Row: {
          created_at: string
          date: string
          employee_id: string
          end_time: string | null
          id: string
          is_day_off: boolean
          slot_order: number | null
          start_time: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          employee_id: string
          end_time?: string | null
          id?: string
          is_day_off?: boolean
          slot_order?: number | null
          start_time?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          employee_id?: string
          end_time?: string | null
          id?: string
          is_day_off?: boolean
          slot_order?: number | null
          start_time?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_weekly_schedules_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "waiters"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          business_id: string
          client_id: string
          created_at: string
        }
        Insert: {
          business_id: string
          client_id: string
          created_at?: string
        }
        Update: {
          business_id?: string
          client_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          business_id: string
          category: string
          created_at: string
          description: string | null
          id: string
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          business_id: string
          category: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          price: number
          updated_at?: string
        }
        Update: {
          business_id?: string
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          id: string
          menu_item_id: string
          notes: string | null
          quantity: number
          status: string
          table_id: string
          waiter_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          menu_item_id: string
          notes?: string | null
          quantity?: number
          status?: string
          table_id: string
          waiter_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          menu_item_id?: string
          notes?: string | null
          quantity?: number
          status?: string
          table_id?: string
          waiter_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_waiter_id_fkey"
            columns: ["waiter_id"]
            isOneToOne: false
            referencedRelation: "waiters"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_records: {
        Row: {
          business_id: string
          created_at: string
          document_url: string | null
          employee_id: string
          gross_amount: number
          hours: number
          id: string
          net_amount: number
          period_end: string
          period_start: string
          status: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          document_url?: string | null
          employee_id: string
          gross_amount?: number
          hours?: number
          id?: string
          net_amount?: number
          period_end: string
          period_start: string
          status?: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          document_url?: string | null
          employee_id?: string
          gross_amount?: number
          hours?: number
          id?: string
          net_amount?: number
          period_end?: string
          period_start?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_records_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "waiters"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          booking_id: string | null
          business_id: string
          client_id: string
          comment: string | null
          created_at: string
          id: string
          rating: number
          updated_at: string
        }
        Insert: {
          booking_id?: string | null
          business_id: string
          client_id: string
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          updated_at?: string
        }
        Update: {
          booking_id?: string | null
          business_id?: string
          client_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_availability"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_cleanup_log: {
        Row: {
          cleaned_at: string | null
          id: string
          records_deleted: number | null
        }
        Insert: {
          cleaned_at?: string | null
          id?: string
          records_deleted?: number | null
        }
        Update: {
          cleaned_at?: string | null
          id?: string
          records_deleted?: number | null
        }
        Relationships: []
      }
      shift_change_requests: {
        Row: {
          business_id: string
          created_at: string
          employee_id: string
          id: string
          reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          schedule_id: string
          status: string
        }
        Insert: {
          business_id: string
          created_at?: string
          employee_id: string
          id?: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          schedule_id: string
          status?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          employee_id?: string
          id?: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          schedule_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_change_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_change_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "waiters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_change_requests_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "employee_weekly_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      tables: {
        Row: {
          business_id: string
          created_at: string
          id: string
          max_capacity: number
          min_capacity: number
          room_id: string | null
          table_number: number
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          max_capacity: number
          min_capacity?: number
          room_id?: string | null
          table_number: number
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          max_capacity?: number
          min_capacity?: number
          room_id?: string | null
          table_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tables_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tables_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "business_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      time_slots: {
        Row: {
          created_at: string
          id: string
          slot_order: number
          slot_time: string
        }
        Insert: {
          created_at?: string
          id?: string
          slot_order: number
          slot_time: string
        }
        Update: {
          created_at?: string
          id?: string
          slot_order?: number
          slot_time?: string
        }
        Relationships: []
      }
      timesheets: {
        Row: {
          approved: boolean | null
          business_id: string
          clock_in: string
          clock_out: string | null
          created_at: string
          duration_minutes: number | null
          employee_id: string
          id: string
          note: string | null
          updated_at: string
        }
        Insert: {
          approved?: boolean | null
          business_id: string
          clock_in: string
          clock_out?: string | null
          created_at?: string
          duration_minutes?: number | null
          employee_id: string
          id?: string
          note?: string | null
          updated_at?: string
        }
        Update: {
          approved?: boolean | null
          business_id?: string
          clock_in?: string
          clock_out?: string | null
          created_at?: string
          duration_minutes?: number | null
          employee_id?: string
          id?: string
          note?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "timesheets_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "waiters"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      waiters: {
        Row: {
          business_id: string
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          position: string | null
          token: string
          user_id: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          position?: string | null
          token: string
          user_id?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          position?: string | null
          token?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "waiters_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      booking_availability: {
        Row: {
          booking_date: string | null
          business_id: string | null
          created_at: string | null
          end_time: string | null
          id: string | null
          party_size: number | null
          start_time: string | null
          status: string | null
          table_id: string | null
          time_slot_id: string | null
        }
        Insert: {
          booking_date?: string | null
          business_id?: string | null
          created_at?: string | null
          end_time?: string | null
          id?: string | null
          party_size?: number | null
          start_time?: string | null
          status?: string | null
          table_id?: string | null
          time_slot_id?: string | null
        }
        Update: {
          booking_date?: string | null
          business_id?: string | null
          created_at?: string | null
          end_time?: string | null
          id?: string | null
          party_size?: number | null
          start_time?: string | null
          status?: string | null
          table_id?: string | null
          time_slot_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_time_slot_id_fkey"
            columns: ["time_slot_id"]
            isOneToOne: false
            referencedRelation: "time_slots"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      check_rate_limit: {
        Args: {
          p_business_id: string
          p_endpoint: string
          p_max_requests?: number
          p_window_minutes?: number
        }
        Returns: boolean
      }
      cleanup_old_schedules: { Args: never; Returns: undefined }
      get_public_businesses: {
        Args: never
        Returns: {
          address: string
          category: string
          created_at: string
          description: string
          id: string
          image_url: string
          is_active: boolean
          name: string
          updated_at: string
        }[]
      }
      get_waiter_by_token: {
        Args: { _token: string }
        Returns: {
          business_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          position: string
          token: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      waiter_can_access_table: {
        Args: { _table_id: string; _waiter_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "owner" | "client"
      user_role: "owner" | "client"
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
      app_role: ["owner", "client"],
      user_role: ["owner", "client"],
    },
  },
} as const
