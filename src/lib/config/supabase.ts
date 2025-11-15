import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

// Supabase configuration
// These should be set in .env file:
// PUBLIC_SUPABASE_URL=https://your-project.supabase.co
// PUBLIC_SUPABASE_ANON_KEY=your-anon-key

const supabaseUrl = PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = PUBLIC_SUPABASE_ANON_KEY || '';

console.log('[Supabase Config]', {
	supabaseUrl: supabaseUrl ? `${supabaseUrl.slice(0, 30)}...` : 'NOT SET',
	supabaseAnonKey: supabaseAnonKey ? `${supabaseAnonKey.slice(0, 20)}...` : 'NOT SET',
	configured: !!(supabaseUrl && supabaseAnonKey)
});

// Check if Supabase is configured
export function isSupabaseConfigured(): boolean {
	return !!(supabaseUrl && supabaseAnonKey);
}

// Create Supabase client only if configured
// Use dummy values during build/SSR if not configured
const dummyUrl = 'https://placeholder.supabase.co';
const dummyKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTI4MDAsImV4cCI6MTk2MDc2ODgwMH0.placeholder';

export const supabase = createClient(
	supabaseUrl || dummyUrl,
	supabaseAnonKey || dummyKey,
	{
		auth: {
			// Use localStorage for session persistence on web
			// Will use AsyncStorage on mobile via Capacitor
			autoRefreshToken: true,
			persistSession: true,
			detectSessionInUrl: true, // Auto-detect OAuth redirect
			flowType: 'pkce' // Use PKCE flow for better security
		}
	}
);

// Database types - Supabase Cloud Schema
export interface Database {
	public: {
		Tables: {
			files: {
				Row: {
					file_id: string;
					user_id: string;
					hash: string | null;
					phash: string | null;
					phash_algorithm: string | null;
					type: 'image' | 'video' | 'audio' | 'url';
					mime_type: string | null;
					local_size: number | null;
					format: string | null;
					width: number | null;
					height: number | null;
					duration: number | null;
					video_codec: string | null;
					video_bitrate: number | null;
					video_framerate: number | null;
					video_color_space: string | null;
					video_bit_depth: number | null;
					audio_codec: string | null;
					audio_bitrate: number | null;
					audio_sample_rate: number | null;
					audio_channels: number | null;
					user_description: string | null;
					create_date: string;
					modified_date: string;
					user_edited_date: string | null;
				};
				Insert: Omit<Database['public']['Tables']['files']['Row'], 'create_date' | 'modified_date'> & {
					create_date?: string;
					modified_date?: string;
				};
				Update: Partial<Database['public']['Tables']['files']['Insert']>;
			};
			subscription_tiers: {
				Row: {
					tier_id: number;
					tier_name: string;
					google_play_product_id: string | null;
					storage_quota_bytes: number;
					file_count_quota: number;
					price_monthly: number | null;
					price_yearly: number | null;
					is_active: boolean;
					create_date: string;
					modified_date: string;
				};
				Insert: Omit<Database['public']['Tables']['subscription_tiers']['Row'], 'tier_id' | 'create_date' | 'modified_date'>;
				Update: Partial<Database['public']['Tables']['subscription_tiers']['Insert']>;
			};
			profiles: {
				Row: {
					// Auth fields
					id: string; // UUID
					username: string;
					email: string;
					android_id: string | null;
					is_anonymous: boolean;

					// Subscription fields
					tier_id: number;
					google_play_token: string | null;
					google_play_order_id: string | null;
					subscription_start_date: string | null;
					subscription_end_date: string | null;

					// Storage tracking
					storage_used_bytes: number;
					file_count_used: number;

					// DMCA / Moderation
					dmca_strike_count: number;
					dmca_strike_date: string | null;
					account_status: 'active' | 'suspended' | 'banned';

					// Privacy/Security
					encryption_enabled: boolean;

					// Timestamps
					create_date: string;
					modified_date: string;
				};
				Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'create_date' | 'modified_date'> & {
					tier_id?: number;
					storage_used_bytes?: number;
					file_count_used?: number;
					dmca_strike_count?: number;
					account_status?: 'active' | 'suspended' | 'banned';
					encryption_enabled?: boolean;
				};
				Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
			};
		};
		Functions: {
			check_storage_quota: {
				Args: { user_id: string };
				Returns: boolean;
			};
			check_file_quota: {
				Args: { user_id: string };
				Returns: boolean;
			};
			is_subscription_active: {
				Args: { user_id: string };
				Returns: boolean;
			};
			record_dmca_strike: {
				Args: { user_id: string };
				Returns: void;
			};
			increment_storage_usage: {
				Args: { p_user_id: string; p_bytes: number };
				Returns: void;
			};
			decrement_storage_usage: {
				Args: { p_user_id: string; p_bytes: number };
				Returns: void;
			};
		};
	};
}
