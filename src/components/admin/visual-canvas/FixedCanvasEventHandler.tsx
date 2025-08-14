/**
 * Fixed Canvas Event Handler with comprehensive interaction support and proper tool management
 */

import { useEffect, useCallback, useState } from 'react';
import { Canvas as FabricCanvas, Group } from 'fabric';
import { VisualSlotLayout, ChassisVisualLayout } from "@/types/product/chassis-types";
import { FixedCanvasRenderer } from './FixedCanvasRenderer';
import { EnhancedSlotEditDialog } from './EnhancedSlotEditDialog';
import { toast } from 'sonner';

interface FixedCanvasEventHandlerProps {
  fabricCanvas: FabricCanvas | null;
  renderer: FixedCanvasRenderer | null;
  selectedTool: 'select' | 'draw';
  totalSlots: number;
  visualLayout: ChassisVisualLayout;
  onVisualLayoutChange?: (layout: ChassisVisualLayout) => void;
  onDeleteSlot?: (slotNumber: number) => void;
  debugMode?: boolean;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const GRID_SIZE = 20;
const DEFAULT_SLOT_WIDTH = 80;
const DEFAULT_SLOT_HEIGHT = 60;

export const FixedCanvasEventHandler: React.FC<FixedCanvasEventHandlerProps> = ({
  fabricCanvas,
  renderer,
  selectedTool,
  totalSlots,
  visualLayout,
  onVisualLayoutChange,
  onDeleteSlot,
  debugMode = false
}) => {
  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    slotNumber: number;
    slotData?: VisualSlotLayout;
  }>({ open: false, slotNumber: 0 });

  const [isDrawing, setIsDrawing] = useState(false);

  const log = useCallback((...args: any[]) => {
    if (debugMode) {
      console.log('[EventHandler]', ...args);
    }
  }, [debugMode]);

  // Handle object modifications (moving, resizing)
  const handleObjectModified = useCallback((e: any) => {
    if (!renderer || !onVisualLayoutChange) return;

    const target = e.target;
    if (!target || target.get('type') !== 'slot') return;

    const slotNumber = target.get('slotNumber');
    if (typeof slotNumber !== 'number') return;

    log('Object modified - slot:', slotNumber);

    // Get actual dimensions including scale
    const scaleX = target.scaleX || 1;
    const scaleY = target.scaleY || 1;
    const actualWidth = Math.max(40, (target.width || DEFAULT_SLOT_WIDTH) * scaleX);
    const actualHeight = Math.max(30, (target.height || DEFAULT_SLOT_HEIGHT) * scaleY);

    // Apply grid snapping with magnetic effect
    const snappedX = renderer.snapToGrid(target.left || 0);
    const snappedY = renderer.snapToGrid(target.top || 0);

    // Keep within canvas bounds
    const constrainedX = Math.max(0, Math.min(CANVAS_WIDTH - actualWidth, snappedX));
    const constrainedY = Math.max(0, Math.min(CANVAS_HEIGHT - actualHeight, snappedY));

    // Reset scale and update dimensions
    target.set({
      left: constrainedX,
      top: constrainedY,
      scaleX: 1,
      scaleY: 1,
      width: actualWidth,
      height: actualHeight
    });

    // Update visual layout state
    const updatedSlots = visualLayout.slots.map(slot => 
      slot.slotNumber === slotNumber 
        ? { 
            ...slot, 
            x: constrainedX, 
            y: constrainedY,
            width: actualWidth,
            height: actualHeight
          }
        : slot
    );

    onVisualLayoutChange({
      ...visualLayout,
      slots: updatedSlots
    });

    target.setCoords();
    fabricCanvas?.requestRenderAll();

    toast.success(`Slot ${slotNumber} updated`);
  }, [renderer, fabricCanvas, visualLayout, onVisualLayoutChange, log]);

