/**
 * Fixed Canvas Renderer with proper Fabric.js v6 integration and full visual customization
 */

import { Canvas as FabricCanvas, Rect, FabricText, Line, Group, FabricImage } from 'fabric';
import { VisualSlotLayout } from "@/types/product/chassis-types";
import { getCanvasHTMLElement } from './canvasDom';

const GRID_SIZE = 20;

export class FixedCanvasRenderer {
  private canvas: FabricCanvas;
  private slotGroups: Map<number, Group> = new Map();
  private gridLines: Line[] = [];
  private isGridVisible: boolean = false;
  private debugMode: boolean = false;

  constructor(canvas: FabricCanvas, debugMode: boolean = false) {
    this.canvas = canvas;
    this.debugMode = debugMode;
    this.log('FixedCanvasRenderer initialized');
  }

  private log(...args: any[]) {
    if (this.debugMode) {
      console.log('[CanvasRenderer]', ...args);
    }
  }

  // Create slot group with enhanced styling and immediate visual feedback
  private async createSlotGroup(slot: VisualSlotLayout): Promise<Group> {
    try {
      this.log('Creating slot group for slot:', slot.slotNumber, 'at:', slot.x, slot.y, 'size:', slot.width, 'x', slot.height);

      // Create rectangle with visible styling
      const rect = new Rect({
        left: 0,
        top: 0,
        width: slot.width,
        height: slot.height,
        fill: '#ffffff',  // Use solid white background for visibility
        stroke: '#2563eb', // Use solid blue border for visibility
        strokeWidth: 2,
        rx: 8,
        ry: 8,
        selectable: false,
        evented: false
      });

      // Create text with high contrast
      const displayText = (slot as any).name || `Slot ${slot.slotNumber}`;
      const text = new FabricText(displayText, {
        left: slot.width / 2,
        top: slot.height / 2,
        fontSize: Math.max(12, Math.min(16, slot.width / 6)),
        fontFamily: 'Arial, sans-serif',
        fontWeight: 'bold',
        fill: '#1f2937', // Dark gray for contrast
        textAlign: 'center',
        originX: 'center',
        originY: 'center',
        selectable: false,
        evented: false
      });

      // Start with base objects
      const objects: any[] = [rect, text];

      // Add image if provided (simplified for now)
      if (slot.imageUrl) {
        try {
          const img = await this.loadSlotImage(slot);
          if (img) {
            objects.splice(1, 0, img); // Insert before text
            // Adjust text position when image is present
            text.set({
              top: slot.height * 0.8,
              fontSize: Math.max(10, Math.min(14, slot.width / 8))
            });
          }
        } catch (error) {
          this.log('Failed to load image for slot', slot.slotNumber, error);
          // Continue without image
        }
      }

      // Create group with visible properties
      const group = new Group(objects, {
        left: slot.x,
        top: slot.y,
        selectable: true,
        hasControls: true,
        hasBorders: true,
        lockRotation: true,
        borderColor: '#ef4444', // Red border when selected
        borderScaleFactor: 3,
        cornerColor: '#ef4444',
        cornerSize: 10,
        transparentCorners: false,
        cornerStyle: 'circle'
      });

      // Configure controls
      group.setControlsVisibility({
        mtr: false, // No rotation
        ml: true,   // Middle left
        mr: true,   // Middle right
        mt: true,   // Middle top
        mb: true,   // Middle bottom
        tl: true,   // Top left
        tr: true,   // Top right
        bl: true,   // Bottom left
        br: true    // Bottom right
      });

      // Store custom properties
      group.set('slotNumber', slot.slotNumber);
      group.set('type', 'slot');
      group.set('slotData', slot);

      this.log('Successfully created slot group:', {
        slotNumber: group.get('slotNumber'),
        position: { x: group.left, y: group.top },
        size: { width: group.width, height: group.height },
        objectCount: objects.length
      });
      
      return group;
    } catch (error) {
      console.error('Error creating slot group for slot', slot.slotNumber, ':', error);
      throw error;
    }
  }

  // Load slot image with proper scaling and positioning
  private async loadSlotImage(slot: VisualSlotLayout): Promise<FabricImage | null> {
    if (!slot.imageUrl) return null;

    return new Promise((resolve, reject) => {
      FabricImage.fromURL(slot.imageUrl!, {
        crossOrigin: 'anonymous'
      }).then((img) => {
        const maxW = slot.width - 20;
        const maxH = slot.height - 40; // Leave space for text
        
        const scale = Math.min(
          maxW / (img.width || maxW),
          maxH / (img.height || maxH),
          1 // Don't scale up
        );
        
        img.set({
          left: slot.width / 2,
          top: slot.height / 3, // Position in upper part
          originX: 'center',
          originY: 'center',
          selectable: false,
          evented: false,
          scaleX: scale,
          scaleY: scale,
          opacity: 0.8
        });
        
        resolve(img);
      }).catch(reject);
    });
  }

