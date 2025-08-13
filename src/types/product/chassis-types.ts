/**
 * © 2025 Qualitrol Corp. All rights reserved.
 */

// Chassis Type interface for configurable chassis layouts
export interface ChassisType {
  id: string;
  code: string;
  name: string;
  totalSlots: number;
  cpuSlotIndex: number;
  layoutRows?: number[][] | null; // Custom layout as array of slot arrays per row
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
  cpuSlotIndex: number;
  layoutRows?: number[][] | null;
  enabled: boolean;
  metadata?: Record<string, any>;
}

// Layout validation utility
export const validateLayoutRows = (layoutRows: number[][], totalSlots: number): boolean => {
  const allSlots = layoutRows.flat();
  const uniqueSlots = new Set(allSlots);
  
  // Must have slots 0 through totalSlots exactly once
  const expectedSlots = Array.from({ length: totalSlots + 1 }, (_, i) => i);
  
  return (
    allSlots.length === totalSlots + 1 &&
    uniqueSlots.size === totalSlots + 1 &&
    expectedSlots.every(slot => uniqueSlots.has(slot))
  );
};

// Default layout generators
export const generateDefaultLayout = (totalSlots: number, cpuSlotIndex: number = 0): number[][] => {
  const slots = Array.from({ length: totalSlots + 1 }, (_, i) => i);
  const slotsPerRow = Math.min(8, totalSlots + 1);
  const rows: number[][] = [];
  
  for (let i = 0; i < slots.length; i += slotsPerRow) {
    rows.push(slots.slice(i, i + slotsPerRow));
  }
  
  return rows;
};