  // Handle mouse down events (drawing, context menu)
  const handleMouseDown = useCallback((e: any) => {
    if (!fabricCanvas || !renderer) return;

    // Handle right-click context menu (delete)
    if (e.e.button === 2) {
      e.e.preventDefault();
      
      const target = e.target;
      if (!target || target.get('type') !== 'slot') return;

      const slotNumber = target.get('slotNumber');
      if (typeof slotNumber !== 'number') return;

      log('Right-click delete on slot:', slotNumber);

      // Select the object first
      fabricCanvas.setActiveObject(target);
      
      // Delete the slot
      if (onDeleteSlot) {
        onDeleteSlot(slotNumber);
      } else if (onVisualLayoutChange) {
        const updatedSlots = visualLayout.slots.filter(s => s.slotNumber !== slotNumber);
        onVisualLayoutChange({
          ...visualLayout,
          slots: updatedSlots
        });
      }

      renderer?.deleteSlot(slotNumber);
      toast.success(`Deleted slot ${slotNumber}`);
      return;
    }

    // Handle left-click for drawing new slots
    if (e.e.button === 0 && selectedTool === 'draw' && onVisualLayoutChange) {
      const pointer = fabricCanvas.getPointer(e.e);
      if (!pointer) return;

      // Don't draw if clicking on existing object
      if (e.target && e.target.get('type') === 'slot') return;

      log('Drawing new slot at:', pointer);
      setIsDrawing(true);

      // Find next available slot number
      const usedSlots = new Set(visualLayout.slots.map(s => s.slotNumber));
      let nextSlotNumber = 0;
      while (usedSlots.has(nextSlotNumber) && nextSlotNumber < totalSlots) {
        nextSlotNumber++;
      }

      if (nextSlotNumber >= totalSlots) {
        toast.error(`Maximum number of slots reached (${totalSlots})`);
        setIsDrawing(false);
        return;
      }

      // Snap to grid
      const snappedX = renderer.snapToGrid(pointer.x);
      const snappedY = renderer.snapToGrid(pointer.y);

      // Create new slot
      const newSlot: VisualSlotLayout = {
        slotNumber: nextSlotNumber,
        x: Math.max(0, Math.min(CANVAS_WIDTH - DEFAULT_SLOT_WIDTH, snappedX)),
        y: Math.max(0, Math.min(CANVAS_HEIGHT - DEFAULT_SLOT_HEIGHT, snappedY)),
        width: DEFAULT_SLOT_WIDTH,
        height: DEFAULT_SLOT_HEIGHT
      };

      log('Creating new slot:', newSlot);

      // Update visual layout
      const updatedSlots = [...visualLayout.slots, newSlot];
      onVisualLayoutChange({
        ...visualLayout,
        slots: updatedSlots
      });

      toast.success(`Added slot ${nextSlotNumber}`);
      setIsDrawing(false);
    }
  }, [fabricCanvas, renderer, selectedTool, totalSlots, visualLayout, onVisualLayoutChange, onDeleteSlot, log]);

  // Handle double-click for editing slots
  const handleDoubleClick = useCallback((e: any) => {
    if (!fabricCanvas || selectedTool !== 'select') return;

    const target = e.target;
    if (!target || target.get('type') !== 'slot') return;

    const slotNumber = target.get('slotNumber');
    if (typeof slotNumber !== 'number') return;

    log('Double-click edit on slot:', slotNumber);

    // Find slot data
    const slotData = visualLayout.slots.find(s => s.slotNumber === slotNumber);
    
    setEditDialog({
      open: true,
      slotNumber,
      slotData
    });
  }, [fabricCanvas, selectedTool, visualLayout, log]);

