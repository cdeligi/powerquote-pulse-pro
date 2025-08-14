/**
 * Dialog for editing slot properties
 */

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SlotEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slotNumber: number;
  slotName?: string;
  onSave: (slotNumber: number, newSlotNumber: number, name?: string) => void;
  usedSlotNumbers: Set<number>;
  maxSlots: number;
}

export const SlotEditDialog: React.FC<SlotEditDialogProps> = ({
  open,
  onOpenChange,
  slotNumber,
  slotName,
  onSave,
  usedSlotNumbers,
  maxSlots
}) => {
  const [newSlotNumber, setNewSlotNumber] = useState(slotNumber);
  const [name, setName] = useState(slotName || '');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setNewSlotNumber(slotNumber);
      setName(slotName || '');
      setError('');
    }
  }, [open, slotNumber, slotName]);

  const handleSave = () => {
    setError('');

    // Validate slot number
    if (newSlotNumber < 0 || newSlotNumber >= maxSlots) {
      setError(`Slot number must be between 0 and ${maxSlots - 1}`);
      return;
    }

    // Check if slot number is already used (unless it's the same slot)
    if (newSlotNumber !== slotNumber && usedSlotNumbers.has(newSlotNumber)) {
      setError(`Slot ${newSlotNumber} is already in use`);
      return;
    }

    onSave(slotNumber, newSlotNumber, name.trim() || undefined);
    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle>Edit Slot {slotNumber}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="slot-number">Slot Number</Label>
            <Input
              id="slot-number"
              type="number"
              min={0}
              max={maxSlots - 1}
              value={newSlotNumber}
              onChange={(e) => {
                setNewSlotNumber(parseInt(e.target.value) || 0);
                setError('');
              }}
              className="w-full"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="slot-name">Slot Name (Optional)</Label>
            <Input
              id="slot-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter slot name"
              className="w-full"
            />
          </div>
          
          {error && (
            <div className="text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};