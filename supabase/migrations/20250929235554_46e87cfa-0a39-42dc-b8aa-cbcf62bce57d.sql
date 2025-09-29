-- Phase 3: Fix Security Issues
-- Set search_path for all functions with mutable search_path

-- Update all existing functions to have secure search_path
ALTER FUNCTION public.update_chassis_config_updated_at() SET search_path = public, extensions;
ALTER FUNCTION public.deactivate_user(uuid) SET search_path = public, extensions;
ALTER FUNCTION public.array_all_positive(integer[]) SET search_path = public, extensions;
ALTER FUNCTION public.ensure_single_default_level4_option() SET search_path = public, extensions;
ALTER FUNCTION public.update_quote_analytics() SET search_path = public, extensions;
ALTER FUNCTION public.calculate_bom_total_cost(text) SET search_path = public, extensions;
ALTER FUNCTION public.update_quote_costs() SET search_path = public, extensions;
ALTER FUNCTION public.set_default_dropdown_option(uuid, uuid) SET search_path = public, extensions;
ALTER FUNCTION public.get_level2_products_by_parent(text) SET search_path = public, extensions;
ALTER FUNCTION public.track_user_session(uuid, text, text, text, jsonb, jsonb) SET search_path = public, extensions;
ALTER FUNCTION public.revoke_user_access(uuid, text) SET search_path = public, extensions;
ALTER FUNCTION public.log_security_event(uuid, text, jsonb, text, text, text) SET search_path = public, extensions;
ALTER FUNCTION public.update_user_login(uuid, boolean, text, text) SET search_path = public, extensions;
ALTER FUNCTION public.update_session_activity(text) SET search_path = public, extensions;
ALTER FUNCTION public.admin_create_user(text, text, text, text, text, text) SET search_path = public, extensions;
ALTER FUNCTION public.admin_list_users() SET search_path = public, extensions;
ALTER FUNCTION public.admin_update_user_status(uuid, text) SET search_path = public, extensions;
ALTER FUNCTION public.sync_requires_level4_config_column() SET search_path = public, extensions;
ALTER FUNCTION public.log_security_event(text, text, text, text, text, text) SET search_path = public, extensions;
ALTER FUNCTION public.get_products_by_level(integer) SET search_path = public, extensions;
ALTER FUNCTION public.get_pd_products() SET search_path = public, extensions;
ALTER FUNCTION public.update_product_display_name(uuid, text) SET search_path = public, extensions;
ALTER FUNCTION public.create_user(text, text, text, text, text, text) SET search_path = public, extensions;
ALTER FUNCTION public.get_level1_products_with_asset_types() SET search_path = public, extensions;
ALTER FUNCTION public.get_dga_products() SET search_path = public, extensions;
ALTER FUNCTION public.get_level2_products_for_category(text) SET search_path = public, extensions;
ALTER FUNCTION public.log_user_security_event(text, text, text, text, text, text) SET search_path = public, extensions;
ALTER FUNCTION public.update_product_display_name(text, text) SET search_path = public, extensions;
ALTER FUNCTION public.finalize_draft_quote_id(text) SET search_path = public, extensions;
ALTER FUNCTION public.execute_sql(text) SET search_path = public, extensions;
ALTER FUNCTION public.set_updated_at() SET search_path = public, extensions;
ALTER FUNCTION public.generate_quote_id(text, boolean) SET search_path = public, extensions;
ALTER FUNCTION public.get_admin_user_ids() SET search_path = public, extensions;
ALTER FUNCTION public.is_admin() SET search_path = public, extensions;
ALTER FUNCTION public.prevent_non_draft_quote_edits() SET search_path = public, extensions;
ALTER FUNCTION public.clone_quote(text, uuid) SET search_path = public, extensions;
ALTER FUNCTION public.update_user_quote_counters_updated_at() SET search_path = public, extensions;
ALTER FUNCTION public.handle_new_user() SET search_path = public, extensions;

-- Add missing RLS policies for tables without policies
-- Based on the security scan, we need to add policies for tables that have RLS enabled but no policies

-- Add policies for level1_level2_relationships
CREATE POLICY "Authenticated users can view level1_level2_relationships"
ON public.level1_level2_relationships
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage level1_level2_relationships"
ON public.level1_level2_relationships
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Add policies for level2_level3_relationships
CREATE POLICY "Authenticated users can view level2_level3_relationships"
ON public.level2_level3_relationships
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage level2_level3_relationships"
ON public.level2_level3_relationships
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);