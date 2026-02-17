import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
};

type Role = "SALES" | "ADMIN" | "FINANCE" | "MASTER";

interface Database {
  public: {
    Tables: {
      quotes: {
        Row: {
          id: string;
          workflow_state: string | null;
          status: string | null;
          owner_id: string | null;
          user_id: string;
          admin_reviewer_id: string | null;
          finance_reviewer_id: string | null;
          admin_decision_status: string | null;
          admin_decision_notes: string | null;
          finance_decision_status: string | null;
          finance_decision_notes: string | null;
          finance_threshold_snapshot: Record<string, any> | null;
          finance_margin_breached: boolean | null;
          requires_finance_approval: boolean | null;
          submitted_at: string | null;
          submitted_by_email: string | null;
          submitted_by_name: string | null;
        };
      };
      profiles: {
        Row: {
          id: string;
          role: string;
          email: string;
          first_name: string | null;
          last_name: string | null;
        };
      };
      quote_events: {
        Row: Record<string, never>;
      };
      app_settings: {
        Row: {
          key: string;
          value: any;
          updated_at: string;
        };
      };
      email_templates: {
        Row: {
          id: string;
          template_type: string;
          subject_template: string;
          body_template: string;
          enabled: boolean | null;
          variables: any;
        };
      };
    };
  };
}

interface RequestContext {
  userId: string;
  role: Role;
  email: string;
  fullName: string;
}

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
    global: { headers: { "X-Client-Info": "quote-workflow" } },
  });

  try {
    const context = await getRequestContext(req, supabase);
    const url = new URL(req.url);
    const action = url.pathname.split("/").pop();

    if (req.method === "POST" && action === "submit") {
      return await handleSubmit(req, supabase, context);
    }

    if (req.method === "POST" && action === "claim") {
      return await handleClaim(req, supabase, context);
    }

    if (req.method === "POST" && action === "admin-decision") {
      return await handleAdminDecision(req, supabase, context);
    }

    if (req.method === "POST" && action === "finance-decision") {
      return await handleFinanceDecision(req, supabase, context);
    }

    if (req.method === "POST" && action === "reassign") {
      return await handleReassign(req, supabase, context);
    }

    if (action === "finance-margin-limit") {
      if (req.method === "GET") {
        return await handleFinanceLimitGet(supabase);
      }
      if (req.method === "PUT") {
        return await handleFinanceLimitUpdate(req, supabase, context);
      }
    }

    if (action === "email-template") {
      if (req.method === "GET") {
        return await handleEmailTemplateGet(url, supabase, context);
      }
      if (req.method === "PUT") {
        return await handleEmailTemplateUpdate(req, supabase, context);
      }
    }

    throw new HttpError(404, "Unsupported route or method");
  } catch (error) {
    console.error("quote-workflow error", error);
    const status = error instanceof HttpError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ error: message }, status);
  }
});

type SupabaseServerClient = SupabaseClient<Database>;

