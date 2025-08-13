/**
 * Enhanced Chassis Layout Designer with visual canvas-based design using Fabric.js
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas as FabricCanvas, Rect, FabricText, Line } from 'fabric';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Grid, Move, RotateCcw, Eye, Square, Hand, ZoomIn, ZoomOut } from "lucide-react";
import { toast } from "sonner";
import { 
  ChassisVisualLayout, 
  VisualSlotLayout, 
  validateLayoutRows, 
  validateVisualLayout, 
  generateDefaultLayout, 
  generateDefaultVisualLayout 
} from "@/types/product/chassis-types";

interface EnhancedChassisLayoutDesignerProps {
  totalSlots: number;
  initialLayout?: number[][] | null;
  initialVisualLayout?: ChassisVisualLayout | null;
  onLayoutChange?: (layout: number[][]) => void;
  onVisualLayoutChange?: (layout: ChassisVisualLayout) => void;
  onPreview?: (layout: number[][], visualLayout?: ChassisVisualLayout) => void;
}

interface DragState {
  isDragging: boolean;
  draggedSlot: number | null;
  sourcePosition: { rowIndex: number; slotIndex: number } | null;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const SLOT_MIN_WIDTH = 40;
const SLOT_MIN_HEIGHT = 30;

export const EnhancedChassisLayoutDesigner: React.FC<EnhancedChassisLayoutDesignerProps> = ({
  totalSlots,
  initialLayout,
  initialVisualLayout,
  onLayoutChange,
  onVisualLayoutChange,
  onPreview
}) => {
  // Grid-based layout state
  const [layout, setLayout] = useState<number[][]>(() => 
    initialLayout || generateDefaultLayout(totalSlots)
  );
  
  // Visual canvas layout state
  const [visualLayout, setVisualLayout] = useState<ChassisVisualLayout>(() => 
    initialVisualLayout || generateDefaultVisualLayout(totalSlots, CANVAS_WIDTH, CANVAS_HEIGHT)
  );
  
  // Canvas state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [selectedTool, setSelectedTool] = useState<'select' | 'draw'>('select');
  const [gridVisible, setGridVisible] = useState(true);
  
  // Grid designer state
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedSlot: null,
    sourcePosition: null
  });
  
  const [errors, setErrors] = useState<string[]>([]);

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      backgroundColor: '#ffffff',
      selection: selectedTool === 'select'
    });

    setFabricCanvas(canvas);
    
    // Setup canvas event handlers
    canvas.on('object:modified', handleCanvasObjectModified);
    canvas.on('mouse:down', handleCanvasMouseDown);

    return () => {
      canvas.dispose();
    };
  }, []);

  // Update canvas selection mode based on tool
  useEffect(() => {
    if (!fabricCanvas) return;
    
    fabricCanvas.selection = selectedTool === 'select';
    fabricCanvas.defaultCursor = selectedTool === 'select' ? 'default' : 'crosshair';
    fabricCanvas.hoverCursor = selectedTool === 'select' ? 'move' : 'crosshair';
  }, [selectedTool, fabricCanvas]);

  // Render slots on canvas
  useEffect(() => {
    if (!fabricCanvas) return;
    
    renderSlotsOnCanvas();
  }, [fabricCanvas, visualLayout]);

  const renderSlotsOnCanvas = useCallback(() => {
    if (!fabricCanvas) return;
    
    fabricCanvas.clear();
    
    // Add grid if visible
    if (gridVisible) {
      drawGrid();
    }
    
    // Add slots
    visualLayout.slots.forEach((slot) => {
      const rect = new Rect({
        left: slot.x,
        top: slot.y,
        width: slot.width,
        height: slot.height,
        fill: 'hsl(var(--accent))',
        stroke: 'hsl(var(--border))',
        strokeWidth: 2,
        cornerSize: 6,
        transparentCorners: false,
        borderColor: 'hsl(var(--primary))',
        borderScaleFactor: 2,
        hasRotatingPoint: false
      });
      
      const text = new FabricText(slot.slotNumber.toString(), {
        left: slot.x + slot.width / 2,
        top: slot.y + slot.height / 2,
        fontSize: 14,
        fontFamily: 'Arial',
        fill: 'hsl(var(--foreground))',
        textAlign: 'center',
        originX: 'center',
        originY: 'center',
        selectable: false,
        evented: false
      });
      
      // Group rect and text together
      rect.set('slotNumber', slot.slotNumber);
      fabricCanvas.add(rect, text);
    });
    
    fabricCanvas.renderAll();
  }, [fabricCanvas, visualLayout, gridVisible]);

  const drawGrid = () => {
    if (!fabricCanvas) return;
    
    const gridSize = 20;
    
    // Vertical lines
    for (let i = 0; i <= CANVAS_WIDTH; i += gridSize) {
      const line = new Line([i, 0, i, CANVAS_HEIGHT], {
        stroke: 'hsl(var(--muted))',
        strokeWidth: 1,
        selectable: false,
        evented: false,
        opacity: 0.3
      });
      fabricCanvas.add(line);
    }
    
    // Horizontal lines
    for (let i = 0; i <= CANVAS_HEIGHT; i += gridSize) {
      const line = new Line([0, i, CANVAS_WIDTH, i], {
        stroke: 'hsl(var(--muted))',
        strokeWidth: 1,
        selectable: false,
        evented: false,
        opacity: 0.3
      });
      fabricCanvas.add(line);
    }
  };

  const handleCanvasObjectModified = (e: any) => {
    const obj = e.target;
    if (!obj || typeof obj.slotNumber !== 'number') return;
    
    const slotNumber = obj.slotNumber;
    const newX = Math.max(0, Math.min(obj.left, CANVAS_WIDTH - obj.width));
    const newY = Math.max(0, Math.min(obj.top, CANVAS_HEIGHT - obj.height));
    const newWidth = Math.max(SLOT_MIN_WIDTH, Math.min(obj.width * obj.scaleX, CANVAS_WIDTH - newX));
    const newHeight = Math.max(SLOT_MIN_HEIGHT, Math.min(obj.height * obj.scaleY, CANVAS_HEIGHT - newY));
    
    // Update visual layout
    const updatedLayout = {
      ...visualLayout,
      slots: visualLayout.slots.map(slot => 
        slot.slotNumber === slotNumber 
          ? { ...slot, x: newX, y: newY, width: newWidth, height: newHeight }
          : slot
      )
    };
    
    setVisualLayout(updatedLayout);
    onVisualLayoutChange?.(updatedLayout);
  };

  const handleCanvasMouseDown = (e: any) => {
    if (selectedTool !== 'draw') return;
    
    const pointer = fabricCanvas!.getPointer(e.e);
    
    // Find available slot number
    const usedSlots = new Set(visualLayout.slots.map(s => s.slotNumber));
    let nextSlotNumber = 0;
    while (usedSlots.has(nextSlotNumber) && nextSlotNumber < totalSlots) {
      nextSlotNumber++;
    }
    
    if (nextSlotNumber >= totalSlots) {
      toast.error("Maximum number of slots reached");
      return;
    }
    
    // Create new slot
    const newSlot: VisualSlotLayout = {
      slotNumber: nextSlotNumber,
      x: pointer.x,
      y: pointer.y,
      width: 80,
      height: 60
    };
    
    const updatedLayout = {
      ...visualLayout,
      slots: [...visualLayout.slots, newSlot]
    };
    
    setVisualLayout(updatedLayout);
    onVisualLayoutChange?.(updatedLayout);
  };

  // Grid-based layout functions
  const handleDragStart = (e: React.DragEvent, slot: number, rowIndex: number, slotIndex: number) => {
    e.dataTransfer.setData("text/plain", slot.toString());
    setDragState({
      isDragging: true,
      draggedSlot: slot,
      sourcePosition: { rowIndex, slotIndex }
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetRowIndex: number, targetSlotIndex?: number) => {
    e.preventDefault();
    
    if (!dragState.draggedSlot || !dragState.sourcePosition) return;
    
    const newLayout = [...layout];
    const { rowIndex: sourceRowIndex, slotIndex: sourceSlotIndex } = dragState.sourcePosition;
    
    // Remove from source
    newLayout[sourceRowIndex].splice(sourceSlotIndex, 1);
    
    // Add to target
    if (targetSlotIndex !== undefined) {
      newLayout[targetRowIndex].splice(targetSlotIndex, 0, dragState.draggedSlot);
    } else {
      newLayout[targetRowIndex].push(dragState.draggedSlot);
    }
    
    // Clean up empty rows
    const cleanedLayout = newLayout.filter(row => row.length > 0);
    
    setLayout(cleanedLayout);
    onLayoutChange?.(cleanedLayout);
    
    setDragState({
      isDragging: false,
      draggedSlot: null,
      sourcePosition: null
    });
  };

  const addNewRow = () => {
    setLayout([...layout, []]);
  };

  const removeRow = (rowIndex: number) => {
    if (layout.length <= 1) return;
    
    const rowSlots = layout[rowIndex];
    const newLayout = layout.filter((_, index) => index !== rowIndex);
    
    // Move slots from removed row to first row
    if (rowSlots.length > 0 && newLayout.length > 0) {
      newLayout[0].push(...rowSlots);
    }
    
    setLayout(newLayout);
    onLayoutChange?.(newLayout);
  };

  const resetGridLayout = () => {
    const defaultLayout = generateDefaultLayout(totalSlots);
    setLayout(defaultLayout);
    onLayoutChange?.(defaultLayout);
  };

  const resetVisualLayout = () => {
    const defaultVisualLayout = generateDefaultVisualLayout(totalSlots, CANVAS_WIDTH, CANVAS_HEIGHT);
    setVisualLayout(defaultVisualLayout);
    onVisualLayoutChange?.(defaultVisualLayout);
  };

  const handlePreview = () => {
    onPreview?.(layout, visualLayout);
  };

  // Validation
  useEffect(() => {
    const newErrors: string[] = [];
    
    if (!validateLayoutRows(layout, totalSlots)) {
      newErrors.push("Grid layout must include all slots exactly once");
    }
    
    if (!validateVisualLayout(visualLayout, totalSlots)) {
      newErrors.push("Visual layout must include all slots exactly once");
    }
    
    setErrors(newErrors);
  }, [layout, visualLayout, totalSlots]);

  return (
    <div className="space-y-4">
      <Tabs defaultValue="grid" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="grid">Grid Designer</TabsTrigger>
          <TabsTrigger value="visual">Visual Designer</TabsTrigger>
        </TabsList>
        
        <TabsContent value="grid" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Grid className="h-5 w-5" />
                Grid-Based Layout Designer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button onClick={addNewRow} variant="outline" size="sm">
                  Add Row
                </Button>
                <Button onClick={resetGridLayout} variant="outline" size="sm">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset Layout
                </Button>
              </div>
              
              <div className="space-y-2">
                {layout.map((row, rowIndex) => (
                  <div key={rowIndex} className="flex items-center gap-2">
                    <div 
                      className="flex-1 min-h-12 border-2 border-dashed border-muted-foreground/20 rounded-lg p-2 flex gap-2 items-center"
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, rowIndex)}
                    >
                      {row.map((slot, slotIndex) => (
                        <Badge
                          key={`${rowIndex}-${slotIndex}`}
                          variant="secondary"
                          className="cursor-move"
                          draggable
                          onDragStart={(e) => handleDragStart(e, slot, rowIndex, slotIndex)}
                        >
                          Slot {slot}
                        </Badge>
                      ))}
                      {row.length === 0 && (
                        <span className="text-muted-foreground text-sm">Drop slots here</span>
                      )}
                    </div>
                    <Button
                      onClick={() => removeRow(rowIndex)}
                      variant="outline"
                      size="sm"
                      disabled={layout.length <= 1}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="visual" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Square className="h-5 w-5" />
                Visual Canvas Designer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2 items-center">
                <Button
                  onClick={() => setSelectedTool('select')}
                  variant={selectedTool === 'select' ? 'default' : 'outline'}
                  size="sm"
                >
                  <Hand className="h-4 w-4 mr-2" />
                  Select
                </Button>
                <Button
                  onClick={() => setSelectedTool('draw')}
                  variant={selectedTool === 'draw' ? 'default' : 'outline'}
                  size="sm"
                >
                  <Square className="h-4 w-4 mr-2" />
                  Draw Slot
                </Button>
                <Separator orientation="vertical" className="h-6" />
                <Button
                  onClick={() => setGridVisible(!gridVisible)}
                  variant="outline"
                  size="sm"
                >
                  <Grid className="h-4 w-4 mr-2" />
                  Grid: {gridVisible ? 'On' : 'Off'}
                </Button>
                <Button onClick={resetVisualLayout} variant="outline" size="sm">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              </div>
              
              <div className="border border-border rounded-lg overflow-hidden">
                <canvas 
                  ref={canvasRef} 
                  className="bg-background"
                />
              </div>
              
              <div className="text-sm text-muted-foreground">
                <p><strong>Select Mode:</strong> Click and drag slots to move them around</p>
                <p><strong>Draw Mode:</strong> Click on empty canvas to create new slots</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Validation and Actions */}
      <Card>
        <CardContent className="pt-6">
          {errors.length > 0 && (
            <div className="mb-4 space-y-2">
              {errors.map((error, index) => (
                <div key={index} className="text-destructive text-sm flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-destructive" />
                  {error}
                </div>
              ))}
            </div>
          )}
          
          <div className="flex gap-2">
            {onPreview && (
              <Button 
                onClick={handlePreview} 
                variant="outline"
                disabled={errors.length > 0}
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview Layout
              </Button>
            )}
            
            <div className="text-sm text-muted-foreground flex items-center">
              Status: {errors.length === 0 ? (
                <Badge variant="default" className="ml-2">Valid</Badge>
              ) : (
                <Badge variant="destructive" className="ml-2">Invalid</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};