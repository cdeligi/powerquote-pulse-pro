import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Level4ConfiguratorAdmin from "@/components/level4/Level4ConfiguratorAdmin";
import {
  type Level4Config,
  emptyVariableConfig,
  emptyFixedConfig,
} from "@/components/level4/Level4ConfigTypes";
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
        // TODO: fetch config from your backend for productId
        // const { data } = await api.get(`/api/level4-config/${productId}`);
        // if (data) setCfg(data);
        
        // Mock data for now
        await new Promise(resolve => setTimeout(resolve, 500));
        setCfg(emptyVariableConfig());
      } catch (error) {
        console.error('Failed to load Level 4 config:', error);
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
      // TODO: persist to your backend
      // await api.put(`/api/level4-config/${productId}`, updated);
      console.log("Saving Level-4 config for product", productId, updated);
      setCfg(updated);
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