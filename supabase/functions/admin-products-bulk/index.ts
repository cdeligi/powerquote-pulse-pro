import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

interface ProductRow {
  id: string;
  product_level: number;
  name: string;
  display_name?: string;
  enabled: boolean;
  cost: number;
  price: number;
  category?: string;
  subcategory?: string;
  asset_type_id?: string;
  parent_product_id?: string;
  chassis_type?: string;
  rack_configurable?: boolean;
  has_level4?: boolean;
  requires_level4_config?: boolean;
  part_number?: string;
  image_url?: string;
  product_info_url?: string;
  specifications_json?: string;
  action?: 'UPDATE' | 'INSERT' | 'DELETE';
}

interface RelationshipRow {
  level3_product_id: string;
  level2_product_ids: string[];
}

interface BulkUpdateRequest {
  products: ProductRow[];
  relationships: RelationshipRow[];
  dry_run: boolean;
}

interface BulkUpdateResponse {
  updated: number;
  inserted: number;
  disabled: number;
  relationship_updates: number;
  skipped: number;
  errors: string[];
  dry_run: boolean;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Invalid token');
    }

    // Verify admin role
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || (profile as any)?.role !== 'admin') {
      throw new Error('Admin access required');
    }

    console.log(`[admin-products-bulk] Admin ${user.email} initiated bulk update`);

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body: BulkUpdateRequest = await req.json();
    const { products = [], relationships = [], dry_run = false } = body;

    console.log(`[admin-products-bulk] Processing ${products.length} products, ${relationships.length} relationships, dry_run: ${dry_run}`);

    const response: BulkUpdateResponse = {
      updated: 0,
      inserted: 0,
      disabled: 0,
      relationship_updates: 0,
      skipped: 0,
      errors: [],
      dry_run
    };

    // Validate and process products
    const validProducts: ProductRow[] = [];
    
    for (const product of products) {
      // Validate required fields
      if (!product.id && product.action !== 'INSERT') {
        response.errors.push(`Row missing ID: ${product.name || 'unknown'}`);
        response.skipped++;
        continue;
      }

      // Validate product_level
      const level = Number(product.product_level);
      if (![1, 2, 3].includes(level)) {
        response.errors.push(`Invalid product_level for ${product.id}: ${product.product_level}`);
        response.skipped++;
        continue;
      }

      // Validate cost and price
      const cost = Number(product.cost);
      const price = Number(product.price);
      
      if (isNaN(cost) || cost < 0) {
        response.errors.push(`Invalid cost for ${product.id}: ${product.cost}`);
        response.skipped++;
        continue;
      }
      
      if (isNaN(price) || price < 0) {
        response.errors.push(`Invalid price for ${product.id}: ${product.price}`);
        response.skipped++;
        continue;
      }

      // Validate specifications_json if provided
      let specifications = null;
      if (product.specifications_json) {
        try {
          specifications = JSON.parse(product.specifications_json);
        } catch (e) {
          response.errors.push(`Invalid JSON in specifications for ${product.id}`);
          response.skipped++;
          continue;
        }
      }

      validProducts.push({
        ...product,
        cost,
        price,
        product_level: level,
        specifications_json: specifications ? JSON.stringify(specifications) : undefined
      });
    }

    if (!dry_run) {
      // Process products
      for (const product of validProducts) {
        const action = product.action || 'UPDATE';
        
        try {
          if (action === 'DELETE') {
            // Soft delete - set enabled to false
            const { error } = await supabaseAdmin
              .from('products')
              .update({ enabled: false, updated_at: new Date().toISOString() })
              .eq('id', product.id);
            
            if (error) throw error;
            response.disabled++;
            
          } else if (action === 'INSERT') {
            // Generate ID if not provided
            const productId = product.id || `${product.name?.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
            
            const insertData: Record<string, any> = {
              id: productId,
              name: product.name,
              display_name: product.display_name || product.name,
              product_level: product.product_level,
              enabled: product.enabled !== false,
              cost: product.cost,
              price: product.price,
              category: product.category || null,
              subcategory: product.subcategory || null,
              asset_type_id: product.asset_type_id || null,
              parent_product_id: product.parent_product_id || null,
              chassis_type: product.chassis_type || null,
              rack_configurable: product.rack_configurable === true,
              has_level4: product.has_level4 === true,
              requires_level4_config: product.requires_level4_config === true,
              part_number: product.part_number || null,
              image_url: product.image_url || null,
              product_info_url: product.product_info_url || null,
              specifications: product.specifications_json ? JSON.parse(product.specifications_json) : null,
            };

            const { error } = await supabaseAdmin
              .from('products')
              .insert(insertData);
            
            if (error) throw error;
            response.inserted++;
            
          } else {
            // UPDATE
            const updateData: Record<string, any> = {
              updated_at: new Date().toISOString(),
            };

            // Only include fields that are explicitly provided
            if (product.name !== undefined) updateData.name = product.name;
            if (product.display_name !== undefined) updateData.display_name = product.display_name;
            if (product.enabled !== undefined) updateData.enabled = product.enabled;
            if (product.cost !== undefined) updateData.cost = product.cost;
            if (product.price !== undefined) updateData.price = product.price;
            if (product.category !== undefined) updateData.category = product.category || null;
            if (product.subcategory !== undefined) updateData.subcategory = product.subcategory || null;
            if (product.asset_type_id !== undefined) updateData.asset_type_id = product.asset_type_id || null;
            if (product.parent_product_id !== undefined) updateData.parent_product_id = product.parent_product_id || null;
            if (product.chassis_type !== undefined) updateData.chassis_type = product.chassis_type || null;
            if (product.rack_configurable !== undefined) updateData.rack_configurable = product.rack_configurable;
            if (product.has_level4 !== undefined) updateData.has_level4 = product.has_level4;
            if (product.requires_level4_config !== undefined) updateData.requires_level4_config = product.requires_level4_config;
            if (product.part_number !== undefined) updateData.part_number = product.part_number || null;
            if (product.image_url !== undefined) updateData.image_url = product.image_url || null;
            if (product.product_info_url !== undefined) updateData.product_info_url = product.product_info_url || null;
            if (product.specifications_json !== undefined) {
              updateData.specifications = product.specifications_json ? JSON.parse(product.specifications_json) : null;
            }

            const { error } = await supabaseAdmin
              .from('products')
              .update(updateData)
              .eq('id', product.id);
            
            if (error) throw error;
            response.updated++;
          }
        } catch (err: any) {
          response.errors.push(`Error processing ${product.id}: ${err.message}`);
          response.skipped++;
        }
      }

      // Process relationships
      for (const rel of relationships) {
        if (!rel.level3_product_id || !Array.isArray(rel.level2_product_ids)) {
          response.errors.push(`Invalid relationship row: ${JSON.stringify(rel)}`);
          continue;
        }

        try {
          // Delete existing relationships for this level3 product
          const { error: deleteError } = await supabaseAdmin
            .from('level2_level3_relationships')
            .delete()
            .eq('level3_product_id', rel.level3_product_id);
          
          if (deleteError) throw deleteError;

          // Insert new relationships
          const validL2Ids = rel.level2_product_ids.filter(id => id && id.trim());
          if (validL2Ids.length > 0) {
            const insertRows = validL2Ids.map(l2Id => ({
              level2_product_id: l2Id.trim(),
              level3_product_id: rel.level3_product_id
            }));

            const { error: insertError } = await supabaseAdmin
              .from('level2_level3_relationships')
              .insert(insertRows);
            
            if (insertError) throw insertError;
          }

          response.relationship_updates++;
        } catch (err: any) {
          response.errors.push(`Error updating relationships for ${rel.level3_product_id}: ${err.message}`);
        }
      }

      // Log audit event
      try {
        await supabaseAdmin
          .from('user_sessions')
          .insert({
            user_id: user.id,
            event: 'admin_products_bulk_update',
            device_info: {
              action: 'bulk_update',
              updated: response.updated,
              inserted: response.inserted,
              disabled: response.disabled,
              relationship_updates: response.relationship_updates,
              skipped: response.skipped,
              errors_count: response.errors.length
            },
            ip_address: req.headers.get('x-forwarded-for') || 'unknown'
          });
      } catch (auditError) {
        console.error('[admin-products-bulk] Audit log error:', auditError);
      }
    } else {
      // Dry run - just count what would be processed
      for (const product of validProducts) {
        const action = product.action || 'UPDATE';
        if (action === 'DELETE') response.disabled++;
        else if (action === 'INSERT') response.inserted++;
        else response.updated++;
      }
      response.relationship_updates = relationships.length;
    }

    console.log(`[admin-products-bulk] Complete: ${JSON.stringify(response)}`);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('[admin-products-bulk] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: error.message.includes('Admin access') ? 403 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
