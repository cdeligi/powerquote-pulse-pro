import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Plus, Minus } from 'lucide-react';
import { Level4Configuration } from '@/types/level4';

interface Level4PreviewModalProps {
  configuration: Level4Configuration;
  onClose: () => void;
}

export const Level4PreviewModal: React.FC<Level4PreviewModalProps> = ({
  configuration,
  onClose
}) => {
  const [mockEntries, setMockEntries] = useState<Array<{ index: number; value: string }>>(() => {
    const defaultOption = configuration.options.find(opt => opt.is_default);
    const defaultValue = defaultOption?.value || '';
    
    if (configuration.template_type === 'OPTION_1') {
      // Variable inputs: show 1 entry as preview
      return [{ index: 0, value: defaultValue }];
    } else {
      // Fixed inputs: show exact number
      const count = configuration.fixed_inputs || 1;
      return Array.from({ length: count }, (_, i) => ({
        index: i,
        value: defaultValue
      }));
    }
  });

  const handleEntryChange = (index: number, value: string) => {
    setMockEntries(prev => prev.map(entry => 
      entry.index === index 
        ? { ...entry, value }
        : entry
    ));
  };

  const addEntry = () => {
    if (configuration.template_type !== 'OPTION_1') return;
    
    const maxInputs = configuration.max_inputs || 1;
    if (mockEntries.length >= maxInputs) return;

    const newIndex = Math.max(...mockEntries.map(e => e.index), -1) + 1;
    const defaultOption = configuration.options.find(opt => opt.is_default);
    
    setMockEntries(prev => [...prev, {
      index: newIndex,
      value: defaultOption?.value || ''
    }]);
  };

  const removeEntry = (index: number) => {
    if (configuration.template_type !== 'OPTION_1') return;
    if (mockEntries.length <= 1) return;

    setMockEntries(prev => prev.filter(entry => entry.index !== index));
  };

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Preview: Level 4 Configuration</DialogTitle>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary">
              {configuration.template_type === 'OPTION_1' 
                ? `Variable inputs (max ${configuration.max_inputs})`
                : `Fixed inputs (${configuration.fixed_inputs})`
              }
            </Badge>
            {configuration.info_url && (
              <a 
                href={configuration.info_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Help
              </a>
            )}
          </div>
        </DialogHeader>

        <div className="py-4">
          <div className="text-sm text-muted-foreground mb-4">
            This is how users will see the Level 4 configuration popup:
          </div>

          <div className="border rounded-lg p-4 bg-muted/10">
            <div className="space-y-4">
              {mockEntries.map((entry, idx) => (
                <div key={`${entry.index}-${idx}`} className="flex items-center gap-2">
                  <div className="flex-1">
                    <Label htmlFor={`preview-entry-${idx}`} className="text-sm font-medium">
                      {configuration.field_label} {mockEntries.length > 1 ? `#${idx + 1}` : ''}
                    </Label>
                    <Select
                      value={entry.value}
                      onValueChange={(value) => handleEntryChange(entry.index, value)}
                    >
                      <SelectTrigger id={`preview-entry-${idx}`} className="mt-1">
                        <SelectValue placeholder="Select an option" />
                      </SelectTrigger>
                      <SelectContent>
                        {configuration.options
                          .sort((a, b) => a.display_order - b.display_order)
                          .map(option => (
                            <SelectItem key={option.id} value={option.value}>
                              {option.label}
                              {option.is_default && <span className="ml-2 text-xs text-muted-foreground">(default)</span>}
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
                        disabled={mockEntries.length >= (configuration.max_inputs || 1)}
                        className="h-8 w-8 p-0"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeEntry(entry.index)}
                        disabled={mockEntries.length <= 1}
                        className="h-8 w-8 p-0"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}

              {configuration.template_type === 'OPTION_1' && mockEntries.length < (configuration.max_inputs || 1) && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={addEntry}
                  className="w-full border-dashed border-2"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Input ({mockEntries.length}/{configuration.max_inputs})
                </Button>
              )}
            </div>
          </div>

          <div className="mt-4 text-xs text-muted-foreground">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <strong>Configuration Details:</strong>
                <ul className="mt-1 space-y-1">
                  <li>• Template: {configuration.template_type}</li>
                  <li>• Field: {configuration.field_label}</li>
                  <li>• Options: {configuration.options.length}</li>
                  {configuration.template_type === 'OPTION_1' && (
                    <li>• Max Inputs: {configuration.max_inputs}</li>
                  )}
                  {configuration.template_type === 'OPTION_2' && (
                    <li>• Fixed Inputs: {configuration.fixed_inputs}</li>
                  )}
                </ul>
              </div>
              <div>
                <strong>Available Options:</strong>
                <ul className="mt-1 space-y-1">
                  {configuration.options
                    .sort((a, b) => a.display_order - b.display_order)
                    .slice(0, 3)
                    .map(option => (
                      <li key={option.id} className="truncate">
                        • {option.label} {option.is_default && '(default)'}
                      </li>
                    ))}
                  {configuration.options.length > 3 && (
                    <li>• ... and {configuration.options.length - 3} more</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose}>
            Close Preview
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};