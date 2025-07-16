import { useRef, useCallback } from 'react';

interface DragDropRef {
  current: {
    isDragging: boolean;
    sourceIndex: number | null;
    targetIndex: number | null;
  };
}

export function useDragAndDrop() {
  const dragDropRef = useRef<DragDropRef>({
    current: {
      isDragging: false,
      sourceIndex: null,
      targetIndex: null,
    },
  });

  const drag = useCallback((id: string) => {
    return {
      onMouseDown: (e: React.MouseEvent) => {
        e.preventDefault();
        dragDropRef.current.current.isDragging = true;
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
      },
    };
  }, []);

  const drop = useCallback((index: number) => {
    return {
      onMouseOver: () => {
        if (dragDropRef.current.current.isDragging) {
          dragDropRef.current.current.targetIndex = index;
        }
      },
    };
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragDropRef.current.current.isDragging) return;
    
    // Update cursor position
    const cursorX = e.clientX;
    const cursorY = e.clientY;
    
    // Update cursor style
    document.body.style.cursor = 'grabbing';
  }, []);

  const handleMouseUp = useCallback(() => {
    if (!dragDropRef.current.current.isDragging) return;
    
    // Reset cursor style
    document.body.style.cursor = '';
    
    // Clean up event listeners
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    
    // Reset drag state
    dragDropRef.current.current.isDragging = false;
    const sourceIndex = dragDropRef.current.current.sourceIndex;
    const targetIndex = dragDropRef.current.current.targetIndex;
    
    // Reset indices
    dragDropRef.current.current.sourceIndex = null;
    dragDropRef.current.current.targetIndex = null;
    
    // Call onDragEnd if we have both source and target indices
    if (sourceIndex !== null && targetIndex !== null && sourceIndex !== targetIndex) {
      // This will be handled by the parent component
      return { sourceIndex, targetIndex };
    }
  }, [handleMouseMove]);

  return { drag, drop };
}