async function getRequestContext(req: Request, supabase: SupabaseServerClient): Promise<RequestContext> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    throw new HttpError(401, "Missing Authorization header");
  }
  const token = authHeader.replace("Bearer ", "");

  const { data: userResult, error } = await supabase.auth.getUser(token);
  if (error || !userResult.user) {
    throw new HttpError(401, "Invalid or expired token");
  }

  const userId = userResult.user.id;
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, email, first_name, last_name")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    throw new HttpError(403, "Profile not found");
  }

  const rawRole = String(profile.role || "SALES").toUpperCase();
  const normalizedRole = (
    rawRole === "LEVEL1" || rawRole === "LEVEL_1" || rawRole === "SALES"
      ? "SALES"
      : rawRole === "LEVEL2" || rawRole === "LEVEL_2"
        ? "SALES"
        : rawRole === "LEVEL3" || rawRole === "LEVEL_3" || rawRole === "ADMIN"
          ? "ADMIN"
          : rawRole === "FINANCE"
            ? "FINANCE"
            : rawRole === "MASTER"
              ? "MASTER"
              : "SALES"
  ) as Role;
  const fullName = `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim();

  return {
    userId: profile.id,
    role: normalizedRole,
    email: userResult.user.email ?? profile.email,
    fullName: fullName || profile.email,
  };
}

async function handleSubmit(
  req: Request,
  supabase: SupabaseServerClient,
  context: RequestContext,
) {
  assertRole(context, ["SALES", "ADMIN", "MASTER"]);
  const { quoteId } = await req.json();
  if (!quoteId) throw new HttpError(400, "quoteId is required");

  const { data: quote, error } = await supabase
    .from("quotes")
    .select("id, owner_id, workflow_state, status")
    .eq("id", quoteId)
    .single();

  if (error || !quote) {
    throw new HttpError(404, "Quote not found");
  }

  if (quote.owner_id && quote.owner_id !== context.userId && context.role !== "MASTER") {
    throw new HttpError(403, "Only the owner or a master operator can submit this quote");
  }

  const now = new Date().toISOString();
  const { data: updatedQuote, error: updateError } = await supabase
    .from("quotes")
    .update({
      owner_id: quote.owner_id ?? context.userId,
      workflow_state: "submitted",
      status: "submitted",
      submitted_at: now,
      submitted_by_email: context.email,
      submitted_by_name: context.fullName,
      updated_at: now,
    })
    .eq("id", quoteId)
    .select("*")
    .single();

  if (updateError || !updatedQuote) {
    throw new HttpError(500, "Failed to submit quote");
  }

  await logEvent(supabase, quoteId, "quote_submitted", context, quote.workflow_state, "submitted", {
    owner_id: updatedQuote.owner_id,
  });

  return jsonResponse({ success: true, quote: updatedQuote });
}

async function handleClaim(
  req: Request,
  supabase: SupabaseServerClient,
  context: RequestContext,
) {
  const { quoteId, lane } = await req.json();
  if (!quoteId || !lane) {
    throw new HttpError(400, "quoteId and lane are required");
  }

  if (lane === "admin") {
    assertRole(context, ["ADMIN", "MASTER"]);
  } else if (lane === "finance") {
    assertRole(context, ["FINANCE", "MASTER"]);
  } else {
    throw new HttpError(400, "Lane must be admin or finance");
  }

  const { data: before, error: beforeError } = await supabase
    .from("quotes")
    .select("id, status")
    .eq("id", quoteId)
    .single();

  if (beforeError || !before) {
    throw new HttpError(404, "Quote not found");
  }

  let data: any = null;
  // Legacy quotes.status check constraint allows: draft/submitted/pending_approval/approved/rejected/in_process/under-review
  const nextState = "under-review";

  const rpcResult = await supabase.rpc("claim_quote_for_review", {
    p_actor_id: context.userId,
    p_lane: lane,
    p_quote_id: quoteId,
  });

  if (!rpcResult.error) {
    data = rpcResult.data;
  } else {
    // Legacy-schema fallback: many environments do not have claim RPC/reviewer columns.
    const updated = await supabase
      .from("quotes")
      .update({
        status: nextState,
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", quoteId)
      .select("*")
      .single();

    if (updated.error || !updated.data) {
      throw new HttpError(400, rpcResult.error?.message ?? "Unable to claim quote");
    }
    data = updated.data;
  }

  await logEvent(
    supabase,
    quoteId,
    lane === "admin" ? "quote_claimed_admin" : "quote_claimed_finance",
    context,
    (before as any).workflow_state ?? (before as any).status ?? null,
    (data as any)?.workflow_state ?? (data as any)?.status ?? (before as any).status ?? null,
    { lane },
  );

  return jsonResponse({ success: true, quote: data });
}

async function handleAdminDecision(
  req: Request,
  supabase: SupabaseServerClient,
  context: RequestContext,
) {
  assertRole(context, ["ADMIN", "MASTER"]);
  const { quoteId, decision, notes, marginPercent, financeLimitPercent } = await req.json();
  if (!quoteId || !decision) {
    throw new HttpError(400, "quoteId and decision are required");
  }

  const { data: quote, error } = await supabase
    .from("quotes")
    .select("workflow_state, finance_threshold_snapshot")
    .eq("id", quoteId)
    .single();

  if (error || !quote) {
    throw new HttpError(404, "Quote not found");
  }

  if ((quote.workflow_state ?? "draft") !== "admin_review") {
    throw new HttpError(400, "Quote is not in admin review");
  }

  const now = new Date().toISOString();
  const updates: Record<string, any> = {
    admin_decision_status: decision,
    admin_decision_notes: notes ?? null,
    admin_decision_by: context.userId,
    admin_decision_at: now,
  };

  let nextState = quote.workflow_state ?? "admin_review";
  let thresholdSnapshot = quote.finance_threshold_snapshot;

  if (decision === "requires_finance") {
    const limit = financeLimitPercent ?? (await getFinanceLimitValue(supabase)).percent;
    const margin = typeof marginPercent === "number" ? marginPercent : null;
    const breached = margin !== null ? margin < limit : true;

    thresholdSnapshot = {
      marginPercent: margin,
      limitPercent: limit,
      breached,
      capturedAt: now,
    };

    Object.assign(updates, {
      workflow_state: "finance_review",
      status: "finance_review",
      requires_finance_approval: true,
      finance_margin_breached: breached,
      finance_threshold_snapshot: thresholdSnapshot,
    });
    nextState = "finance_review";
  } else if (decision === "approved") {
    Object.assign(updates, {
      workflow_state: "approved",
      status: "approved",
      requires_finance_approval: false,
      finance_margin_breached: false,
    });
    nextState = "approved";
  } else if (decision === "rejected") {
    Object.assign(updates, {
      workflow_state: "rejected",
      status: "rejected",
      requires_finance_approval: false,
    });
    nextState = "rejected";
  } else if (decision === "needs_revision") {
    Object.assign(updates, {
      workflow_state: "needs_revision",
      status: "needs_revision",
      requires_finance_approval: false,
    });
    nextState = "needs_revision";
  }

  const { data: updatedQuote, error: updateError } = await supabase
    .from("quotes")
    .update(updates)
    .eq("id", quoteId)
    .select("*")
    .single();

  if (updateError || !updatedQuote) {
    throw new HttpError(500, "Unable to record admin decision");
  }

  await logEvent(supabase, quoteId, "quote_admin_decision", context, quote.workflow_state, nextState, {
    decision,
    notes,
    marginPercent,
    financeLimitPercent: financeLimitPercent ?? thresholdSnapshot?.limitPercent ?? null,
  });

  if (decision === "requires_finance") {
    await notifyFinanceReviewRequired(supabase, {
      quoteId,
      customerName: updatedQuote.customer_name ?? "Unknown Customer",
      requesterName: context.fullName,
      appUrl: Deno.env.get("APP_DOMAIN") ? `https://${Deno.env.get("APP_DOMAIN")}` : null,
    });
  }

  return jsonResponse({ success: true, quote: updatedQuote });
}

