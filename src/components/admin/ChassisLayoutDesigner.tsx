/**
 * © 2025 Qualitrol Corp. All rights reserved.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Plus, Trash2, RotateCcw, Eye } from "lucide-react";
import { validateLayoutRows, generateDefaultLayout } from "@/types/product/chassis-types";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ChassisLayoutDesignerProps {
  totalSlots: number;
  initialLayout?: number[][] | null;
  onLayoutChange: (layout: number[][]) => void;
  onPreview?: () => void;
}

interface DragState {
  isDragging: boolean;
  draggedSlot: number | null;
  sourceRowIndex: number | null;
  sourceSlotIndex: number | null;
}

export const ChassisLayoutDesigner: React.FC<ChassisLayoutDesignerProps> = ({
  totalSlots,
  initialLayout,
  onLayoutChange,
  onPreview
}) => {
  const [layout, setLayout] = useState<number[][]>(() => {
    if (initialLayout && initialLayout.length > 0) {
      return [...initialLayout];
    }
    return generateDefaultLayout(totalSlots);
  });
  
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedSlot: null,
    sourceRowIndex: null,
    sourceSlotIndex: null
  });
  
  const [validationError, setValidationError] = useState<string | null>(null);
  const dragRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isValid = validateLayoutRows(layout, totalSlots);
    if (!isValid) {
      const allSlots = layout.flat();
      const missing = [];
      const duplicates = [];
      
      for (let i = 0; i < totalSlots; i++) {
        const count = allSlots.filter(slot => slot === i).length;
        if (count === 0) missing.push(i);
        if (count > 1) duplicates.push(i);
      }
      
      let error = '';
      if (missing.length > 0) error += `Missing slots: ${missing.join(', ')}. `;
      if (duplicates.length > 0) error += `Duplicate slots: ${duplicates.join(', ')}. `;
      
      setValidationError(error.trim());
    } else {
      setValidationError(null);
      onLayoutChange(layout);
    }
  }, [layout, totalSlots, onLayoutChange]);

  const handleDragStart = (slot: number, rowIndex: number, slotIndex: number) => {
    setDragState({
      isDragging: true,
      draggedSlot: slot,
      sourceRowIndex: rowIndex,
      sourceSlotIndex: slotIndex
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetRowIndex: number, targetSlotIndex?: number) => {
    if (!dragState.isDragging || dragState.sourceRowIndex === null || dragState.sourceSlotIndex === null) {
      return;
    }

    const newLayout = [...layout];
    const draggedSlot = dragState.draggedSlot!;
    
    // Remove from source
    newLayout[dragState.sourceRowIndex].splice(dragState.sourceSlotIndex, 1);
    
    // Add to target
    if (targetSlotIndex !== undefined) {
      newLayout[targetRowIndex].splice(targetSlotIndex, 0, draggedSlot);
    } else {
      newLayout[targetRowIndex].push(draggedSlot);
    }
    
    // Clean up empty rows
    const filteredLayout = newLayout.filter(row => row.length > 0);
    
    setLayout(filteredLayout);
    setDragState({
      isDragging: false,
      draggedSlot: null,
      sourceRowIndex: null,
      sourceSlotIndex: null
    });
  };

  const handleDropBetweenSlots = (rowIndex: number, slotIndex: number) => {
    handleDrop(rowIndex, slotIndex);
  };

  const addNewRow = () => {
    setLayout([...layout, []]);
  };

  const removeRow = (rowIndex: number) => {
    if (layout.length <= 1) return;
    
    const newLayout = [...layout];
    const removedSlots = newLayout[rowIndex];
    newLayout.splice(rowIndex, 1);
    
    // Add removed slots to the first row
    if (removedSlots.length > 0 && newLayout.length > 0) {
      newLayout[0] = [...newLayout[0], ...removedSlots];
    }
    
    setLayout(newLayout);
  };

  const resetToDefault = () => {
    setLayout(generateDefaultLayout(totalSlots));
  };

  const getSlotColor = (slot: number) => {
    if (dragState.draggedSlot === slot) return 'bg-accent/50 text-accent-foreground opacity-50';
    return 'bg-secondary text-secondary-foreground hover:bg-secondary/80';
  };

  const renderSlot = (slot: number, rowIndex: number, slotIndex: number) => (
    <div
      key={`${rowIndex}-${slotIndex}-${slot}`}
      className={`
        relative h-10 min-w-[40px] border border-border rounded flex items-center justify-center 
        text-sm font-medium cursor-move transition-all select-none
        ${getSlotColor(slot)}
        ${dragState.isDragging ? 'pointer-events-none' : ''}
      `}
      draggable
      onDragStart={() => handleDragStart(slot, rowIndex, slotIndex)}
      title={`Slot ${slot}`}
    >
      {slot}
    </div>
  );

  const renderDropZone = (rowIndex: number, slotIndex: number) => (
    <div
      key={`drop-${rowIndex}-${slotIndex}`}
      className={`
        w-2 h-10 border-2 border-dashed border-transparent rounded
        ${dragState.isDragging ? 'border-primary bg-primary/10' : ''}
      `}
      onDragOver={handleDragOver}
      onDrop={() => handleDropBetweenSlots(rowIndex, slotIndex)}
    />
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            Layout Designer
            <Badge variant="outline">{totalSlots} slots total</Badge>
          </CardTitle>
          <div className="flex gap-2">
            {onPreview && (
              <Button variant="outline" size="sm" onClick={onPreview}>
                <Eye className="h-4 w-4 mr-1" />
                Preview
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={resetToDefault}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {validationError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{validationError}</AlertDescription>
          </Alert>
        )}

        <div className="text-sm text-muted-foreground">
          Drag slots between rows to create your custom layout. All slots are equal and configurable.
        </div>

        <div ref={dragRef} className="space-y-3 p-4 border-2 border-dashed border-gray-300 rounded-lg">
          {layout.map((row, rowIndex) => (
            <div key={rowIndex} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  Row {rowIndex + 1} ({row.length} slots)
                </span>
                {layout.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeRow(rowIndex)}
                    className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
              
              <div
                className={`
                  flex items-center gap-1 p-2 border rounded min-h-[56px]
                  ${dragState.isDragging ? 'border-primary bg-primary/5' : 'border-border'}
                `}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(rowIndex)}
              >
                {dragState.isDragging && renderDropZone(rowIndex, 0)}
                
                {row.map((slot, slotIndex) => (
                  <React.Fragment key={`fragment-${rowIndex}-${slotIndex}`}>
                    {renderSlot(slot, rowIndex, slotIndex)}
                    {dragState.isDragging && renderDropZone(rowIndex, slotIndex + 1)}
                  </React.Fragment>
                ))}
                
                {row.length === 0 && (
                  <div className="text-muted-foreground text-sm italic p-2">
                    Drop slots here
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={addNewRow}>
            <Plus className="h-4 w-4 mr-1" />
            Add Row
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          <p><strong>Tips:</strong></p>
          <ul className="list-disc list-inside space-y-1 mt-1">
            <li>Drag slots between rows to rearrange the layout</li>
            <li>Add new rows for multi-row chassis designs</li>
            <li>All slots (0-{totalSlots - 1}) must be placed exactly once</li>
            <li>Slots can be freely rearranged to create custom layouts</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};