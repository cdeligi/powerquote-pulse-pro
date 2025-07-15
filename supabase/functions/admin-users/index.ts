
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create supabase admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify the requesting user is an admin
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user is admin
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { method } = req
    const url = new URL(req.url)

    if (method === 'GET') {
      // List all users
      const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers()
      if (authError) throw authError

      const { data: profiles = [], error: profilesError } = await supabaseAdmin
        .from('profiles')
        .select('id, first_name, last_name, role, email, department, user_status, created_at')

      if (profilesError) throw profilesError

      const users = authUsers.users.map(authUser => {
        const profile = profiles.find(p => p.id === authUser.id)
        return {
          id: authUser.id,
          email: authUser.email || '',
          fullName: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Unknown User',
          role: profile?.role || 'level1',
          department: profile?.department || null,
          confirmedAt: authUser.confirmed_at,
          lastSignInAt: authUser.last_sign_in_at,
          createdAt: authUser.created_at,
          userStatus: profile?.user_status || 'active'
        }
      })

      return new Response(
        JSON.stringify({ users }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (method === 'POST') {
      // Create new user
      const body = await req.json()
      const { email, firstName, lastName, role, department, password } = body

      // Validate required fields
      if (!email || !firstName || !lastName) {
        return new Response(
          JSON.stringify({ error: 'Email, first name, and last name are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Generate temporary password if not provided
      const tempPassword = password || `Temp${Math.random().toString(36).substring(2, 8)}!`

      // Create user in auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
          role: role || 'level1',
          department: department || null
        }
      })

      if (authError) {
        return new Response(
          JSON.stringify({ error: authError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Create profile record
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: authData.user.id,
          email,
          first_name: firstName,
          last_name: lastName,
          role: role || 'level1',
          department: department || null,
          user_status: 'active'
        })

      if (profileError) {
        console.error('Profile creation error:', profileError)
        // User was created in auth but profile failed
        return new Response(
          JSON.stringify({ 
            warning: 'User created but profile sync failed',
            tempPassword 
          }),
          { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          tempPassword,
          message: 'User created successfully'
        }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (method === 'PUT') {
      // Update user status
      const body = await req.json()
      const { userId, status } = body

      if (!userId || !status) {
        return new Response(
          JSON.stringify({ error: 'User ID and status are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { error } = await supabaseAdmin
        .from('profiles')
        .update({ 
          user_status: status,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true, message: 'User status updated successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
