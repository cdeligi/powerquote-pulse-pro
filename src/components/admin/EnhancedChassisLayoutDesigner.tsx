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
import { FixedCanvasRenderer } from "./visual-canvas/FixedCanvasRenderer";
import { FixedCanvasEventHandler } from "./visual-canvas/FixedCanvasEventHandler";
import { CanvasToolbar } from "./visual-canvas/CanvasToolbar";
import { CanvasInstructions } from "./visual-canvas/CanvasInstructions";
import { getCanvasHTMLElement } from './visual-canvas/canvasDom';

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
  const rendererRef = useRef<FixedCanvasRenderer | null>(null);
  const [debugMode] = useState(true); // Enable debug mode for better troubleshooting
  
  // Grid designer state
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedSlot: null,
    sourcePosition: null
  });
  
  const [errors, setErrors] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  // Comprehensive sanitization to handle ghost slots
  const sanitizeSlots = (slots: VisualSlotLayout[]): VisualSlotLayout[] => {
    if (!Array.isArray(slots)) return [];
    return slots.filter(s => {
      const w = Number(s.width ?? 0);
      const h = Number(s.height ?? 0);
      const x = Number(s.x ?? 0);
      const y = Number(s.y ?? 0);
      return isFinite(w) && isFinite(h) && w >= 8 && h >= 8 && isFinite(x) && isFinite(y);
    });
  };

  // State for canvas initialization
  const [canvasInitialized, setCanvasInitialized] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [initializationRetries, setInitializationRetries] = useState(0);
  const maxRetries = 3;

  // Enhanced Fabric.js canvas initialization with robust error handling and retry mechanism
  // Only initialize when component is active and visible
  useEffect(() => {
    let observer: IntersectionObserver | null = null;
    let resizeObserver: ResizeObserver | null = null;
    
    const initializeCanvas = async () => {
      if (!canvasRef.current) {
        return;
      }

      // Clear previous error state
      setInitializationError(null);
      
      try {
        if (debugMode) {
          console.log(`Initializing canvas (attempt ${initializationRetries + 1}/${maxRetries + 1})...`);
        }
        
        // Verify DOM element is properly mounted and visible
        const canvasElement = canvasRef.current;
        const rect = canvasElement.getBoundingClientRect();
        
        if (debugMode) {
          console.log('Canvas DOM validation:', {
            element: !!canvasElement,
            inDocument: document.body.contains(canvasElement),
            visible: rect.width > 0 && rect.height > 0,
            rect: { width: rect.width, height: rect.height, x: rect.x, y: rect.y },
            parentElement: !!canvasElement.parentElement
          });
        }

        if (rect.width === 0 || rect.height === 0) {
          throw new Error('Canvas element has zero dimensions');
        }

        // Create canvas with defensive configuration
        console.log('Creating Fabric.js canvas instance...');
        const canvas = new FabricCanvas(canvasElement, {
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          backgroundColor: '#ffffff', // Use explicit white for better visibility
          selection: true,
          preserveObjectStacking: true,
          renderOnAddRemove: true,
          stateful: true,
          interactive: true,
          enableRetinaScaling: true,
          allowTouchScrolling: false,
          stopContextMenu: true,
          fireRightClick: true,
          fireMiddleClick: false,
          targetFindTolerance: 5,
          perPixelTargetFind: true,
          skipTargetFind: false
        });

        // Verify canvas was created successfully
        if (!canvas || typeof canvas.getWidth !== 'function') {
          throw new Error('Fabric.js canvas creation failed');
        }

        console.log('Canvas created successfully:', {
          width: canvas.getWidth(),
          height: canvas.getHeight(),
          backgroundColor: canvas.backgroundColor
        });

        // Enhanced canvas element configuration
        const htmlCanvasElement = getCanvasHTMLElement(canvas);
        if (htmlCanvasElement) {
          htmlCanvasElement.tabIndex = 0;
          htmlCanvasElement.style.outline = 'none';
          htmlCanvasElement.style.userSelect = 'none';
          htmlCanvasElement.style.webkitUserSelect = 'none';
          htmlCanvasElement.style.touchAction = 'none';
          htmlCanvasElement.style.position = 'relative';
          htmlCanvasElement.style.border = debugMode ? '2px solid #3b82f6' : 'none';
          
          console.log('Canvas DOM element configured');
        }

        // Test basic canvas functionality
        console.log('Testing canvas basic functionality...');
        canvas.requestRenderAll();
        
        // Wait for render to complete
        await new Promise(resolve => setTimeout(resolve, 50));

        // Initialize renderer
        console.log('Initializing canvas renderer...');
        const renderer = new FixedCanvasRenderer(canvas, debugMode);
        rendererRef.current = renderer;

        // Test renderer functionality
        renderer.drawGrid(true);
        await new Promise(resolve => setTimeout(resolve, 10));
        renderer.drawGrid(false);
        
        console.log('Canvas and renderer initialized successfully');

        // Set canvas state
        setFabricCanvas(canvas);
        setCanvasInitialized(true);
        setInitializationRetries(0);
        
        toast.success('Canvas initialized successfully!');

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Canvas initialization failed:', error);
        
        setInitializationError(errorMessage);
        
        // Retry logic
        if (initializationRetries < maxRetries) {
          console.log(`Retrying canvas initialization in 1 second... (${initializationRetries + 1}/${maxRetries})`);
          setInitializationRetries(prev => prev + 1);
          
          setTimeout(() => {
            initializeCanvas();
          }, 1000);
        } else {
          console.error('Canvas initialization failed after maximum retries');
          toast.error(`Canvas initialization failed: ${errorMessage}`);
        }
      }
    };

    // Use IntersectionObserver to detect when canvas becomes visible
    if (canvasRef.current) {
      observer = new IntersectionObserver(
        (entries) => {
          const [entry] = entries;
          if (entry.isIntersecting && !canvasInitialized && !fabricCanvas) {
            // Small delay to ensure DOM is fully ready
            setTimeout(initializeCanvas, 200);
          }
        },
        { threshold: 0.1 }
      );
      
      observer.observe(canvasRef.current);
      
      // Use ResizeObserver to trigger initialization when canvas gets proper dimensions
      resizeObserver = new ResizeObserver((entries) => {
        const [entry] = entries;
        if (entry.contentRect.width > 0 && entry.contentRect.height > 0 && !canvasInitialized && !fabricCanvas) {
          setTimeout(initializeCanvas, 100);
        }
      });
      
      resizeObserver.observe(canvasRef.current);
    }

    return () => {
      // Cleanup observers
      if (observer) {
        observer.disconnect();
      }
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      
      // Cleanup canvas
      if (fabricCanvas) {
        try {
          if (rendererRef.current) {
            rendererRef.current.dispose();
            rendererRef.current = null;
          }
          fabricCanvas.dispose();
          if (debugMode) {
            console.log('Canvas cleaned up successfully');
          }
        } catch (error) {
          console.error('Error during canvas cleanup:', error);
        }
      }
    };
  }, [debugMode, initializationRetries]);

  // Manual initialization trigger for failed cases
  const retryCanvasInitialization = () => {
    setInitializationRetries(0);
    setInitializationError(null);
    setCanvasInitialized(false);
    setFabricCanvas(null);
  };

  // Enhanced slot rendering with sanitization and comprehensive debugging
  useEffect(() => {
    if (!fabricCanvas || !rendererRef.current) {
      console.log('Canvas or renderer not ready for slot rendering');
      return;
    }
    
    // Sanitize slots before rendering to prevent ghost slot issues
    const validSlots = sanitizeSlots(visualLayout.slots);
    
    console.log('=== CANVAS RENDER TRIGGER ===');
    console.log('Canvas state:', {
      totalSlots: visualLayout.slots.length,
      validSlots: validSlots.length,
      filteredOut: visualLayout.slots.length - validSlots.length,
      gridVisible,
      canvasReady: !!fabricCanvas,
      rendererReady: !!rendererRef.current,
      canvasSize: { width: fabricCanvas.width, height: fabricCanvas.height },
      canvasObjects: fabricCanvas.getObjects().length,
      validSlotsData: validSlots.map(s => ({ slot: s.slotNumber, x: s.x, y: s.y, w: s.width, h: s.height }))
    });

    // Force render with comprehensive error handling and visual feedback
    const renderWithFeedback = async () => {
      try {
        console.log('Starting enhanced slot rendering...');
        
        // Clear existing objects first to prevent accumulation
        fabricCanvas.clear();
        fabricCanvas.backgroundColor = 'hsl(var(--background))';
        
        // Render only valid slots
        await rendererRef.current!.renderSlots(validSlots);
        console.log(`${validSlots.length} valid slots rendered`);
        
        // Render grid if enabled
        if (gridVisible) {
          rendererRef.current!.drawGrid(true, 'hsl(var(--border))', 0.3);
          console.log('Grid rendered with enhanced visibility');
        }
        
        // Force immediate canvas update
        fabricCanvas.requestRenderAll();
        console.log('Canvas render completed');
        
        // Comprehensive verification
        const objects = fabricCanvas.getObjects();
        const slotObjects = objects.filter(obj => obj.get('data')?.type === 'slot' || obj.get('type') === 'slot');
        const gridObjects = objects.filter(obj => obj.get('excludeFromExport') === true);
        
        console.log('Render verification:', {
          totalObjects: objects.length,
          slotObjects: slotObjects.length,
          gridObjects: gridObjects.length,
          expectedSlots: validSlots.length,
          canvasBackground: fabricCanvas.backgroundColor,
          renderingSuccess: slotObjects.length === validSlots.length
        });
        
        // Enhanced user feedback
        if (slotObjects.length > 0) {
          toast.success(`Canvas rendered: ${slotObjects.length} slots visible`);
        } else if (validSlots.length > 0) {
          toast.error('Rendering failed - slots not visible on canvas');
          console.error('Rendering failure detected:', { validSlots, objects });
        } else if (visualLayout.slots.length > validSlots.length) {
          toast.warning(`${visualLayout.slots.length - validSlots.length} invalid slots filtered out`);
        }
        
        // Update visual layout if we filtered out invalid slots
        if (visualLayout.slots.length !== validSlots.length) {
          const cleanedLayout = { ...visualLayout, slots: validSlots };
          setVisualLayout(cleanedLayout);
          onVisualLayoutChange?.(cleanedLayout);
        }
        
      } catch (error) {
        console.error('=== CANVAS RENDER ERROR ===', error);
        toast.error(`Canvas rendering failed: ${error.message}`);
        
        // Attempt recovery
        try {
          fabricCanvas.clear();
          fabricCanvas.backgroundColor = 'hsl(var(--background))';
          fabricCanvas.requestRenderAll();
          console.log('Canvas cleared for recovery');
        } catch (recoveryError) {
          console.error('Canvas recovery failed:', recoveryError);
        }
      }
    };

    // Enhanced timing for better reliability
    const timeoutId = setTimeout(() => {
      requestAnimationFrame(renderWithFeedback);
    }, 100);

    return () => clearTimeout(timeoutId);
    
  }, [fabricCanvas, visualLayout, gridVisible, onVisualLayoutChange]);

  // Handle visual layout changes from canvas with enhanced logging
  const handleVisualLayoutChange = useCallback((newLayout: ChassisVisualLayout) => {
    console.log('Visual layout changed:', {
      previousSlots: visualLayout.slots.length,
      newSlots: newLayout.slots.length,
      changes: newLayout.slots.map(s => ({ slot: s.slotNumber, x: s.x, y: s.y }))
    });
    
    setVisualLayout(newLayout);
    onVisualLayoutChange?.(newLayout);
    setIsEditing(true);
    
    // Show success feedback
    toast.success('Canvas layout updated');
  }, [onVisualLayoutChange, visualLayout.slots.length]);

  // Handle slot deletion from canvas with proper state management
  const handleDeleteSlot = useCallback((slotNumber: number) => {
    console.log('Deleting slot from layout:', slotNumber);
    
    const updatedLayout = {
      ...visualLayout,
      slots: visualLayout.slots.filter(slot => slot.slotNumber !== slotNumber)
    };
    
    console.log('Updated layout after deletion:', {
      previousCount: visualLayout.slots.length,
      newCount: updatedLayout.slots.length,
      deletedSlot: slotNumber
    });
    
    setVisualLayout(updatedLayout);
    onVisualLayoutChange?.(updatedLayout);
    setIsEditing(true);
    
    toast.success(`Slot ${slotNumber} deleted successfully`);
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

  // Enhanced canvas focus management with better timing
  useEffect(() => {
    if (rendererRef.current && fabricCanvas && selectedTool) {
      // Use requestAnimationFrame for better timing
      const focusCanvas = () => {
        rendererRef.current?.focusCanvas();
        console.log('Canvas focused for tool:', selectedTool, 'at:', new Date().toISOString());
      };
      
      requestAnimationFrame(() => {
        setTimeout(focusCanvas, 100);
      });
    }
  }, [selectedTool, fabricCanvas]);

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
              <CanvasToolbar
                selectedTool={selectedTool}
                onToolChange={setSelectedTool}
                gridVisible={gridVisible}
                onGridToggle={() => setGridVisible(!gridVisible)}
                onReset={resetVisualLayout}
                slotsCount={sanitizeSlots(visualLayout.slots).length}
                maxSlots={totalSlots}
                canvasRef={canvasRef}
              />
              
              {/* Canvas Initialization Status */}
              {!canvasInitialized && !initializationError && (
                <Alert>
                  <AlertDescription>
                    Initializing Canvas... {initializationRetries > 0 && `(Retry ${initializationRetries}/${maxRetries})`}
                  </AlertDescription>
                </Alert>
              )}
              
              {initializationError && (
                <Alert variant="destructive">
                  <AlertDescription className="flex items-center justify-between">
                    <span>Canvas initialization failed: {initializationError}</span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={retryCanvasInitialization}
                      disabled={initializationRetries >= maxRetries}
                    >
                      Retry
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {/* Enhanced Canvas Section with comprehensive debugging */}
              <div className="space-y-4">
                {/* Status Bar with debug information */}
                {debugMode && canvasInitialized && (
                  <Alert>
                    <AlertDescription className="flex items-center justify-between">
                      <span>
                        Canvas ready: {fabricCanvas ? 'Yes' : 'No'} | 
                        Slots: {sanitizeSlots(visualLayout.slots).length}/{totalSlots} valid | 
                        Objects: {fabricCanvas?.getObjects().length || 0} |
                        Grid: {gridVisible ? 'On' : 'Off'}
                      </span>
                      <div className="flex gap-2">
                        <Button onClick={retryCanvasInitialization} variant="outline" size="sm">
                          Restart Canvas
                        </Button>
                        <Button onClick={resetVisualLayout} variant="outline" size="sm">
                          Reset Layout
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
                
                {/* Main Canvas Container with explicit dimensions */}
                <div className="relative">
                  <div 
                    className="border-2 border-border rounded-lg bg-background shadow-lg overflow-hidden relative"
                    style={{ 
                      width: CANVAS_WIDTH, 
                      height: CANVAS_HEIGHT,
                      minHeight: CANVAS_HEIGHT,
                      maxHeight: CANVAS_HEIGHT
                    }}
                  >
                    <canvas
                      ref={canvasRef}
                      className="absolute inset-0 w-full h-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 z-10"
                      tabIndex={0}
                      style={{ 
                        cursor: selectedTool === 'draw' ? 'crosshair' : 'default',
                        background: 'transparent'
                      }}
                    />
                    
                    {/* Canvas ready indicator */}
                    {fabricCanvas && (
                      <div className="absolute top-2 left-2 z-20">
                        <Badge variant="outline" className="text-xs bg-background/80">
                          Canvas Ready • {fabricCanvas.getObjects().length} objects
                        </Badge>
                      </div>
                    )}
                  </div>
                  
                  {/* Loading state overlay */}
                  {!fabricCanvas && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg z-30">
                      <div className="text-center">
                        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                        <p className="text-sm text-muted-foreground">Initializing Canvas...</p>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Event Handler Component */}
                {fabricCanvas && rendererRef.current && (
                  <FixedCanvasEventHandler
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
              
              <CanvasInstructions
                selectedTool={selectedTool}
                gridVisible={gridVisible}
              />
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