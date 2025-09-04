import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Level4ConfiguratorAdmin from "@/components/level4/Level4ConfiguratorAdmin";
import {
  type Level4Config,
  emptyVariableConfig,
  emptyFixedConfig,
} from "@/components/level4/Level4ConfigTypes";
import { Level4Service } from "@/services/level4Service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function AdminLevel4ConfigPage() {
  const { productId } = useParams();
  const [cfg, setCfg] = useState<Level4Config>(emptyVariableConfig());
  const [loading, setLoading] = useState(true);
  const [dbSchemaError, setDbSchemaError] = useState<string | null>(null);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        setLoading(true);
        const config = await Level4Service.getLevel4Configuration(productId!);
        
        if (config) {
          setCfg(config);
        } else {
          setCfg(emptyVariableConfig());
        }
      } catch (error) {
        console.error('Failed to load Level 4 config:', error);
        if (error && typeof error === 'object' && 'code' in error && error.code === '42P01') {
          const description = "The 'level4_configs' table is missing from your database. Please apply the latest database migrations to resolve this issue.";
          setDbSchemaError(description);
        } else if (error && typeof error === 'object' && 'status' in error && error.status === 406) {
          const description = "The API schema is out of date. This can happen after database migrations. Restarting your Supabase services (or project on the cloud) will force the schema to reload.";
          setDbSchemaError(description);
        } else {
          setDbSchemaError(error instanceof Error ? error.message : 'An unknown error occurred while loading the configuration.');
        }
        setCfg(emptyVariableConfig()); // Set a default empty state
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
      const savedConfig = await Level4Service.saveLevel4Configuration(updated, productId!);
      if (!savedConfig) {
        throw new Error('Failed to save configuration');
      }
      // The service now returns the full config, so we can just set it.
      // The ID is managed by the database, so the `updated` object might have a temporary one.
      // The `savedConfig` will have the real, persisted state.
      setCfg(savedConfig);
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

  if (dbSchemaError) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Configuration Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">{dbSchemaError}</p>
            <p className="text-sm text-muted-foreground">
              This error indicates that your application code is ahead of your database schema. Run the following command in your project's terminal and then refresh this page.
            </p>
            <div className="mt-4 p-4 bg-muted rounded font-mono text-sm">
              <pre><code>supabase db push</code></pre>
            </div>
            <Button onClick={() => window.location.reload()} className="mt-4">Refresh Page</Button>
          </CardContent>
        </Card>
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