  // Render slots with comprehensive error handling and immediate visual feedback
  async renderSlots(slots: VisualSlotLayout[]): Promise<void> {
    try {
      this.log('=== Starting slot rendering ===');
      this.log('Input slots:', slots.length, slots);
      this.log('Current slot groups:', this.slotGroups.size);
      
      if (!this.canvas) {
        throw new Error('Canvas not initialized');
      }

      // Clear all existing slots first for a clean render
      this.clearSlots();
      this.log('Cleared existing slots');

      // Add each slot with proper error handling
      for (const slot of slots) {
        try {
          this.log('Creating slot:', slot.slotNumber, 'at position:', slot.x, slot.y);
          
          const group = await this.createSlotGroup(slot);
          this.slotGroups.set(slot.slotNumber, group);
          this.canvas.add(group);
          
          this.log('Successfully added slot:', slot.slotNumber);
        } catch (slotError) {
          console.error('Error creating slot', slot.slotNumber, ':', slotError);
          // Continue with other slots even if one fails
        }
      }

      // Maintain grid layer order
      if (this.isGridVisible) {
        this.sendGridToBack();
      }

      // Force immediate render
      this.canvas.requestRenderAll();
      
      this.log('=== Slot rendering complete ===');
      this.log('Final slot groups count:', this.slotGroups.size);
      this.log('Canvas objects count:', this.canvas.getObjects().length);
      
      // Verify rendering success
      const canvasObjects = this.canvas.getObjects();
      const slotObjects = canvasObjects.filter(obj => obj.get('type') === 'slot');
      this.log('Slot objects on canvas:', slotObjects.length);
      
      if (slotObjects.length !== slots.length) {
        console.warn('Mismatch: Expected', slots.length, 'slots, but found', slotObjects.length, 'on canvas');
      }
      
    } catch (error) {
      console.error('Critical error in renderSlots:', error);
      throw error;
    }
  }

  // Update existing slot group properties
  private async updateSlotGroup(group: Group, slot: VisualSlotLayout): Promise<void> {
    const hasPositionChanged = group.left !== slot.x || group.top !== slot.y;
    const hasSizeChanged = group.width !== slot.width || group.height !== slot.height;
    const currentData = group.get('slotData') as VisualSlotLayout;
    const hasContentChanged = 
      (slot as any).name !== (currentData as any)?.name ||
      slot.imageUrl !== currentData?.imageUrl;

    if (hasPositionChanged || hasSizeChanged || hasContentChanged) {
      this.log('Updating slot:', slot.slotNumber);
      
      // Update position
      if (hasPositionChanged) {
        group.set({ left: slot.x, top: slot.y });
      }

      // Update size and content if needed
      if (hasSizeChanged || hasContentChanged) {
        // Get current objects
        const objects = group.getObjects();
        const rect = objects[0] as Rect;
        
        // Update rectangle
        rect.set({
          width: slot.width,
          height: slot.height
        });

        // Find and update text
        const textObj = objects.find(obj => obj instanceof FabricText) as FabricText;
        if (textObj) {
          const displayText = (slot as any).name || `Slot ${slot.slotNumber}`;
          textObj.set({
            text: displayText,
            left: slot.width / 2,
            top: slot.imageUrl ? slot.height * 0.75 : slot.height / 2,
            fontSize: Math.max(10, Math.min(14, slot.width / 8))
          });
        }

        // Handle image updates
        if (hasContentChanged && slot.imageUrl !== currentData?.imageUrl) {
          // Remove old image if exists
          const oldImage = objects.find(obj => obj instanceof FabricImage);
          if (oldImage) {
            group.remove(oldImage);
          }

          // Add new image if URL provided
          if (slot.imageUrl) {
            try {
              const newImage = await this.loadSlotImage(slot);
              if (newImage) {
                group.add(newImage); // Add the image
              }
            } catch (error) {
              this.log('Error updating slot image:', error);
            }
          }
        }
      }

      // Update stored data
      group.set('slotData', slot);
      group.setCoords();
    }
  }

