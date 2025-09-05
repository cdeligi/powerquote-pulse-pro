import { supabase } from "@/integrations/supabase/client";
import type { Level4Config } from "@/components/level4/Level4ConfigTypes";
import { Level4BOMValue, Level4RuntimePayload } from "@/types/level4";

/**
 * Represents the shape of the data in the `level4_configs` table.
 */
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
  // Get Level 4 configuration for a Level 3 product
  static async getLevel4Configuration(
    productId: string,
  ): Promise<Level4Config | null> {
    // Fetch configuration, allowing zero results without 406 errors
    const { data, error } = await supabase
      .from("level4_configs")
      .select("*")
      .eq("product_id", productId)
      .maybeSingle();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      console.error("Error loading Level 4 config:", error);
      throw error;
    }

    if (!data) {
      return null;
    }

    // Transform the database row into the Level4Config shape
    return {
      id: data.id,
      fieldLabel: data.field_label,
      mode: data.mode,
      fixed:
        data.mode === "fixed"
          ? { numberOfInputs: data.fixed_number_of_inputs! }
          : undefined,
      variable:
        data.mode === "variable"
          ? { maxInputs: data.variable_max_inputs! }
          : undefined,
      options: data.options || [],
    };
  }

  // Get all Level 3 products that have Level 4 enabled
  static async getLevel3ProductsWithLevel4(): Promise<any[]> {
    console.log("Level4Service: Fetching all L3 products and L4 configs...");

    // 1. Fetch all L3 products and all L4 config IDs in parallel.
    const [productsResult, configsResult] = await Promise.all([
      supabase
        .from("products")
        .select("id, name, parent_product_id, has_level4, enabled")
        .eq("product_level", 3),
      supabase.from("level4_configs").select("product_id"),
    ]);

    const { data: allL3Products, error: productsError } = productsResult;
    const { data: l4Configs, error: configsError } = configsResult;

    if (productsError) {
      console.error("Error loading L3 products:", productsError);
      throw productsError;
    }
    if (configsError) {
      // If there's any error fetching the configs (including 406), we must fail.
      // The UI will catch this and display an appropriate message.
      console.error("Error loading L4 configs:", configsError);
      throw configsError;
    }

    // 2. Filter L3 products that are relevant for Level 4 configuration.
    const configuredProductIds = new Set(
      l4Configs?.map((c) => c.product_id) || [],
    );
    const relevantProducts = (allL3Products || []).filter(
      (p) => p.has_level4 || configuredProductIds.has(p.id),
    );

    console.log(
      "Level4Service: Total relevant L4 products:",
      relevantProducts.length,
    );
    return relevantProducts;
  }

  // Create or update Level 4 configuration
  static async saveLevel4Configuration(
    config: Level4Config,
    productId: string,
  ): Promise<Level4Config | null> {
    const rowToSave: Omit<Level4ConfigRow, "id" | "created_at" | "updated_at"> =
      {
        product_id: productId,
        field_label: config.fieldLabel,
        mode: config.mode,
        fixed_number_of_inputs: config.fixed?.numberOfInputs ?? null,
        variable_max_inputs: config.variable?.maxInputs ?? null,
        options: config.options,
      };

    const { data, error } = await supabase
      .from("level4_configs")
      .upsert(rowToSave, { onConflict: "product_id" })
      .select()
      .single();

    if (error) {
      console.error("Error saving Level 4 config:", error);
      throw error;
    }

    // The 'upsert' with '.select()' returns the saved data.
    // Transform it to the Level4Config shape.
    return {
      id: data.id,
      fieldLabel: data.field_label,
      mode: data.mode,
      fixed:
        data.mode === "fixed"
          ? { numberOfInputs: data.fixed_number_of_inputs! }
          : undefined,
      variable:
        data.mode === "variable"
          ? { maxInputs: data.variable_max_inputs! }
          : undefined,
      options: data.options || [],
    };
  }

  // Save BOM Level 4 value (user selections)
  static async saveBOMLevel4Value(
    bomItemId: string,
    payload: Level4RuntimePayload,
  ): Promise<Level4BOMValue | null> {
    try {
      const { data, error } = await supabase
        .from("bom_level4_values")
        .upsert(
          {
            bom_item_id: bomItemId,
            level4_config_id: payload.configuration_id,
            entries: payload.entries,
          },
          {
            onConflict: "bom_item_id",
          },
        )
        .select()
        .maybeSingle();

      if (error) throw error;
      return data || null;
    } catch (error) {
      console.error("Error in saveBOMLevel4Value:", error);
      throw error; // Re-throw the error to be handled by the caller
    }
  }

  // Get BOM Level 4 value
  static async getBOMLevel4Value(
    bomItemId: string,
  ): Promise<Level4BOMValue | null> {
    try {
      const { data, error } = await supabase
        .from("bom_level4_values")
        .select("*")
        .eq("bom_item_id", bomItemId)
        .maybeSingle();

      if (error) {
        console.error("Error getting BOM Level 4 value:", error);
        return null;
      }

      return data || null;
    } catch (error) {
      console.error("Error in getBOMLevel4Value:", error);
      return null;
    }
  }

  // Delete BOM Level 4 value
  static async deleteBOMLevel4Value(bomItemId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("bom_level4_values")
        .delete()
        .eq("bom_item_id", bomItemId);

      if (error) {
        console.error("Error deleting BOM Level 4 value:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error in deleteBOMLevel4Value:", error);
      return false;
    }
  }

  // Helper function to format Level 4 display
  static formatLevel4Display(
    value: Level4BOMValue,
    config: Level4Config,
  ): string[] {
    try {
      if (!value || !value.entries || !config) {
        return ["Level 4 configuration error"];
      }

      return value.entries.map((entry, index) => {
        const option = config.options.find((opt) => opt.id === entry.value);
        const label = option?.name || entry.value;

        // Format based on template type
        if (config.mode === "variable") {
          // Variable inputs: show entry number
          return `${config.fieldLabel} #${index + 1}: ${label}`;
        } else {
          // Fixed inputs: just show position number
          return `${config.fieldLabel} ${index + 1}: ${label}`;
        }
      });
    } catch (error) {
      console.error("Error formatting Level 4 display:", error);
      return ["Level 4 configuration error"];
    }
  }

  // Get formatted summary for BOM display
  static getLevel4Summary(
    value: Level4BOMValue,
    config?: Level4Config,
  ): string {
    try {
      if (!value || !value.entries || value.entries.length === 0) {
        return "No Level 4 configuration";
      }

      const count = value.entries.length;
      const hasMultiple = count > 1;

      if (config) {
        const templateType =
          config.mode.charAt(0).toUpperCase() + config.mode.slice(1);
        return `L4: ${count} ${config.fieldLabel.toLowerCase()}${hasMultiple ? "s" : ""} (${templateType})`;
      }

      return `L4: ${count} selection${hasMultiple ? "s" : ""}`;
    } catch (error) {
      console.error("Error generating Level 4 summary:", error);
      return "L4: Error";
    }
  }

  // Validate Level 4 configuration completeness
  static validateLevel4Configuration(
    value: Level4BOMValue,
    config: Level4Config,
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!value || !value.entries) {
      errors.push("No Level 4 selections found");
      return { isValid: false, errors };
    }

    if (config.mode === "variable") {
      const maxInputs = config.variable?.maxInputs || 1;
      if (value.entries.length > maxInputs) {
        errors.push(
          `Too many selections: ${value.entries.length}/${maxInputs}`,
        );
      }
      if (value.entries.length === 0) {
        errors.push("At least one selection is required");
      }
    } else if (config.mode === "fixed") {
      const requiredInputs = config.fixed?.numberOfInputs || 1;
      if (value.entries.length !== requiredInputs) {
        errors.push(
          `Incorrect number of selections: ${value.entries.length}/${requiredInputs}`,
        );
      }
    }

    // Check all entries have valid values
    value.entries.forEach((entry, index) => {
      if (!entry.value) {
        errors.push(`Selection ${index + 1} is empty`);
      } else {
        const isValidOption = config.options.some(
          (opt) => opt.id === entry.value,
        );
        if (!isValidOption) {
          errors.push(
            `Selection ${index + 1} has invalid option: ${entry.value}`,
          );
        }
      }
    });

    return { isValid: errors.length === 0, errors };
  }
}
