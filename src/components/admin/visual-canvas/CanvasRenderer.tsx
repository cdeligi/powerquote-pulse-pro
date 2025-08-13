/**
 * Canvas renderer for managing Fabric.js objects efficiently
 */

import { Canvas as FabricCanvas, Rect, FabricText, Line, Group } from 'fabric';
import { VisualSlotLayout } from "@/types/product/chassis-types";

const GRID_SIZE = 20;

export class CanvasRenderer {
  private canvas: FabricCanvas;
  private slotGroups: Map<number, Group> = new Map();
  private gridLines: Line[] = [];

  constructor(canvas: FabricCanvas) {
    this.canvas = canvas;
    console.log('CanvasRenderer initialized');
  }

  // Create a slot group using Fabric.js v6 API
  private createSlotGroup(slot: VisualSlotLayout): Group {
    console.log('Creating slot group for slot:', slot.slotNumber);

    // Create rectangle
    const rect = new Rect({
      width: slot.width,
      height: slot.height,
      fill: 'hsl(var(--muted))',
      stroke: 'hsl(var(--border))',
      strokeWidth: 2,
      rx: 4,
      ry: 4
    });

    // Create text
    const text = new FabricText(slot.slotNumber.toString(), {
      fontSize: 14,
      fontFamily: 'Inter, sans-serif',
      fill: 'hsl(var(--foreground))',
      textAlign: 'center',
      originX: 'center',
      originY: 'center'
    });

    // Create group with proper v6 API
    const group = new Group([rect, text], {
      left: slot.x,
      top: slot.y,
      selectable: true,
      hasControls: true,
      hasBorders: true,
      lockRotation: true
    });

    // Store slot number as custom property
    group.set('slotNumber', slot.slotNumber);
    group.set('type', 'slot');

    console.log('Created slot group with slotNumber:', group.get('slotNumber'));
    return group;
  }

  // Render slots efficiently - only update changed slots
  renderSlots(slots: VisualSlotLayout[]): void {
    console.log('Rendering slots:', slots.length);
    
    const currentSlotNumbers = new Set(Array.from(this.slotGroups.keys()));
    const newSlotNumbers = new Set(slots.map(s => s.slotNumber));

    // Remove slots that no longer exist
    for (const slotNumber of currentSlotNumbers) {
      if (!newSlotNumbers.has(slotNumber)) {
        const group = this.slotGroups.get(slotNumber);
        if (group) {
          console.log('Removing slot:', slotNumber);
          this.canvas.remove(group);
          this.slotGroups.delete(slotNumber);
        }
      }
    }

    // Add or update slots
    for (const slot of slots) {
      let group = this.slotGroups.get(slot.slotNumber);
      
      if (!group) {
        // Create new slot
        console.log('Creating new slot:', slot.slotNumber);
        group = this.createSlotGroup(slot);
        this.slotGroups.set(slot.slotNumber, group);
        this.canvas.add(group);
      } else {
        // Update existing slot position and size
        console.log('Updating slot position:', slot.slotNumber);
        group.set({
          left: slot.x,
          top: slot.y
        });
        
        // Update rectangle size
        const rect = group.getObjects()[0] as Rect;
        if (rect) {
          rect.set({
            width: slot.width,
            height: slot.height
          });
        }
      }
    }

    this.canvas.renderAll();
    console.log('Slots rendered successfully');
  }

  // Draw grid lines
  drawGrid(visible: boolean): void {
    // Remove existing grid lines
    this.gridLines.forEach(line => this.canvas.remove(line));
    this.gridLines = [];

    if (!visible) {
      this.canvas.renderAll();
      return;
    }

    console.log('Drawing grid');

    // Vertical lines
    for (let x = 0; x <= this.canvas.width!; x += GRID_SIZE) {
      const line = new Line([x, 0, x, this.canvas.height!], {
        stroke: 'hsl(var(--border))',
        strokeWidth: 0.5,
        selectable: false,
        evented: false,
        excludeFromExport: true
      });
      this.gridLines.push(line);
      this.canvas.add(line);
    }

    // Horizontal lines
    for (let y = 0; y <= this.canvas.height!; y += GRID_SIZE) {
      const line = new Line([0, y, this.canvas.width!, y], {
        stroke: 'hsl(var(--border))',
        strokeWidth: 0.5,
        selectable: false,
        evented: false,
        excludeFromExport: true
      });
      this.gridLines.push(line);
      this.canvas.add(line);
    }

    // Send grid to back
    this.gridLines.forEach(line => this.canvas.sendToBack(line));
    this.canvas.renderAll();
  }

  // Snap position to grid
  snapToGrid(value: number): number {
    return Math.round(value / GRID_SIZE) * GRID_SIZE;
  }

  // Get slot group by slot number
  getSlotGroup(slotNumber: number): Group | undefined {
    return this.slotGroups.get(slotNumber);
  }

  // Get all slot groups
  getAllSlotGroups(): Map<number, Group> {
    return new Map(this.slotGroups);
  }

  // Clear all slots
  clearSlots(): void {
    console.log('Clearing all slots');
    this.slotGroups.forEach(group => this.canvas.remove(group));
    this.slotGroups.clear();
    this.canvas.renderAll();
  }

  // Dispose resources
  dispose(): void {
    this.clearSlots();
    this.gridLines.forEach(line => this.canvas.remove(line));
    this.gridLines = [];
  }
}