  // Enhanced grid drawing with customizable appearance
  drawGrid(visible: boolean, gridColor?: string, gridOpacity?: number): void {
    this.isGridVisible = visible;
    
    // Remove existing grid lines
    this.gridLines.forEach(line => this.canvas.remove(line));
    this.gridLines = [];

    if (!visible) {
      this.canvas.requestRenderAll();
      return;
    }

    this.log('Drawing enhanced grid');

    const color = gridColor || 'hsl(var(--border))';
    const opacity = gridOpacity || 0.3;

    // Vertical lines
    for (let x = 0; x <= this.canvas.width!; x += GRID_SIZE) {
      const line = new Line([x, 0, x, this.canvas.height!], {
        stroke: color,
        strokeWidth: x % (GRID_SIZE * 4) === 0 ? 1 : 0.5, // Thicker lines every 4 grid units
        selectable: false,
        evented: false,
        excludeFromExport: true,
        opacity
      });
      this.gridLines.push(line);
      this.canvas.add(line);
    }

    // Horizontal lines
    for (let y = 0; y <= this.canvas.height!; y += GRID_SIZE) {
      const line = new Line([0, y, this.canvas.width!, y], {
        stroke: color,
        strokeWidth: y % (GRID_SIZE * 4) === 0 ? 1 : 0.5, // Thicker lines every 4 grid units
        selectable: false,
        evented: false,
        excludeFromExport: true,
        opacity
      });
      this.gridLines.push(line);
      this.canvas.add(line);
    }

    this.sendGridToBack();
    this.canvas.requestRenderAll();
  }

  // Enhanced grid snapping with magnetic effect
  snapToGrid(value: number, magneticRange: number = 5): number {
    const snapped = Math.round(value / GRID_SIZE) * GRID_SIZE;
    const distance = Math.abs(value - snapped);
    
    // Only snap if within magnetic range
    return distance <= magneticRange ? snapped : value;
  }

  // Send grid lines to back
  private sendGridToBack(): void {
    this.gridLines.forEach(line => this.canvas.sendObjectToBack(line));
  }

  // Get slot group by slot number
  getSlotGroup(slotNumber: number): Group | undefined {
    return this.slotGroups.get(slotNumber);
  }

  // Get all slot groups
  getAllSlotGroups(): Map<number, Group> {
    return new Map(this.slotGroups);
  }

  // Update slot properties (for edit dialog)
  async updateSlotProperties(slotNumber: number, properties: Partial<VisualSlotLayout>): Promise<boolean> {
    const group = this.slotGroups.get(slotNumber);
    if (!group) return false;

    const currentData = group.get('slotData') as VisualSlotLayout;
    const updatedSlot = { ...currentData, ...properties };
    
    await this.updateSlotGroup(group, updatedSlot);
    
    // Update mapping if slot number changed
    if (properties.slotNumber !== undefined && properties.slotNumber !== slotNumber) {
      this.slotGroups.delete(slotNumber);
      this.slotGroups.set(properties.slotNumber, group);
      group.set('slotNumber', properties.slotNumber);
    }

    this.canvas.requestRenderAll();
    return true;
  }

  // Delete specific slot
  deleteSlot(slotNumber: number): boolean {
    const group = this.slotGroups.get(slotNumber);
    if (group) {
      this.log('Deleting slot:', slotNumber);
      this.canvas.remove(group);
      this.slotGroups.delete(slotNumber);
      this.canvas.requestRenderAll();
      return true;
    }
    return false;
  }

  // Clear all slots
  clearSlots(): void {
    this.log('Clearing all slots');
    this.slotGroups.forEach(group => this.canvas.remove(group));
    this.slotGroups.clear();
    this.canvas.requestRenderAll();
  }

  // Enhanced canvas focus with improved accessibility and interaction
  focusCanvas(): void {
    const canvasElement = getCanvasHTMLElement(this.canvas);
    if (canvasElement) {
      // Ensure element is focusable
      if (!canvasElement.hasAttribute('tabindex')) {
        canvasElement.tabIndex = 0;
      }
      
      // Focus with proper error handling
      try {
        canvasElement.focus({ preventScroll: true });
        this.log('Canvas focused successfully');
        
        // Trigger a small visual feedback to confirm focus
        canvasElement.style.outline = '2px solid hsl(var(--primary))';
        setTimeout(() => {
          canvasElement.style.outline = 'none';
        }, 200);
        
      } catch (error) {
        this.log('Error focusing canvas:', error);
      }
    } else {
      this.log('Canvas element not found for focusing');
    }
  }

  // Set canvas background
  setCanvasBackground(color: string): void {
    this.canvas.backgroundColor = color;
    this.canvas.requestRenderAll();
  }

  // Export canvas as image
  exportAsImage(format: 'png' | 'jpeg' = 'png', quality: number = 1): string {
    // Temporarily hide grid for export
    const wasGridVisible = this.isGridVisible;
    if (wasGridVisible) {
      this.drawGrid(false);
    }

    const dataURL = this.canvas.toDataURL({
      format,
      quality,
      multiplier: 2 // Higher resolution
    });

    // Restore grid if it was visible
    if (wasGridVisible) {
      this.drawGrid(true);
    }

    return dataURL;
  }

  // Dispose resources
  dispose(): void {
    this.log('Disposing renderer');
    this.clearSlots();
    this.gridLines.forEach(line => this.canvas.remove(line));
    this.gridLines = [];
  }
}