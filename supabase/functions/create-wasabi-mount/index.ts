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

    // Check if user already has a Wasabi mount
    const { data: existingMounts } = await supabaseClient
      .from('mounts')
      .select('mount_id')
      .eq('user_id', user.id)
      .eq('platform', 'Wasabi')
      .eq('is_active', true)
      .limit(1)

    if (existingMounts && existingMounts.length > 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Wasabi mount already exists',
          mount_id: existingMounts[0].mount_id
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get Wasabi credentials from environment
    const wasabiAccessKey = Deno.env.get('WASABI_ACCESS_KEY_ID')
    const wasabiSecretKey = Deno.env.get('WASABI_SECRET_ACCESS_KEY')
    const wasabiBucket = Deno.env.get('WASABI_BUCKET_NAME')
    const wasabiRegion = Deno.env.get('WASABI_REGION')
    const wasabiEndpoint = Deno.env.get('WASABI_ENDPOINT')

    if (!wasabiAccessKey || !wasabiSecretKey || !wasabiBucket || !wasabiRegion || !wasabiEndpoint) {
      throw new Error('Wasabi credentials not configured')
    }

    // User's folder path in Wasabi
    const userFolderPath = `users/${user.id}/`

    // Note: We don't actually need to create the folder in Wasabi
    // S3-compatible storage creates folders automatically when you upload files
    // Just create the mount record in the database

    // Create mount record in database
    const { data: mount, error: mountError } = await supabaseClient
      .from('mounts')
      .insert({
        user_id: user.id,
        platform: 'Wasabi',
        mount_label: 'Cloud Storage',
        device_path: userFolderPath,
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
        path: userFolderPath
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error creating Wasabi mount:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
