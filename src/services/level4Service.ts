import { getSupabaseClient, getSupabaseAdminClient, isAdminAvailable } from "@/integrations/supabase/client";

const supabase = getSupabaseClient();
const supabaseAdmin = getSupabaseAdminClient();;
import type { Level4Config } from "@/components/level4/Level4ConfigTypes";
import { Level4BOMValue, Level4RuntimePayload } from "@/types/level4";

interface Level4ConfigRow {
  id: string;
  product_id: string;
  field_label: string;
  mode: "fixed" | "variable";
  fixed_number_of_inputs: number | null;
  variable_max_inputs: number | null;
  options: { id: string; name: string; url: string }[];
}

export class Level4Service {
  static async getLevel4Configuration(productId: string): Promise<Level4Config | null> {
    const { data, error } = await supabase
      .from("level4_configs")
      .select(
        "id, product_id, field_label, mode, fixed_number_of_inputs, variable_max_inputs, options"
      )
      .eq("product_id", productId)
      .maybeSingle(); // <- prevents 406

    if (error) {
      console.error("Error loading Level 4 config:", error);
      throw error;
    }
    if (!data) return null;

    return {
      id: data.id,
      fieldLabel: data.field_label,
      mode: data.mode,
      fixed: data.mode === "fixed" ? { numberOfInputs: data.fixed_number_of_inputs ?? 1 } : undefined,
      variable: data.mode === "variable" ? { maxInputs: data.variable_max_inputs ?? 1 } : undefined,
      options: data.options || [],
    };
  }

  static async getLevel3ProductsWithLevel4(): Promise<any[]> {
    const [productsResult, configsResult] = await Promise.all([
      supabase
        .from("products")
        .select("id, name, parent_product_id, has_level4, enabled")
        .eq("product_level", 3),
      supabase.from("level4_configs").select("product_id"),
    ]);

    const { data: allL3Products, error: productsError } = productsResult;
    const { data: l4Configs, error: configsError } = configsResult;

    if (productsError) throw productsError;
    if (configsError) throw configsError;

    const configuredProductIds = new Set((l4Configs || []).map((c: { product_id: string }) => c.product_id));
    const relevantProducts = (allL3Products || []).filter(
      (p: any) => p.has_level4 || configuredProductIds.has(p.id)
    );
    return relevantProducts;
  }

  static async saveLevel4Configuration(config: Level4Config, productId: string): Promise<Level4Config | null> {
    const rowToSave: Omit<Level4ConfigRow, "id"> = {
      product_id: productId,
      field_label: config.fieldLabel,
      mode: config.mode,
      fixed_number_of_inputs: config.fixed?.numberOfInputs ?? null,
      variable_max_inputs: config.variable?.maxInputs ?? null,
      options: config.options,
    } as Omit<Level4ConfigRow, "id">;

    const { data, error } = await supabase
      .from("level4_configs")
      .upsert(rowToSave, { onConflict: "product_id" })
      .select(
        "id, product_id, field_label, mode, fixed_number_of_inputs, variable_max_inputs, options"
      )
      .single(); // ← here we *expect* one row back

    if (error) {
      console.error("Error saving Level 4 config:", error);
      throw error;
    }

    return {
      id: data.id,
      fieldLabel: data.field_label,
      mode: data.mode,
      fixed: data.mode === "fixed" ? { numberOfInputs: data.fixed_number_of_inputs ?? 1 } : undefined,
      variable: data.mode === "variable" ? { maxInputs: data.variable_max_inputs ?? 1 } : undefined,
      options: data.options || [],
    };
  }

  static async saveBOMLevel4Value(
    bomItemId: string,
    payload: Level4RuntimePayload
  ): Promise<Level4BOMValue | null> {
    const { data, error } = await supabase
      .from("bom_level4_values")
      .upsert(
        {
          bom_item_id: bomItemId,
          level4_config_id: payload.configuration_id,
          entries: payload.entries,
        },
        { onConflict: "bom_item_id" }
      )
      .select()
      .maybeSingle(); // safe

    if (error) throw error;
    return data || null;
  }

  static async getBOMLevel4Value(bomItemId: string): Promise<Level4BOMValue | null> {
    const { data, error } = await supabase
      .from("bom_level4_values")
      .select("*")
      .eq("bom_item_id", bomItemId)
      .maybeSingle();

    if (error) return null;
    return data || null;
  }

  static async deleteBOMLevel4Value(bomItemId: string): Promise<boolean> {
    const { error } = await supabase.from("bom_level4_values").delete().eq("bom_item_id", bomItemId);
    return !error;
  }

  static formatLevel4Display(value: Level4BOMValue, config: Level4Config): string[] {
    if (!value || !value.entries || !config) return ["Level 4 configuration error"];
    return value.entries.map((entry, i) => {
      const option = config.options.find((opt) => opt.id === entry.value);
      const label = option?.name || entry.value;
      return config.mode === "variable"
        ? `${config.fieldLabel} #${i + 1}: ${label}`
        : `${config.fieldLabel} ${i + 1}: ${label}`;
    });
  }

  static getLevel4Summary(value: Level4BOMValue, config?: Level4Config): string {
    if (!value || !value.entries || value.entries.length === 0) return "No Level 4 configuration";
    const count = value.entries.length;
    if (config) {
      const template = config.mode.charAt(0).toUpperCase() + config.mode.slice(1);
      return `L4: ${count} ${config.fieldLabel.toLowerCase()}${count > 1 ? "s" : ""} (${template})`;
    }
    return `L4: ${count} selection${count > 1 ? "s" : ""}`;
  }

  static validateLevel4Configuration(value: Level4BOMValue, config: Level4Config) {
    const errors: string[] = [];
    if (!value || !value.entries) return { isValid: false, errors: ["No Level 4 selections found"] };

    if (config.mode === "variable") {
      const maxInputs = config.variable?.maxInputs || 1;
      if (value.entries.length > maxInputs) errors.push(`Too many selections: ${value.entries.length}/${maxInputs}`);
      if (value.entries.length === 0) errors.push("At least one selection is required");
    } else if (config.mode === "fixed") {
      const required = config.fixed?.numberOfInputs || 1;
      if (value.entries.length !== required) errors.push(`Incorrect number of selections: ${value.entries.length}/${required}`);
    }

    value.entries.forEach((entry, i) => {
      if (!entry.value) errors.push(`Selection ${i + 1} is empty`);
      else if (!config.options.some((opt) => opt.id === entry.value))
        errors.push(`Selection ${i + 1} has invalid option: ${entry.value}`);
    });

    return { isValid: errors.length === 0, errors };
  }
}
