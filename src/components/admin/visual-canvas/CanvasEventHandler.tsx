/**
 * Canvas event handler component for visual designer
 */

import { useEffect, useCallback } from 'react';
import { Canvas as FabricCanvas, Group } from 'fabric';
import { VisualSlotLayout, ChassisVisualLayout } from "@/types/product/chassis-types";
import { CanvasRenderer } from './CanvasRenderer';

interface CanvasEventHandlerProps {
  fabricCanvas: FabricCanvas | null;
  renderer: CanvasRenderer | null;
  selectedTool: 'select' | 'draw';
  totalSlots: number;
  visualLayout: ChassisVisualLayout;
  onVisualLayoutChange?: (layout: ChassisVisualLayout) => void;
  onDeleteSlot?: (slotNumber: number) => void;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const GRID_SIZE = 20;

export const CanvasEventHandler: React.FC<CanvasEventHandlerProps> = ({
  fabricCanvas,
  renderer,
  selectedTool,
  totalSlots,
  visualLayout,
  onVisualLayoutChange,
  onDeleteSlot
}) => {

  // Handle object modifications (moving, resizing)
  const handleObjectModified = useCallback((e: any) => {
    if (!renderer || !onVisualLayoutChange) return;

    const target = e.target;
    if (!target || target.get('type') !== 'slot') return;

    const slotNumber = target.get('slotNumber');
    if (typeof slotNumber !== 'number') return;

    console.log('Object modified - slot:', slotNumber);

    // Apply grid snapping
    const snappedX = renderer.snapToGrid(target.left || 0);
    const snappedY = renderer.snapToGrid(target.top || 0);

    // Keep within canvas bounds
    const constrainedX = Math.max(0, Math.min(CANVAS_WIDTH - (target.width || 0), snappedX));
    const constrainedY = Math.max(0, Math.min(CANVAS_HEIGHT - (target.height || 0), snappedY));

    // Update object position
    target.set({
      left: constrainedX,
      top: constrainedY
    });

    // Update visual layout state
    const updatedSlots = visualLayout.slots.map(slot => 
      slot.slotNumber === slotNumber 
        ? { ...slot, x: constrainedX, y: constrainedY }
        : slot
    );

    onVisualLayoutChange({
      ...visualLayout,
      slots: updatedSlots
    });

    fabricCanvas?.renderAll();
  }, [renderer, fabricCanvas, visualLayout, onVisualLayoutChange]);

  // Handle mouse down events for drawing new slots
  const handleMouseDown = useCallback((e: any) => {
    if (!fabricCanvas || !renderer || selectedTool !== 'draw' || !onVisualLayoutChange) return;

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
      console.log('No more slots available');
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
  }, [fabricCanvas, renderer, selectedTool, totalSlots, visualLayout, onVisualLayoutChange]);

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
        // Remove slot from visual layout
        const updatedSlots = visualLayout.slots.filter(s => s.slotNumber !== slotNumber);
        onVisualLayoutChange({
          ...visualLayout,
          slots: updatedSlots
        });
      }
      
      fabricCanvas.remove(activeObject);
      fabricCanvas.renderAll();
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

  // Setup event listeners
  useEffect(() => {
    if (!fabricCanvas) return;

    console.log('Setting up canvas event listeners');

    // Canvas events
    fabricCanvas.on('object:modified', handleObjectModified);
    fabricCanvas.on('mouse:down', handleMouseDown);

    // Keyboard events
    const canvasElement = fabricCanvas.getElement();
    if (canvasElement) {
      canvasElement.addEventListener('keydown', handleKeyDown);
    }

    // Update canvas selection mode
    fabricCanvas.selection = selectedTool === 'select';
    fabricCanvas.isDrawingMode = false;

    return () => {
      console.log('Cleaning up canvas event listeners');
      fabricCanvas.off('object:modified', handleObjectModified);
      fabricCanvas.off('mouse:down', handleMouseDown);
      
      if (canvasElement) {
        canvasElement.removeEventListener('keydown', handleKeyDown);
      }
    };
  }, [fabricCanvas, selectedTool, handleObjectModified, handleMouseDown, handleKeyDown]);

  return null; // This component doesn't render anything
};
