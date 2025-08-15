/**
 * © 2025 Qualitrol Corp. All rights reserved.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Edit3, Trash2, Save, X, Plus, Eye } from "lucide-react";
import { 
  ChassisType, 
  ChassisTypeFormData, 
  ChassisVisualLayout,
  validateLayoutRows, 
  validateVisualLayout,
  generateDefaultLayout,
  generateDefaultVisualLayout
} from "@/types/product/chassis-types";
import { productDataService } from "@/services/productDataService";
import { useToast } from "@/hooks/use-toast";
import { EnhancedChassisLayoutDesigner } from "./EnhancedChassisLayoutDesigner";
import { ChassisPreviewModal } from "./ChassisPreviewModal";

export const ChassisTypeManager: React.FC = () => {
  const { toast } = useToast();
  const [chassisTypes, setChassisTypes] = useState<ChassisType[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createFormData, setCreateFormData] = useState<ChassisTypeFormData>({
    code: '',
    name: '',
    totalSlots: 8,
    layoutRows: null,
    visualLayout: null,
    enabled: true,
    metadata: {}
  });
  const [editFormData, setEditFormData] = useState<Partial<ChassisType>>({});
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);

  useEffect(() => {
    loadChassisTypes();
  }, []);

  const loadChassisTypes = async () => {
    try {
      setLoading(true);
      const data = await productDataService.getChassisTypes();
      setChassisTypes(data);
    } catch (error) {
      console.error('Error loading chassis types:', error);
      toast({
        title: "Error",
        description: "Failed to load chassis types",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      // Auto-generate layout if not provided
      if (!createFormData.layoutRows && createFormData.totalSlots > 0) {
        createFormData.layoutRows = generateDefaultLayout(createFormData.totalSlots);
      }
      
      // Auto-generate visual layout if not provided
      if (!createFormData.visualLayout && createFormData.totalSlots > 0) {
        createFormData.visualLayout = generateDefaultVisualLayout(createFormData.totalSlots);
      }

      await productDataService.createChassisType(createFormData);
      toast({
        title: "Success",
        description: "Chassis type created successfully"
      });
      setShowCreateForm(false);
      setCreateFormData({
        code: '',
        name: '',
        totalSlots: 8,
        layoutRows: null,
        visualLayout: null,
        enabled: true,
        metadata: {}
      });
      loadChassisTypes();
    } catch (error) {
      console.error('Error creating chassis type:', error);
      toast({
        title: "Error",
        description: "Failed to create chassis type",
        variant: "destructive"
      });
    }
  };

  const handleEditStart = (chassisType: ChassisType) => {
    setEditingId(chassisType.id);
    setEditFormData({
      code: chassisType.code,
      name: chassisType.name,
      totalSlots: chassisType.totalSlots,
      layoutRows: chassisType.layoutRows,
      visualLayout: chassisType.visualLayout,
      enabled: chassisType.enabled,
      metadata: chassisType.metadata
    });
  };

  const handleEditSave = async () => {
    if (!editingId) return;

    try {
      await productDataService.updateChassisType(editingId, editFormData);
      toast({
        title: "Success",
        description: "Chassis type updated successfully"
      });
      setEditingId(null);
      setEditFormData({});
      loadChassisTypes();
    } catch (error) {
      console.error('Error updating chassis type:', error);
      toast({
        title: "Error",
        description: "Failed to update chassis type",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      try {
        await productDataService.deleteChassisType(id);
        toast({
          title: "Success",
          description: "Chassis type deleted successfully"
        });
        loadChassisTypes();
      } catch (error) {
        console.error('Error deleting chassis type:', error);
        toast({
          title: "Error",
          description: "Failed to delete chassis type",
          variant: "destructive"
        });
      }
    }
  };

  const renderLayoutPreview = (layoutRows?: number[][] | null) => {
    if (!layoutRows || layoutRows.length === 0) return <span className="text-muted-foreground">Auto-generated</span>;
    
    return (
      <div className="space-y-1">
        {layoutRows.map((row, i) => (
          <div key={i} className="flex gap-1">
            {row.map(slot => (
              <span key={slot} className="inline-block w-6 h-6 bg-primary/20 text-xs flex items-center justify-center rounded border">
                {slot}
              </span>
            ))}
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading chassis types...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Chassis Types ({chassisTypes.length})</CardTitle>
            <Collapsible open={showCreateForm} onOpenChange={setShowCreateForm}>
              <CollapsibleTrigger asChild>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  {showCreateForm ? 'Cancel' : 'Add Chassis Type'}
                </Button>
              </CollapsibleTrigger>
            </Collapsible>
          </div>
        </CardHeader>
        <CardContent>
          <Collapsible open={showCreateForm} onOpenChange={setShowCreateForm}>
            <CollapsibleContent>
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-lg">Create New Chassis Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="basic" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="basic">Basic Info</TabsTrigger>
                      <TabsTrigger value="layout" disabled={createFormData.totalSlots <= 0}>
                        Layout Designer
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="basic" className="space-y-4 mt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="create-code">Code *</Label>
                          <Input
                            id="create-code"
                            value={createFormData.code}
                            onChange={(e) => setCreateFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                            placeholder="e.g., LTX"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="create-name">Name *</Label>
                          <Input
                            id="create-name"
                            value={createFormData.name}
                            onChange={(e) => setCreateFormData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="e.g., LTX Chassis"
                            required
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="create-slots">Total Slots *</Label>
                          <Input
                            id="create-slots"
                            type="number"
                            min="1"
                            value={createFormData.totalSlots}
                            onChange={(e) => setCreateFormData(prev => ({ ...prev, totalSlots: parseInt(e.target.value) || 0 }))}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="create-numbering">Slot numbering starts at *</Label>
                          <select
                            id="create-numbering"
                            value={createFormData.metadata?.slotNumberingStart || 0}
                            onChange={(e) => setCreateFormData(prev => ({ 
                              ...prev, 
                              metadata: { ...prev.metadata, slotNumberingStart: parseInt(e.target.value) }
                            }))}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                          >
                            <option value={0}>0 (zero-based)</option>
                            <option value={1}>1 (one-based)</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="create-enabled"
                          checked={createFormData.enabled}
                          onCheckedChange={(enabled) => setCreateFormData(prev => ({ ...prev, enabled }))}
                        />
                        <Label htmlFor="create-enabled">Enabled</Label>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="layout" className="mt-4">
                      {createFormData.totalSlots > 0 ? (
                        <EnhancedChassisLayoutDesigner
                          totalSlots={createFormData.totalSlots}
                          initialLayout={createFormData.layoutRows}
                          initialVisualLayout={createFormData.visualLayout}
                          onLayoutChange={(layout) => setCreateFormData(prev => ({ ...prev, layoutRows: layout }))}
                          onVisualLayoutChange={(visualLayout) => setCreateFormData(prev => ({ ...prev, visualLayout }))}
                          onPreview={(layout, visualLayout) => {
                            setPreviewData({
                              code: createFormData.code || 'Preview',
                              name: createFormData.name || 'Preview Chassis',
                              totalSlots: createFormData.totalSlots,
                              layoutRows: layout,
                              visualLayout: visualLayout
                            });
                            setShowPreview(true);
                          }}
                        />
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <p>Please set the total slots in Basic Info to use the Layout Designer.</p>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                  
                  <div className="flex justify-end space-x-2 mt-6 pt-4 border-t">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowCreateForm(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleCreate}
                      disabled={!createFormData.code || !createFormData.name || createFormData.totalSlots <= 0}
                    >
                      Create Chassis Type
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>

          <div className="space-y-4">
            {chassisTypes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No chassis types found. Create one to get started.</p>
              </div>
            ) : (
              chassisTypes.map((chassisType) => (
                <div key={chassisType.id} className="p-4 border rounded-lg">
                  {editingId === chassisType.id ? (
                    <div className="space-y-4">
                      <Tabs defaultValue="basic" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="basic">Basic Info</TabsTrigger>
                          <TabsTrigger value="layout" disabled={(editFormData.totalSlots || 0) <= 0}>
                            Layout Designer
                          </TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="basic" className="space-y-4 mt-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Code *</Label>
                              <Input
                                value={editFormData.code || ''}
                                onChange={(e) => setEditFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                              />
                            </div>
                            <div>
                              <Label>Name *</Label>
                              <Input
                                value={editFormData.name || ''}
                                onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Total Slots *</Label>
                              <Input
                                type="number"
                                min="1"
                                value={editFormData.totalSlots || 0}
                                onChange={(e) => setEditFormData(prev => ({ ...prev, totalSlots: parseInt(e.target.value) || 0 }))}
                              />
                            </div>
                            <div>
                              <Label>Slot numbering starts at *</Label>
                              <select
                                value={editFormData.metadata?.slotNumberingStart || 0}
                                onChange={(e) => setEditFormData(prev => ({ 
                                  ...prev, 
                                  metadata: { ...prev.metadata, slotNumberingStart: parseInt(e.target.value) }
                                }))}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                              >
                                <option value={0}>0 (zero-based)</option>
                                <option value={1}>1 (one-based)</option>
                              </select>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={editFormData.enabled || false}
                              onCheckedChange={(enabled) => setEditFormData(prev => ({ ...prev, enabled }))}
                            />
                            <Label>Enabled</Label>
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="layout" className="mt-4">
                          {(editFormData.totalSlots || 0) > 0 ? (
                            <EnhancedChassisLayoutDesigner
                              totalSlots={editFormData.totalSlots!}
                              initialLayout={editFormData.layoutRows}
                              initialVisualLayout={editFormData.visualLayout}
                              onLayoutChange={(layout) => setEditFormData(prev => ({ ...prev, layoutRows: layout }))}
                              onVisualLayoutChange={(visualLayout) => setEditFormData(prev => ({ ...prev, visualLayout }))}
                              onPreview={(layout, visualLayout) => {
                                setPreviewData({
                                  code: editFormData.code || 'Preview',
                                  name: editFormData.name || 'Preview Chassis',
                                  totalSlots: editFormData.totalSlots || 0,
                                  layoutRows: layout,
                                  visualLayout: visualLayout
                                });
                                setShowPreview(true);
                              }}
                            />
                          ) : (
                            <div className="text-center py-8 text-muted-foreground">
                              <p>Please set the total slots in Basic Info to use the Layout Designer.</p>
                            </div>
                          )}
                        </TabsContent>
                      </Tabs>
                      
                      <div className="flex space-x-2 pt-4 border-t">
                        <Button onClick={handleEditSave} disabled={!editFormData.code || !editFormData.name}>
                          <Save className="h-4 w-4 mr-2" />
                          Save
                        </Button>
                        <Button variant="outline" onClick={() => setEditingId(null)}>
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-semibold">{chassisType.name}</h3>
                            <Badge variant={chassisType.enabled ? "default" : "secondary"}>
                              {chassisType.enabled ? 'Enabled' : 'Disabled'}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p><strong>Code:</strong> {chassisType.code}</p>
                            <p><strong>Total Slots:</strong> {chassisType.totalSlots}</p>
                            <p><strong>Slot Numbering:</strong> Starts at {chassisType.metadata?.slotNumberingStart || 0}</p>
                            <p><strong>Created:</strong> {new Date(chassisType.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                        
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setPreviewData(chassisType);
                              setShowPreview(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Preview
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditStart(chassisType)}
                          >
                            <Edit3 className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(chassisType.id, chassisType.name)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      </div>
                      
                      <div className="mt-4 pt-4 border-t">
                        <div className="text-sm">
                          <span className="font-medium">Layout Preview:</span>
                          <div className="mt-2">
                            {renderLayoutPreview(chassisType.layoutRows)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <ChassisPreviewModal
        open={showPreview}
        onOpenChange={setShowPreview}
        chassisType={previewData}
      />
    </div>
  );
};