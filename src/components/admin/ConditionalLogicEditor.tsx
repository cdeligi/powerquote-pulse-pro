import { QuoteFieldConditionalField, QuoteFieldConditionalRule, QuoteFieldType } from '@/types/quote-field';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Layers, Plus, Trash2 } from 'lucide-react';

const generateId = () => {
  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return `rule-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

interface ConditionalLogicEditorProps {
  rules: QuoteFieldConditionalRule[];
  onChange: (rules: QuoteFieldConditionalRule[]) => void;
  parentFieldLabel: string;
}

const fieldTypeOptions: { value: QuoteFieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'number', label: 'Number' },
  { value: 'select', label: 'Select' },
  { value: 'date', label: 'Date' },
  { value: 'email', label: 'Email' },
  { value: 'tel', label: 'Phone' },
  { value: 'checkbox', label: 'Checkbox' },
];

const ConditionalLogicEditor = ({ rules, onChange, parentFieldLabel }: ConditionalLogicEditorProps) => {
  const handleRuleChange = (index: number, updatedRule: QuoteFieldConditionalRule) => {
    const nextRules = [...rules];
    nextRules[index] = updatedRule;
    onChange(nextRules);
  };

  const handleAddRule = () => {
    onChange([
      ...rules,
      {
        id: generateId(),
        triggerValues: [],
        displayMode: 'inline',
        title: `${parentFieldLabel} follow-up`,
        description: '',
        fields: [],
      },
    ]);
  };

  const handleRemoveRule = (index: number) => {
    const nextRules = [...rules];
    nextRules.splice(index, 1);
    onChange(nextRules);
  };

  const handleTriggerValuesChange = (index: number, value: string) => {
    const triggerValues = value
      .split('\n')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    handleRuleChange(index, { ...rules[index], triggerValues });
  };

  const handleFieldChange = (
    ruleIndex: number,
    fieldIndex: number,
    updatedField: QuoteFieldConditionalField,
  ) => {
    const targetRule = rules[ruleIndex];
    const nextFields = [...targetRule.fields];
    nextFields[fieldIndex] = updatedField;
    handleRuleChange(ruleIndex, { ...targetRule, fields: nextFields });
  };

  const handleAddField = (ruleIndex: number) => {
    const targetRule = rules[ruleIndex];
    const newField: QuoteFieldConditionalField = {
      id: `conditional-${generateId()}`,
      label: 'Follow-up Question',
      type: 'text',
      required: false,
      include_in_pdf: false,
      options: [],
      enabled: true,
    };

    handleRuleChange(ruleIndex, { ...targetRule, fields: [...targetRule.fields, newField] });
  };

  const handleRemoveField = (ruleIndex: number, fieldIndex: number) => {
    const targetRule = rules[ruleIndex];
    const nextFields = [...targetRule.fields];
    nextFields.splice(fieldIndex, 1);
    handleRuleChange(ruleIndex, { ...targetRule, fields: nextFields });
  };

  if (!rules.length) {
    return (
      <div className="border border-dashed border-gray-700 rounded-md p-4 text-sm text-gray-400 bg-gray-900/40">
        <p>
          No conditional follow-up questions configured. Use the button below to prompt for additional
          information when specific answers are provided.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3 border-gray-700 text-gray-200 hover:text-white"
          onClick={handleAddRule}
        >
          <Plus className="h-4 w-4 mr-2" /> Add Conditional Question
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {rules.map((rule, ruleIndex) => (
        <Card key={rule.id} className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-white text-sm">
              <span className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-red-400" />
                Conditional Rule {ruleIndex + 1}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-red-400 hover:text-red-300"
                onClick={() => handleRemoveRule(ruleIndex)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-white text-sm">Trigger Values (one per line)</Label>
                <Textarea
                  value={rule.triggerValues.join('\n')}
                  onChange={(event) => handleTriggerValuesChange(ruleIndex, event.target.value)}
                  className="bg-gray-800 border-gray-700 text-white"
                  placeholder={'Yes\nAP\nNEO'}
                  rows={4}
                />
              </div>
              <div className="space-y-3">
                <div>
                  <Label className="text-white text-sm">Display Mode</Label>
                  <Select
                    value={rule.displayMode}
                    onValueChange={(value) =>
                      handleRuleChange(ruleIndex, {
                        ...rule,
                        displayMode: value as QuoteFieldConditionalRule['displayMode'],
                      })
                    }
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="inline" className="text-white">
                        Inline
                      </SelectItem>
                      <SelectItem value="modal" className="text-white">
                        Modal
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-white text-sm">Modal Title (optional)</Label>
                  <Input
                    value={rule.title ?? ''}
                    onChange={(event) => handleRuleChange(ruleIndex, { ...rule, title: event.target.value })}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="Additional Information"
                  />
                </div>
                <div>
                  <Label className="text-white text-sm">Modal Description (optional)</Label>
                  <Textarea
                    value={rule.description ?? ''}
                    onChange={(event) => handleRuleChange(ruleIndex, { ...rule, description: event.target.value })}
                    className="bg-gray-800 border-gray-700 text-white"
                    rows={3}
                    placeholder="Provide more context for the follow-up question."
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-white text-sm">Follow-up Fields</Label>
                <Button
                  type="button"
                  size="sm"
                  className="bg-red-600 hover:bg-red-700"
                  onClick={() => handleAddField(ruleIndex)}
                >
                  <Plus className="h-4 w-4 mr-2" /> Add Field
                </Button>
              </div>

              {rule.fields.length === 0 ? (
                <div className="rounded-md border border-dashed border-gray-700 p-3 text-xs text-gray-400 bg-gray-900/40">
                  No follow-up fields configured yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {rule.fields.map((field, fieldIndex) => (
                    <Card key={field.id} className="bg-gray-950 border-gray-800">
                      <CardContent className="pt-4 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <Label className="text-white text-xs uppercase tracking-wide">Field ID</Label>
                            <Input
                              value={field.id}
                              onChange={(event) =>
                                handleFieldChange(ruleIndex, fieldIndex, {
                                  ...field,
                                  id: event.target.value,
                                })
                              }
                              className="bg-gray-800 border-gray-700 text-white"
                            />
                          </div>
                          <div>
                            <Label className="text-white text-xs uppercase tracking-wide">Field Label</Label>
                            <Input
                              value={field.label}
                              onChange={(event) =>
                                handleFieldChange(ruleIndex, fieldIndex, {
                                  ...field,
                                  label: event.target.value,
                                })
                              }
                              className="bg-gray-800 border-gray-700 text-white"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <Label className="text-white text-xs uppercase tracking-wide">Type</Label>
                            <Select
                              value={field.type}
                              onValueChange={(value) =>
                                handleFieldChange(ruleIndex, fieldIndex, {
                                  ...field,
                                  type: value as QuoteFieldType,
                                  options: value === 'select' ? field.options ?? [] : undefined,
                                })
                              }
                            >
                              <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-gray-800 border-gray-700">
                                {fieldTypeOptions.map((option) => (
                                  <SelectItem key={option.value} value={option.value} className="text-white">
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={field.required}
                              onCheckedChange={(checked) =>
                                handleFieldChange(ruleIndex, fieldIndex, {
                                  ...field,
                                  required: checked,
                                })
                              }
                              className="data-[state=checked]:bg-red-500 data-[state=unchecked]:bg-gray-500"
                            />
                            <span className={`text-xs font-medium ${field.required ? 'text-red-400' : 'text-gray-300'}`}>
                              Required
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={field.include_in_pdf ?? false}
                              onCheckedChange={(checked) =>
                                handleFieldChange(ruleIndex, fieldIndex, {
                                  ...field,
                                  include_in_pdf: checked,
                                })
                              }
                              className="data-[state=checked]:bg-blue-500 data-[state=unchecked]:bg-gray-500"
                            />
                            <span className="text-xs text-gray-300">Include in Quote</span>
                          </div>
                        </div>

                        {field.type === 'select' && (
                          <div>
                            <Label className="text-white text-xs uppercase tracking-wide">Options (one per line)</Label>
                            <Textarea
                              value={field.options?.join('\n') ?? ''}
                              onChange={(event) =>
                                handleFieldChange(ruleIndex, fieldIndex, {
                                  ...field,
                                  options: event.target.value
                                    .split('\n')
                                    .map((item) => item.trim())
                                    .filter((item) => item.length > 0),
                                })
                              }
                              className="bg-gray-800 border-gray-700 text-white"
                              rows={4}
                            />
                          </div>
                        )}

                        <div className="flex justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:text-red-300"
                            onClick={() => handleRemoveField(ruleIndex, fieldIndex)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Remove Follow-up
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="border-gray-700 text-gray-200 hover:text-white"
        onClick={handleAddRule}
      >
        <Plus className="h-4 w-4 mr-2" /> Add Another Conditional Rule
      </Button>
    </div>
  );
};

export default ConditionalLogicEditor;
