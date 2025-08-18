import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface ElementInfo {
  tagName: string;
  id?: string;
  className?: string;
  width: number;
  height: number;
  x: number;
  y: number;
  path: string;
}

export const ElementInspector = () => {
  const [isActive, setIsActive] = useState(false);
  const [selectedElement, setSelectedElement] = useState<ElementInfo | null>(null);
  const [hoveredElement, setHoveredElement] = useState<ElementInfo | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const getElementPath = (element: Element): string => {
    const path: string[] = [];
    let current: Element | null = element;
    
    while (current && current !== document.body) {
      const selector = current.tagName.toLowerCase();
      const id = current.id ? `#${current.id}` : '';
      const classes = current.className && typeof current.className === 'string' 
        ? `.${current.className.split(' ').filter(Boolean).join('.')}` 
        : '';
      
      path.unshift(`${selector}${id}${classes}`);
      current = current.parentElement;
    }
    
    return path.join(' > ');
  };

  const getElementInfo = (element: Element): ElementInfo => {
    const rect = element.getBoundingClientRect();
    return {
      tagName: element.tagName.toLowerCase(),
      id: element.id || undefined,
      className: element.className && typeof element.className === 'string' 
        ? element.className 
        : undefined,
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      x: Math.round(rect.left + window.scrollX),
      y: Math.round(rect.top + window.scrollY),
      path: getElementPath(element)
    };
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isActive || !overlayRef.current) return;
    
    const element = document.elementFromPoint(e.clientX, e.clientY);
    if (!element || element === overlayRef.current) return;
    
    const elementInfo = getElementInfo(element);
    setHoveredElement(elementInfo);
  };

  const handleClick = (e: MouseEvent) => {
    if (!isActive || !overlayRef.current) return;
    
    e.preventDefault();
    const element = document.elementFromPoint(e.clientX, e.clientY);
    if (!element || element === overlayRef.current) return;
    
    setSelectedElement(getElementInfo(element));
    setIsActive(false);
    
    // Log the selected element (you can replace this with your own logic)
    console.log('Selected element:', getElementInfo(element));
  };

  useEffect(() => {
    if (isActive) {
      document.body.style.cursor = 'crosshair';
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('click', handleClick, true);
    } else {
      document.body.style.cursor = '';
      setHoveredElement(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('click', handleClick, true);
    }

    return () => {
      document.body.style.cursor = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('click', handleClick, true);
    };
  }, [isActive]);

  const toggleInspect = () => {
    setIsActive(!isActive);
    if (!isActive) {
      setSelectedElement(null);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end space-y-2">
      <button
        onClick={toggleInspect}
        className={cn(
          'px-4 py-2 rounded-md font-medium transition-colors',
          isActive 
            ? 'bg-red-500 text-white hover:bg-red-600' 
            : 'bg-blue-500 text-white hover:bg-blue-600'
        )}
      >
        {isActive ? 'Cancel' : 'Inspect Element'}
      </button>

      {(hoveredElement || selectedElement) && (
        <div className="bg-gray-900 text-white p-4 rounded-md shadow-lg max-w-xs w-full">
          <h3 className="font-bold mb-2">
            {selectedElement ? 'Selected Element' : 'Hovering Over'}
          </h3>
          <div className="space-y-1 text-sm">
            <p><span className="text-gray-400">Tag:</span> &lt;{(selectedElement || hoveredElement)?.tagName}&gt;</p>
            {(selectedElement || hoveredElement)?.id && (
              <p><span className="text-gray-400">ID:</span> {(selectedElement || hoveredElement)?.id}</p>
            )}
            {(selectedElement || hoveredElement)?.className && (
              <p className="truncate">
                <span className="text-gray-400">Class:</span> {(selectedElement || hoveredElement)?.className}
              </p>
            )}
            <p><span className="text-gray-400">Size:</span> 
              {(selectedElement || hoveredElement)?.width} × {(selectedElement || hoveredElement)?.height}px
            </p>
            <p><span className="text-gray-400">Position:</span> 
              x: {(selectedElement || hoveredElement)?.x}, y: {(selectedElement || hoveredElement)?.y}
            </p>
            <p className="text-xs text-gray-400 truncate" title={(selectedElement || hoveredElement)?.path}>
              {(selectedElement || hoveredElement)?.path}
            </p>
          </div>
        </div>
      )}

      {isActive && (
        <div
          ref={overlayRef}
          className="fixed inset-0 z-40 pointer-events-none"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.1)',
            pointerEvents: 'none'
          }}
        >
          {hoveredElement && (
            <div
              className="absolute border-2 border-blue-500 bg-blue-500 bg-opacity-10 pointer-events-none"
              style={{
                left: `${hoveredElement.x}px`,
                top: `${hoveredElement.y}px`,
                width: `${hoveredElement.width}px`,
                height: `${hoveredElement.height}px`,
                pointerEvents: 'none',
              }}
            />
          )}
        </div>
      )}
    </div>
  );
};
