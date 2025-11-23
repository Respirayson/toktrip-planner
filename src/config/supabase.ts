/**
 * Supabase Configuration for TokTrip Planner
 * 100% Supabase - Storage, Database, and Functions
 * Replace with your Supabase project credentials if needed
 */

import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

// Get these from your Supabase project settings
const supabaseUrl = 'https://cvzctcplgkvhshhkjkwt.supabase.co';
const supabaseAnonKey = 'sb_publishable_8IcZqTIrj42peRG2rbdNzw_y7HiiF61';

// Database types
export interface Place {
  id: string;
  user_id: string;
  video_url: string;
  video_path: string;
  place_name: string | null;
  address_search_query: string | null;
  category: 'Food' | 'Activity' | 'Stay' | null;
  vibe_keywords: string[] | null;
  latitude: number | null;
  longitude: number | null;
  thumbnail_url: string | null;
  status: 'processing' | 'completed' | 'failed';
  error_message: string | null;
  created_at: string;
  updated_at: string;
  timestamp?: Date; // For compatibility with existing code
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // For MVP, we'll use anonymous access
    // In production, implement proper authentication
    persistSession: false,
  },
});

export default supabase;
