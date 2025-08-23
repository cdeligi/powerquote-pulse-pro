import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Minus, ExternalLink } from 'lucide-react';
import { Level4Service } from '@/services/level4Service';
import { BOMItem } from '@/types/product';
import { 
  Level4Configuration, 
  Level4SelectionEntry, 
  Level4RuntimePayload 
} from '@/types/level4';
import { toast } from '@/components/ui/use-toast';

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

        // Initialize entries based on template type
        const initialEntries: Level4SelectionEntry[] = [];
        const defaultOption = config.options.find(opt => opt.is_default);
        
        if (config.template_type === 'OPTION_1') {
          // Variable inputs: start with 1 entry
          initialEntries.push({
            index: 0,
            value: defaultOption?.value || ''
          });
        } else {
          // Fixed inputs: create exactly fixed_inputs entries
          const count = config.fixed_inputs || 1;
          for (let i = 0; i < count; i++) {
            initialEntries.push({
              index: i,
              value: defaultOption?.value || ''
            });
          }
        }

        setEntries(initialEntries);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load configuration.');
        console.error('Error loading Level 4 configuration:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadConfiguration();
  }, [level3ProductId]);

  const handleEntryChange = (index: number, value: string) => {
    setEntries(prev => prev.map(entry => 
      entry.index === index 
        ? { ...entry, value }
        : entry
    ));
  };

  const addEntry = () => {
    if (!configuration || configuration.template_type !== 'OPTION_1') return;
    
    const maxInputs = configuration.max_inputs || 1;
    if (entries.length >= maxInputs) {
      toast({
        title: "Maximum inputs reached",
        description: `You can only add up to ${maxInputs} inputs.`,
        variant: "destructive"
      });
      return;
    }

    const newIndex = Math.max(...entries.map(e => e.index), -1) + 1;
    const defaultOption = configuration.options.find(opt => opt.is_default);
    
    setEntries(prev => [...prev, {
      index: newIndex,
      value: defaultOption?.value || ''
    }]);
  };

  const removeEntry = (index: number) => {
    if (!configuration || configuration.template_type !== 'OPTION_1') return;
    
    if (entries.length <= 1) {
      toast({
        title: "Minimum inputs required",
        description: "At least one input is required.",
        variant: "destructive"
      });
      return;
    }

    setEntries(prev => prev.filter(entry => entry.index !== index));
  };

  const handleSave = () => {
    if (!configuration) return;

    // Validate all entries have selections
    const emptyEntries = entries.filter(entry => !entry.value);
    if (emptyEntries.length > 0) {
      toast({
        title: "Incomplete configuration",
        description: "Please make a selection for all inputs.",
        variant: "destructive"
      });
      return;
    }

    const payload: Level4RuntimePayload = {
      configuration_id: configuration.id,
      template_type: configuration.template_type,
      entries: entries.map((entry, idx) => ({
        index: idx, // Re-index sequentially
        value: entry.value
      }))
    };

    onSave(payload);
  };

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
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Configure: {bomItem.product.name}</DialogTitle>
          {configuration.info_url && (
            <div className="mt-2">
              <a 
                href={configuration.info_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Help & Information
              </a>
            </div>
          )}
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="text-sm text-muted-foreground">
            Template: {configuration.template_type === 'OPTION_1' 
              ? `Variable inputs (max ${configuration.max_inputs})`
              : `Fixed inputs (${configuration.fixed_inputs})`
            }
          </div>

          {entries.map((entry, idx) => (
            <div key={`${entry.index}-${idx}`} className="flex items-center gap-2">
              <div className="flex-1">
                <Label htmlFor={`entry-${idx}`} className="text-sm font-medium">
                  {configuration.field_label} {entries.length > 1 ? `#${idx + 1}` : ''}
                </Label>
                <Select
                  value={entry.value}
                  onValueChange={(value) => handleEntryChange(entry.index, value)}
                >
                  <SelectTrigger id={`entry-${idx}`} className="mt-1">
                    <SelectValue placeholder="Select an option" />
                  </SelectTrigger>
                  <SelectContent>
                    {configuration.options
                      .sort((a, b) => a.display_order - b.display_order)
                      .map(option => (
                        <SelectItem key={option.id} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {configuration.template_type === 'OPTION_1' && (
                <div className="flex flex-col gap-1 mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addEntry}
                    disabled={entries.length >= (configuration.max_inputs || 1)}
                    className="h-8 w-8 p-0"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeEntry(entry.index)}
                    disabled={entries.length <= 1}
                    className="h-8 w-8 p-0"
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          ))}

          {configuration.template_type === 'OPTION_1' && entries.length < (configuration.max_inputs || 1) && (
            <Button
              type="button"
              variant="ghost"
              onClick={addEntry}
              className="w-full border-dashed border-2"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Input ({entries.length}/{configuration.max_inputs})
            </Button>
          )}
        </div>

        <DialogFooter>
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