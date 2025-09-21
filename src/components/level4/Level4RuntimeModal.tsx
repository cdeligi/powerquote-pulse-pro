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

interface Level4SessionInfo {
  bomItemId: string;
  tempQuoteId?: string;
}

export const Level4RuntimeModal: React.FC<Level4RuntimeModalProps> = ({
  bomItem,
  level3ProductId,
  onSave,
  onCancel
}) => {
  const bomItemTempQuoteId = (bomItem as any)?.tempQuoteId as string | undefined;
  const [adminConfig, setAdminConfig] = useState<Level4Config | null>(null);
  const [runtimeConfig, setRuntimeConfig] = useState<Level4Configuration | null>(null);
  const [entries, setEntries] = useState<Level4SelectionEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<Level4SessionInfo>({
    bomItemId: bomItem.id,
    tempQuoteId: bomItemTempQuoteId
  });

  useEffect(() => {
    setSessionInfo({
      bomItemId: bomItem.id,
      tempQuoteId: bomItemTempQuoteId
    });
  }, [bomItem.id, bomItemTempQuoteId]);

  useEffect(() => {
    const loadConfiguration = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        console.log('Loading Level 4 config for product:', level3ProductId);

        let effectiveBomItemId = sessionInfo.bomItemId;

        if (!effectiveBomItemId) {
          throw new Error('No BOM item is available for this configuration session.');
        }

        // Register this session to prevent premature cleanup
        Level4Service.registerActiveSession(effectiveBomItemId);

        // Validate BOM item exists before loading configuration
        let validation = await Level4Service.validateBOMItemAccess(effectiveBomItemId);

        if (!validation.exists) {
          console.warn('BOM item not found when loading configuration. Attempting to recreate session...');

          if (!bomItem?.product?.id) {
            throw new Error('The configuration session is invalid. Please close and restart the Level 4 configuration.');
          }

          try {
            Level4Service.unregisterActiveSession(effectiveBomItemId);
            const { bomItemId: recreatedId, tempQuoteId } = await Level4Service.createBOMItemForLevel4Config(bomItem);

            effectiveBomItemId = recreatedId;
            validation = await Level4Service.validateBOMItemAccess(effectiveBomItemId);

            Level4Service.registerActiveSession(effectiveBomItemId);
            setSessionInfo({ bomItemId: recreatedId, tempQuoteId });
          } catch (recreateError) {
            console.error('Failed to recreate BOM item for Level 4 session:', recreateError);
            throw new Error('The configuration session is invalid. Please close and restart the Level 4 configuration.');
          }
        }

        if (!validation.exists) {
          throw new Error('The configuration session is invalid. Please close and restart the Level 4 configuration.');
        }
        
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
          const existingValue = await Level4Service.getBOMLevel4Value(effectiveBomItemId);
          
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
  }, [level3ProductId, sessionInfo.bomItemId]);

  const handleEntriesChange = (newEntries: Level4SelectionEntry[]) => {
    setEntries(newEntries);
  };

  const handleSave = async () => {
    if (!runtimeConfig) {
      console.error('No runtime configuration available for saving');
      return;
    }

    // Validate entries before saving
    const validationResult = Level4Service.validateEntries(entries, runtimeConfig);
    if (!validationResult.isValid) {
      console.error('Validation failed:', validationResult.errors);
      toast.error(`Configuration Invalid: ${validationResult.errors.join(', ')}`);
      return;
    }

    const payload: Level4RuntimePayload = {
      bomItemId: sessionInfo.bomItemId,
      level4_config_id: runtimeConfig.id,
      template_type: runtimeConfig.template_type,
      entries
    };

    setIsSaving(true);
    
    try {
      console.log('Saving Level 4 configuration with payload:', payload);
      
      if (!sessionInfo.bomItemId) {
        throw new Error('Your configuration session is no longer valid. Please close and restart the Level 4 configuration.');
      }

      // Re-validate BOM item access right before save
      const validation = await Level4Service.validateBOMItemAccess(sessionInfo.bomItemId);
      if (!validation.exists) {
        throw new Error('Your configuration session has expired. Please close and restart the Level 4 configuration.');
      }

      const saveResult = await Level4Service.saveBOMLevel4Value(sessionInfo.bomItemId, payload, {
        bomItemData: {
          ...bomItem,
          id: sessionInfo.bomItemId,
          tempQuoteId: sessionInfo.tempQuoteId
        }
      });

      const finalBomItemId = saveResult?.bomItemId ?? sessionInfo.bomItemId;
      const finalTempQuoteId = saveResult?.tempQuoteId ?? sessionInfo.tempQuoteId;

      if (finalBomItemId !== sessionInfo.bomItemId || finalTempQuoteId !== sessionInfo.tempQuoteId) {
        setSessionInfo(prev => ({
          bomItemId: finalBomItemId,
          tempQuoteId: finalTempQuoteId ?? prev.tempQuoteId
        }));
      }

      toast.success('Level 4 configuration has been saved successfully.');

      onSave({ ...payload, bomItemId: finalBomItemId });
    } catch (error: any) {
      console.error('Error saving Level 4 configuration:', error);
      
      // Enhanced error messaging with recovery suggestions
      let errorMessage = 'Failed to save Level 4 configuration.';
      let recoveryAction = 'Please try again.';
      
      if (error.message?.includes('session has expired') || error.message?.includes('expired')) {
        errorMessage = 'Your configuration session has expired.';
        recoveryAction = 'Please close this dialog and start over.';
      } else if (error.message?.includes('not found') || error.message?.includes('unavailable')) {
        errorMessage = 'Configuration data is no longer available.';
        recoveryAction = 'Please close and restart the configuration.';
      } else if (error.message?.includes('Access denied') || error.message?.includes('permission')) {
        errorMessage = 'You do not have permission to save this configuration.';
        recoveryAction = 'Please check your access rights.';
      } else if (error.code === '23503') {
        errorMessage = 'Database connection issue detected.';
        recoveryAction = 'Please close this dialog and try again in a moment.';
      }
      
      toast.error(`${errorMessage} ${recoveryAction}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = async () => {
    try {
      // Unregister the active session
      if (sessionInfo.bomItemId) {
        Level4Service.unregisterActiveSession(sessionInfo.bomItemId);
      }

      // Clean up temporary BOM item and quote if created (force cleanup on cancel)
      if (sessionInfo.bomItemId && sessionInfo.tempQuoteId) {
        console.log('Cleaning up temporary Level 4 data...');
        await Level4Service.deleteTempBOMItem(sessionInfo.bomItemId, true); // Force cleanup
      }
    } catch (error) {
      console.error('Error during Level 4 cleanup:', error);
      // Don't block cancellation
    }
    
    onCancel();
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleCancel();
      } else if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
        handleSave();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]); // Removed onCancel from dependencies since we now use handleCancel

  if (isLoading) {
    return (
      <Dialog open={true} onOpenChange={() => handleCancel()}>
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
      <Dialog open={true} onOpenChange={() => handleCancel()}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Configuration Error</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-destructive">{error || 'Configuration not found'}</p>
          </div>
          <DialogFooter>
            <Button onClick={handleCancel}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={true} onOpenChange={() => handleCancel()}>
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
          <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};