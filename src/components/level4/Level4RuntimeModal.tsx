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
import Level4Configurator from './Level4Configurator';
import { Level4Config } from './Level4ConfigTypes';

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
  const [level4Config, setLevel4Config] = useState<Level4Config | null>(null);
  const [entries, setEntries] = useState<Level4SelectionEntry[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
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

        // Convert to Level4Config format for new UI
        const newFormatConfig: Level4Config = {
          id: config.id,
          fieldLabel: config.field_label,
          mode: config.template_type === 'OPTION_1' ? 'variable' : 'fixed',
          fixed: config.template_type === 'OPTION_2' ? { numberOfInputs: config.fixed_inputs || 1 } : undefined,
          variable: config.template_type === 'OPTION_1' ? { maxInputs: config.max_inputs || 3 } : undefined,
          options: config.options.map(opt => ({
            id: opt.value,
            name: opt.label,
            url: '' // Level4Option doesn't have info_url, each option URL is managed in new system
          }))
        };
        setLevel4Config(newFormatConfig);

        // Check for existing Level 4 values
        const existingValue = await Level4Service.getBOMLevel4Value(bomItem.id);
        
        if (existingValue && existingValue.entries.length > 0) {
          // Pre-populate with existing selections
          setEntries(existingValue.entries);
          setSelectedIds(existingValue.entries.map(e => e.value));
        } else {
          // Initialize with defaults
          const initialEntries: Level4SelectionEntry[] = [];
          const defaultOption = config.options.find(opt => opt.is_default);
          const defaultValue = defaultOption?.value || '';
          
          if (config.template_type === 'OPTION_1') {
            initialEntries.push({
              index: 0,
              value: defaultValue
            });
            setSelectedIds([defaultValue]);
          } else {
            const count = config.fixed_inputs || 1;
            const initialIds: string[] = [];
            for (let i = 0; i < count; i++) {
              initialEntries.push({
                index: i,
                value: defaultValue
              });
              initialIds.push(defaultValue);
            }
            setSelectedIds(initialIds);
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

  const handleSelectionChange = (ids: string[]) => {
    setSelectedIds(ids);
    // Convert to entries format
    const newEntries = ids.map((id, index) => ({
      index,
      value: id
    }));
    setEntries(newEntries);
  };

  const handleSave = async () => {
    try {
      if (!configuration) {
        toast({
          title: "Error",
          description: "No Level 4 configuration found",
          variant: "destructive"
        });
        return;
      }

      // Validate all entries have selections
      if (!validateEntries(entries)) {
        toast({
          title: "Incomplete configuration",
          description: "Please make a selection for all inputs.",
          variant: "destructive"
        });
        return;
      }

      // Create the payload
      const payload: Level4RuntimePayload = {
        bomItemId: bomItem.id!,
        configuration_id: configuration.id,
        template_type: configuration.template_type,
        entries: entries.map((entry, idx) => ({
          index: idx, // Re-index sequentially
          value: entry.value
        }))
      };

      // Save the configuration
      const savedValue = await Level4Service.saveBOMLevel4Value(bomItem.id!, payload);
      if (!savedValue) {
        throw new Error('Failed to save Level 4 configuration');
      }

      toast({
        title: "Success",
        description: "Level 4 configuration saved successfully",
      });

      // Pass the saved value to parent
      onSave(payload);
    } catch (error) {
      console.error('Error saving Level 4 configuration:', error);
      toast({
        title: "Error",
        description: "Failed to save Level 4 configuration",
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
          {level4Config ? (
            <Level4Configurator
              config={level4Config}
              initial={selectedIds}
              onChange={handleSelectionChange}
            />
          ) : (
            <Level4RuntimeView
              mode="interactive"
              configuration={configuration}
              initialEntries={entries}
              onEntriesChange={handleEntriesChange}
            />
          )}
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