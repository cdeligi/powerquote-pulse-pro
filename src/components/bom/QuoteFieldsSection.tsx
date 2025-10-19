import { useState, useEffect, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import {
  normalizeQuoteFieldConditionalRules,
  normalizeQuoteFieldOptions,
} from '@/utils/quoteFieldNormalization';
import {
  QuoteFieldConfiguration as QuoteFieldConfig,
  QuoteFieldConditionalField,
  QuoteFieldConditionalRule,
  QuoteFieldType,
} from '@/types/quote-field';
import { useQuoteValidation, QuoteField as ValidationQuoteField } from './QuoteFieldValidation';
import { cn } from '@/lib/utils';

interface QuoteFieldsSectionProps {
  quoteFields: Record<string, any>;
  onFieldChange: (fieldId: string, value: any) => void;
}

type QuoteField = QuoteFieldConfig;
type RenderableField = QuoteField | QuoteFieldConditionalField;

type ActiveModalState = { fieldId: string; ruleId: string } | null;

const normalizeTriggerValue = (value: string) => {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'yes') return 'true';
  if (normalized === 'no') return 'false';
  return normalized;
};

const normalizeValueList = (value: unknown): string[] => {
  if (value === null || value === undefined) {
    return [];
  }

  const list = Array.isArray(value) ? value : [value];
  return list
    .map((item) => {
      if (typeof item === 'boolean') {
        return item ? 'true' : 'false';
      }
      return normalizeTriggerValue(String(item));
    })
    .filter((item) => item.length > 0);
};

const getComparisonSignature = (value: unknown): string =>
  normalizeValueList(value).sort().join('|');

const getActiveConditionalRules = (
  field: QuoteField,
  value: unknown,
): QuoteFieldConditionalRule[] => {
  if (!field.conditional_logic || field.conditional_logic.length === 0) {
    return [];
  }

  const currentValues = normalizeValueList(value);
  if (!currentValues.length) {
    return [];
  }

  const valueSet = new Set(currentValues);
  return field.conditional_logic.filter((rule) => {
    const triggers = (rule.triggerValues || []).map(normalizeTriggerValue);
    return triggers.some((trigger) => valueSet.has(trigger));
  });
};

const hasMeaningfulValue = (value: unknown): boolean => {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.some((item) => hasMeaningfulValue(item));
  }

  return true;
};

