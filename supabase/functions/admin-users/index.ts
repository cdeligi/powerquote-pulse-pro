
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@3.2.0";
import nodemailer from "npm:nodemailer@6.9.13";

// Simple template engine (Mustache-style)
function renderTemplate(template: string, data: Record<string, any>): string {

  let result = template;
  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, String(value ?? ''));
  }
  result = result.replace(/{{#if (\w+)}}([\s\S]*?){{\/if}}/g, (match, varName, content) => {
    return data[varName] ? content : '';
  });
  return result;
}

const ALLOWED_DB_ROLES = new Set(['level1', 'level2', 'level3', 'admin', 'finance', 'master']);

function normalizeRoleForDb(input: string | null | undefined): string {
  const raw = String(input || '').trim().toLowerCase();

  if (raw === 'sales' || raw === 'level_2' || raw === 'level2') return 'level2';
  if (raw === 'level_1' || raw === 'level1') return 'level1';
  if (raw === 'level_3' || raw === 'level3') return 'level3';
  if (raw === 'admin') return 'admin';
  if (raw === 'finance' || raw === 'finance_reviewer') return 'finance';
  if (raw === 'master') return 'master';

  return raw;
}

function ensureRole(input: string | null | undefined): string {
  const role = normalizeRoleForDb(input);
  if (!ALLOWED_DB_ROLES.has(role)) return 'level2';
  return role;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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

    const rawRole = String((profile as any)?.role || '').toLowerCase();
    const isAdminLike = ['admin','master','level3','level_3'].includes(rawRole);
    if (profileError || !profile || !isAdminLike) {
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
        } else if (path === 'delete-rejected-request') {
          // Allow POST for compatibility (some clients may drop DELETE bodies)
          return await handleDeleteRejectedRequest(req, supabaseAdmin, user.id);
        }
        break;
      
      case 'PUT':
        if (path === 'users') {
          return await handleUpdateUser(req, supabaseAdmin, user.id);
        } else if (path === 'reject-request') {
          return await handleRejectRequest(req, supabaseAdmin, user.id);
        }
        break;

      case 'DELETE':
        if (path === 'delete-rejected-request') {
          return await handleDeleteRejectedRequest(req, supabaseAdmin, user.id);
        }
        break;
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error in admin-users function:', error);

    const message = String(error?.message || 'Unexpected error');
    const status = /required|invalid|already|constraint|not found|admin access required|no authorization header/i.test(message)
      ? 400
      : 500;

    return new Response(JSON.stringify({ error: message }), {
      status,
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

async function logAuditEvent(supabase: any, payload: { user_id?: string | null; event: string; ip_address?: string | null; user_agent?: string | null; device_info?: any; location?: any; }) {
  try {
    await supabase.from('user_sessions').insert({
      user_id: payload.user_id ?? null,
      event: payload.event,
      ip_address: payload.ip_address ?? null,
      user_agent: payload.user_agent ?? null,
      device_info: payload.device_info ?? {},
      location: payload.location ?? {},
    });
  } catch (error) {
    console.warn('Failed to write audit log event:', error);
  }
}

async function getSetting(supabase: any, key: string) {
  const { data, error } = await supabase
    .from('email_settings')
    .select('setting_value')
    .eq('setting_key', key)
    .maybeSingle();
  if (error) return null;
  return (data as any)?.setting_value ?? null;
}

async function sendEmailNotification(
  supabase: any,
  payload: { to: string[]; subject?: string; html?: string; template_type?: string; template_data?: Record<string, any> }
) {
  try {
    const { data: settingsRows } = await supabase
      .from('email_settings')
      .select('setting_key, setting_value');

    const settings: Record<string, any> = {};
    for (const row of settingsRows ?? []) settings[row.setting_key] = row.setting_value;

    if (settings.enable_notifications === false) return;

    const fromEmail = settings.smtp_from_email as string | undefined;
    const fromName = (settings.smtp_from_name as string | undefined) ?? 'PowerQuotePro';
    if (!fromEmail) {
      console.warn('smtp_from_email not configured; skipping email notification');
      return;
    }

    const provider = String(settings.email_service_provider || 'resend').toLowerCase();

    let subject = payload.subject || 'PowerQuotePro notification';
    let html = payload.html || '<p>Hello,</p><p>This is a notification from PowerQuotePro.</p>';

    if (payload.template_type) {
      const { data: templateRow, error: templateErr } = await supabase
        .from('email_templates')
        .select('*')
        .eq('template_type', payload.template_type)
        .eq('enabled', true)
        .maybeSingle();

      if (templateErr) throw new Error(`Failed to fetch email template (${payload.template_type}): ${templateErr.message}`);
      if (!templateRow) throw new Error(`Email template not found or disabled: ${payload.template_type}`);

      const data = payload.template_data || {};
      subject = renderTemplate(String(templateRow.subject_template || ''), data);
      html = renderTemplate(String(templateRow.body_template || ''), data);
    }

    const from = `${fromName} <${fromEmail}>`;

    if (provider === 'smtp') {
      const host = String(settings.smtp_host || '').trim();
      const port = Number(settings.smtp_port || 587);
      const secure = Boolean(settings.smtp_secure);
      if (!host) throw new Error('smtp_host not configured');

      const user = Deno.env.get('SMTP_USER') || '';
      const pass = Deno.env.get('SMTP_PASSWORD') || '';

      const transport = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: user && pass ? { user, pass } : undefined,
      } as any);

      await transport.sendMail({
        from,
        to: payload.to.join(', '),
        subject,
        html,
      });
      return;
    }

    // Default to Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.warn('RESEND_API_KEY not configured; skipping email notification');
      return;
    }

    const resend = new Resend(resendApiKey);
    await resend.emails.send({ from, to: payload.to, subject, html });
  } catch (error) {
    console.warn('Failed to send email notification:', error);
  }
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

  const safeEmail = String(email || '').trim().toLowerCase();
  if (!safeEmail) throw new Error('Email is required');
  if (!firstName || !lastName) throw new Error('First name and last name are required');
  if (!department) throw new Error('Department is required');

  const tempPassword = password || Math.random().toString(36).slice(-8) + 'A1!';
  const dbRole = ensureRole(role);

  // Create Auth user first (avoid listUsers dependency which can fail on some projects).
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: safeEmail,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
      role: dbRole,
      department,
    },
  });

  // If user already exists in Auth, try to update existing profile by email.
  if (authError) {
    const msg = String((authError as any)?.message || authError);
    if (/already|exists|registered/i.test(msg)) {
      const { data: existingProfile, error: existingProfileError } = await supabase
        .from('profiles')
        .select('id')
        .ilike('email', safeEmail)
        .maybeSingle();

      if (existingProfileError) throw existingProfileError;
      if (!existingProfile?.id) {
        throw new Error('User already exists in Auth, but no profile was found to update.');
      }

      const { error: updateExistingProfileError } = await supabase
        .from('profiles')
        .update({
          first_name: firstName,
          last_name: lastName,
          role: dbRole,
          department,
          job_title: jobTitle,
          phone_number: phoneNumber,
          manager_email: managerEmail,
          company_name: companyName || 'QUALITROL',
          business_justification: businessJustification,
          user_status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingProfile.id);

      if (updateExistingProfileError) throw updateExistingProfileError;

      await logAuditEvent(supabase, {
        user_id: adminId,
        event: `ADMIN_CREATE_USER_EXISTING_AUTH:${safeEmail}`,
      });

      return new Response(JSON.stringify({
        success: true,
        userId: existingProfile.id,
        existed: true,
        message: 'User already existed. Profile updated and activated.',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    throw authError;
  }

  const userId = authUser?.user?.id;
  if (!userId) throw new Error('Unable to resolve auth user id');

  // Insert/Upsert profile for newly created auth user.
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      email: safeEmail,
      first_name: firstName,
      last_name: lastName,
      role: dbRole,
      department,
      job_title: jobTitle,
      phone_number: phoneNumber,
      manager_email: managerEmail,
      company_name: companyName || 'QUALITROL',
      business_justification: businessJustification,
      user_status: 'active',
      updated_at: new Date().toISOString(),
    });

  if (profileError) throw profileError;

  await logAuditEvent(supabase, {
    user_id: adminId,
    event: `ADMIN_CREATE_USER:${safeEmail}`,
  });

  return new Response(JSON.stringify({
    success: true,
    userId,
    existed: false,
    message: 'User created successfully.',
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

  const dbRole = ensureRole(role);

  // Update auth user metadata
  const { error: authError } = await supabase.auth.admin.updateUserById(userId, {
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
      role: dbRole
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
      role: dbRole,
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

  await logAuditEvent(supabase, {
    user_id: adminId,
    event: `ADMIN_UPDATE_USER:${userId}`,
  });

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

  // Find existing auth user by email (user already chose password during registration)
  const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) throw listError;

  const match = (authUsers?.users || []).find((u: any) => String(u.email || '').toLowerCase() === String(request.email || '').toLowerCase());
  if (!match?.id) {
    throw new Error('No auth user found for this email. User must complete registration first.');
  }

  const userId = match.id;
  const dbRole = ensureRole(request.requested_role);

  // Upsert profile with all fields from request and activate
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      email: request.email,
      first_name: request.first_name,
      last_name: request.last_name,
      role: dbRole,
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

  await logAuditEvent(supabase, {
    user_id: adminId,
    event: `ADMIN_APPROVE_REQUEST:${request.email}`,
  });

  // Notify applicant (approval)
  await sendEmailNotification(supabase, {
    to: [String(request.email).trim()],
    template_type: 'user_request_approved',
    template_data: {
      recipient_name: `${request.first_name ?? ''} ${request.last_name ?? ''}`.trim() || 'there',
      recipient_email: String(request.email).trim(),
      requested_role: request.requested_role,
      request_id: request.id,
      decision_date: new Date().toISOString(),
      support_email: String((await getSetting(supabase, 'support_email')) || 'cdeligi@qualitrolcorp.com'),
    },
  });

  return new Response(JSON.stringify({ 
    success: true,
    invited: false,
    message: 'User approved. User can log in with the password created during registration.',
    userId
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function handleRejectRequest(req: Request, supabase: any, adminId: string) {
  const { requestId, reason } = await req.json();

  // Fetch request email before updating (for notification)
  const { data: requestRow } = await supabase
    .from('user_requests')
    .select('email, first_name, last_name')
    .eq('id', requestId)
    .maybeSingle();

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

  await logAuditEvent(supabase, {
    user_id: adminId,
    event: `ADMIN_REJECT_REQUEST:${requestId}`,
  });

  // Notify applicant (rejection)
  if (requestRow?.email) {
    const safeReason = reason ? String(reason).replaceAll('<','&lt;').replaceAll('>','&gt;') : '';

    await sendEmailNotification(supabase, {
      to: [String(requestRow.email).trim()],
      template_type: 'user_request_rejected',
      template_data: {
        recipient_name: `${requestRow.first_name ?? ''} ${requestRow.last_name ?? ''}`.trim() || 'there',
        recipient_email: String(requestRow.email).trim(),
        request_id: requestId,
        rejection_reason: safeReason,
        decision_date: new Date().toISOString(),
        support_email: String((await getSetting(supabase, 'support_email')) || 'cdeligi@qualitrolcorp.com'),
      },
    });
  }

  return new Response(JSON.stringify({ success: true }), { 
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function handleDeleteRejectedRequest(req: Request, supabase: any, adminId: string) {
  const { requestId } = await req.json();

  if (!requestId) throw new Error('requestId is required');

  const { data: request, error: requestError } = await supabase
    .from('user_requests')
    .select('id, email, status')
    .eq('id', requestId)
    .maybeSingle();

  if (requestError) throw requestError;
  if (!request) throw new Error('Request not found');

  const status = String((request as any).status || '').trim().toLowerCase();
  if (status !== 'rejected') {
    throw new Error(`Only rejected requests can be hard deleted (current status: ${request.status})`);
  }

  let deletedAuthUserId: string | null = null;

  // Find auth user by email (if exists)
  const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.warn('listUsers failed during hard delete:', listError);
  }

  const authUser = (authUsers?.users || []).find(
    (u: any) => String(u.email || '').toLowerCase() === String(request.email || '').toLowerCase(),
  );

  // Delete related profile first (if present). Do not fail hard if already missing.
  if (authUser?.id) {
    const { error: profileDeleteError } = await supabase.from('profiles').delete().eq('id', authUser.id);
    if (profileDeleteError) {
      console.warn('Profile delete warning during hard delete:', profileDeleteError);
    }

    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(authUser.id);
    if (authDeleteError) {
      // Continue request cleanup so rejected rows can still be removed from queue.
      console.warn('Auth delete warning during hard delete:', authDeleteError);
    } else {
      deletedAuthUserId = authUser.id;
    }
  }

  // Delete request row (primary expected action in Registration Requests queue)
  const { error: requestDeleteError } = await supabase
    .from('user_requests')
    .delete()
    .eq('id', requestId);

  if (requestDeleteError) throw requestDeleteError;

  await logAuditEvent(supabase, {
    user_id: adminId,
    event: `ADMIN_HARD_DELETE_REJECTED_REQUEST:${request.email}`,
  });

  return new Response(JSON.stringify({
    success: true,
    deletedAuthUserId,
    message: deletedAuthUserId
      ? 'Rejected request, profile, and auth user deleted.'
      : 'Rejected request deleted. Auth user may already be missing or could not be deleted.',
  }), {
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
