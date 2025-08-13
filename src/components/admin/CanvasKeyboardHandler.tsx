/**
 * Keyboard handler component for canvas operations
 */

import { useEffect } from 'react';
import { Canvas as FabricCanvas } from 'fabric';

interface CanvasKeyboardHandlerProps {
  fabricCanvas: FabricCanvas | null;
  onDeleteSlot: (slotNumber: number) => void;
  onObjectModified: (obj: any) => void;
}

export const CanvasKeyboardHandler: React.FC<CanvasKeyboardHandlerProps> = ({
  fabricCanvas,
  onDeleteSlot,
  onObjectModified
}) => {
  useEffect(() => {
    if (!fabricCanvas) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeObject = fabricCanvas.getActiveObject();
      if (!activeObject) return;

      // Delete key to remove slot
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        const slotNumber = activeObject.get('slotNumber');
        if (typeof slotNumber === 'number') {
          onDeleteSlot(slotNumber);
          fabricCanvas.remove(activeObject);
          fabricCanvas.renderAll();
        }
        return;
      }

      // Arrow keys for precise movement
      const step = e.shiftKey ? 10 : 1;
      let moved = false;

      switch (e.key) {
        case 'ArrowLeft':
          activeObject.set('left', Math.max(0, (activeObject.left || 0) - step));
          moved = true;
          break;
        case 'ArrowRight':
          activeObject.set('left', Math.min(800 - (activeObject.width || 0), (activeObject.left || 0) + step));
          moved = true;
          break;
        case 'ArrowUp':
          activeObject.set('top', Math.max(0, (activeObject.top || 0) - step));
          moved = true;
          break;
        case 'ArrowDown':
          activeObject.set('top', Math.min(600 - (activeObject.height || 0), (activeObject.top || 0) + step));
          moved = true;
          break;
      }

      if (moved) {
        e.preventDefault();
        fabricCanvas.renderAll();
        onObjectModified(activeObject);
      }
    };

    // Focus canvas to receive keyboard events
    const canvasElement = fabricCanvas.getElement();
    if (canvasElement) {
      canvasElement.tabIndex = 0; // Make it focusable
      canvasElement.addEventListener('keydown', handleKeyDown);
      
      return () => {
        canvasElement.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [fabricCanvas, onDeleteSlot, onObjectModified]);

  return null; // This component doesn't render anything
};