async function handleFinanceDecision(
  req: Request,
  supabase: SupabaseServerClient,
  context: RequestContext,
) {
  assertRole(context, ["FINANCE", "MASTER"]);
  const { quoteId, decision, notes, marginPercent, financeLimitPercent } = await req.json();
  if (!quoteId || !decision) {
    throw new HttpError(400, "quoteId and decision are required");
  }

  const { data: quote, error } = await supabase
    .from("quotes")
    .select("workflow_state, finance_threshold_snapshot")
    .eq("id", quoteId)
    .single();

  if (error || !quote) {
    throw new HttpError(404, "Quote not found");
  }

  if ((quote.workflow_state ?? "draft") !== "finance_review") {
    throw new HttpError(400, "Quote is not waiting for finance");
  }

  const snapshotLimit = quote.finance_threshold_snapshot?.limitPercent;
  const limit = financeLimitPercent ?? snapshotLimit ?? (await getFinanceLimitValue(supabase)).percent;
  const margin = typeof marginPercent === "number"
    ? marginPercent
    : quote.finance_threshold_snapshot?.marginPercent ?? null;

  if (decision === "approved" && margin !== null && margin < limit) {
    throw new HttpError(422, "Margin is still below the finance guardrail");
  }

  const now = new Date().toISOString();
  const updates: Record<string, any> = {
    finance_decision_status: decision,
    finance_decision_notes: notes ?? null,
    finance_decision_by: context.userId,
    finance_decision_at: now,
    finance_margin_breached: margin !== null ? margin < limit : false,
    requires_finance_approval: false,
    workflow_state: decision === "approved" ? "approved" : "rejected",
    status: decision === "approved" ? "approved" : "rejected",
  };

  const { data: updatedQuote, error: updateError } = await supabase
    .from("quotes")
    .update(updates)
    .eq("id", quoteId)
    .select("*")
    .single();

  if (updateError || !updatedQuote) {
    throw new HttpError(500, "Unable to record finance decision");
  }

  await logEvent(supabase, quoteId, "quote_finance_decision", context, quote.workflow_state, updates.workflow_state, {
    decision,
    notes,
    marginPercent: margin,
    financeLimitPercent: limit,
  });

  return jsonResponse({ success: true, quote: updatedQuote });
}

