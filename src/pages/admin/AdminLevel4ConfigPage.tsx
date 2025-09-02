import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Level4ConfiguratorAdmin from "@/components/level4/Level4ConfiguratorAdmin";
import {
  type Level4Config,
  emptyVariableConfig,
  emptyFixedConfig,
} from "@/components/level4/Level4ConfigTypes";
import { Level4Service } from "@/services/level4Service";
import { Level4TemplateType } from "@/types/level4";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function AdminLevel4ConfigPage() {
  const { productId } = useParams();
  const [cfg, setCfg] = useState<Level4Config>(emptyVariableConfig());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        setLoading(true);
        // Load existing configuration from Supabase if available
        const level4Config = await Level4Service.getLevel4Configuration(productId);
        
        if (level4Config) {
          // Convert Supabase format to Level4Config format
          setCfg({
            id: level4Config.id,
            fieldLabel: level4Config.field_label,
            mode: level4Config.template_type === 'OPTION_1' ? 'variable' : 'fixed',
            fixed: level4Config.template_type === 'OPTION_2' ? { numberOfInputs: level4Config.fixed_inputs || 1 } : undefined,
            variable: level4Config.template_type === 'OPTION_1' ? { maxInputs: level4Config.max_inputs || 3 } : undefined,
            options: level4Config.options.map(opt => ({
              id: opt.id,
              name: opt.label,
              url: '' // Level4Option doesn't have info_url field
            }))
          });
        } else {
          setCfg(emptyVariableConfig());
        }
      } catch (error) {
        console.error('Failed to load Level 4 config:', error);
        setCfg(emptyVariableConfig());
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      loadConfig();
    }
  }, [productId]);

  const save = async (updated: Level4Config) => {
    try {
      // Convert Level4Config format to Supabase format
      const configToSave = {
        id: updated.id !== emptyVariableConfig().id ? updated.id : undefined,
        level3_product_id: productId!,
        template_type: (updated.mode === 'variable' ? 'OPTION_1' : 'OPTION_2') as Level4TemplateType,
        field_label: updated.fieldLabel,
        max_inputs: updated.mode === 'variable' ? updated.variable?.maxInputs : null,
        fixed_inputs: updated.mode === 'fixed' ? updated.fixed?.numberOfInputs : null,
        info_url: null // Global URL not used in new system
      };

      // Save configuration
      const savedConfig = await Level4Service.saveLevel4Configuration(configToSave);
      if (!savedConfig) throw new Error('Failed to save configuration');

      // Delete existing options and recreate
      if (updated.id && updated.id !== emptyVariableConfig().id) {
        // Delete existing options
        const existingConfig = await Level4Service.getLevel4Configuration(productId);
        if (existingConfig?.options) {
          for (const opt of existingConfig.options) {
            await Level4Service.deleteLevel4Option(opt.id);
          }
        }
      }

      // Save new options
      for (let i = 0; i < updated.options.length; i++) {
        const option = updated.options[i];
        await Level4Service.saveLevel4Option({
          level4_configuration_id: savedConfig.id,
          label: option.name,
          value: option.id,
          display_order: i,
          is_default: i === 0 // First option is default
        });
      }

      setCfg({ ...updated, id: savedConfig.id });
    } catch (error) {
      console.error('Failed to save Level 4 config:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Level 4 Configuration - Admin</CardTitle>
            <CardDescription>
              Configure Fixed/Variable inputs and manage dropdown options for product: {productId}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Main Configuration */}
      <Level4ConfiguratorAdmin 
        value={cfg} 
        onChange={setCfg} 
        onSave={save} 
      />
    </div>
  );
}