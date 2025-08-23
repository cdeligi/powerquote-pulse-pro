import React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Level4Configuration } from '@/types/level4';
import { Level4RuntimeView } from './Level4RuntimeView';

interface Level4PreviewModalProps {
  configuration: Level4Configuration;
  onClose: () => void;
}

export const Level4PreviewModal: React.FC<Level4PreviewModalProps> = ({
  configuration,
  onClose
}) => {
  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>Preview: Level 4 Configuration</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          <Level4RuntimeView
            mode="preview"
            configuration={configuration}
            className="max-h-full"
          />
        </div>

        <DialogFooter className="shrink-0">
          <Button onClick={onClose}>
            Close Preview
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};