import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ExternalLink, Plus, Minus, Info } from 'lucide-react';
import { Level4Configuration, Level4SelectionEntry } from '@/types/level4';
import { normalizeUrl, isValidUrl } from '@/utils/urlUtils';
import { cn } from '@/lib/utils';

export interface Level4RuntimeViewProps {
  mode: 'preview' | 'interactive';
  configuration: Level4Configuration;
  initialEntries?: Level4SelectionEntry[];
  onEntriesChange?: (entries: Level4SelectionEntry[]) => void;
  className?: string;
  allowInteractions?: boolean; // New prop to control interaction ability in preview mode
}

export const Level4RuntimeView: React.FC<Level4RuntimeViewProps> = ({
  mode,
  configuration,
  initialEntries,
  onEntriesChange,
  className,
  allowInteractions = true // Default to true for backward compatibility
}) => {
  const [entries, setEntries] = useState<Level4SelectionEntry[]>(() => {
    if (initialEntries && initialEntries.length > 0) {
      return initialEntries;
    }

    // Initialize entries based on template type
    const defaultOption = configuration.options.find(opt => opt.is_default);
    const defaultValue = defaultOption?.value || '';
    
    if (configuration.template_type === 'OPTION_1') {
      return [{ index: 0, value: defaultValue }];
    } else {
      const count = configuration.fixed_inputs || 1;
      return Array.from({ length: count }, (_, i) => ({
        index: i,
        value: defaultValue
      }));
    }
  });

  const [validationErrors, setValidationErrors] = useState<Record<number, string>>({});

  useEffect(() => {
    onEntriesChange?.(entries);
  }, [entries, onEntriesChange]);

  const handleEntryChange = (index: number, value: string) => {
    if (!allowInteractions) return;
    
    setEntries(prev => prev.map(entry => 
      entry.index === index 
        ? { ...entry, value }
        : entry
    ));

    // Clear validation error for this field
    if (validationErrors[index]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[index];
        return newErrors;
      });
    }
  };

  const addEntry = () => {
    if (!allowInteractions || configuration.template_type !== 'OPTION_1') return;
    
    const maxInputs = configuration.max_inputs || 1;
    if (entries.length >= maxInputs) return;

    const newIndex = Math.max(...entries.map(e => e.index), -1) + 1;
    const defaultOption = configuration.options.find(opt => opt.is_default);
    
    setEntries(prev => [...prev, {
      index: newIndex,
      value: defaultOption?.value || ''
    }]);
  };

  const removeEntry = (index: number) => {
    if (!allowInteractions || configuration.template_type !== 'OPTION_1') return;
    if (entries.length <= 1) return;

    setEntries(prev => prev.filter(entry => entry.index !== index));
  };

  const validateEntries = (): boolean => {
    const errors: Record<number, string> = {};
    
    entries.forEach((entry, idx) => {
      if (!entry.value) {
        errors[entry.index] = 'This field is required';
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Expose validation function for parent components
  React.useImperativeHandle(React.useRef(null), () => ({
    validate: validateEntries
  }));

  const hasInfoUrl = configuration.info_url && isValidUrl(configuration.info_url);
  const isReadOnly = !allowInteractions;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with template info and help link */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="text-sm">
            {configuration.template_type === 'OPTION_1' 
              ? `Variable inputs (max ${configuration.max_inputs})`
              : `Fixed inputs (${configuration.fixed_inputs})`
            }
          </Badge>
          
          {hasInfoUrl && (
            <div className="flex items-center gap-2">
              <a 
                href={normalizeUrl(configuration.info_url!)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline underline-offset-2 transition-colors"
                aria-label="Open product information"
              >
                Product Info <ExternalLink className="size-4" />
              </a>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 rounded-full"
                asChild
              >
                <a 
                  href={normalizeUrl(configuration.info_url!)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Product information"
                >
                  <Info className="size-3" />
                </a>
              </Button>
            </div>
          )}
        </div>

        {configuration.info_url && !isValidUrl(configuration.info_url) && (
          <Alert variant="destructive">
            <AlertDescription>
              Invalid link configured. Please contact your administrator.
            </AlertDescription>
          </Alert>
        )}

        {isReadOnly && (
          <div className="text-sm text-muted-foreground">
            This is how users will see the Level 4 configuration:
          </div>
        )}
      </div>

      {/* Configuration inputs */}
      <div className={cn(
        "border rounded-lg p-4 space-y-4",
        isReadOnly && "bg-muted/10"
      )}>
        {entries.map((entry, idx) => {
          const selectedOption = configuration.options.find(opt => opt.value === entry.value);
          const optionHasInfo = selectedOption?.info_url && isValidUrl(selectedOption.info_url);
          return (
          <div key={`${entry.index}-${idx}`} className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor={`entry-${entry.index}`} className="text-sm font-medium">
                    {configuration.field_label} {entries.length > 1 ? `#${idx + 1}` : ''}
                  </Label>
                  {!isReadOnly && validationErrors[entry.index] && (
                    <span className="text-xs text-destructive">
                      {validationErrors[entry.index]}
                    </span>
                  )}
                </div>
                
                <Select
                  value={entry.value || undefined}
                  onValueChange={(value) => handleEntryChange(entry.index, value)}
                  disabled={isReadOnly}
                >
                  <SelectTrigger
                    id={`entry-${entry.index}`}
                    className={cn(
                      validationErrors[entry.index] && "border-destructive focus:ring-destructive"
                    )}
                  >
                    <SelectValue placeholder="Select an option" />
                  </SelectTrigger>
                  <SelectContent className="z-[100] bg-background border shadow-lg">
                    {configuration.options
                      .sort((a, b) => a.display_order - b.display_order)
                      .map(option => (
                        <SelectItem key={option.id} value={option.value}>
                          {option.label}
                          {option.is_default && isReadOnly && (
                            <span className="ml-2 text-xs text-muted-foreground">(default)</span>
                          )}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              {optionHasInfo && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  asChild
                >
                  <a
                    href={normalizeUrl(selectedOption!.info_url!)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Option information"
                  >
                    <Info className="h-4 w-4" />
                  </a>
                </Button>
              )}

              {/* Add/Remove buttons for variable inputs */}
              {allowInteractions && configuration.template_type === 'OPTION_1' && (
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
          </div>
        );})}

        {/* Add more button for variable inputs */}
        {allowInteractions && 
         configuration.template_type === 'OPTION_1' && 
         entries.length < (configuration.max_inputs || 1) && (
          <Button
            type="button"
            variant="ghost"
            onClick={addEntry}
            className="w-full border-dashed border-2"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Input ({entries.length}/{configuration.max_inputs})
          </Button>
        )}
      </div>

      {/* Configuration summary for preview mode */}
      {isReadOnly && (
        <div className="text-xs text-muted-foreground">
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
      )}
    </div>
  );
};

// Hook to validate Level 4 entries
export const useLevel4Validation = () => {
  const [errors, setErrors] = useState<Record<number, string>>({});

  const validateEntries = (entries: Level4SelectionEntry[]): boolean => {
    const newErrors: Record<number, string> = {};
    
    entries.forEach((entry) => {
      if (!entry.value) {
        newErrors[entry.index] = 'This field is required';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const clearErrors = () => setErrors({});

  return { errors, validateEntries, clearErrors };
};