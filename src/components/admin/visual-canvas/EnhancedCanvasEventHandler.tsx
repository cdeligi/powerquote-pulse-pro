/**
 * Enhanced canvas event handler with comprehensive interaction support
 */

import { useEffect, useCallback, useState } from 'react';
import { Canvas as FabricCanvas, Group } from 'fabric';
import { VisualSlotLayout, ChassisVisualLayout } from "@/types/product/chassis-types";
import { EnhancedCanvasRenderer } from './EnhancedCanvasRenderer';
import { SlotEditDialog } from './SlotEditDialog';
import { toast } from 'sonner';

interface EnhancedCanvasEventHandlerProps {
  fabricCanvas: FabricCanvas | null;
  renderer: EnhancedCanvasRenderer | null;
  selectedTool: 'select' | 'draw';
  totalSlots: number;
  visualLayout: ChassisVisualLayout;
  onVisualLayoutChange?: (layout: ChassisVisualLayout) => void;
  onDeleteSlot?: (slotNumber: number) => void;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const GRID_SIZE = 20;

export const EnhancedCanvasEventHandler: React.FC<EnhancedCanvasEventHandlerProps> = ({
  fabricCanvas,
  renderer,
  selectedTool,
  totalSlots,
  visualLayout,
  onVisualLayoutChange,
  onDeleteSlot
}) => {
  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    slotNumber: number;
    slotName?: string;
  }>({ open: false, slotNumber: 0 });

  // Handle object modifications (moving, resizing)
  const handleObjectModified = useCallback((e: any) => {
    if (!renderer || !onVisualLayoutChange) return;

    const target = e.target;
    if (!target || target.get('type') !== 'slot') return;

    const slotNumber = target.get('slotNumber');
    if (typeof slotNumber !== 'number') return;

    console.log('Object modified - slot:', slotNumber);

    // Get actual dimensions including scale
    const scaleX = target.scaleX || 1;
    const scaleY = target.scaleY || 1;
    const actualWidth = (target.width || 0) * scaleX;
    const actualHeight = (target.height || 0) * scaleY;

    // Apply grid snapping
    const snappedX = renderer.snapToGrid(target.left || 0);
    const snappedY = renderer.snapToGrid(target.top || 0);

    // Keep within canvas bounds
    const constrainedX = Math.max(0, Math.min(CANVAS_WIDTH - actualWidth, snappedX));
    const constrainedY = Math.max(0, Math.min(CANVAS_HEIGHT - actualHeight, snappedY));

    // Reset scale and update dimensions properly
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
            width: Math.max(40, actualWidth),
            height: Math.max(30, actualHeight)
          }
        : slot
    );

    onVisualLayoutChange({
      ...visualLayout,
      slots: updatedSlots
    });

