/**
 * Enhanced Slot Edit Dialog with full visual customization capabilities
 */

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Upload, Image, Palette, Maximize2 } from "lucide-react";
import { VisualSlotLayout } from "@/types/product/chassis-types";

interface EnhancedSlotEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slotData?: VisualSlotLayout;
  onSave: (slotData: VisualSlotLayout) => void;
  usedSlotNumbers: Set<number>;
  maxSlots: number;
}

export const EnhancedSlotEditDialog: React.FC<EnhancedSlotEditDialogProps> = ({
  open,
  onOpenChange,
  slotData,
  onSave,
  usedSlotNumbers,
  maxSlots
}) => {
  const [formData, setFormData] = useState<VisualSlotLayout>({
    slotNumber: 0,
    x: 0,
    y: 0,
    width: 80,
    height: 60
  });
  const [slotName, setSlotName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [error, setError] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Initialize form data when dialog opens
  useEffect(() => {
    if (open && slotData) {
      setFormData(slotData);
      setSlotName((slotData as any).name || '');
      setImageUrl(slotData.imageUrl || '');
      setImagePreview(slotData.imageUrl || null);
      setError('');
    }
  }, [open, slotData]);

  // Validate image URL and update preview
  useEffect(() => {
    if (imageUrl && imageUrl.trim()) {
      const img = new window.Image();
      img.onload = () => setImagePreview(imageUrl);
      img.onerror = () => setImagePreview(null);
      img.src = imageUrl;
    } else {
      setImagePreview(null);
    }
  }, [imageUrl]);

  const handleInputChange = (field: keyof VisualSlotLayout, value: number | string) => {
    setFormData(prev => ({
      ...prev,
      [field]: typeof value === 'string' ? parseFloat(value) || 0 : value
    }));
    setError('');
  };

  const validateAndSave = () => {
    setError('');

    // Validate slot number
    if (formData.slotNumber < 0 || formData.slotNumber >= maxSlots) {
      setError(`Slot number must be between 0 and ${maxSlots - 1}`);
      return;
    }

    // Check if slot number is already used (unless it's the same slot)
    if (formData.slotNumber !== slotData?.slotNumber && usedSlotNumbers.has(formData.slotNumber)) {
      setError(`Slot ${formData.slotNumber} is already in use`);
      return;
    }

    // Validate dimensions
    if (formData.width < 40 || formData.height < 30) {
      setError('Minimum size is 40x30 pixels');
      return;
    }

    if (formData.width > 400 || formData.height > 300) {
      setError('Maximum size is 400x300 pixels');
      return;
    }

    // Validate position
    if (formData.x < 0 || formData.y < 0) {
      setError('Position cannot be negative');
      return;
    }

    if (formData.x + formData.width > 800 || formData.y + formData.height > 600) {
      setError('Slot extends beyond canvas boundaries');
      return;
    }

    // Build final slot data
    const finalSlotData: VisualSlotLayout = {
      ...formData,
      ...(slotName.trim() && { name: slotName.trim() }),
      ...(imageUrl.trim() && { imageUrl: imageUrl.trim() })
    };

    onSave(finalSlotData);
    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      validateAndSave();
    } else if (e.key === 'Escape') {
      onOpenChange(false);
    }
  };

  const quickSizePresets = [
    { name: 'Small', width: 60, height: 40 },
    { name: 'Medium', width: 80, height: 60 },
    { name: 'Large', width: 120, height: 80 },
    { name: 'Wide', width: 140, height: 60 },
    { name: 'Tall', width: 80, height: 100 }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Edit Slot {slotData?.slotNumber}
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="position">Position</TabsTrigger>
          </TabsList>
          
          <TabsContent value="basic" className="space-y-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="slot-number">Slot Number *</Label>
                  <Input
                    id="slot-number"
                    type="number"
                    min={0}
                    max={maxSlots - 1}
                    value={formData.slotNumber}
                    onChange={(e) => handleInputChange('slotNumber', parseInt(e.target.value) || 0)}
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="slot-name">Display Name</Label>
                  <Input
                    id="slot-name"
                    type="text"
                    value={slotName}
                    onChange={(e) => setSlotName(e.target.value)}
                    placeholder="e.g., 'I/O Port 1'"
                    className="w-full"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Quick Size Presets</Label>
                <div className="flex flex-wrap gap-2">
                  {quickSizePresets.map((preset) => (
                    <Button
                      key={preset.name}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        handleInputChange('width', preset.width);
                        handleInputChange('height', preset.height);
                      }}
                      className="text-xs"
                    >
                      {preset.name}
                      <span className="ml-1 text-muted-foreground">
                        {preset.width}×{preset.height}
                      </span>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="appearance" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="image-url" className="flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  Background Image URL
                </Label>
                <Input
                  id="image-url"
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.png"
                  className="w-full"
                />
                {imagePreview && (
                  <div className="mt-2 p-3 border border-border rounded-lg">
                    <p className="text-sm text-muted-foreground mb-2">Preview:</p>
                    <div className="flex justify-center">
                      <img 
                        src={imagePreview} 
                        alt="Slot preview" 
                        className="max-w-24 max-h-24 object-contain border border-border rounded"
                        onError={() => setImagePreview(null)}
                      />
                    </div>
                  </div>
                )}
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Upload Tips
                </Label>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>• Use PNG or SVG for best quality</p>
                  <p>• Recommended size: 64×64 to 128×128 pixels</p>
                  <p>• Images will be automatically scaled to fit</p>
                  <p>• Transparent backgrounds work best</p>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="position" className="space-y-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="slot-x">X Position</Label>
                  <Input
                    id="slot-x"
                    type="number"
                    min={0}
                    max={800}
                    value={formData.x}
                    onChange={(e) => handleInputChange('x', e.target.value)}
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="slot-y">Y Position</Label>
                  <Input
                    id="slot-y"
                    type="number"
                    min={0}
                    max={600}
                    value={formData.y}
                    onChange={(e) => handleInputChange('y', e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="slot-width" className="flex items-center gap-2">
                    <Maximize2 className="h-4 w-4" />
                    Width
                  </Label>
                  <Input
                    id="slot-width"
                    type="number"
                    min={40}
                    max={400}
                    value={formData.width}
                    onChange={(e) => handleInputChange('width', e.target.value)}
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="slot-height">Height</Label>
                  <Input
                    id="slot-height"
                    type="number"
                    min={30}
                    max={300}
                    value={formData.height}
                    onChange={(e) => handleInputChange('height', e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
              
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">Current Status:</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">
                    Size: {formData.width}×{formData.height}
                  </Badge>
                  <Badge variant="outline">
                    Position: ({formData.x}, {formData.y})
                  </Badge>
                  <Badge variant={
                    formData.x + formData.width <= 800 && formData.y + formData.height <= 600
                      ? "default" : "destructive"
                  }>
                    {formData.x + formData.width <= 800 && formData.y + formData.height <= 600
                      ? "Within bounds" : "Out of bounds"}
                  </Badge>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        {error && (
          <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
            {error}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={validateAndSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};