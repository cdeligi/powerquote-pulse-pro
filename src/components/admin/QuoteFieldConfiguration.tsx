import { useState, useEffect } from "react";
import type { PostgrestSingleResponse, SupabaseClient } from "@supabase/supabase-js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  Shield,
  GripVertical
} from "lucide-react";
import { User } from "@/types/auth";
import { useToast } from "@/hooks/use-toast";
import { getSupabaseClient } from "@/integrations/supabase/client";
import ConditionalLogicEditor from "@/components/admin/ConditionalLogicEditor";
import {
  QuoteFieldConfiguration as QuoteFieldConfig,
  QuoteFieldType,
  SalesforceFieldMapping,
} from "@/types/quote-field";
import {
  normalizeQuoteFieldConditionalRules,
  normalizeQuoteFieldOptions,
} from "@/utils/quoteFieldNormalization";

const supabase = getSupabaseClient();
const POSTGREST_SCHEMA_RELOAD_ERROR_CODE = "PGRST204";


const normalizeSalesforceApiName = (value: string): string => {
  const trimmed = (value || '').trim();
  if (!trimmed) return '';
  let cleaned = trimmed.replace(/[^A-Za-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
  if (!/^[A-Za-z]/.test(cleaned)) cleaned = `F_${cleaned}`;
  return cleaned;
};

const getConditionalSubfieldLabels = (field: QuoteField): string[] => {
  const labels = new Set<string>();
  (field.conditional_logic || []).forEach((rule) => {
    (rule.fields || []).forEach((sub) => {
      if (sub?.label?.trim()) labels.add(sub.label.trim());
    });
  });
  return Array.from(labels);
};

const getMutationErrorMessage = (error: { code?: string; message?: string }) => {
  if (error?.code === POSTGREST_SCHEMA_RELOAD_ERROR_CODE) {
    return "Supabase is still refreshing its schema. Please wait a moment and try saving again.";
  }

  return error?.message || "Failed to save quote field changes";
};

async function waitForSchemaReload(delayMs = 1000) {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}

interface PostgrestSchemaRetryOptions {
  reloadClient?: SupabaseClient | null;
  maxAttempts?: number;
}

async function runWithPostgrestSchemaRetry<T>(
  operation: () => Promise<PostgrestSingleResponse<T>>,
  { reloadClient = supabase, maxAttempts = 6 }: PostgrestSchemaRetryOptions = {}
): Promise<PostgrestSingleResponse<T>> {
  let lastResult: PostgrestSingleResponse<T> | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const result = await operation();
    lastResult = result;

    if (result.error?.code !== POSTGREST_SCHEMA_RELOAD_ERROR_CODE) {
      return result;
    }

    const waitMs = Math.min(8000, 1000 * Math.pow(2, attempt));
    const client = reloadClient ?? supabase;
    console.warn(
      `PostgREST schema cache out of date (attempt ${attempt + 1}/${maxAttempts}). Reloading before retrying mutation after ${waitMs}ms.`
    );

    const reloadResult = await client.rpc("reload_postgrest_schema");
    if (reloadResult.error) {
      console.error("Failed to trigger PostgREST schema reload", reloadResult.error);
      break;
    }

    await waitForSchemaReload(waitMs);

    const probeResult = await client.from("quote_fields").select("id, conditional_logic").limit(1);
    if (probeResult.error?.code === POSTGREST_SCHEMA_RELOAD_ERROR_CODE) {
      console.warn("PostgREST schema still reloading; will retry mutation once cache is refreshed.");
      continue;
    }

    if (probeResult.error) {
      console.error("Unexpected error while verifying quote_fields schema", probeResult.error);
      break;
    }

    console.info("PostgREST schema refreshed for quote_fields; retrying mutation.");
  }

  return lastResult as PostgrestSingleResponse<T>;
}

type QuoteField = QuoteFieldConfig;

interface QuoteFieldConfigurationProps {
  user: User;
}

const QuoteFieldConfiguration = ({ user }: QuoteFieldConfigurationProps) => {
  const [quoteFields, setQuoteFields] = useState<QuoteField[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingField, setEditingField] = useState<QuoteField | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [draggedFieldId, setDraggedFieldId] = useState<string | null>(null);
  const [quoteFieldsView, setQuoteFieldsView] = useState<'data-fields' | 'field-mapping-table'>('data-fields');
  const [mappingDrafts, setMappingDrafts] = useState<Record<string, QuoteField>>({});
  const { toast } = useToast();

  const handleDragStart = (e: React.DragEvent, field: QuoteField) => {
    e.dataTransfer.setData('text/plain', field.id);
    setDraggedFieldId(field.id);
  };

  const handleDragOver = (e: React.DragEvent, targetField: QuoteField) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent, targetField: QuoteField) => {
    e.preventDefault();
    e.stopPropagation();

    const draggedId = draggedFieldId;
    if (!draggedId) return;

    const sourceIndex = quoteFields.findIndex(field => field.id === draggedId);
    const targetIndex = quoteFields.findIndex(field => field.id === targetField.id);
    
    if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) return;

    // Swap the fields
    const updatedFields = [...quoteFields];
    const [movedField] = updatedFields.splice(sourceIndex, 1);
    updatedFields.splice(targetIndex, 0, movedField);
    
    // Update display orders
    updatedFields.forEach((field, index) => {
      field.display_order = index + 1;
    });

    setQuoteFields(updatedFields);
    
    // Save new orders to database
    const orderClient = supabase;
    Promise.all(updatedFields.map(field =>
      orderClient
        .from('quote_fields')
        .update({ display_order: field.display_order })
        .eq('id', field.id)
    )).then(() => {
      toast({
        title: "Success",
        description: "Field order updated successfully"
      });
    }).catch(error => {
      console.error('Error updating field order:', error);
      toast({
        title: "Error",
        description: "Failed to update field order",
        variant: "destructive"
      });
    });

    setDraggedFieldId(null);
  };

  const DragHandle = ({ field }: { field: QuoteField }) => (
    <div
      draggable
      onDragStart={(e) => handleDragStart(e, field)}
      className="flex items-center cursor-move hover:bg-gray-700 rounded-sm p-1 transition-colors"
    >
      <GripVertical className="h-4 w-4 mr-1" />
      <span className="text-xs text-gray-400">#{field.display_order}</span>
    </div>
  );

  useEffect(() => {
    checkAuthAndRole();
    fetchQuoteFields();
  }, []);

  const checkAuthAndRole = async () => {
    try {
      setAuthLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setIsAuthenticated(true);
        
        // Check if user is admin
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        
        const r = String(profile?.role || '').toLowerCase();
        setIsAdmin(['admin','master','level3','level_3'].includes(r));
      }
    } catch (error) {
      console.error('Error checking auth:', error);
    } finally {
      setAuthLoading(false);
    }
  };

  const fetchQuoteFields = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('quote_fields')
        .select('*')
        .order('display_order');

      if (error) throw error;

      const fields = (data ?? []).map((field) => ({
        id: field.id,
        label: field.label,
        type: (field.type as QuoteFieldType) ?? 'text',
        required: Boolean(field.required),
        enabled: field.enabled ?? true,
        options: normalizeQuoteFieldOptions(field.options),
        display_order: field.display_order ?? 0,
        include_in_pdf: Boolean(field.include_in_pdf),
        conditional_logic: normalizeQuoteFieldConditionalRules(field.conditional_logic),
        salesforce_mapping: (field.salesforce_mapping as SalesforceFieldMapping | null) ?? null,
      })) as QuoteField[];

      // Sort fields by display_order and then by label
      fields.sort((a, b) => {
        if (a.display_order === b.display_order) {
          return a.label.localeCompare(b.label);
        }
        return a.display_order - b.display_order;
      });

      // Fix duplicate display orders by reassigning them
      const uniqueFields = [...fields];
      let currentOrder = 1;
      
      // Group fields by display_order
      const groups = uniqueFields.reduce((acc, field) => {
        const key = field.display_order;
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(field);
        return acc;
      }, {} as Record<number, QuoteField[]>);

      // Reassign display orders for fields with duplicates
      Object.values(groups).forEach(group => {
        if (group.length > 1) {
          // If there are duplicates, assign sequential orders
          group.forEach((field, index) => {
            field.display_order = currentOrder + index;
          });
          currentOrder += group.length;
        } else {
          // For single fields, use their current order if valid
          if (group[0].display_order > 0) {
            currentOrder = Math.max(currentOrder, group[0].display_order + 1);
          } else {
            group[0].display_order = currentOrder;
            currentOrder++;
          }
        }
      });

      // Sort again with new display orders
      uniqueFields.sort((a, b) => a.display_order - b.display_order);

      setQuoteFields(uniqueFields);
      setMappingDrafts(
        uniqueFields.reduce((acc, field) => {
          acc[field.id] = {
            ...field,
            salesforce_mapping: field.salesforce_mapping ?? {
              enabled: true,
              objectName: 'Opportunity',
              fieldApiName: field.label,
              direction: 'to_salesforce',
              transformRule: '',
            },
          };
          return acc;
        }, {} as Record<string, QuoteField>)
      );
    } catch (error) {
      console.error('Error fetching quote fields:', error);
      toast({
        title: "Error",
        description: "Failed to load quote fields",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createQuoteField = async (fieldData: Omit<QuoteField, 'id'>) => {
    try {
      const mutationClient = supabase;
      const { error } = await runWithPostgrestSchemaRetry(
        async () =>
          await mutationClient
            .from('quote_fields')
            .insert({
              id: `field-${Date.now()}`,
              label: fieldData.label,
              type: fieldData.type,
              required: fieldData.required,
              enabled: fieldData.enabled,
              options: fieldData.options && fieldData.options.length ? JSON.stringify(fieldData.options) : null,
              display_order: fieldData.display_order,
              include_in_pdf: fieldData.include_in_pdf || false,
              conditional_logic: fieldData.conditional_logic ?? [],
              salesforce_mapping: fieldData.salesforce_mapping ?? null,
            }),
        { reloadClient: mutationClient }
      );

      if (error) throw error;

      await fetchQuoteFields();
      toast({
        title: "Success",
        description: "Quote field created successfully"
      });
    } catch (error) {
      console.error('Error creating quote field:', error);
      toast({
        title: "Error",
        description: getMutationErrorMessage(error),
        variant: "destructive"
      });
    }
  };

  const updateQuoteField = async (fieldId: string, fieldData: Omit<QuoteField, 'id'>) => {
    try {
      const mutationClient = supabase;
      const { error } = await runWithPostgrestSchemaRetry(
        async () =>
          await mutationClient
            .from('quote_fields')
            .update({
              label: fieldData.label,
              type: fieldData.type,
              required: fieldData.required,
              enabled: fieldData.enabled,
              options: fieldData.options && fieldData.options.length ? JSON.stringify(fieldData.options) : null,
              display_order: fieldData.display_order,
              include_in_pdf: fieldData.include_in_pdf || false,
              conditional_logic: fieldData.conditional_logic ?? [],
              salesforce_mapping: fieldData.salesforce_mapping ?? null,
            })
            .eq('id', fieldId),
        { reloadClient: mutationClient }
      );

      if (error) throw error;

      await fetchQuoteFields();
      toast({
        title: "Success",
        description: "Quote field updated successfully"
      });
    } catch (error) {
      console.error('Error updating quote field:', error);
      toast({
        title: "Error",
        description: getMutationErrorMessage(error),
        variant: "destructive"
      });
    }
  };

  const deleteQuoteField = async (fieldId: string) => {
    try {
      const deletionClient = supabase;
      const { error } = await deletionClient
        .from('quote_fields')
        .delete()
        .eq('id', fieldId);

      if (error) throw error;

      await fetchQuoteFields();
      toast({
        title: "Success",
        description: "Quote field deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting quote field:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete quote field",
        variant: "destructive"
      });
    }
  };

  const toggleFieldEnabled = async (fieldId: string) => {
    const field = quoteFields.find(f => f.id === fieldId);
    if (!field) return;

    try {
      const { error } = await supabase
        .from('quote_fields')
        .update({ enabled: !field.enabled })
        .eq('id', fieldId);

      if (error) throw error;

      await fetchQuoteFields();
    } catch (error) {
      console.error('Error toggling field:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to toggle field status",
        variant: "destructive"
      });
    }
  };

  const toggleIncludeInQuote = async (fieldId: string) => {
    const field = quoteFields.find(f => f.id === fieldId);
    if (!field) return;

    try {
      const { error } = await supabase
        .from('quote_fields')
        .update({ include_in_pdf: !field.include_in_pdf })
        .eq('id', fieldId);

      if (error) throw error;

      await fetchQuoteFields();
      toast({
        title: "Success",
        description: `Field ${!field.include_in_pdf ? 'added to' : 'removed from'} quote`,
      });
    } catch (error) {
      console.error('Error toggling include in quote:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to toggle include in quote",
        variant: "destructive"
      });
    }
  };

  const handleCreateField = async (fieldData: Omit<QuoteField, 'id'>) => {
    await createQuoteField(fieldData);
    setDialogOpen(false);
    setEditingField(null);
  };

  const handleUpdateField = async (fieldData: Omit<QuoteField, 'id'>) => {
    if (!editingField) return;
    await updateQuoteField(editingField.id, fieldData);
    setDialogOpen(false);
    setEditingField(null);
  };

  const handleDeleteField = async (fieldId: string) => {
    await deleteQuoteField(fieldId);
  };

  const openEditDialog = (field: QuoteField) => {
    setEditingField(field);
    setDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingField(null);
    setDialogOpen(true);
  };

  const updateMappingDraft = (fieldId: string, patch: Partial<QuoteField>) => {
    setMappingDrafts((prev) => ({
      ...prev,
      [fieldId]: {
        ...(prev[fieldId] ?? quoteFields.find((f) => f.id === fieldId)!),
        ...patch,
      },
    }));
  };

  const updateConditionalSubfieldMapping = (
    parentFieldId: string,
    subfieldKey: string,
    patch: Partial<SalesforceFieldMapping>
  ) => {
    const base = mappingDrafts[parentFieldId] ?? quoteFields.find((f) => f.id === parentFieldId);
    if (!base) return;

    const normalizeKey = (value: string) => value.trim().toLowerCase().replace(/\s*\([^)]*\)\s*$/,'').trim();
    const targetKey = normalizeKey(subfieldKey);

    const nextConditional = (base.conditional_logic || []).map((rule) => ({
      ...rule,
      fields: (rule.fields || []).map((sub: any) => {
        const key = normalizeKey(String(sub.label || sub.id || ''));
        if (key !== targetKey) return sub;

        const currentMapping = (sub as any).salesforce_mapping ?? {
          enabled: true,
          objectName: 'Opportunity',
          fieldApiName: sub.label?.replace(/\s+/g, '_') || sub.id,
          direction: 'to_salesforce' as const,
          transformRule: '',
        };

        return {
          ...sub,
          salesforce_mapping: {
            ...currentMapping,
            ...patch,
          },
        };
      }),
    }));

    updateMappingDraft(parentFieldId, { conditional_logic: nextConditional });
  };

  const getMappingIssues = (row: QuoteField, allRows: QuoteField[]) => {
    const issues: string[] = [];
    const mapping = row.salesforce_mapping;

    // Only enforce mapping validation when both the field and mapping are enabled.
    if (!row.enabled || mapping?.enabled === false) {
      return issues;
    }

    if (!mapping) {
      issues.push('Missing Salesforce mapping.');
      return issues;
    }

    if (!mapping.objectName?.trim()) {
      issues.push('Missing SF object.');
    }

    const apiName = mapping.fieldApiName?.trim();
    if (!apiName) {
      issues.push('Missing SF field API name.');
    }

    const duplicateCount = allRows.filter((candidate) => {
      const c = candidate.salesforce_mapping;
      return (
        c?.enabled !== false &&
        mapping.enabled !== false &&
        c?.objectName?.trim().toLowerCase() === mapping.objectName?.trim().toLowerCase() &&
        c?.fieldApiName?.trim().toLowerCase() === apiName?.toLowerCase()
      );
    }).length;

    if (apiName && duplicateCount > 1) {
      issues.push('Duplicate mapping target.');
    }

    return issues;
  };

  const exportMappingTableCsv = () => {
    const rows = quoteFields.map((field) => mappingDrafts[field.id] ?? field);
    const header = [
      'Field Label',
      'Field ID',
      'Type',
      'Required',
      'Enabled',
      'Include In Quote',
      'SF Object',
      'SF Field API Name',
      'Direction',
      'Transform Rule',
    ];

    const csvLines = [
      header.join(','),
      ...rows.map((row) => {
        const m = row.salesforce_mapping;
        const cols = [
          row.label,
          row.id,
          row.type,
          String(row.required),
          String(row.enabled),
          String(Boolean(row.include_in_pdf)),
          m?.objectName ?? '',
          m?.fieldApiName ?? '',
          m?.direction ?? '',
          m?.transformRule ?? '',
        ];
        return cols.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(',');
      }),
    ];

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `field-mapping-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const saveMappingTable = async () => {
    try {
      const rows = Object.values(mappingDrafts).map((row) => {
        const mapping = row.salesforce_mapping
          ? { ...row.salesforce_mapping, fieldApiName: normalizeSalesforceApiName(row.salesforce_mapping.fieldApiName || row.label) }
          : row.salesforce_mapping;

        const conditional_logic = (row.conditional_logic || []).map((rule) => ({
          ...rule,
          fields: (rule.fields || []).map((sub: any) => {
            const sf = (sub as any).salesforce_mapping;
            if (!sf) return sub;
            return {
              ...sub,
              salesforce_mapping: {
                ...sf,
                fieldApiName: normalizeSalesforceApiName(sf.fieldApiName || sub.label || sub.id),
              },
            };
          }),
        }));

        return {
          ...row,
          salesforce_mapping: mapping,
          conditional_logic,
        };
      });

      const rowsWithIssues = rows
        .map((row) => ({ row, issues: getMappingIssues(row, rows) }))
        .filter((entry) => entry.issues.length > 0);

      if (rowsWithIssues.length > 0) {
        toast({
          title: 'Validation required',
          description: `Please fix ${rowsWithIssues.length} row(s) with mapping issues before saving.`,
          variant: 'destructive',
        });
        return;
      }

      await Promise.all(
        rows.map((row) =>
          supabase
            .from('quote_fields')
            .update({
              required: row.required,
              enabled: row.enabled,
              include_in_pdf: row.include_in_pdf || false,
              salesforce_mapping: row.salesforce_mapping ?? null,
              conditional_logic: row.conditional_logic ?? [],
            })
            .eq('id', row.id)
        )
      );

      toast({
        title: 'Success',
        description: 'Field Mapping Table saved successfully',
      });
      await fetchQuoteFields();
    } catch (error) {
      console.error('Error saving mapping table:', error);
      toast({
        title: 'Error',
        description: 'Failed to save field mapping table',
        variant: 'destructive',
      });
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
        <span className="ml-2 text-white">Loading...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="space-y-6">
        <Alert className="bg-red-900/20 border-red-600">
          <Shield className="h-4 w-4" />
          <AlertDescription className="text-red-400">
            You must be logged in to manage quote fields. Please sign in to continue.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <Alert className="bg-orange-900/20 border-orange-600">
          <Shield className="h-4 w-4" />
          <AlertDescription className="text-orange-400">
            You need administrator privileges to manage quote fields. Contact your system administrator for access.
          </AlertDescription>
        </Alert>
        
        {/* Show read-only view for non-admins */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Current Quote Fields (Read-Only)</CardTitle>
            <CardDescription className="text-gray-400">
              These are the fields currently configured for quote requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {quoteFields.map((field) => (
                <div 
                  key={field.id} 
                  className="flex items-center justify-between p-2 bg-gray-800 rounded-md border border-gray-700 hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">
                        {field.label}
                      </div>
                      <div className="text-xs text-gray-400">
                        {field.type.toUpperCase()}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id={`enabled-${field.id}`}
                        checked={field.enabled}
                        onCheckedChange={() => toggleFieldEnabled(field.id)}
                        className={`
                          data-[state=checked]:bg-green-500
                          data-[state=unchecked]:bg-red-500
                          hover:bg-gray-700
                        `}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-medium text-white">Data Fields</h2>
          <p className="text-gray-400 text-sm">Manage quote fields and edit Salesforce mappings in one place.</p>
        </div>
        <div className="flex items-center gap-2">
          {quoteFieldsView === 'field-mapping-table' && (
            <>
              <Button variant="outline" className="border-gray-700 text-gray-200" onClick={exportMappingTableCsv}>
                Export CSV
              </Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={saveMappingTable}>
                Save All
              </Button>
            </>
          )}
          <Button
            className="bg-red-600 hover:bg-red-700"
            onClick={openCreateDialog}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Field
          </Button>
        </div>
      </div>

      <Tabs value={quoteFieldsView} onValueChange={(v) => setQuoteFieldsView(v as 'data-fields' | 'field-mapping-table')}>
        <TabsList className="bg-gray-800">
          <TabsTrigger value="data-fields" className="text-white data-[state=active]:bg-red-600 data-[state=active]:text-white">Data Fields</TabsTrigger>
          <TabsTrigger value="field-mapping-table" className="text-white data-[state=active]:bg-red-600 data-[state=active]:text-white">Field Mapping Table</TabsTrigger>
        </TabsList>

        <TabsContent value="data-fields" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {quoteFields.map((field) => (
              <Card
                key={field.id}
                onDragOver={(e) => handleDragOver(e, field)}
                onDrop={(e) => handleDrop(e, field)}
                className={`bg-gray-900 border-gray-800 hover:bg-gray-800 transition-colors ${
                  field.id === draggedFieldId ? 'opacity-50' : ''
                }`}
              >
                <CardHeader className="p-3">
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <DragHandle field={field} />
                            <CardTitle className={`${field.required ? 'text-red-400' : 'text-white'} text-sm font-medium truncate`}>
                              {field.label}
                            </CardTitle>
                          </div>
                          <div className="flex gap-1 mt-1">
                            <Badge variant="outline" className="text-xs capitalize border-gray-600 text-gray-400">
                              {field.type.toUpperCase()}
                            </Badge>
                            {field.conditional_logic && field.conditional_logic.length > 0 && (
                              <Badge variant="outline" className="text-xs border-red-600 text-red-300 bg-red-900/20">
                                Conditional ({getConditionalSubfieldLabels(field).length})
                              </Badge>
                            )}
                            {field.include_in_pdf && (
                              <Badge variant="outline" className="text-xs bg-blue-900/30 text-blue-400 border-blue-600">
                                QUOTE
                              </Badge>
                            )}
                          </div>
                          {field.conditional_logic && field.conditional_logic.length > 0 && (
                            <div className="mt-2 text-xs text-gray-300">
                              <p className="text-gray-400">Sub-items:</p>
                              <p className="truncate max-w-full">{getConditionalSubfieldLabels(field).join(', ') || 'None'}</p>
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <Label htmlFor={`include-quote-${field.id}`} className="text-xs text-gray-400 cursor-pointer">
                              Include in the Quote
                            </Label>
                            <Switch
                              id={`include-quote-${field.id}`}
                              checked={field.include_in_pdf || false}
                              onCheckedChange={() => toggleIncludeInQuote(field.id)}
                              className="data-[state=checked]:bg-blue-500"
                            />
                          </div>
                        </div>
                        <div className="shrink-0 pt-0.5">
                          <Switch
                            id={`enabled-${field.id}`}
                            checked={field.enabled}
                            onCheckedChange={() => toggleFieldEnabled(field.id)}
                            className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-red-500 hover:bg-gray-700"
                          />
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 mt-1 text-xs text-gray-400">
                        <code className="bg-gray-800 px-1 rounded">{field.id}</code>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center space-x-1">
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(field)} className="text-blue-400 hover:text-blue-300">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteField(field.id)} className="text-red-400 hover:text-red-300">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="field-mapping-table" className="mt-4">
          <div className="overflow-x-auto rounded-md border border-gray-800">
            <table className="w-full text-sm">
              <thead className="bg-gray-900 text-gray-300">
                <tr>
                  <th className="text-left p-2">Field Label</th>
                  <th className="text-left p-2">Type</th>
                  <th className="text-left p-2">Required</th>
                  <th className="text-left p-2">Enabled</th>
                  <th className="text-left p-2">Include in Quote</th>
                  <th className="text-left p-2">SF Object</th>
                  <th className="text-left p-2">SF Field API Name</th>
                  <th className="text-left p-2">Direction</th>
                  <th className="text-left p-2">Validation</th>
                </tr>
              </thead>
              <tbody>
                {quoteFields.map((field) => {
                  const row = mappingDrafts[field.id] ?? field;
                  const mapping = row.salesforce_mapping ?? {
                    enabled: true,
                    objectName: 'Opportunity',
                    fieldApiName: row.label,
                    direction: 'to_salesforce' as const,
                    transformRule: '',
                  };
                  const issues = getMappingIssues({ ...row, salesforce_mapping: mapping }, quoteFields.map((f) => mappingDrafts[f.id] ?? f));
                  const subRows = (() => {
                    const byKey = new Map<string, any>();
                    (row.conditional_logic || []).forEach((rule) => {
                      (rule.fields || []).forEach((sub: any) => {
                        const key = String(sub.label || sub.id || '').trim().toLowerCase().replace(/\s*\([^)]*\)\s*$/,'').trim();
                        if (!key) return;
                        if (!byKey.has(key)) {
                          byKey.set(key, sub);
                        }
                      });
                    });
                    return Array.from(byKey.values());
                  })();

                  return (
                    <>
                      <tr key={field.id} className="border-t border-gray-800 bg-gray-950 text-white">
                        <td className="p-2">
                          <div>{row.label}</div>
                          {getConditionalSubfieldLabels(row).length > 0 && (
                            <div className="text-xs text-gray-400 mt-1">
                              Follow-up fields below
                            </div>
                          )}
                        </td>
                        <td className="p-2 text-gray-300">{row.type.toUpperCase()}</td>
                        <td className="p-2">
                          <Switch
                            className="data-[state=checked]:bg-emerald-500"
                            checked={row.required}
                            onCheckedChange={(v) => updateMappingDraft(field.id, { required: v })}
                          />
                        </td>
                        <td className="p-2">
                          <Switch
                            className="data-[state=checked]:bg-emerald-500"
                            checked={row.enabled}
                            onCheckedChange={(v) => updateMappingDraft(field.id, { enabled: v })}
                          />
                        </td>
                        <td className="p-2">
                          <Switch
                            className="data-[state=checked]:bg-emerald-500"
                            checked={row.include_in_pdf || false}
                            onCheckedChange={(v) => updateMappingDraft(field.id, { include_in_pdf: v })}
                          />
                        </td>
                        <td className="p-2 min-w-[140px]">
                          <Select
                            value={mapping.objectName}
                            onValueChange={(value) =>
                              updateMappingDraft(field.id, {
                                salesforce_mapping: { ...mapping, objectName: value },
                              })
                            }
                          >
                            <SelectTrigger className="bg-gray-800 border-gray-700 text-white h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-800 border-gray-700">
                              <SelectItem value="Opportunity" className="text-white">Opportunity</SelectItem>
                              <SelectItem value="Case" className="text-white">Case</SelectItem>
                              <SelectItem value="Quote" className="text-white">Quote</SelectItem>
                              <SelectItem value="Account" className="text-white">Account</SelectItem>
                              <SelectItem value="Contact" className="text-white">Contact</SelectItem>
                              <SelectItem value="Custom" className="text-white">Custom</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-2 min-w-[220px]">
                          <Input
                            value={mapping.fieldApiName}
                            onChange={(e) =>
                              updateMappingDraft(field.id, {
                                salesforce_mapping: { ...mapping, fieldApiName: e.target.value },
                              })
                            }
                            className="bg-gray-800 border-gray-700 text-white h-8"
                          />
                        </td>
                        <td className="p-2 min-w-[190px]">
                          <Select
                            value={mapping.direction}
                            onValueChange={(value: 'to_salesforce' | 'from_salesforce' | 'bidirectional') =>
                              updateMappingDraft(field.id, {
                                salesforce_mapping: { ...mapping, direction: value },
                              })
                            }
                          >
                            <SelectTrigger className="bg-gray-800 border-gray-700 text-white h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-800 border-gray-700">
                              <SelectItem value="to_salesforce" className="text-white">PowerQuote → Salesforce</SelectItem>
                              <SelectItem value="from_salesforce" className="text-white">Salesforce → PowerQuote</SelectItem>
                              <SelectItem value="bidirectional" className="text-white">Bidirectional</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-2 min-w-[220px]">
                          {issues.length === 0 ? (
                            <span className="text-emerald-400 text-xs">OK</span>
                          ) : (
                            <div className="text-xs text-amber-300 space-y-1">
                              {issues.map((issue) => (
                                <div key={issue} className="flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  <span>{issue}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>

                      {subRows.map((sub) => {
                        const subMapping = (sub as any).salesforce_mapping ?? {
                          enabled: true,
                          objectName: mapping.objectName,
                          fieldApiName: (sub.label || sub.id || '').replace(/\s+/g, '_'),
                          direction: mapping.direction,
                          transformRule: '',
                        };

                        return (
                          <tr key={`${field.id}-${String(sub.label || sub.id).toLowerCase().replace(/\s*\([^)]*\)\s*$/, '').trim()}`} className="border-t border-gray-800 bg-gray-900/70 text-white">
                            <td className="p-2 pl-6 text-cyan-300">↳ {String(sub.label || sub.id).replace(/\s*\([^)]*\)\s*$/, '').trim()}</td>
                            <td className="p-2 text-gray-300">{String(sub.type || 'text').toUpperCase()}</td>
                            <td className="p-2"><span className="text-xs text-gray-400">{sub.required ? 'Yes' : 'No'}</span></td>
                            <td className="p-2"><span className="text-xs text-gray-400">{sub.enabled === false ? 'No' : 'Yes'}</span></td>
                            <td className="p-2"><span className="text-xs text-gray-400">{sub.include_in_pdf ? 'Yes' : 'No'}</span></td>
                            <td className="p-2 min-w-[140px]">
                              <Select
                                value={subMapping.objectName}
                                onValueChange={(value) => updateConditionalSubfieldMapping(field.id, String(sub.label || sub.id), { objectName: value })}
                              >
                                <SelectTrigger className="bg-gray-800 border-gray-700 text-white h-8"><SelectValue /></SelectTrigger>
                                <SelectContent className="bg-gray-800 border-gray-700">
                                  <SelectItem value="Opportunity" className="text-white">Opportunity</SelectItem>
                                  <SelectItem value="Case" className="text-white">Case</SelectItem>
                                  <SelectItem value="Quote" className="text-white">Quote</SelectItem>
                                  <SelectItem value="Account" className="text-white">Account</SelectItem>
                                  <SelectItem value="Contact" className="text-white">Contact</SelectItem>
                                  <SelectItem value="Custom" className="text-white">Custom</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="p-2 min-w-[220px]"><Input value={subMapping.fieldApiName} onChange={(e)=>updateConditionalSubfieldMapping(field.id, String(sub.label || sub.id), { fieldApiName: e.target.value })} className="bg-gray-800 border-gray-700 text-white h-8" /></td>
                            <td className="p-2 min-w-[190px]">
                              <Select
                                value={subMapping.direction}
                                onValueChange={(value: 'to_salesforce' | 'from_salesforce' | 'bidirectional') => updateConditionalSubfieldMapping(field.id, String(sub.label || sub.id), { direction: value })}
                              >
                                <SelectTrigger className="bg-gray-800 border-gray-700 text-white h-8"><SelectValue /></SelectTrigger>
                                <SelectContent className="bg-gray-800 border-gray-700">
                                  <SelectItem value="to_salesforce" className="text-white">PowerQuote → Salesforce</SelectItem>
                                  <SelectItem value="from_salesforce" className="text-white">Salesforce → PowerQuote</SelectItem>
                                  <SelectItem value="bidirectional" className="text-white">Bidirectional</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="p-2 min-w-[220px]"><span className="text-emerald-400 text-xs">OK</span></td>
                          </tr>
                        );
                      })}
                    </>
                  );
                })}              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-800 max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingField ? 'Edit' : 'Create'} Quote Field
            </DialogTitle>
          </DialogHeader>
          
          <QuoteFieldForm
            onSubmit={editingField ? handleUpdateField : handleCreateField}
            initialData={editingField}
            onCancel={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

interface QuoteFieldFormProps {
  onSubmit: (fieldData: Omit<QuoteField, 'id'>) => void;
  initialData?: QuoteField | null;
  onCancel: () => void;
}

const QuoteFieldForm = ({ onSubmit, initialData, onCancel }: QuoteFieldFormProps) => {
  const [formData, setFormData] = useState<Omit<QuoteField, 'id'>>({
    label: initialData?.label || '',
    type: initialData?.type || 'text',
    required: initialData?.required ?? false,
    enabled: initialData?.enabled ?? true,
    options: initialData?.options || [],
    display_order: initialData?.display_order || 1,
    include_in_pdf: initialData?.include_in_pdf ?? false,
    conditional_logic: initialData?.conditional_logic ?? [],
    salesforce_mapping: initialData?.salesforce_mapping ?? {
      enabled: true,
      objectName: 'Opportunity',
      fieldApiName: initialData?.label || '',
      direction: 'to_salesforce',
      transformRule: '',
    },
  });

  const [optionsText, setOptionsText] = useState(
    initialData?.options?.join('\n') || ''
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sanitizedOptions = formData.type === 'select'
      ? optionsText
          .split('\n')
          .map(option => option.trim())
          .filter(option => option.length > 0)
      : [];

    const sanitizedConditionalLogic = (formData.conditional_logic ?? [])
      .map((rule) => ({
        ...rule,
        triggerValues: (rule.triggerValues || [])
          .map((value) => value.trim())
          .filter((value) => value.length > 0),
        fields: (rule.fields || [])
          .map((field) => ({
            ...field,
            id: field.id.trim(),
            label: field.label.trim(),
            include_in_pdf: field.include_in_pdf ?? false,
            enabled: field.enabled ?? true,
            options:
              field.type === 'select'
                ? (field.options || [])
                    .map((option) => option.trim())
                    .filter((option) => option.length > 0)
                : undefined,
          }))
          .filter((field) => field.id.length > 0 && field.label.length > 0),
      }))
      .filter((rule) => rule.triggerValues.length > 0 && rule.fields.length > 0);

    const finalData = {
      ...formData,
      options: formData.type === 'select' ? sanitizedOptions : [],
      conditional_logic: sanitizedConditionalLogic,
    };
    onSubmit(finalData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="label" className="text-white">Field Label</Label>
          <Input
            id="label"
            value={formData.label}
            onChange={(e) => setFormData({ ...formData, label: e.target.value })}
            className="bg-gray-800 border-gray-700 text-white"
            required
          />
        </div>
        <div>
          <Label htmlFor="type" className="text-white">Field Type</Label>
          <Select
            value={formData.type}
            onValueChange={(value: QuoteFieldType) => {
              setFormData({
                ...formData,
                type: value,
                options: value === 'select' ? formData.options : [],
              });
              if (value !== 'select') {
                setOptionsText('');
              }
            }}
          >
            <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="text" className="text-white">Text</SelectItem>
              <SelectItem value="textarea" className="text-white">Textarea</SelectItem>
              <SelectItem value="number" className="text-white">Number</SelectItem>
              <SelectItem value="select" className="text-white">Select</SelectItem>
              <SelectItem value="date" className="text-white">Date</SelectItem>
              <SelectItem value="email" className="text-white">Email</SelectItem>
              <SelectItem value="tel" className="text-white">Phone</SelectItem>
              <SelectItem value="checkbox" className="text-white">Checkbox</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="order" className="text-white">Display Order</Label>
        <Input
          id="order"
          type="number"
          value={formData.display_order}
          onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
          className="bg-gray-800 border-gray-700 text-white"
          min="1"
        />
      </div>

      {formData.type === 'select' && (
        <div>
          <Label htmlFor="options" className="text-white">Options (one per line)</Label>
          <Textarea
            id="options"
            value={optionsText}
            onChange={(e) => setOptionsText(e.target.value)}
            className="bg-gray-800 border-gray-700 text-white"
            rows={4}
            placeholder="Option 1&#10;Option 2&#10;Option 3"
          />
        </div>
      )}

      <div className="space-y-2">
        <div>
          <Label className="text-white">Conditional Follow-up Questions</Label>
          <p className="text-xs text-gray-400">
            Configure additional prompts that appear when a user selects specific answers for this field. Use this to
            collect product-specific details or require clarifications such as representative incentives.
          </p>
        </div>
        <ConditionalLogicEditor
          rules={formData.conditional_logic ?? []}
          onChange={(rules) => setFormData({ ...formData, conditional_logic: rules })}
          parentFieldLabel={formData.label || 'Quote Field'}
        />
      </div>

      <div className="space-y-3 border border-gray-800 rounded-md p-3">
        <div>
          <Label className="text-white">Salesforce Mapping</Label>
          <p className="text-xs text-gray-400">Define which Salesforce field this quote field maps to.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label htmlFor="sf-object" className="text-white">Object</Label>
            <Select
              value={formData.salesforce_mapping?.objectName || 'Opportunity'}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  salesforce_mapping: {
                    enabled: formData.salesforce_mapping?.enabled ?? true,
                    objectName: value,
                    fieldApiName: formData.salesforce_mapping?.fieldApiName || formData.label,
                    direction: formData.salesforce_mapping?.direction ?? 'to_salesforce',
                    transformRule: formData.salesforce_mapping?.transformRule || '',
                  },
                })
              }
            >
              <SelectTrigger id="sf-object" className="bg-gray-800 border-gray-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="Opportunity" className="text-white">Opportunity</SelectItem>
                <SelectItem value="Case" className="text-white">Case</SelectItem>
                <SelectItem value="Quote" className="text-white">Quote</SelectItem>
                <SelectItem value="Account" className="text-white">Account</SelectItem>
                <SelectItem value="Contact" className="text-white">Contact</SelectItem>
                <SelectItem value="Custom" className="text-white">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="sf-api-name" className="text-white">Salesforce Field API Name</Label>
            <Input
              id="sf-api-name"
              value={formData.salesforce_mapping?.fieldApiName || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  salesforce_mapping: {
                    enabled: formData.salesforce_mapping?.enabled ?? true,
                    objectName: formData.salesforce_mapping?.objectName || 'Opportunity',
                    fieldApiName: e.target.value,
                    direction: formData.salesforce_mapping?.direction ?? 'to_salesforce',
                    transformRule: formData.salesforce_mapping?.transformRule || '',
                  },
                })
              }
              className="bg-gray-800 border-gray-700 text-white"
              placeholder="e.g. Opportunity_Name__c"
            />
          </div>
          <div>
            <Label htmlFor="sf-direction" className="text-white">Sync Direction</Label>
            <Select
              value={formData.salesforce_mapping?.direction || 'to_salesforce'}
              onValueChange={(value: 'to_salesforce' | 'from_salesforce' | 'bidirectional') =>
                setFormData({
                  ...formData,
                  salesforce_mapping: {
                    enabled: formData.salesforce_mapping?.enabled ?? true,
                    objectName: formData.salesforce_mapping?.objectName || 'Opportunity',
                    fieldApiName: formData.salesforce_mapping?.fieldApiName || formData.label,
                    direction: value,
                    transformRule: formData.salesforce_mapping?.transformRule || '',
                  },
                })
              }
            >
              <SelectTrigger id="sf-direction" className="bg-gray-800 border-gray-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="to_salesforce" className="text-white">PowerQuote → Salesforce</SelectItem>
                <SelectItem value="from_salesforce" className="text-white">Salesforce → PowerQuote</SelectItem>
                <SelectItem value="bidirectional" className="text-white">Bidirectional</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="required"
            checked={formData.required}
            onCheckedChange={(required) => setFormData({ ...formData, required })}
            className={`
              data-[state=checked]:bg-red-500
              data-[state=unchecked]:bg-gray-500
              hover:bg-gray-700
            `}
          />
          <Label htmlFor="required" className={`${formData.required ? 'text-red-400' : 'text-white'} text-sm font-medium`}>Required</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="enabled"
            checked={formData.enabled}
            onCheckedChange={(enabled) => setFormData({ ...formData, enabled })}
            className={`
              data-[state=checked]:bg-green-500
              data-[state=unchecked]:bg-red-500
              hover:bg-gray-700
            `}
          />
          <Label htmlFor="enabled" className="text-white">Enabled</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="include_in_pdf"
            checked={formData.include_in_pdf}
            onCheckedChange={(include_in_pdf) => setFormData({ ...formData, include_in_pdf })}
            className={`
              data-[state=checked]:bg-blue-500
              data-[state=unchecked]:bg-gray-500
              hover:bg-gray-700
            `}
          />
          <Label htmlFor="include_in_pdf" className="text-white">Include in the Quote</Label>
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          className="border-gray-600 bg-gray-800 text-gray-200 hover:bg-gray-700 hover:text-white focus:ring-2 focus:ring-gray-500"
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          className="bg-red-600 hover:bg-red-700 text-white focus:ring-2 focus:ring-red-500"
        >
          {initialData ? 'Update' : 'Create'} Field
        </Button>
      </div>
    </form>
  );
};

export default QuoteFieldConfiguration;
