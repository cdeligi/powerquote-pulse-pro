/**
 * © 2025 Qualitrol Corp. All rights reserved.
 */

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import RackVisualizer from "@/components/bom/RackVisualizer";
import { ChassisType } from "@/types/product/chassis-types";

interface ChassisPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chassisType: {
    code: string;
    name: string;
    totalSlots: number;
    layoutRows?: number[][] | null;
    visualLayout?: any;
  } | null;
}

export const ChassisPreviewModal: React.FC<ChassisPreviewModalProps> = ({
  open,
  onOpenChange,
  chassisType
}) => {
  if (!chassisType) {
    return null;
  }

  // Create a mock chassis for the visualizer
  const mockChassis = {
    id: 'preview',
    name: chassisType.name,
    type: chassisType.code,
    chassisType: chassisType.code,
    specifications: {
      slots: chassisType.totalSlots,
      height: '6U'
    },
    slots: chassisType.totalSlots,
    height: '6U',
    description: 'Preview chassis',
    price: 0,
    enabled: true,
    parentProductId: 'preview'
  };

  // Create mock chassis type for custom layout
  const mockChassisTypeData: ChassisType = {
    id: 'preview',
    code: chassisType.code,
    name: chassisType.name,
    totalSlots: chassisType.totalSlots,
    layoutRows: chassisType.layoutRows,
    visualLayout: chassisType.visualLayout,
    enabled: true,
    metadata: (chassisType as any).metadata || {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chassis Layout Preview - {chassisType.name}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            This is how your chassis layout will appear in the BOM builder and other parts of the application.
          </div>
          
          <RackVisualizer
            chassis={mockChassis}
            slotAssignments={{}}
            onSlotClick={() => {}}
            onSlotClear={() => {}}
            selectedSlot={null}
            chassisType={mockChassisTypeData}
          />
          
          <div className="flex justify-end">
            <Button onClick={() => onOpenChange(false)}>
              Close Preview
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};