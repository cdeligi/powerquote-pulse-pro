/**
 * Enhanced Chassis Layout Designer with visual canvas-based design using Fabric.js
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas as FabricCanvas, Rect, FabricText, Line, Group } from 'fabric';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Grid, RotateCcw, Eye, Square, Hand, ArrowUp, ArrowDown, Trash2 } from "lucide-react";
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
  const rendererRef = useRef<any>(null);
  
  // Grid designer state
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedSlot: null,
    sourcePosition: null
  });
  
  const [errors, setErrors] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      backgroundColor: '#f8f9fa',
      selection: selectedTool === 'select'
    });

    console.log('Canvas initialized:', canvas);
    setFabricCanvas(canvas);
    
    // Setup canvas event handlers
    canvas.on('object:modified', handleCanvasObjectModified);
    canvas.on('mouse:down', handleCanvasMouseDown);

    // Make canvas focusable for keyboard events
    const canvasElement = canvas.getElement();
    if (canvasElement) {
      canvasElement.tabIndex = 0;
      canvasElement.style.outline = 'none';
    }

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
    const newSlotGroups = new Map<number, Group>();
    
    // Add grid if visible
    if (gridVisible) {
      drawGrid();
    }
    
    // Add slots as grouped objects
    visualLayout.slots.forEach((slot) => {
      const rect = new Rect({
        left: 0,
        top: 0,
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
        left: slot.width / 2,
        top: slot.height / 2,
        fontSize: 14,
        fontFamily: 'Arial',
        fill: 'hsl(var(--foreground))',
        textAlign: 'center',
        originX: 'center',
        originY: 'center'
      });
      
      // Create group with rect and text
      const group = new Group([rect, text], {
        left: slot.x,
        top: slot.y
      });
      
      // Disable rotation for the group
      group.setControlsVisibility({
        mtr: false // Hide rotation control
      });
      
      group.set('slotNumber', slot.slotNumber);
      newSlotGroups.set(slot.slotNumber, group);
      fabricCanvas.add(group);
    });
    
    setSlotGroups(newSlotGroups);
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
    const group = obj as Group;
    
    // Get current dimensions
    const groupWidth = group.width * group.scaleX;
    const groupHeight = group.height * group.scaleY;
    
    // Snap to grid if enabled
    const gridSize = 20;
    const snappedX = gridVisible ? Math.round(group.left / gridSize) * gridSize : group.left;
    const snappedY = gridVisible ? Math.round(group.top / gridSize) * gridSize : group.top;
    
    // Constrain to canvas bounds
    const newX = Math.max(0, Math.min(snappedX, CANVAS_WIDTH - groupWidth));
    const newY = Math.max(0, Math.min(snappedY, CANVAS_HEIGHT - groupHeight));
    const newWidth = Math.max(SLOT_MIN_WIDTH, Math.min(groupWidth, CANVAS_WIDTH - newX));
    const newHeight = Math.max(SLOT_MIN_HEIGHT, Math.min(groupHeight, CANVAS_HEIGHT - newY));
    
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
    setIsEditing(true);
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
    
    // Snap to grid
    const gridSize = 20;
    const snappedX = gridVisible ? Math.round(pointer.x / gridSize) * gridSize : pointer.x;
    const snappedY = gridVisible ? Math.round(pointer.y / gridSize) * gridSize : pointer.y;
    
    // Create new slot
    const newSlot: VisualSlotLayout = {
      slotNumber: nextSlotNumber,
      x: Math.max(0, Math.min(snappedX, CANVAS_WIDTH - 80)),
      y: Math.max(0, Math.min(snappedY, CANVAS_HEIGHT - 60)),
      width: 80,
      height: 60
    };
    
    const updatedLayout = {
      ...visualLayout,
      slots: [...visualLayout.slots, newSlot]
    };
    
    setVisualLayout(updatedLayout);
    onVisualLayoutChange?.(updatedLayout);
    setIsEditing(true);
    toast.success(`Added slot ${nextSlotNumber}`);
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
    setIsEditing(true);
  };

  const moveRowUp = (rowIndex: number) => {
    if (rowIndex === 0) return;
    
    const newLayout = [...layout];
    [newLayout[rowIndex - 1], newLayout[rowIndex]] = [newLayout[rowIndex], newLayout[rowIndex - 1]];
    
    setLayout(newLayout);
    onLayoutChange?.(newLayout);
    setIsEditing(true);
  };

  const moveRowDown = (rowIndex: number) => {
    if (rowIndex === layout.length - 1) return;
    
    const newLayout = [...layout];
    [newLayout[rowIndex], newLayout[rowIndex + 1]] = [newLayout[rowIndex + 1], newLayout[rowIndex]];
    
    setLayout(newLayout);
    onLayoutChange?.(newLayout);
    setIsEditing(true);
  };

  const deleteSlotFromCanvas = (slotNumber: number) => {
    const updatedLayout = {
      ...visualLayout,
      slots: visualLayout.slots.filter(slot => slot.slotNumber !== slotNumber)
    };
    
    setVisualLayout(updatedLayout);
    onVisualLayoutChange?.(updatedLayout);
    setIsEditing(true);
    toast.success(`Deleted slot ${slotNumber}`);
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

  // Flexible validation - only enforce completeness on save
  useEffect(() => {
    const newErrors: string[] = [];
    
    // Only validate if not actively editing
    if (!isEditing) {
      if (!validateLayoutRows(layout, totalSlots)) {
        const allSlots = layout.flat();
        const missingSlots = Array.from({length: totalSlots}, (_, i) => i).filter(slot => !allSlots.includes(slot));
        if (missingSlots.length > 0) {
          newErrors.push(`Missing slots in grid: ${missingSlots.join(', ')}`);
        }
      }
      
      if (!validateVisualLayout(visualLayout, totalSlots)) {
        const usedSlots = visualLayout.slots.map(s => s.slotNumber);
        const missingSlots = Array.from({length: totalSlots}, (_, i) => i).filter(slot => !usedSlots.includes(slot));
        if (missingSlots.length > 0) {
          newErrors.push(`Missing slots in visual: ${missingSlots.join(', ')}`);
        }
      }
    }
    
    setErrors(newErrors);
  }, [layout, visualLayout, totalSlots, isEditing]);

  // Reset editing state after changes settle
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsEditing(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [layout, visualLayout]);

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
                    <div className="flex flex-col gap-1">
                      <Button
                        onClick={() => moveRowUp(rowIndex)}
                        variant="ghost"
                        size="sm"
                        disabled={rowIndex === 0}
                        className="h-6 w-6 p-0"
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button
                        onClick={() => moveRowDown(rowIndex)}
                        variant="ghost"
                        size="sm"
                        disabled={rowIndex === layout.length - 1}
                        className="h-6 w-6 p-0"
                      >
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                    </div>
                    <div 
                      className="flex-1 min-h-12 border-2 border-dashed border-muted-foreground/20 rounded-lg p-2 flex gap-2 items-center"
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, rowIndex)}
                    >
                      {row.map((slot, slotIndex) => (
                        <Badge
                          key={`${rowIndex}-${slotIndex}`}
                          variant="secondary"
                          className="cursor-move hover:bg-accent"
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
                      variant="ghost"
                      size="sm"
                      disabled={layout.length <= 1}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
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
                  className="bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  tabIndex={0}
                />
                <CanvasKeyboardHandler
                  fabricCanvas={fabricCanvas}
                  onDeleteSlot={deleteSlotFromCanvas}
                  onObjectModified={handleCanvasObjectModified}
                />
              </div>
              
              <div className="text-sm text-muted-foreground space-y-1">
                <p><strong>Select Mode:</strong> Click and drag slots to move/resize them</p>
                <p><strong>Draw Mode:</strong> Click on empty canvas to create new slots</p>
                <p><strong>Delete:</strong> Select slot and press Delete key or right-click</p>
                <p><strong>Grid:</strong> {gridVisible ? 'Enabled - objects snap to grid' : 'Disabled - free positioning'}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Validation and Actions */}
      <Card>
        <CardContent className="pt-6">
          {errors.length > 0 && !isEditing && (
            <div className="mb-4 space-y-2">
              {errors.map((error, index) => (
                <div key={index} className="text-destructive text-sm flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-destructive" />
                  {error}
                </div>
              ))}
            </div>
          )}
          
          {isEditing && (
            <div className="mb-4 text-sm text-muted-foreground flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              Editing in progress...
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
              Status: {isEditing ? (
                <Badge variant="secondary" className="ml-2">Editing</Badge>
              ) : errors.length === 0 ? (
                <Badge variant="default" className="ml-2">Valid</Badge>
              ) : (
                <Badge variant="destructive" className="ml-2">Incomplete</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};