import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Level4Service } from '@/services/level4Service';
import { Level4RuntimeView } from './Level4RuntimeView';
import type { BOMItem } from '@/types/product';
import type { Level4SelectionEntry, Level4RuntimePayload, Level4Configuration } from '@/types/level4';
import { toast } from 'sonner';
import type { Level4Config } from './Level4ConfigTypes';

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
  const [adminConfig, setAdminConfig] = useState<Level4Config | null>(null);
  const [runtimeConfig, setRuntimeConfig] = useState<Level4Configuration | null>(null);
  const [entries, setEntries] = useState<Level4SelectionEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadConfiguration = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        console.log('Loading Level 4 config for product:', level3ProductId);
        
        // Load the Level 4 configuration
        const config = await Level4Service.getLevel4Configuration(level3ProductId);
        if (!config) {
          throw new Error('No Level 4 configuration found for this product. Please configure it in the admin panel first.');
        }

        if (!config.options || config.options.length === 0) {
          throw new Error('No options configured for this Level 4 configuration. Please add options in the admin panel.');
        }

        console.log('Loaded admin config:', config);
        setAdminConfig(config);
        
        // Convert to runtime format
        const runtime = Level4Service.convertToRuntimeConfiguration(config, level3ProductId);
        console.log('Converted to runtime config:', runtime);
        setRuntimeConfig(runtime);

        try {
          // Try to load existing configuration
          const existingValue = await Level4Service.getBOMLevel4Value(bomItem.id);
          
          if (existingValue?.entries?.length > 0) {
            // Pre-populate with existing selections
            const validSelections = existingValue.entries
              .filter(entry => config.options.some(opt => opt.id === entry.value));
              
            if (validSelections.length > 0) {
              setEntries(validSelections);
              return;
            }
          }
        } catch (loadError) {
          console.warn('Could not load existing Level 4 values, using defaults:', loadError);
        }

        // Initialize with defaults if no existing values found
        const initialEntries: Level4SelectionEntry[] = [];
        const defaultValue = config.options[0]?.id || '';
        const count = config.mode === 'fixed' ? config.fixed?.numberOfInputs || 1 : 1;
        
        for (let i = 0; i < count; i++) {
          initialEntries.push({
            index: i,
            value: defaultValue
          });
        }
        
        setEntries(initialEntries);
      } catch (err) {
        let description = "Failed to load configuration.";
        
        if (err && typeof err === 'object') {
          if ('code' in err && err.code === '42P01') {
            description = "The database schema is out of date. Please run the latest migrations.";
          } else if ('status' in err && err.status === 406) {
            description = "The API schema is out of date. Please refresh the Supabase API schema.";
          } else if ('message' in err) {
            description = err.message as string;
          }
        } else if (err instanceof Error) {
          description = err.message;
        }
        
        console.error('Error loading Level 4 configuration:', err);
        setError(description);
        toast.error(description);
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
    if (!adminConfig || !runtimeConfig) {
      toast.error("No Level 4 configuration found");
      return;
    }

    // Validate all entries have selections
    if (entries.some(entry => !entry.value)) {
      toast.error("Please complete all required fields");
      return;
    }

    try {
      setIsLoading(true);
      
      const payload: Level4RuntimePayload = {
        bomItemId: bomItem.id,
        configuration_id: adminConfig.id,
        template_type: runtimeConfig.template_type,
        entries: entries
      };

      // Save the configuration
      await Level4Service.saveBOMLevel4Value(bomItem.id, payload);
      
      // Notify parent component
      onSave(payload);
      
      toast.success('Level 4 configuration saved successfully');
    } catch (error) {
      console.error('Error saving Level 4 configuration:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save configuration';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
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

  if (error || !runtimeConfig) {
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
          {runtimeConfig ? (
            <Level4RuntimeView
              mode="interactive"
              configuration={runtimeConfig}
              initialEntries={entries}
              onEntriesChange={handleEntriesChange}
              allowInteractions={true}
            />
          ) : null}
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