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
			detectSessionInUrl: false // We'll handle OAuth redirects manually
		}
	}
);

// Database types (will expand as we add tables)
export interface Database {
	public: {
		Tables: {
			profiles: {
				Row: {
					id: string; // UUID, references auth.users(id)
					username: string;
					android_id: string | null;
					is_anonymous: boolean;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id: string;
					username: string;
					android_id?: string | null;
					is_anonymous?: boolean;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					id?: string;
					username?: string;
					android_id?: string | null;
					is_anonymous?: boolean;
					updated_at?: string;
				};
			};
		};
	};
}
