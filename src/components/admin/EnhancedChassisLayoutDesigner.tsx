/**
 * Enhanced Chassis Layout Designer with visual canvas-based design using Fabric.js
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas as FabricCanvas } from 'fabric';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Grid, RotateCcw, Eye, Square, Hand, ArrowUp, ArrowDown, Trash2, MousePointer, Edit } from "lucide-react";
import { toast } from "sonner";
import { 
  ChassisVisualLayout, 
  VisualSlotLayout, 
  validateLayoutRows, 
  validateVisualLayout, 
  generateDefaultLayout, 
  generateDefaultVisualLayout 
} from "@/types/product/chassis-types";
import { EnhancedCanvasRenderer } from "./visual-canvas/EnhancedCanvasRenderer";
import { EnhancedCanvasEventHandler } from "./visual-canvas/EnhancedCanvasEventHandler";

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
  const rendererRef = useRef<EnhancedCanvasRenderer | null>(null);
  
  // Grid designer state
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedSlot: null,
    sourcePosition: null
  });
  
  const [errors, setErrors] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  // Initialize Fabric.js canvas and renderer
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      backgroundColor: 'hsl(0 0% 100%)',
      selection: true
    });

    console.log('Enhanced canvas initialized:', canvas);
    setFabricCanvas(canvas);
    
    // Initialize enhanced renderer
    const renderer = new EnhancedCanvasRenderer(canvas);
    rendererRef.current = renderer;

    return () => {
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current = null;
      }
      canvas.dispose();
    };
  }, []);

  // Render slots when layout changes
  useEffect(() => {
    if (!fabricCanvas || !rendererRef.current) return;
    
    console.log('Updating canvas with new layout');
    rendererRef.current.renderSlots(visualLayout.slots);
    rendererRef.current.drawGrid(gridVisible);
  }, [fabricCanvas, visualLayout, gridVisible]);

  // Handle visual layout changes from canvas
  const handleVisualLayoutChange = useCallback((newLayout: ChassisVisualLayout) => {
    setVisualLayout(newLayout);
    onVisualLayoutChange?.(newLayout);
    setIsEditing(true);
  }, [onVisualLayoutChange]);

  // Handle slot deletion from canvas
  const handleDeleteSlot = useCallback((slotNumber: number) => {
    const updatedLayout = {
      ...visualLayout,
      slots: visualLayout.slots.filter(slot => slot.slotNumber !== slotNumber)
    };
    
    setVisualLayout(updatedLayout);
    onVisualLayoutChange?.(updatedLayout);
    setIsEditing(true);
  }, [visualLayout, onVisualLayoutChange]);

  // Grid-based layout functions with improved state management
  const handleDragStart = (e: React.DragEvent, slot: number, rowIndex: number, slotIndex: number) => {
    e.dataTransfer.setData("text/plain", slot.toString());
    e.dataTransfer.effectAllowed = 'move';
    
    setDragState({
      isDragging: true,
      draggedSlot: slot,
      sourcePosition: { rowIndex, slotIndex }
    });
    
    console.log('Drag started:', { slot, rowIndex, slotIndex });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetRowIndex: number, targetSlotIndex?: number) => {
    e.preventDefault();
    
    const draggedSlotData = e.dataTransfer.getData("text/plain");
    const draggedSlot = parseInt(draggedSlotData);
    
    if (!dragState.sourcePosition || draggedSlot !== dragState.draggedSlot) {
      console.error('Invalid drag state');
      setDragState({ isDragging: false, draggedSlot: null, sourcePosition: null });
      return;
    }
    
    const newLayout = [...layout];
    const { rowIndex: sourceRowIndex, slotIndex: sourceSlotIndex } = dragState.sourcePosition;
    
    console.log('Drop operation:', { 
      draggedSlot, 
      from: { row: sourceRowIndex, slot: sourceSlotIndex }, 
      to: { row: targetRowIndex, slot: targetSlotIndex }
    });
    
    // Remove from source first to avoid duplication
    const removedSlot = newLayout[sourceRowIndex].splice(sourceSlotIndex, 1)[0];
    console.log('Removed slot:', removedSlot, 'from position:', sourceRowIndex, sourceSlotIndex);
    
    // Calculate correct insertion index based on the movement direction
    let insertIndex = targetSlotIndex !== undefined ? targetSlotIndex : newLayout[targetRowIndex].length;
    
    // CRITICAL FIX: Adjust index for same-row moves after removal
    if (sourceRowIndex === targetRowIndex && targetSlotIndex !== undefined) {
      if (targetSlotIndex > sourceSlotIndex) {
        // Moving right: target index should be reduced by 1 after removal
        insertIndex = targetSlotIndex - 1;
      } else {
        // Moving left: use target index as-is
        insertIndex = targetSlotIndex;
      }
    }
    
    // Insert at calculated position
    newLayout[targetRowIndex].splice(insertIndex, 0, removedSlot);
    
    console.log('Final layout after drop:', newLayout.map((row, i) => ({ row: i, slots: [...row] })));
    
    // Clean up empty rows
    const cleanedLayout = newLayout.filter(row => row.length > 0);
    
    setLayout(cleanedLayout);
    onLayoutChange?.(cleanedLayout);
    setIsEditing(true);
    
    setDragState({
      isDragging: false,
      draggedSlot: null,
      sourcePosition: null
    });
    
    toast.success(`Moved slot ${draggedSlot} to row ${targetRowIndex + 1}`);
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

  // Progressive validation - show issues but don't block editing
  useEffect(() => {
    const newErrors: string[] = [];
    
    // Only show validation errors, don't block editing
    if (!isEditing) {
      const gridSlots = layout.flat();
      const visualSlots = visualLayout.slots.map(s => s.slotNumber);
      
      // Check for missing slots in grid
      if (gridSlots.length < totalSlots) {
        const missingGridSlots = Array.from({length: totalSlots}, (_, i) => i).filter(slot => !gridSlots.includes(slot));
        if (missingGridSlots.length > 0) {
          newErrors.push(`Grid layout missing slots: ${missingGridSlots.join(', ')}`);
        }
      }
      
      // Check for missing slots in visual
      if (visualSlots.length < totalSlots) {
        const missingVisualSlots = Array.from({length: totalSlots}, (_, i) => i).filter(slot => !visualSlots.includes(slot));
        if (missingVisualSlots.length > 0) {
          newErrors.push(`Visual layout missing slots: ${missingVisualSlots.join(', ')}`);
        }
      }
      
      // Check for duplicate slots
      const duplicateGridSlots = gridSlots.filter((slot, index) => gridSlots.indexOf(slot) !== index);
      if (duplicateGridSlots.length > 0) {
        newErrors.push(`Duplicate slots in grid: ${[...new Set(duplicateGridSlots)].join(', ')}`);
      }
      
      const duplicateVisualSlots = visualSlots.filter((slot, index) => visualSlots.indexOf(slot) !== index);
      if (duplicateVisualSlots.length > 0) {
        newErrors.push(`Duplicate slots in visual: ${[...new Set(duplicateVisualSlots)].join(', ')}`);
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

  // Focus canvas when switching tools or visual tab becomes active
  useEffect(() => {
    if (rendererRef.current && selectedTool) {
      setTimeout(() => {
        rendererRef.current?.focusCanvas();
        console.log('Canvas focused for tool:', selectedTool);
      }, 200);
    }
  }, [selectedTool]);

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
                      className={`flex-1 min-h-12 border-2 border-dashed rounded-lg p-2 flex gap-2 items-center transition-colors ${
                        dragState.isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/20'
                      }`}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, rowIndex)}
                    >
                      {row.map((slot, slotIndex) => (
                        <div
                          key={`${rowIndex}-${slotIndex}`}
                          className="relative"
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, rowIndex, slotIndex)}
                        >
                          <Badge
                            variant="secondary"
                            className={`cursor-move transition-all ${
                              dragState.draggedSlot === slot ? 'opacity-50 scale-95' : 'hover:bg-secondary/80'
                            }`}
                            draggable
                            onDragStart={(e) => handleDragStart(e, slot, rowIndex, slotIndex)}
                          >
                            Slot {slot}
                          </Badge>
                        </div>
                      ))}
                      {row.length === 0 && (
                        <span className="text-muted-foreground text-sm italic">Drop slots here</span>
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
                {fabricCanvas && rendererRef.current && (
                  <EnhancedCanvasEventHandler
                    fabricCanvas={fabricCanvas}
                    renderer={rendererRef.current}
                    selectedTool={selectedTool}
                    totalSlots={totalSlots}
                    visualLayout={visualLayout}
                    onVisualLayoutChange={handleVisualLayoutChange}
                    onDeleteSlot={handleDeleteSlot}
                  />
                )}
              </div>
              
              <div className="text-sm text-muted-foreground space-y-1">
                <p><strong>Select Mode:</strong> Click and drag slots to move/resize them. Double-click to edit.</p>
                <p><strong>Draw Mode:</strong> Click on empty canvas to create new slots</p>
                <p><strong>Delete:</strong> Select slot and press Delete key or right-click</p>
                <p><strong>Keyboard:</strong> Arrow keys to move, Shift+Arrow for grid snap</p>
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