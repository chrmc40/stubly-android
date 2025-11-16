import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get auth user from request
    const authHeader = req.headers.get('Authorization')!
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user already has a Backblaze mount
    const { data: existingMounts } = await supabaseClient
      .from('mounts')
      .select('mount_id')
      .eq('user_id', user.id)
      .eq('platform', 'Backblaze')
      .eq('is_active', true)
      .limit(1)

    if (existingMounts && existingMounts.length > 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Backblaze mount already exists',
          mount_id: existingMounts[0].mount_id
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get Backblaze B2 credentials from environment
    const backblazeKeyId = Deno.env.get('BACKBLAZE_KEY_ID')
    const backblazeAppKey = Deno.env.get('BACKBLAZE_APPLICATION_KEY')
    const backblazeBucketFiles = Deno.env.get('BACKBLAZE_BUCKET_FILES')
    const backblazeRegion = Deno.env.get('BACKBLAZE_REGION')
    const backblazeEndpoint = Deno.env.get('BACKBLAZE_ENDPOINT')

    if (!backblazeKeyId || !backblazeAppKey || !backblazeBucketFiles || !backblazeRegion || !backblazeEndpoint) {
      throw new Error('Backblaze B2 credentials not configured')
    }

    // Files bucket path - per-user folder for quota enforcement
    const devicePath = `b2://${backblazeBucketFiles}/${user.id}/`

    // Note: We don't actually need to create the folder in Backblaze B2
    // S3-compatible storage creates folders automatically when you upload files
    // Each user gets their own folder: stubly-files/USER_ID/
    // This ensures files count toward individual user quotas

    // Create mount record in database
    const { data: mount, error: mountError } = await supabaseClient
      .from('mounts')
      .insert({
        user_id: user.id,
        platform: 'Backblaze',
        mount_label: 'Cloud Storage',
        device_path: devicePath,
        storage_type: 'cloud',
        encryption_enabled: false,
        is_active: true
      })
      .select()
      .single()

    if (mountError) throw mountError

    return new Response(
      JSON.stringify({
        success: true,
        mount_id: mount.mount_id,
        path: devicePath
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error creating Backblaze mount:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
