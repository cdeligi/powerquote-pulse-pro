/**
 * Canvas debugging utilities for troubleshooting rendering and interaction issues
 */

import type { Canvas as FabricCanvas } from 'fabric';
import type { VisualSlotLayout, ChassisVisualLayout } from '@/types/product/chassis-types';

export interface CanvasDebugInfo {
  canvas: {
    ready: boolean;
    width: number;
    height: number;
    objectsCount: number;
    backgroundColor: string;
    selection: boolean;
  };
  layout: {
    totalSlots: number;
    validSlots: number;
    invalidSlots: number;
    slotsDetails: Array<{
      slotNumber: number;
      x: number;
      y: number;
      width: number;
      height: number;
      valid: boolean;
    }>;
  };
  rendering: {
    slotObjectsOnCanvas: number;
    gridObjectsOnCanvas: number;
    renderingMatch: boolean;
  };
  dom: {
    canvasElementExists: boolean;
    canvasElementFocusable: boolean;
    canvasElementVisible: boolean;
  };
}

/**
 * Sanitize slots to filter out invalid ones
 */
export function sanitizeSlots(slots: VisualSlotLayout[]): VisualSlotLayout[] {
  if (!Array.isArray(slots)) return [];
  return slots.filter(s => {
    const w = Number(s.width ?? 0);
    const h = Number(s.height ?? 0);
    const x = Number(s.x ?? 0);
    const y = Number(s.y ?? 0);
    return isFinite(w) && isFinite(h) && w >= 8 && h >= 8 && isFinite(x) && isFinite(y);
  });
}

/**
 * Generate comprehensive debug information about the canvas state
 */
export function generateCanvasDebugInfo(
  fabricCanvas: FabricCanvas | null,
  visualLayout: ChassisVisualLayout,
  canvasElement?: HTMLCanvasElement | null
): CanvasDebugInfo {
  const validSlots = sanitizeSlots(visualLayout.slots);
  
  const debugInfo: CanvasDebugInfo = {
    canvas: {
      ready: !!fabricCanvas,
      width: fabricCanvas?.width ?? 0,
      height: fabricCanvas?.height ?? 0,
      objectsCount: fabricCanvas?.getObjects().length ?? 0,
      backgroundColor: fabricCanvas?.backgroundColor as string ?? '',
      selection: fabricCanvas?.selection ?? false
    },
    layout: {
      totalSlots: visualLayout.slots.length,
      validSlots: validSlots.length,
      invalidSlots: visualLayout.slots.length - validSlots.length,
      slotsDetails: visualLayout.slots.map(slot => ({
        slotNumber: slot.slotNumber,
        x: Number(slot.x ?? 0),
        y: Number(slot.y ?? 0),
        width: Number(slot.width ?? 0),
        height: Number(slot.height ?? 0),
        valid: validSlots.some(vs => vs.slotNumber === slot.slotNumber)
      }))
    },
    rendering: {
      slotObjectsOnCanvas: 0,
      gridObjectsOnCanvas: 0,
      renderingMatch: false
    },
    dom: {
      canvasElementExists: !!canvasElement,
      canvasElementFocusable: canvasElement ? canvasElement.tabIndex >= 0 : false,
      canvasElementVisible: canvasElement ? 
        (canvasElement.offsetWidth > 0 && canvasElement.offsetHeight > 0) : false
    }
  };

  if (fabricCanvas) {
    const objects = fabricCanvas.getObjects();
    debugInfo.rendering.slotObjectsOnCanvas = objects.filter(obj => 
      obj.get('data')?.type === 'slot' || obj.get('type') === 'slot'
    ).length;
    debugInfo.rendering.gridObjectsOnCanvas = objects.filter(obj => 
      obj.get('excludeFromExport') === true
    ).length;
    debugInfo.rendering.renderingMatch = 
      debugInfo.rendering.slotObjectsOnCanvas === validSlots.length;
  }

  return debugInfo;
}

/**
 * Log comprehensive debug information to console
 */
