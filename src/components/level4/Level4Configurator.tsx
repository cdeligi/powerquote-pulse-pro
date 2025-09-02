import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ExternalLink, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Level4Config } from './Level4ConfigTypes';

interface Level4ConfiguratorProps {
  config: Level4Config;
  initial?: string[];
  onChange?: (ids: string[]) => void;
  readOnly?: boolean;
  className?: string;
}

export default function Level4Configurator({
  config,
  initial = [],
  onChange,
  readOnly = false,
  className
}: Level4ConfiguratorProps) {
  const [selections, setSelections] = useState<string[]>([]);

  // Initialize selections
  useEffect(() => {
    if (config.mode === 'fixed') {
      const fixedCount = config.fixed?.numberOfInputs || 1;
      const initSelections = [...initial];
      while (initSelections.length < fixedCount) {
        initSelections.push('');
      }
      setSelections(initSelections.slice(0, fixedCount));
    } else {
      setSelections(initial.length > 0 ? initial : ['']);
    }
  }, [config, initial]);

  // Notify parent of changes
  useEffect(() => {
    onChange?.(selections);
  }, [selections, onChange]);

  const updateSelection = (index: number, value: string) => {
    if (readOnly) return;
    
    const newSelections = [...selections];
    newSelections[index] = value;
    setSelections(newSelections);
  };

  const addInput = () => {
    if (readOnly || config.mode !== 'variable') return;
    
    const maxInputs = config.variable?.maxInputs || 3;
    if (selections.length < maxInputs) {
      setSelections([...selections, '']);
    }
  };

  const removeInput = (index: number) => {
    if (readOnly || config.mode !== 'variable' || selections.length <= 1) return;
    
    const newSelections = selections.filter((_, i) => i !== index);
    setSelections(newSelections);
  };

  const getSelectedOption = (selectionId: string) => {
    return config.options.find(opt => opt.id === selectionId);
  };

  const openDetailsUrl = (selectionId: string) => {
    const option = getSelectedOption(selectionId);
    if (option?.url) {
      window.open(option.url, '_blank', 'noopener,noreferrer');
    }
  };

  const renderHeader = () => {
    if (config.mode === 'fixed') {
      const count = config.fixed?.numberOfInputs || 1;
      return `Fixed number of ${count} input${count !== 1 ? 's' : ''}`;
    } else {
      const max = config.variable?.maxInputs || 3;
      return `Configure up to ${max} input${max !== 1 ? 's' : ''}`;
    }
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle>{config.fieldLabel}</CardTitle>
        <CardDescription>{renderHeader()}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {selections.map((selection, index) => (
          <div key={index} className="flex items-center gap-2">
            <div className="flex-1">
              <Select
                value={selection}
                onValueChange={(value) => updateSelection(index, value)}
                disabled={readOnly}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an option" />
                </SelectTrigger>
                <SelectContent>
                  {config.options.length === 0 ? (
                    <SelectItem value="" disabled>
                      No options available
                    </SelectItem>
                  ) : (
                    config.options.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* View Details Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => openDetailsUrl(selection)}
              disabled={!selection || !getSelectedOption(selection)?.url}
              className="shrink-0"
            >
              <ExternalLink className="h-4 w-4" />
              <span className="sr-only">View Details</span>
            </Button>

            {/* Remove Button (Variable mode only) */}
            {config.mode === 'variable' && !readOnly && selections.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => removeInput(index)}
                className="shrink-0"
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Remove</span>
              </Button>
            )}
          </div>
        ))}

        {/* Add Input Button (Variable mode only) */}
        {config.mode === 'variable' && !readOnly && (
          <div className="flex justify-center pt-2">
            <Button
              variant="outline"
              onClick={addInput}
              disabled={selections.length >= (config.variable?.maxInputs || 3)}
              className="w-full max-w-xs"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Input ({selections.length}/{config.variable?.maxInputs || 3})
            </Button>
          </div>
        )}

        {/* Hidden input for form submission */}
        <input
          type="hidden"
          name="level4_selection"
          value={JSON.stringify(selections.filter(Boolean))}
        />

        {/* Debug info (remove in production) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-2 bg-muted rounded text-xs">
            <strong>Debug:</strong> {JSON.stringify(selections.filter(Boolean))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}