async function handleReassign(
  req: Request,
  supabase: SupabaseServerClient,
  context: RequestContext,
) {
  assertRole(context, ["MASTER"]);
  const { quoteId, lane, targetUserId } = await req.json();
  if (!quoteId || !lane) {
    throw new HttpError(400, "quoteId and lane are required");
  }

  const allowedLanes = ["owner", "admin", "finance"] as const;
  if (!allowedLanes.includes(lane)) {
    throw new HttpError(400, "lane must be owner, admin, or finance");
  }

  const columnMap: Record<typeof allowedLanes[number], string> = {
    owner: "owner_id",
    admin: "admin_reviewer_id",
    finance: "finance_reviewer_id",
  };

  const column = columnMap[lane];
  const { data: updatedQuote, error } = await supabase
    .from("quotes")
    .update({ [column]: targetUserId ?? null })
    .eq("id", quoteId)
    .select("*")
    .single();

  if (error || !updatedQuote) {
    throw new HttpError(500, "Unable to reassign quote");
  }

  await logEvent(supabase, quoteId, `quote_reassigned_${lane}`, context, null, updatedQuote.workflow_state, {
    targetUserId,
    lane,
  });

  return jsonResponse({ success: true, quote: updatedQuote });
}

async function handleFinanceLimitGet(
  supabase: SupabaseServerClient,
) {
  const limit = await getFinanceLimitValue(supabase);
  return jsonResponse({ success: true, value: limit });
}