export function logCanvasDebugInfo(debugInfo: CanvasDebugInfo, context?: string): void {
  const prefix = context ? `[${context}]` : '[Canvas Debug]';
  
  console.group(`${prefix} Canvas Debug Information`);
  
  console.log('📊 Canvas State:', debugInfo.canvas);
  console.log('🎯 Layout Analysis:', debugInfo.layout);
  console.log('🎨 Rendering Status:', debugInfo.rendering);
  console.log('🌐 DOM Status:', debugInfo.dom);
  
  // Highlight issues
  const issues: string[] = [];
  
  if (!debugInfo.canvas.ready) issues.push('Canvas not ready');
  if (debugInfo.layout.invalidSlots > 0) issues.push(`${debugInfo.layout.invalidSlots} invalid slots`);
  if (!debugInfo.rendering.renderingMatch) issues.push('Rendering mismatch');
  if (!debugInfo.dom.canvasElementExists) issues.push('Canvas DOM element missing');
  if (!debugInfo.dom.canvasElementFocusable) issues.push('Canvas not focusable');
  if (!debugInfo.dom.canvasElementVisible) issues.push('Canvas not visible');
  
  if (issues.length > 0) {
    console.warn('⚠️ Issues detected:', issues);
  } else {
    console.log('✅ No issues detected');
  }
  
  console.groupEnd();
}

/**
 * Perform comprehensive canvas health check
 */
export function performCanvasHealthCheck(
  fabricCanvas: FabricCanvas | null,
  visualLayout: ChassisVisualLayout,
  canvasElement?: HTMLCanvasElement | null
): { healthy: boolean; issues: string[]; debugInfo: CanvasDebugInfo } {
  const debugInfo = generateCanvasDebugInfo(fabricCanvas, visualLayout, canvasElement);
  const issues: string[] = [];
  
  // Check canvas readiness
  if (!debugInfo.canvas.ready) {
    issues.push('Canvas is not initialized');
  }
  
  // Check layout validity
  if (debugInfo.layout.invalidSlots > 0) {
    issues.push(`${debugInfo.layout.invalidSlots} slots have invalid dimensions or positions`);
  }
  
  // Check rendering consistency
  if (debugInfo.canvas.ready && !debugInfo.rendering.renderingMatch) {
    issues.push(`Rendering mismatch: ${debugInfo.rendering.slotObjectsOnCanvas} objects vs ${debugInfo.layout.validSlots} slots`);
  }
  
  // Check DOM accessibility
  if (!debugInfo.dom.canvasElementExists) {
    issues.push('Canvas DOM element is missing');
  } else {
    if (!debugInfo.dom.canvasElementFocusable) {
      issues.push('Canvas is not focusable (keyboard events will not work)');
    }
    if (!debugInfo.dom.canvasElementVisible) {
      issues.push('Canvas is not visible (may have zero dimensions)');
    }
  }
  
  return {
    healthy: issues.length === 0,
    issues,
    debugInfo
  };
}

/**
 * Fix common canvas issues automatically
 */
export function autoFixCanvasIssues(
  fabricCanvas: FabricCanvas | null,
  canvasElement?: HTMLCanvasElement | null
): { fixed: string[]; remaining: string[] } {
  const fixed: string[] = [];
  const remaining: string[] = [];
  
  if (!fabricCanvas) {
    remaining.push('Cannot fix issues: Canvas not ready');
    return { fixed, remaining };
  }
  
  try {
    // Fix canvas focus issues
    if (canvasElement) {
      if (canvasElement.tabIndex < 0) {
        canvasElement.tabIndex = 0;
        fixed.push('Made canvas focusable');
      }
      
      // Ensure basic styles
      if (!canvasElement.style.outline) {
        canvasElement.style.outline = 'none';
        fixed.push('Added canvas outline style');
      }
      
      if (!canvasElement.style.userSelect) {
        canvasElement.style.userSelect = 'none';
        fixed.push('Disabled text selection on canvas');
      }
    }
    
    // Fix canvas background if missing
    if (!fabricCanvas.backgroundColor) {
      fabricCanvas.backgroundColor = 'hsl(var(--background))';
      fixed.push('Set canvas background color');
    }
    
    // Note: interactive property doesn't exist on Fabric v6 Canvas
    // Canvas is interactive by default in v6
    
    // Force render to update display
    fabricCanvas.requestRenderAll();
    fixed.push('Triggered canvas re-render');
    
  } catch (error) {
    remaining.push(`Auto-fix failed: ${error.message}`);
  }
  
  return { fixed, remaining };
}