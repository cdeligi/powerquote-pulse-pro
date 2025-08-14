/**
 * Enhanced Canvas renderer with selective updates and proper Fabric.js v6 integration
 */

import { Canvas as FabricCanvas, Rect, FabricText, Line, Group, FabricImage } from 'fabric';
import { VisualSlotLayout } from "@/types/product/chassis-types";

const GRID_SIZE = 20;

export class EnhancedCanvasRenderer {
  private canvas: FabricCanvas;
  private slotGroups: Map<number, Group> = new Map();
  private gridLines: Line[] = [];
  private isGridVisible: boolean = false;

  constructor(canvas: FabricCanvas) {
    this.canvas = canvas;
    console.log('EnhancedCanvasRenderer initialized');
  }

  // Create a slot group using proper Fabric.js v6 API
  private createSlotGroup(slot: VisualSlotLayout): Group {
    console.log('Creating slot group for slot:', slot.slotNumber);

    // Create rectangle
    const rect = new Rect({
      left: 0,
      top: 0,
      width: slot.width,
      height: slot.height,
      fill: 'hsl(210 40% 98%)',
      stroke: 'hsl(214.3 31.8% 91.4%)',
      strokeWidth: 2,
      rx: 6,
      ry: 6,
      selectable: false,
      evented: false
    });

    // Create text - use slot name if available, otherwise slot number
    const displayText = (slot as any).name || slot.slotNumber.toString();
    const text = new FabricText(displayText, {
      left: slot.width / 2,
      top: slot.height / 2,
      fontSize: 14,
      fontFamily: 'Inter, system-ui, sans-serif',
      fill: 'hsl(222.2 84% 4.9%)',
      textAlign: 'center',
      originX: 'center',
      originY: 'center',
      selectable: false,
      evented: false
    });

    // Create group with proper v6 API
    const group = new Group([rect, text], {
      left: slot.x,
      top: slot.y,
      selectable: true,
      hasControls: true,
      hasBorders: true,
      lockRotation: true,
      borderColor: 'hsl(221.2 83.2% 53.3%)',
      borderScaleFactor: 2,
      cornerColor: 'hsl(221.2 83.2% 53.3%)',
      cornerSize: 8,
      transparentCorners: false
    });

    // Disable rotation control
    group.setControlsVisibility({
      mtr: false
    });

    // Store custom properties
    group.set('slotNumber', slot.slotNumber);
    group.set('type', 'slot');

    // Add image if URL is provided
    this.addSlotImageIfAny(group, slot);

    console.log('Created slot group with slotNumber:', group.get('slotNumber'));
    return group;
  }

  // Add slot image if URL is provided
  private async addSlotImageIfAny(group: Group, slot: VisualSlotLayout): Promise<void> {
    if (!slot.imageUrl) return;

    try {
      FabricImage.fromURL(slot.imageUrl, {
        crossOrigin: 'anonymous'
      }).then((img) => {
        const rect = group.getObjects()[0] as Rect;
        const maxW = (rect.width as number) - 20;
        const maxH = (rect.height as number) - 40; // Leave space for text
        
        const scale = Math.min(
          maxW / (img.width || maxW),
          maxH / (img.height || maxH),
          1 // Don't scale up
        );
        
        img.set({
          left: rect.width! / 2,
          top: rect.height! / 2 - 10, // Offset up to leave space for text
          originX: 'center',
          originY: 'center',
          selectable: false,
          evented: false,
          scaleX: scale,
          scaleY: scale
        });
        
        group.add(img);
        this.canvas.requestRenderAll();
      }).catch((error) => {
        console.warn('Failed to load slot image:', slot.imageUrl, error);
      });
    } catch (error) {
      console.warn('Error loading slot image:', error);
    }
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
        // Update existing slot position and size if changed
        const hasChanged = 
          group.left !== slot.x || 
          group.top !== slot.y || 
          group.width !== slot.width || 
          group.height !== slot.height;

        if (hasChanged) {
          console.log('Updating slot:', slot.slotNumber);
          group.set({
            left: slot.x,
            top: slot.y
          });
          
          // Update rectangle and text within group
          const [rect, text] = group.getObjects() as [Rect, FabricText];
          if (rect && text) {
            rect.set({
              width: slot.width,
              height: slot.height
            });
            
            // Update text content and position
            const displayText = (slot as any).name || slot.slotNumber.toString();
            text.set({
              text: displayText,
              left: slot.width / 2,
              top: slot.height / 2
            });
          }
          
          group.setCoords();
        }
      }
    }

    // Maintain grid layer order
    if (this.isGridVisible) {
      this.sendGridToBack();
    }

    this.canvas.renderAll();
    console.log('Slots rendered successfully');
  }

  // Draw grid lines with proper layering
  drawGrid(visible: boolean): void {
    this.isGridVisible = visible;
    
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
        stroke: 'hsl(214.3 31.8% 91.4%)',
        strokeWidth: 0.5,
        selectable: false,
        evented: false,
        excludeFromExport: true,
        opacity: 0.5
      });
      this.gridLines.push(line);
      this.canvas.add(line);
    }

    // Horizontal lines
    for (let y = 0; y <= this.canvas.height!; y += GRID_SIZE) {
      const line = new Line([0, y, this.canvas.width!, y], {
        stroke: 'hsl(214.3 31.8% 91.4%)',
        strokeWidth: 0.5,
        selectable: false,
        evented: false,
        excludeFromExport: true,
        opacity: 0.5
      });
      this.gridLines.push(line);
      this.canvas.add(line);
    }

    // Send grid to back
    this.sendGridToBack();
    this.canvas.renderAll();
  }

  // Send grid lines to back
  private sendGridToBack(): void {
    this.gridLines.forEach(line => this.canvas.sendObjectToBack(line));
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

  // Delete specific slot
  deleteSlot(slotNumber: number): boolean {
    const group = this.slotGroups.get(slotNumber);
    if (group) {
      console.log('Deleting slot:', slotNumber);
      this.canvas.remove(group);
      this.slotGroups.delete(slotNumber);
      this.canvas.renderAll();
      return true;
    }
    return false;
  }

  // Clear all slots
  clearSlots(): void {
    console.log('Clearing all slots');
    this.slotGroups.forEach(group => this.canvas.remove(group));
    this.slotGroups.clear();
    this.canvas.renderAll();
  }

  // Focus canvas for keyboard events
  focusCanvas(): void {
    const canvasElement = this.canvas.getElement();
    if (canvasElement) {
      canvasElement.focus();
    }
  }

  // Dispose resources
  dispose(): void {
    this.clearSlots();
    this.gridLines.forEach(line => this.canvas.remove(line));
    this.gridLines = [];
  }
}