async function handleFinanceLimitUpdate(
  req: Request,
  supabase: SupabaseServerClient,
  context: RequestContext,
) {
  assertRole(context, ["ADMIN", "FINANCE", "MASTER"]);
  const { percent, currency } = await req.json();
  if (typeof percent !== "number" || percent <= 0) {
    throw new HttpError(400, "percent must be a positive number");
  }

  const payload = {
    percent,
    currency: currency || "USD",
    updatedBy: context.userId,
    updatedAt: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("app_settings")
    .upsert({
      key: "workflow.finance_margin_limit",
      value: payload,
      updated_by: context.userId,
    }, {
      onConflict: "key",
    });

  if (error) {
    throw new HttpError(500, "Unable to update finance guardrail");
  }

  return jsonResponse({ success: true, value: payload });
}

async function handleEmailTemplateGet(
  url: URL,
  supabase: SupabaseServerClient,
  context: RequestContext,
) {
  assertRole(context, ["ADMIN", "FINANCE", "MASTER"]);
  const requestedType = url.searchParams.get("type");
  if (!requestedType) {
    throw new HttpError(400, "type query parameter is required");
  }
  // Backward compatibility with DB constraint that only supports quote_approved/quote_rejected.
  const templateType = requestedType === "quote_admin_decision" ? "quote_approved" : requestedType;

  const { data, error } = await supabase
    .from("email_templates")
    .select("*")
    .eq("template_type", templateType)
    .maybeSingle();

  if (error) {
    throw new HttpError(500, "Unable to load template");
  }

  if (data) {
    return jsonResponse({ success: true, template: data });
  }

  const fallback = {
    template_type: templateType,
    subject_template: "Quote {{quote_id}} decision",
    body_template: "Quote {{quote_id}} status updated.",
    enabled: true,
    variables: ["quote_id", "customer_name", "approved_by", "approved_date"],
    updated_by: context.userId,
    updated_at: new Date().toISOString(),
  };

  const { data: inserted, error: insertError } = await supabase
    .from("email_templates")
    .upsert(fallback, { onConflict: "template_type" })
    .select("*")
    .single();

  if (insertError || !inserted) {
    throw new HttpError(500, "Unable to initialize template");
  }

  return jsonResponse({ success: true, template: inserted });
}

async function handleEmailTemplateUpdate(
  req: Request,
  supabase: SupabaseServerClient,
  context: RequestContext,
) {
  assertRole(context, ["ADMIN", "FINANCE", "MASTER"]);
  const { templateType, subjectTemplate, bodyTemplate, enabled } = await req.json();
  if (!templateType || !subjectTemplate || !bodyTemplate) {
    throw new HttpError(400, "templateType, subjectTemplate and bodyTemplate are required");
  }

  const normalizedTemplateType = templateType === "quote_admin_decision" ? "quote_approved" : templateType;
  const now = new Date().toISOString();
  const payload = {
    template_type: normalizedTemplateType,
    subject_template: subjectTemplate,
    body_template: bodyTemplate,
    enabled: typeof enabled === "boolean" ? enabled : true,
    updated_by: context.userId,
    updated_at: now,
  };

  const { data: existing, error: existingError } = await supabase
    .from("email_templates")
    .select("id")
    .eq("template_type", normalizedTemplateType)
    .maybeSingle();

  if (existingError) {
    throw new HttpError(500, "Unable to lookup template");
  }

  let data: any = null;
  if (existing?.id) {
    const updated = await supabase
      .from("email_templates")
      .update(payload)
      .eq("id", existing.id)
      .select("*")
      .single();
    if (updated.error || !updated.data) {
      throw new HttpError(500, "Unable to update template");
    }
    data = updated.data;
  } else {
    const inserted = await supabase
      .from("email_templates")
      .insert({ ...payload, created_at: now })
      .select("*")
      .single();
    if (inserted.error || !inserted.data) {
      throw new HttpError(500, "Unable to create template");
    }
    data = inserted.data;
  }

  return jsonResponse({ success: true, template: data });
}

async function getFinanceLimitValue(
  supabase: SupabaseServerClient,
): Promise<{ percent: number; currency: string; updatedAt?: string }> {
  const { data } = await supabase
    .from("app_settings")
    .select("value, updated_at")
    .eq("key", "workflow.finance_margin_limit")
    .single();

  if (data?.value && typeof data.value.percent === "number") {
    return {
      percent: data.value.percent,
      currency: data.value.currency ?? "USD",
      updatedAt: data.updated_at,
    };
  }

  return { percent: 22, currency: "USD" };
}

async function notifyFinanceReviewRequired(
  supabase: SupabaseServerClient,
  payload: {
    quoteId: string;
    customerName?: string | null;
    requesterName?: string | null;
    appUrl?: string | null;
  },
) {
  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.warn("RESEND_API_KEY not configured; skipping finance notification email");
      return;
    }

    const { data: settingsRows } = await supabase
      .from("email_settings")
      .select("setting_key, setting_value");

    const settings: Record<string, any> = {};
    for (const row of settingsRows ?? []) {
      settings[row.setting_key] = row.setting_value;
    }

    if (settings.enable_notifications === false) {
      return;
    }

    const fromEmail = settings.smtp_from_email as string | undefined;
    const fromName = (settings.smtp_from_name as string | undefined) ?? "PowerQuote";
    if (!fromEmail) {
      console.warn("smtp_from_email is not configured; skipping finance notification email");
      return;
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("email, role");

    const financeRecipients = (profiles ?? [])
      .filter((p: any) => String(p.role ?? "").toUpperCase() === "FINANCE")
      .map((p: any) => String(p.email ?? "").trim())
      .filter((email) => email.length > 0);

    const uniqueRecipients = [...new Set(financeRecipients)];
    if (uniqueRecipients.length === 0) {
      console.warn("No FINANCE recipients found for quote workflow email");
      return;
    }

    const appBase = payload.appUrl ?? "";
    const reviewLink = appBase ? `${appBase}/#admin` : "";
    const subject = `Finance review required: Quote ${payload.quoteId}`;
    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.5">
        <p>Hello Finance team,</p>
        <p>Quote <strong>${payload.quoteId}</strong> requires finance approval.</p>
        <p><strong>Customer:</strong> ${payload.customerName ?? "Unknown Customer"}</p>
        <p><strong>Routed by:</strong> ${payload.requesterName ?? "System"}</p>
        ${reviewLink ? `<p><a href="${reviewLink}">Open PowerQuote Admin Review Queue</a></p>` : ""}
        <p>Regards,<br/>PowerQuote Workflow</p>
      </div>
    `;

    const resend = new Resend(resendApiKey);
    await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: uniqueRecipients,
      subject,
      html,
    });
  } catch (error) {
    console.error("Failed to send finance review notification", error);
  }
}

async function logEvent(
  supabase: SupabaseServerClient,
  quoteId: string,
  eventType: string,
  context: RequestContext,
  previousState: string | null,
  newState: string | null,
  payload?: Record<string, any>,
) {
  const result = await supabase.from("quote_events").insert({
    quote_id: quoteId,
    event_type: eventType,
    actor_id: context.userId,
    actor_role: context.role,
    previous_state: previousState,
    new_state: newState,
    payload: payload ?? null,
  });

  if (result.error) {
    // Backward-compatible mode: some projects do not have quote_events table yet.
    console.warn("quote_events logging skipped", result.error.message);
  }
}

function assertRole(context: RequestContext, allowed: Role[]) {
  if (!allowed.includes(context.role)) {
    throw new HttpError(403, "Insufficient role for this action");
  }
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