const formatDisplayValue = (value: unknown): string => {
  if (!hasMeaningfulValue(value)) {
    return '—';
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (Array.isArray(value)) {
    return value.map((item) => formatDisplayValue(item)).join(', ');
  }

  return String(value);
};

const getFieldOptions = (field: RenderableField): string[] => {
  if (!field.options) {
    return [];
  }

  if (Array.isArray(field.options)) {
    return field.options as string[];
  }

  return normalizeQuoteFieldOptions(field.options);
};

interface RenderFieldInputArgs {
  field: RenderableField;
  value: any;
  onValueChange: (value: any) => void;
  isRequired: boolean;
}

const renderFieldInput = ({ field, value, onValueChange, isRequired }: RenderFieldInputArgs) => {
  const hasValue = hasMeaningfulValue(value);
  const baseInputClass = `bg-gray-700 border-gray-600 text-white ${isRequired && !hasValue ? 'border-red-500' : ''}`;

  switch (field.type) {
    case 'textarea':
      return (
        <Textarea
          className={baseInputClass}
          rows={3}
          value={typeof value === 'string' ? value : value ?? ''}
          onChange={(event) => onValueChange(event.target.value)}
          placeholder={`Enter ${field.label.toLowerCase()}...`}
        />
      );

    case 'select': {
      const options = getFieldOptions(field);
      const stringValue =
        typeof value === 'string' ? value : value !== undefined && value !== null ? String(value) : undefined;

      return (
        <Select value={stringValue} onValueChange={(newValue) => onValueChange(newValue)}>
          <SelectTrigger className={baseInputClass}>
            <SelectValue placeholder={`Select ${field.label.toLowerCase()}...`} />
          </SelectTrigger>
          <SelectContent className="bg-gray-700 border-gray-600">
            {options.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    case 'checkbox':
      return (
        <div className="flex items-center space-x-2">
          <Checkbox
            id={field.id}
            checked={value === true || value === 'true'}
            onCheckedChange={(checked) => onValueChange(Boolean(checked))}
            className="border-gray-600 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
          />
          <span className="text-sm text-gray-200">{value === true || value === 'true' ? 'Yes' : 'No'}</span>
        </div>
      );

    case 'number':
      return (
        <Input
          type="number"
          className={baseInputClass}
          value={value ?? ''}
          onChange={(event) => onValueChange(event.target.value)}
          placeholder={`Enter ${field.label.toLowerCase()}...`}
        />
      );

    case 'date':
      return (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-full justify-start text-left font-normal bg-gray-700 border-gray-600 text-white hover:bg-gray-600',
                !value && 'text-gray-400',
                isRequired && !hasValue && 'border-red-500',
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {value ? format(new Date(value), 'PPP') : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-gray-800 border-gray-600" align="start">
            <Calendar
              mode="single"
              selected={value ? new Date(value) : undefined}
              onSelect={(date) => onValueChange(date ? date.toISOString() : null)}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      );

    default:
      return (
        <Input
          className={baseInputClass}
          value={value ?? ''}
          onChange={(event) => onValueChange(event.target.value)}
          placeholder={`Enter ${field.label.toLowerCase()}...`}
        />
      );
  }
};

const QuoteFieldsSection = ({ quoteFields, onFieldChange }: QuoteFieldsSectionProps) => {
  const [configuredFields, setConfiguredFields] = useState<QuoteField[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<ActiveModalState>(null);

  const validationFields = useMemo<ValidationQuoteField[]>(() => {
    if (!configuredFields.length) {
      return [];
    }

    const baseFields: ValidationQuoteField[] = configuredFields.map((field) => ({
      id: field.id,
      label: field.label,
      type: field.type,
      required: field.required,
      enabled: field.enabled,
      options: getFieldOptions(field),
    }));

    const activeConditionalMap = new Map<string, ValidationQuoteField>();

    configuredFields.forEach((field) => {
      const activeRules = getActiveConditionalRules(field, quoteFields[field.id]);
      activeRules.forEach((rule) => {
        rule.fields.forEach((conditionalField) => {
          activeConditionalMap.set(conditionalField.id, {
            id: conditionalField.id,
            label: conditionalField.label,
            type: conditionalField.type,
            required: conditionalField.required,
            enabled: conditionalField.enabled ?? true,
            options: getFieldOptions(conditionalField),
          });
        });
      });
    });

    return [...baseFields, ...Array.from(activeConditionalMap.values())];
  }, [configuredFields, quoteFields]);

  const { validation } = useQuoteValidation(quoteFields, validationFields);

  const fetchQuoteFields = useCallback(async () => {
    console.log('Fetching quote field configurations...');
    try {
      const { data, error } = await supabase
        .from('quote_fields')
        .select('*')
        .eq('enabled', true)
        .order('display_order', { ascending: true });

      if (error) {
        console.error('Error fetching quote fields:', error);
        return;
      }

      const normalized = (data ?? []).map((field) => ({
        id: field.id,
        label: field.label,
        type: (field.type as QuoteFieldType) ?? 'text',
        required: Boolean(field.required),
        enabled: field.enabled ?? true,
        options: normalizeQuoteFieldOptions(field.options),
        include_in_pdf: Boolean(field.include_in_pdf),
        display_order: field.display_order ?? 0,
        conditional_logic: normalizeQuoteFieldConditionalRules(field.conditional_logic),
      })) as QuoteField[];

      console.log('Fetched quote fields:', normalized);
      setConfiguredFields(normalized);
    } catch (error) {
      console.error('Failed to fetch quote fields:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuoteFields();
  }, [fetchQuoteFields]);

  const handleFieldValueChange = (field: QuoteField, newValue: any) => {
    const previousValue = quoteFields[field.id];
    onFieldChange(field.id, newValue);

    if (!field.conditional_logic || field.conditional_logic.length === 0) {
      return;
    }

    const previousSignature = getComparisonSignature(previousValue);
    const nextSignature = getComparisonSignature(newValue);

    if (previousSignature !== nextSignature) {
      field.conditional_logic.forEach((rule) => {
        rule.fields.forEach((conditionalField) => {
          onFieldChange(conditionalField.id, null);
        });
      });
    }

    const activeRules = getActiveConditionalRules(field, newValue);
    const modalRule = activeRules.find((rule) => rule.displayMode === 'modal' && rule.fields.length > 0);

    if (modalRule) {
      if (!activeModal || activeModal.fieldId !== field.id || activeModal.ruleId !== modalRule.id) {
        setActiveModal({ fieldId: field.id, ruleId: modalRule.id });
      }
    } else if (activeModal?.fieldId === field.id) {
      setActiveModal(null);
    }
  };

  const renderConditionalFollowUp = (field: QuoteField) => {
    if (!field.conditional_logic || field.conditional_logic.length === 0) {
      return null;
    }

    const activeRules = getActiveConditionalRules(field, quoteFields[field.id]);
    if (!activeRules.length) {
      return null;
    }

    return (
      <div className="mt-3 space-y-3">
        {activeRules.map((rule) => {
          if (rule.displayMode === 'modal') {
            const hasAnyValues = rule.fields.some((conditionalField) =>
              hasMeaningfulValue(quoteFields[conditionalField.id]),
            );

            return (
              <div
                key={rule.id}
                className="rounded-md border border-red-600/40 bg-red-900/10 p-3 text-sm text-gray-200"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-red-200">Additional information required</p>
                    <p className="text-xs text-gray-300">
                      {rule.description || `Provide follow-up details for ${field.label}.`}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="bg-red-600 hover:bg-red-700"
                    onClick={() => setActiveModal({ fieldId: field.id, ruleId: rule.id })}
                  >
                    {hasAnyValues ? 'Review details' : 'Add details'}
                  </Button>
                </div>
                <div className="mt-3 space-y-1 text-xs text-gray-300">
                  {rule.fields.map((conditionalField) => (
                    <div key={conditionalField.id} className="flex items-center justify-between gap-3">
                      <span>{conditionalField.label}</span>
                      <span className="text-gray-100">{formatDisplayValue(quoteFields[conditionalField.id])}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          return (
            <div key={rule.id} className="space-y-3 border-l border-gray-700 pl-4 pt-2 text-sm">
              <p className="text-xs uppercase tracking-wide text-gray-400">
                Additional details required for &ldquo;{field.label}&rdquo;
              </p>
              {rule.fields.map((conditionalField) => (
                <div key={conditionalField.id} className="space-y-2">
                  <Label htmlFor={conditionalField.id} className="text-white flex items-center gap-2">
                    {conditionalField.label}
                    {conditionalField.include_in_pdf && (
                      <Badge variant="outline" className="text-xs bg-blue-900/30 text-blue-400 border-blue-600">
                        QUOTE
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs border-red-600 text-red-300 bg-red-900/20">
                      Conditional
                    </Badge>
                  </Label>
                  {renderFieldInput({
                    field: conditionalField,
                    value: quoteFields[conditionalField.id],
                    onValueChange: (newValue) => onFieldChange(conditionalField.id, newValue),
                    isRequired: conditionalField.required,
                  })}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    );
  };

  const renderField = (field: QuoteField) => {
    const value = quoteFields[field.id];

    return (
      <div key={field.id} className="space-y-2">
        <Label htmlFor={field.id} className="text-white flex items-center gap-2">
          {field.label}
          {field.include_in_pdf && (
            <Badge variant="outline" className="text-xs bg-blue-900/30 text-blue-400 border-blue-600">
              QUOTE
            </Badge>
          )}
          {field.conditional_logic && field.conditional_logic.length > 0 && (
            <Badge variant="outline" className="text-xs border-red-600 text-red-300 bg-red-900/20">
              Conditional
            </Badge>
          )}
        </Label>
        {renderFieldInput({
          field,
          value,
          onValueChange: (newValue) => handleFieldValueChange(field, newValue),
          isRequired: field.required,
        })}
        {renderConditionalFollowUp(field)}
      </div>
    );
  };

  const activeModalContext = useMemo(() => {
    if (!activeModal) {
      return null;
    }

    const parentField = configuredFields.find((field) => field.id === activeModal.fieldId);
    if (!parentField) {
      return null;
    }

    const rule = parentField.conditional_logic?.find((item) => item.id === activeModal.ruleId);
    if (!rule) {
      return null;
    }

    return { parentField, rule };
  }, [activeModal, configuredFields]);

  if (loading) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-6">
          <div className="text-white">Loading quote fields...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Quote Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {!validation.isValid && validation.missingFields.length > 0 && (
            <Alert className="border-yellow-500 bg-yellow-900/20">
              <AlertDescription className="text-yellow-400">
                <strong>Required fields:</strong> {validation.missingFields.join(', ')}
              </AlertDescription>
            </Alert>
          )}

          {configuredFields.length === 0 ? (
            <div className="text-gray-400 text-center py-4">
              No quote fields have been configured. Please contact your administrator to set up quote fields.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {configuredFields.map((field) => renderField(field))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(activeModalContext)} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {activeModalContext?.rule.title || `Additional details: ${activeModalContext?.parentField.label}`}
            </DialogTitle>
            {(activeModalContext?.rule.description || activeModalContext?.rule.triggerValues?.length) && (
              <DialogDescription className="text-gray-300">
                {activeModalContext?.rule.description || 'Provide the required follow-up information to continue.'}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-4">
            {activeModalContext?.rule.fields.map((conditionalField) => (
              <div key={conditionalField.id} className="space-y-2">
                <Label htmlFor={conditionalField.id} className="text-white flex items-center gap-2">
                  {conditionalField.label}
                  {conditionalField.required && (
                    <Badge variant="outline" className="text-xs border-red-600 text-red-300 bg-red-900/20">
                      Required
                    </Badge>
                  )}
                  {conditionalField.include_in_pdf && (
                    <Badge variant="outline" className="text-xs bg-blue-900/30 text-blue-400 border-blue-600">
                      QUOTE
                    </Badge>
                  )}
                </Label>
                {renderFieldInput({
                  field: conditionalField,
                  value: quoteFields[conditionalField.id],
                  onValueChange: (newValue) => onFieldChange(conditionalField.id, newValue),
                  isRequired: conditionalField.required,
                })}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="border-gray-600 bg-gray-800 text-gray-200 hover:text-white"
              onClick={() => setActiveModal(null)}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default QuoteFieldsSection;
