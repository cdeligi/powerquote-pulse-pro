import React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface TypeSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (type: 'bushing' | 'analog') => void;
}

export const TypeSelectionDialog: React.FC<TypeSelectionDialogProps> = ({
  isOpen,
  onClose,
  onSelect,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Select Configuration Type</DialogTitle>
          <DialogDescription>
            Please select the type of configuration you want to create.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div 
            className="border rounded-lg p-4 cursor-pointer hover:bg-accent transition-colors"
            onClick={() => onSelect('bushing')}
          >
            <h4 className="font-semibold">Option 1</h4>
            <p className="text-sm text-muted-foreground">Configure Option 1 settings</p>
          </div>
          
          <div 
            className="border rounded-lg p-4 cursor-pointer hover:bg-accent transition-colors"
            onClick={() => onSelect('analog')}
          >
            <h4 className="font-semibold">Option 2</h4>
            <p className="text-sm text-muted-foreground">Configure Option 2 settings</p>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TypeSelectionDialog;
