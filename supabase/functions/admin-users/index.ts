
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          first_name: string | null;
          last_name: string | null;
          role: string;
          department: string | null;
          user_status: string;
          job_title: string | null;
          phone_number: string | null;
          manager_email: string | null;
          company_name: string | null;
          business_justification: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      user_requests: {
        Row: {
          id: string;
          email: string;
          first_name: string | null;
          last_name: string | null;
          full_name: string | null;
          requested_role: string;
          department: string | null;
          job_title: string | null;
          phone_number: string | null;
          manager_email: string | null;
          company_name: string | null;
          business_justification: string | null;
          requested_at: string;
          status: string;
          processed_by: string | null;
          processed_at: string | null;
          rejection_reason: string | null;
          ip_address: string | null;
          user_agent: string | null;
        };
      };
      user_sessions: {
        Row: {
          id: string;
          user_id: string | null;
          event: string;
          ip_address: string | null;
          user_agent: string | null;
          location: any;
          device_info: any;
          created_at: string;
        };
      };
    };
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify the user is authenticated and is an admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Invalid token');
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      throw new Error('Admin access required');
    }

    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();

    switch (req.method) {
      case 'GET':
        if (path === 'users') {
          return await handleListUsers(supabaseAdmin);
        } else if (path === 'user-requests') {
          return await handleListUserRequests(supabaseAdmin);
        } else if (path === 'audit-logs') {
          return await handleListAuditLogs(supabaseAdmin);
        } else {
          return await handleListUsers(supabaseAdmin);
        }
      
      case 'POST':
        if (path === 'users') {
          return await handleCreateUser(req, supabaseAdmin, user.id);
        } else if (path === 'approve-request') {
          return await handleApproveRequest(req, supabaseAdmin, user.id);
        }
        break;
      
      case 'PUT':
        if (path === 'users') {
          return await handleUpdateUser(req, supabaseAdmin, user.id);
        } else if (path === 'reject-request') {
          return await handleRejectRequest(req, supabaseAdmin, user.id);
        }
        break;
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error in admin-users function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function handleListUsers(supabase: any) {
  // Get auth users
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
  if (authError) throw authError;

  // Get profiles with all fields
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select(`
      *,
      job_title,
      phone_number,
      manager_email,
      company_name,
      business_justification
    `);
  
  if (profilesError) throw profilesError;

  // Merge data
  const users = authUsers.users.map((authUser: any) => {
    const profile = profiles.find((p: any) => p.id === authUser.id);
    return {
      id: authUser.id,
      email: authUser.email || profile?.email || '',
      fullName: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : '',
      role: profile?.role || 'level1',
      department: profile?.department || null,
      userStatus: profile?.user_status || 'active',
      jobTitle: profile?.job_title || null,
      phoneNumber: profile?.phone_number || null,
      managerEmail: profile?.manager_email || null,
      companyName: profile?.company_name || null,
      businessJustification: profile?.business_justification || null,
      confirmedAt: authUser.confirmed_at,
      lastSignInAt: authUser.last_sign_in_at,
      createdAt: authUser.created_at
    };
  });

  return new Response(JSON.stringify({ users }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function handleCreateUser(req: Request, supabase: any, adminId: string) {
  const { 
    email, 
    firstName, 
    lastName, 
    role, 
    department, 
    password,
    jobTitle,
    phoneNumber,
    managerEmail,
    companyName,
    businessJustification
  } = await req.json();
  
  const tempPassword = password || Math.random().toString(36).slice(-8) + 'A1!';
  
  // Create auth user
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
      role,
      department
    }
  });

  if (authError) throw authError;

  // Create profile with all fields
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: authUser.user.id,
      email,
      first_name: firstName,
      last_name: lastName,
      role,
      department,
      job_title: jobTitle,
      phone_number: phoneNumber,
      manager_email: managerEmail,
      company_name: companyName,
      business_justification: businessJustification,
      user_status: 'active'
    });

  if (profileError) throw profileError;

  return new Response(JSON.stringify({ 
    success: true, 
    tempPassword,
    userId: authUser.user.id 
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function handleUpdateUser(req: Request, supabase: any, adminId: string) {
  const { 
    userId, 
    firstName, 
    lastName, 
    role, 
    userStatus, 
    department,
    jobTitle,
    phoneNumber,
    managerEmail,
    companyName,
    businessJustification,
    email 
  } = await req.json();

  // Update auth user metadata
  const { error: authError } = await supabase.auth.admin.updateUserById(userId, {
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
      role
    },
    email_confirm: true
  });

  if (authError) throw authError;

  // Update profile with all fields
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      first_name: firstName,
      last_name: lastName,
      role,
      user_status: userStatus,
      department,
      job_title: jobTitle,
      phone_number: phoneNumber,
      manager_email: managerEmail,
      company_name: companyName,
      business_justification: businessJustification,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId);

  if (profileError) throw profileError;

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function handleListUserRequests(supabase: any) {
  const { data: requests, error } = await supabase
    .from('user_requests')
    .select(`
      *,
      processed_by_profile:profiles!user_requests_processed_by_fkey(first_name, last_name)
    `)
    .order('requested_at', { ascending: false });

  if (error) throw error;

  return new Response(JSON.stringify({ requests }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function handleApproveRequest(req: Request, supabase: any, adminId: string) {
  const { requestId } = await req.json();

  // Get request details
  const { data: request, error: requestError } = await supabase
    .from('user_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (requestError) throw requestError;

  const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';

  // Create auth user
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: request.email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      first_name: request.first_name,
      last_name: request.last_name,
      role: request.requested_role,
      department: request.department
    }
  });

  if (authError) throw authError;

  // Create profile with all fields from request
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: authUser.user.id,
      email: request.email,
      first_name: request.first_name,
      last_name: request.last_name,
      role: request.requested_role,
      department: request.department,
      job_title: request.job_title,
      phone_number: request.phone_number,
      manager_email: request.manager_email,
      company_name: request.company_name,
      business_justification: request.business_justification,
      user_status: 'active'
    });

  if (profileError) throw profileError;

  // Update request status
  const { error: updateError } = await supabase
    .from('user_requests')
    .update({
      status: 'approved',
      processed_by: adminId,
      processed_at: new Date().toISOString()
    })
    .eq('id', requestId);

  if (updateError) throw updateError;

  return new Response(JSON.stringify({ 
    success: true, 
    tempPassword,
    userId: authUser.user.id 
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function handleRejectRequest(req: Request, supabase: any, adminId: string) {
  const { requestId, reason } = await req.json();

  const { error } = await supabase
    .from('user_requests')
    .update({
      status: 'rejected',
      processed_by: adminId,
      processed_at: new Date().toISOString(),
      rejection_reason: reason
    })
    .eq('id', requestId);

  if (error) throw error;

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function handleListAuditLogs(supabase: any) {
  const { data: sessions, error } = await supabase
    .from('user_sessions')
    .select(`
      *,
      profiles!user_sessions_user_id_fkey(first_name, last_name, email)
    `)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw error;

  return new Response(JSON.stringify({ sessions }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
