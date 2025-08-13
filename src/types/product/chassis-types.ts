/**
 * © 2025 Qualitrol Corp. All rights reserved.
 */

// Visual slot layout for canvas-based design
export interface VisualSlotLayout {
  slotNumber: number;
  x: number; // X coordinate on canvas
  y: number; // Y coordinate on canvas
  width: number; // Slot width
  height: number; // Slot height
}

// Visual layout data structure
export interface ChassisVisualLayout {
  slots: VisualSlotLayout[];
  canvasWidth: number;
  canvasHeight: number;
}

// Chassis Type interface for configurable chassis layouts
export interface ChassisType {
  id: string;
  code: string;
  name: string;
  totalSlots: number;
  layoutRows?: number[][] | null; // Custom layout as array of slot arrays per row
  visualLayout?: ChassisVisualLayout | null; // Canvas-based visual layout
  enabled: boolean;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

// Form data interface for creating chassis types
export interface ChassisTypeFormData {
  code: string;
  name: string;
  totalSlots: number;
  layoutRows?: number[][] | null;
  visualLayout?: ChassisVisualLayout | null;
  enabled: boolean;
  metadata?: Record<string, any>;
}

// Layout validation utilities
export const validateLayoutRows = (layoutRows: number[][], totalSlots: number): boolean => {
  const allSlots = layoutRows.flat();
  const uniqueSlots = new Set(allSlots);
  
  // Must have slots 0 through totalSlots-1 exactly once
  const expectedSlots = Array.from({ length: totalSlots }, (_, i) => i);
  
  return (
    allSlots.length === totalSlots &&
    uniqueSlots.size === totalSlots &&
    expectedSlots.every(slot => uniqueSlots.has(slot))
  );
};

export const validateVisualLayout = (visualLayout: ChassisVisualLayout, totalSlots: number): boolean => {
  if (!visualLayout || !visualLayout.slots) return false;
  
  const slotNumbers = visualLayout.slots.map(slot => slot.slotNumber);
  const uniqueSlots = new Set(slotNumbers);
  const expectedSlots = Array.from({ length: totalSlots }, (_, i) => i);
  
  return (
    slotNumbers.length === totalSlots &&
    uniqueSlots.size === totalSlots &&
    expectedSlots.every(slot => uniqueSlots.has(slot))
  );
};

// Default layout generators
export const generateDefaultLayout = (totalSlots: number): number[][] => {
  const slots = Array.from({ length: totalSlots }, (_, i) => i);
  const slotsPerRow = Math.min(8, totalSlots);
  const rows: number[][] = [];
  
  for (let i = 0; i < slots.length; i += slotsPerRow) {
    rows.push(slots.slice(i, i + slotsPerRow));
  }
  
  return rows;
};

export const generateDefaultVisualLayout = (totalSlots: number, canvasWidth: number = 800, canvasHeight: number = 600): ChassisVisualLayout => {
  const slotsPerRow = Math.min(8, totalSlots);
  const rows = Math.ceil(totalSlots / slotsPerRow);
  
  const slotWidth = Math.floor((canvasWidth - 40) / slotsPerRow) - 10;
  const slotHeight = Math.floor((canvasHeight - 40) / rows) - 10;
  
  const slots: VisualSlotLayout[] = [];
  
  for (let i = 0; i < totalSlots; i++) {
    const row = Math.floor(i / slotsPerRow);
    const col = i % slotsPerRow;
    
    slots.push({
      slotNumber: i,
      x: 20 + col * (slotWidth + 10),
      y: 20 + row * (slotHeight + 10),
      width: slotWidth,
      height: slotHeight
    });
  }
  
  return {
    slots,
    canvasWidth,
    canvasHeight
  };
};