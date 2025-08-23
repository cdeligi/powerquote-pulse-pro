import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Level4Service } from '@/services/level4Service';
import { BOMItem } from '@/types/product';
import { 
  Level4Configuration, 
  Level4SelectionEntry, 
  Level4RuntimePayload 
} from '@/types/level4';
import { toast } from '@/components/ui/use-toast';
import { Level4RuntimeView, useLevel4Validation } from './Level4RuntimeView';

interface Level4RuntimeModalProps {
  bomItem: BOMItem;
  level3ProductId: string;
  onSave: (payload: Level4RuntimePayload) => void;
  onCancel: () => void;
}

export const Level4RuntimeModal: React.FC<Level4RuntimeModalProps> = ({ 
  bomItem, 
  level3ProductId, 
  onSave, 
  onCancel 
}) => {
  const [configuration, setConfiguration] = useState<Level4Configuration | null>(null);
  const [entries, setEntries] = useState<Level4SelectionEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { validateEntries } = useLevel4Validation();

  useEffect(() => {
    const loadConfiguration = async () => {
      setIsLoading(true);
      try {
        const config = await Level4Service.getLevel4Configuration(level3ProductId);
        if (!config) {
          throw new Error('No Level 4 configuration found for this product.');
        }

        if (config.options.length === 0) {
          throw new Error('No options configured for this Level 4 configuration.');
        }

        setConfiguration(config);

        // Check for existing Level 4 values
        const existingValue = await Level4Service.getBOMLevel4Value(bomItem.id);
        
        if (existingValue && existingValue.entries.length > 0) {
          // Pre-populate with existing selections
          setEntries(existingValue.entries);
        } else {
          // Initialize with defaults
          const initialEntries: Level4SelectionEntry[] = [];
          const defaultOption = config.options.find(opt => opt.is_default);
          
          if (config.template_type === 'OPTION_1') {
            initialEntries.push({
              index: 0,
              value: defaultOption?.value || ''
            });
          } else {
            const count = config.fixed_inputs || 1;
            for (let i = 0; i < count; i++) {
              initialEntries.push({
                index: i,
                value: defaultOption?.value || ''
              });
            }
          }
          setEntries(initialEntries);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load configuration.');
        console.error('Error loading Level 4 configuration:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadConfiguration();
  }, [level3ProductId, bomItem.id]);

  const handleEntriesChange = (newEntries: Level4SelectionEntry[]) => {
    setEntries(newEntries);
  };

  const handleSave = async () => {
    if (!configuration) return;

    // Validate all entries have selections
    if (!validateEntries(entries)) {
      toast({
        title: "Incomplete configuration",
        description: "Please make a selection for all inputs.",
        variant: "destructive"
      });
      return;
    }

    const payload: Level4RuntimePayload = {
      bomItemId: bomItem.id,
      configuration_id: configuration.id,
      template_type: configuration.template_type,
      entries: entries.map((entry, idx) => ({
        index: idx, // Re-index sequentially
        value: entry.value
      }))
    };

    try {
      // Save to database
      await Level4Service.saveBOMLevel4Value(bomItem.id, payload);
      
      toast({
        title: "Configuration saved",
        description: "Level 4 configuration has been saved successfully.",
      });
      
      onSave(payload);
    } catch (error) {
      console.error('Error saving Level 4 configuration:', error);
      toast({
        title: "Save failed",
        description: "Failed to save Level 4 configuration. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel();
      } else if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
        handleSave();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel, handleSave]);

  if (isLoading) {
    return (
      <Dialog open={true} onOpenChange={() => onCancel()}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Loading Configuration...</DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading configuration...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error || !configuration) {
    return (
      <Dialog open={true} onOpenChange={() => onCancel()}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Configuration Error</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-destructive">{error || 'Configuration not found'}</p>
          </div>
          <DialogFooter>
            <Button onClick={onCancel}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={true} onOpenChange={() => onCancel()}>
      <DialogContent className="max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>Configure: {bomItem.product.name}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          <Level4RuntimeView
            mode="interactive"
            configuration={configuration}
            initialEntries={entries}
            onEntriesChange={handleEntriesChange}
          />
        </div>

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};