  // Handle keyboard events
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!fabricCanvas || !renderer) return;

    const activeObject = fabricCanvas.getActiveObject();
    if (!activeObject || activeObject.get('type') !== 'slot') return;

    const slotNumber = activeObject.get('slotNumber');
    if (typeof slotNumber !== 'number') return;

    log('Key pressed:', e.key, 'for slot:', slotNumber);

    // Delete key
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      log('Deleting slot via keyboard:', slotNumber);
      
      if (onDeleteSlot) {
        onDeleteSlot(slotNumber);
      } else if (onVisualLayoutChange) {
        const updatedSlots = visualLayout.slots.filter(s => s.slotNumber !== slotNumber);
        onVisualLayoutChange({
          ...visualLayout,
          slots: updatedSlots
        });
      }
      
      renderer.deleteSlot(slotNumber);
      toast.success(`Deleted slot ${slotNumber}`);
      return;
    }

    // Arrow keys for precise movement
    const step = e.shiftKey ? GRID_SIZE : 5;
    let moved = false;
    let newX = activeObject.left || 0;
    let newY = activeObject.top || 0;

    switch (e.key) {
      case 'ArrowLeft':
        newX = Math.max(0, newX - step);
        moved = true;
        break;
      case 'ArrowRight':
        newX = Math.min(CANVAS_WIDTH - (activeObject.width || 0), newX + step);
        moved = true;
        break;
      case 'ArrowUp':
        newY = Math.max(0, newY - step);
        moved = true;
        break;
      case 'ArrowDown':
        newY = Math.min(CANVAS_HEIGHT - (activeObject.height || 0), newY + step);
        moved = true;
        break;
    }

    if (moved) {
      e.preventDefault();
      
      // Snap to grid if shift is held
      if (e.shiftKey && renderer) {
        newX = renderer.snapToGrid(newX, 0); // Force snap when shift held
        newY = renderer.snapToGrid(newY, 0);
      }

      activeObject.set({ left: newX, top: newY });
      activeObject.setCoords();
      fabricCanvas.requestRenderAll();

      // Update visual layout
      if (onVisualLayoutChange) {
        const updatedSlots = visualLayout.slots.map(slot => 
          slot.slotNumber === slotNumber 
            ? { ...slot, x: newX, y: newY }
            : slot
        );
        onVisualLayoutChange({
          ...visualLayout,
          slots: updatedSlots
        });
      }
    }
  }, [fabricCanvas, renderer, visualLayout, onVisualLayoutChange, onDeleteSlot, log]);

  // Handle slot edit save
  const handleSlotEditSave = useCallback(async (updatedSlot: VisualSlotLayout) => {
    if (!onVisualLayoutChange || !renderer) return;

    log('Saving slot edit:', updatedSlot);

    const originalSlotNumber = editDialog.slotNumber;

    // Update visual layout state
    const updatedSlots = visualLayout.slots.map(slot => 
      slot.slotNumber === originalSlotNumber ? updatedSlot : slot
    );

    onVisualLayoutChange({
      ...visualLayout,
      slots: updatedSlots
    });

    // Update canvas renderer
    await renderer.updateSlotProperties(originalSlotNumber, updatedSlot);

    toast.success(`Slot ${originalSlotNumber} ${originalSlotNumber !== updatedSlot.slotNumber ? `renamed to ${updatedSlot.slotNumber}` : 'updated'}`);
  }, [visualLayout, onVisualLayoutChange, renderer, editDialog.slotNumber, log]);

  // Setup event listeners and canvas configuration
  useEffect(() => {
    if (!fabricCanvas) return;

    log('Setting up canvas event listeners');

    // Canvas events
    fabricCanvas.on('object:modified', handleObjectModified);
    fabricCanvas.on('mouse:down', handleMouseDown);
    fabricCanvas.on('mouse:dblclick', handleDoubleClick);

    // Configure canvas based on selected tool
    fabricCanvas.selection = selectedTool === 'select';
    fabricCanvas.isDrawingMode = false; // We handle drawing manually
    
    // Update cursors based on tool
    if (selectedTool === 'select') {
      fabricCanvas.defaultCursor = 'default';
      fabricCanvas.hoverCursor = 'move';
      fabricCanvas.moveCursor = 'move';
    } else {
      fabricCanvas.defaultCursor = 'crosshair';
      fabricCanvas.hoverCursor = 'crosshair';
      fabricCanvas.moveCursor = 'crosshair';
    }

    // Keyboard events
    const canvasElement = fabricCanvas.getElement();
    if (canvasElement) {
      canvasElement.addEventListener('keydown', handleKeyDown);
      canvasElement.tabIndex = 0; // Make canvas focusable
      canvasElement.style.outline = 'none';
    }

    // Enable right-click context menu
    const canvasEl = fabricCanvas.getElement();
    if (canvasEl) {
      canvasEl.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    return () => {
      log('Cleaning up canvas event listeners');
      fabricCanvas.off('object:modified', handleObjectModified);
      fabricCanvas.off('mouse:down', handleMouseDown);
      fabricCanvas.off('mouse:dblclick', handleDoubleClick);
      
      if (canvasElement) {
        canvasElement.removeEventListener('keydown', handleKeyDown);
      }
    };
  }, [
    fabricCanvas, 
    selectedTool, 
    handleObjectModified, 
    handleMouseDown, 
    handleDoubleClick, 
    handleKeyDown,
    log
  ]);

  // Focus canvas when tool changes to select or when component mounts
  useEffect(() => {
    if (renderer && fabricCanvas) {
      setTimeout(() => {
        renderer.focusCanvas();
        log('Canvas focused for tool:', selectedTool);
      }, 100);
    }
  }, [selectedTool, renderer, fabricCanvas, log]);

  const usedSlotNumbers = new Set(visualLayout.slots.map(s => s.slotNumber));

  return (
    <EnhancedSlotEditDialog
      open={editDialog.open}
      onOpenChange={(open) => setEditDialog(prev => ({ ...prev, open }))}
      slotData={editDialog.slotData}
      onSave={handleSlotEditSave}
      usedSlotNumbers={usedSlotNumbers}
      maxSlots={totalSlots}
    />
  );
};