    target.setCoords();
    fabricCanvas?.renderAll();
  }, [renderer, fabricCanvas, visualLayout, onVisualLayoutChange]);

  // Handle all mouse down events (left-click draw, right-click context)
  const handleMouseDown = useCallback((e: any) => {
    if (!fabricCanvas || !renderer) return;

    // Handle right-click context menu
    if (e.e.button === 2) {
      e.e.preventDefault();
      
      const target = e.target;
      if (!target || target.get('type') !== 'slot') return;

      const slotNumber = target.get('slotNumber');
      if (typeof slotNumber !== 'number') return;

      console.log('Right-click on slot:', slotNumber);

      // Select the object
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

      console.log('Mouse down in draw mode:', pointer);

    // Find next available slot number
    const usedSlots = new Set(visualLayout.slots.map(s => s.slotNumber));
    let nextSlotNumber = 0;
    while (usedSlots.has(nextSlotNumber) && nextSlotNumber < totalSlots) {
      nextSlotNumber++;
    }

    if (nextSlotNumber >= totalSlots) {
      toast.error(`Maximum number of slots reached (${totalSlots})`);
      return;
    }

    // Snap to grid
    const snappedX = renderer.snapToGrid(pointer.x);
    const snappedY = renderer.snapToGrid(pointer.y);

    // Create new slot
    const newSlot: VisualSlotLayout = {
      slotNumber: nextSlotNumber,
      x: Math.max(0, Math.min(CANVAS_WIDTH - 80, snappedX)),
      y: Math.max(0, Math.min(CANVAS_HEIGHT - 60, snappedY)),
      width: 80,
      height: 60
    };

    console.log('Creating new slot:', newSlot);

    // Update visual layout
    const updatedSlots = [...visualLayout.slots, newSlot];
    onVisualLayoutChange({
      ...visualLayout,
      slots: updatedSlots
    });

      toast.success(`Added slot ${nextSlotNumber}`);
    }
  }, [fabricCanvas, renderer, selectedTool, totalSlots, visualLayout, onVisualLayoutChange, onDeleteSlot]);

  // Handle double-click for editing slots
  const handleDoubleClick = useCallback((e: any) => {
    if (!fabricCanvas || selectedTool !== 'select') return;

    const target = e.target;
    if (!target || target.get('type') !== 'slot') return;

    const slotNumber = target.get('slotNumber');
    if (typeof slotNumber !== 'number') return;

    console.log('Double-click on slot:', slotNumber);

    // Find slot data
    const slotData = visualLayout.slots.find(s => s.slotNumber === slotNumber);
    
    setEditDialog({
      open: true,
      slotNumber,
      slotName: (slotData as any)?.name
    });
  }, [fabricCanvas, selectedTool, visualLayout]);

  // Handle keyboard events
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!fabricCanvas || !renderer) return;

    const activeObject = fabricCanvas.getActiveObject();
    if (!activeObject || activeObject.get('type') !== 'slot') return;

    const slotNumber = activeObject.get('slotNumber');
    if (typeof slotNumber !== 'number') return;

    console.log('Key pressed:', e.key, 'for slot:', slotNumber);

    // Delete key
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      console.log('Deleting slot:', slotNumber);
      
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
        newX = renderer.snapToGrid(newX);
        newY = renderer.snapToGrid(newY);
      }

      activeObject.set({ left: newX, top: newY });
      activeObject.setCoords();
      fabricCanvas.renderAll();

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
  }, [fabricCanvas, renderer, visualLayout, onVisualLayoutChange, onDeleteSlot]);

  // Handle slot edit save with canvas updates
  const handleSlotEditSave = useCallback((
    originalSlotNumber: number, 
    newSlotNumber: number, 
    name?: string
  ) => {
    if (!onVisualLayoutChange || !renderer) return;

    console.log('Saving slot edit:', { originalSlotNumber, newSlotNumber, name });

    const updatedSlots = visualLayout.slots.map(slot => 
      slot.slotNumber === originalSlotNumber 
        ? { 
            ...slot, 
            slotNumber: newSlotNumber,
            ...(name && { name })
          }
        : slot
    );

    // Update visual layout state
    onVisualLayoutChange({
      ...visualLayout,
      slots: updatedSlots
    });

    // Update canvas object properties
    const group = renderer.getSlotGroup(originalSlotNumber);
    if (group) {
      // Update group properties
      group.set('slotNumber', newSlotNumber);
      
      // Update text content in the group
      const [, text] = group.getObjects() as [any, any];
      if (text && text.set) {
        text.set('text', name || newSlotNumber.toString());
      }
      
      // Update slot groups mapping
      renderer.getAllSlotGroups().delete(originalSlotNumber);
      renderer.getAllSlotGroups().set(newSlotNumber, group);
      
      group.setCoords();
      fabricCanvas?.renderAll();
    }

    toast.success(`Slot ${originalSlotNumber} ${originalSlotNumber !== newSlotNumber ? `renamed to ${newSlotNumber}` : 'updated'}`);
  }, [visualLayout, onVisualLayoutChange, renderer, fabricCanvas]);

  // Setup event listeners
  useEffect(() => {
    if (!fabricCanvas) return;

    console.log('Setting up enhanced canvas event listeners');

    // Canvas events
    fabricCanvas.on('object:modified', handleObjectModified);
    fabricCanvas.on('mouse:down', handleMouseDown);
    fabricCanvas.on('mouse:dblclick', handleDoubleClick);

    // Keyboard events
    const canvasElement = fabricCanvas.getElement();
    if (canvasElement) {
      canvasElement.addEventListener('keydown', handleKeyDown);
      canvasElement.tabIndex = 0; // Make canvas focusable
      canvasElement.style.outline = 'none';
    }

    // Update canvas selection mode and visual feedback
    fabricCanvas.selection = selectedTool === 'select';
    fabricCanvas.isDrawingMode = false;
    fabricCanvas.defaultCursor = selectedTool === 'select' ? 'default' : 'crosshair';
    fabricCanvas.hoverCursor = selectedTool === 'select' ? 'move' : 'crosshair';

    // Enable right-click context menu
    const canvasEl = fabricCanvas.getElement();
    if (canvasEl) {
      canvasEl.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    return () => {
      console.log('Cleaning up enhanced canvas event listeners');
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
    handleKeyDown
  ]);

  // Focus canvas when tool changes to select
  useEffect(() => {
    if (selectedTool === 'select' && renderer) {
      setTimeout(() => renderer.focusCanvas(), 100);
    }
  }, [selectedTool, renderer]);

  const usedSlotNumbers = new Set(visualLayout.slots.map(s => s.slotNumber));

  return (
    <SlotEditDialog
      open={editDialog.open}
      onOpenChange={(open) => setEditDialog(prev => ({ ...prev, open }))}
      slotNumber={editDialog.slotNumber}
      slotName={editDialog.slotName}
      onSave={handleSlotEditSave}
      usedSlotNumbers={usedSlotNumbers}
      maxSlots={totalSlots}
    />
  );
};
