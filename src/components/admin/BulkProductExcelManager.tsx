import React, { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Download, 
  FileSpreadsheet, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  ArrowRight,
  X,
  Eye
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ProductRow {
  id: string;
  product_level: number;
  name: string;
  display_name: string;
  enabled: boolean;
  cost: number;
  price: number;
  category: string;
  subcategory: string;
  asset_type_id: string;
  parent_product_id: string;
  chassis_type: string;
  rack_configurable: boolean;
  has_level4: boolean;
  requires_level4_config: boolean;
  part_number: string;
  image_url: string;
  product_info_url: string;
  specifications_json: string;
  action: 'UPDATE' | 'INSERT' | 'DELETE';
}

interface RelationshipRow {
  level3_product_id: string;
  level2_product_ids: string[];
}

interface DiffItem {
  id: string;
  name: string;
  field: string;
  oldValue: string | number | boolean;
  newValue: string | number | boolean;
}

interface ValidationResult {
  isValid: boolean;
  totalRows: number;
  validRows: number;
  errors: string[];
  products: ProductRow[];
  relationships: RelationshipRow[];
}

interface BulkProductExcelManagerProps {
  onRefresh: () => void;
}

// Dynamic import for exceljs to keep initial bundle smaller
const loadExcelJS = async () => {
  // exceljs ships as a CJS/dual package; in Vite the module often comes through as { default: ExcelJS }
  const mod: any = await import('exceljs');
  return mod?.default ?? mod;
};

export const BulkProductExcelManager: React.FC<BulkProductExcelManagerProps> = ({ onRefresh }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isDownloading, setIsDownloading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [diffPreview, setDiffPreview] = useState<DiffItem[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  // Download Excel file with all products
  const handleDownload = useCallback(async () => {
    setIsDownloading(true);
    try {
      const ExcelJS = await loadExcelJS();
      
      // Fetch all products (levels 1-3)
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*')
        .in('product_level', [1, 2, 3])
        .order('product_level')
        .order('name');

      if (productsError) throw productsError;

      // Fetch relationships
      const { data: relationships, error: relError } = await supabase
        .from('level2_level3_relationships')
        .select('level2_product_id, level3_product_id');

      if (relError) throw relError;

      // Build products sheet data
      const productsData = (products || []).map(p => ({
        id: p.id,
        product_level: p.product_level,
        name: p.name,
        display_name: p.display_name || '',
        enabled: p.enabled ? 'TRUE' : 'FALSE',
        cost: p.cost || 0,
        price: p.price || 0,
        category: p.category || '',
        subcategory: p.subcategory || '',
        asset_type_id: p.asset_type_id || '',
        parent_product_id: p.parent_product_id || '',
        chassis_type: p.chassis_type || '',
        rack_configurable: p.rack_configurable ? 'TRUE' : 'FALSE',
        has_level4: p.has_level4 ? 'TRUE' : 'FALSE',
        requires_level4_config: p.requires_level4_config ? 'TRUE' : 'FALSE',
        part_number: p.part_number || '',
        image_url: p.image_url || '',
        product_info_url: p.product_info_url || '',
        specifications_json: p.specifications ? JSON.stringify(p.specifications) : '',
        action: 'UPDATE'
      }));

      // Build relationships sheet data - group by level3
      const relMap: Record<string, string[]> = {};
      (relationships || []).forEach(r => {
        if (!relMap[r.level3_product_id]) {
          relMap[r.level3_product_id] = [];
        }
        relMap[r.level3_product_id].push(r.level2_product_id);
      });

      const relationshipsData = Object.entries(relMap).map(([l3Id, l2Ids]) => ({
        level3_product_id: l3Id,
        level2_product_ids: l2Ids.join(',')
      }));

      // Create workbook
      const wb = new ExcelJS.Workbook();

      // Products sheet
      const productsWs = wb.addWorksheet('products');
      if (productsData.length > 0) {
        productsWs.columns = Object.keys(productsData[0]).map((key) => ({ header: key, key }));
        productsWs.addRows(productsData);
      }

      // Relationships sheet
      const relWs = wb.addWorksheet('level2_level3_relationships');
      if (relationshipsData.length > 0) {
        relWs.columns = Object.keys(relationshipsData[0]).map((key) => ({ header: key, key }));
        relWs.addRows(relationshipsData);
      }

      // Generate filename with date
      const date = new Date().toISOString().split('T')[0];
      const filename = `product-master-${date}.xlsx`;

      // Download
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      toast.success(`Exported ${productsData.length} products to ${filename}`);

    } catch (error: any) {
      console.error('Download error:', error);
      toast.error(`Download Failed: ${error.message}`);
    } finally {
      setIsDownloading(false);
    }
  }, []);

  // Parse and validate uploaded Excel
  const parseExcel = useCallback(async (file: File): Promise<ValidationResult> => {
    const ExcelJS = await loadExcelJS();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const data = e.target?.result as ArrayBuffer;
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.load(data);

          const errors: string[] = [];
          const products: ProductRow[] = [];
          const relationships: RelationshipRow[] = [];

          // Helper: convert worksheet to array of objects using first row as headers
          const sheetToJson = (ws: any): any[] => {
            if (!ws) return [];
            const headerRow = ws.getRow(1);
            const headers: string[] = [];
            headerRow.eachCell({ includeEmpty: true }, (cell: any, colNumber: number) => {
              const v = String(cell?.value ?? '').trim();
              headers[colNumber] = v;
            });

            const rows: any[] = [];
            ws.eachRow((row: any, rowNumber: number) => {
              if (rowNumber === 1) return;
              const obj: any = {};
              row.eachCell({ includeEmpty: true }, (cell: any, colNumber: number) => {
                const key = headers[colNumber];
                if (!key) return;
                // exceljs can return objects for rich text; coerce to primitive string/number when possible
                const val = (cell && cell.value && typeof cell.value === 'object' && 'text' in cell.value)
                  ? (cell.value as any).text
                  : cell?.value;
                obj[key] = val;
              });
              // skip completely empty rows
              if (Object.keys(obj).length > 0) rows.push(obj);
            });
            return rows;
          };

          const parseBoolean = (val: any): boolean => {
            if (typeof val === 'boolean') return val;
            if (typeof val === 'number') return val !== 0;
            if (typeof val === 'string') return val.toUpperCase() === 'TRUE';
            return Boolean(val);
          };

          // Parse products sheet
          const productsSheet = workbook.getWorksheet('products');
          if (!productsSheet) {
            errors.push('Missing "products" sheet');
          } else {
            const rows = sheetToJson(productsSheet);

            const requiredColumns = ['id', 'product_level', 'name', 'cost', 'price'];
            if (rows.length > 0) {
              const firstRow = rows[0];
              for (const col of requiredColumns) {
                if (!(col in firstRow)) errors.push(`Missing required column: ${col}`);
              }
            }

            for (let i = 0; i < rows.length; i++) {
              const row = rows[i];
              const rowNum = i + 2;

              const cost = Number(row.cost);
              const price = Number(row.price);
              const level = Number(row.product_level);

              if (isNaN(cost)) { errors.push(`Row ${rowNum}: Invalid cost value "${row.cost}"`); continue; }
              if (isNaN(price)) { errors.push(`Row ${rowNum}: Invalid price value "${row.price}"`); continue; }
              if (![1, 2, 3].includes(level)) { errors.push(`Row ${rowNum}: Invalid product_level "${row.product_level}" (must be 1, 2, or 3)`); continue; }

              const action = String(row.action || 'UPDATE').toUpperCase();
              if (!['UPDATE', 'INSERT', 'DELETE'].includes(action)) {
                errors.push(`Row ${rowNum}: Invalid action "${row.action}" (must be UPDATE, INSERT, or DELETE)`);
                continue;
              }
              if (action !== 'INSERT' && !row.id) {
                errors.push(`Row ${rowNum}: Missing ID for ${action} action`);
                continue;
              }

              products.push({
                id: row.id || '',
                product_level: level,
                name: row.name || '',
                display_name: row.display_name || '',
                enabled: parseBoolean(row.enabled),
                cost,
                price,
                category: row.category || '',
                subcategory: row.subcategory || '',
                asset_type_id: row.asset_type_id || '',
                parent_product_id: row.parent_product_id || '',
                chassis_type: row.chassis_type || '',
                rack_configurable: parseBoolean(row.rack_configurable),
                has_level4: parseBoolean(row.has_level4),
                requires_level4_config: parseBoolean(row.requires_level4_config),
                part_number: row.part_number || '',
                image_url: row.image_url || '',
                product_info_url: row.product_info_url || '',
                specifications_json: row.specifications_json || '',
                action: action as 'UPDATE' | 'INSERT' | 'DELETE'
              });
            }
          }

          // Parse relationships sheet
          const relSheet = workbook.getWorksheet('level2_level3_relationships');
          if (relSheet) {
            const rows = sheetToJson(relSheet);
            for (const row of rows) {
              if (row.level3_product_id && row.level2_product_ids) {
                const l2Ids = String(row.level2_product_ids)
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean);
                relationships.push({
                  level3_product_id: row.level3_product_id,
                  level2_product_ids: l2Ids
                });
              }
            }
          }

          resolve({
            isValid: errors.length === 0,
            totalRows: products.length + relationships.length,
            validRows: products.length,
            errors,
            products,
            relationships
          });
        } catch (err: any) {
          reject(new Error(`Failed to parse Excel file: ${err.message}`));
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  }, []);

  // Generate diff preview by comparing with current DB data
  const generateDiffPreview = useCallback(async (products: ProductRow[]): Promise<DiffItem[]> => {
    const productIds = products
      .filter(p => p.action === 'UPDATE')
      .map(p => p.id);

    if (productIds.length === 0) return [];

    const { data: currentProducts, error } = await supabase
      .from('products')
      .select('*')
      .in('id', productIds);

    if (error) {
      console.error('Error fetching current products:', error);
      return [];
    }

    const currentMap = new Map((currentProducts || []).map(p => [p.id, p]));
    const diffs: DiffItem[] = [];

    for (const newProduct of products) {
      if (newProduct.action !== 'UPDATE') continue;
      
      const current = currentMap.get(newProduct.id);
      if (!current) continue;

      // Compare key fields
      const fieldsToCompare = [
        { key: 'cost', label: 'cost' },
        { key: 'price', label: 'price' },
        { key: 'enabled', label: 'enabled' },
        { key: 'name', label: 'name' },
        { key: 'display_name', label: 'display_name' },
        { key: 'category', label: 'category' },
        { key: 'part_number', label: 'part_number' },
      ];

      for (const { key, label } of fieldsToCompare) {
        const oldVal = current[key];
        const newVal = (newProduct as any)[key];
        
        // Handle boolean comparison
        if (key === 'enabled') {
          const oldBool = Boolean(oldVal);
          const newBool = Boolean(newVal);
          if (oldBool !== newBool) {
            diffs.push({
              id: newProduct.id,
              name: newProduct.name,
              field: label,
              oldValue: oldBool,
              newValue: newBool
            });
          }
        } else if (oldVal !== newVal && (oldVal || newVal)) {
          diffs.push({
            id: newProduct.id,
            name: newProduct.name,
            field: label,
            oldValue: oldVal ?? '',
            newValue: newVal ?? ''
          });
        }
      }
    }

    return diffs;
  }, []);

  // Handle file upload
  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(10);
    setValidationResult(null);
    setDiffPreview([]);
    setShowPreview(false);

    try {
      setUploadProgress(30);
      const result = await parseExcel(file);
      setUploadProgress(60);
      
      setValidationResult(result);
      
      if (result.isValid && result.products.length > 0) {
        setUploadProgress(80);
        const diffs = await generateDiffPreview(result.products);
        setDiffPreview(diffs);
        setShowPreview(true);
      }
      
      setUploadProgress(100);

      if (result.errors.length > 0) {
        toast.error(`Found ${result.errors.length} validation issue(s). Review before applying.`);
      } else {
        toast.success(`Ready to apply ${result.validRows} product updates.`);
      }

    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(`Upload Failed: ${error.message}`);
      setValidationResult(null);
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [parseExcel, generateDiffPreview]);

  // Apply updates via edge function
  const handleApplyUpdates = useCallback(async () => {
    if (!validationResult) return;

    setIsApplying(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-products-bulk', {
        body: {
          products: validationResult.products,
          relationships: validationResult.relationships,
          dry_run: false
        }
      });

      if (error) throw error;

      const result = data as {
        updated: number;
        inserted: number;
        disabled: number;
        relationship_updates: number;
        skipped: number;
        errors: string[];
      };

      toast.success(`Bulk Update Complete - Updated: ${result.updated}, Inserted: ${result.inserted}, Disabled: ${result.disabled}`);

      // Reset state
      setValidationResult(null);
      setDiffPreview([]);
      setShowPreview(false);

      // Refresh product data
      onRefresh();

    } catch (error: any) {
      console.error('Apply updates error:', error);
      toast.error(`Update Failed: ${error.message}`);
    } finally {
      setIsApplying(false);
    }
  }, [validationResult, onRefresh]);

  // Reset/clear state
  const handleReset = useCallback(() => {
    setValidationResult(null);
    setDiffPreview([]);
    setShowPreview(false);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Bulk Update via Excel
          </CardTitle>
          <CardDescription>
            Download the product master spreadsheet, edit costs/prices in Excel, then upload to apply changes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {/* Download Button */}
            <Button 
              onClick={handleDownload}
              disabled={isDownloading}
              className="min-w-[200px]"
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Download Product Master (.xlsx)
            </Button>

            {/* Upload Area */}
            <div className="flex items-center gap-2">
              <Input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                disabled={isUploading || isApplying}
                className="max-w-[300px]"
              />
              {isUploading && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>

            {/* Reset Button */}
            {validationResult && (
              <Button variant="outline" onClick={handleReset}>
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
            )}
          </div>

          {/* Upload Progress */}
          {isUploading && (
            <div className="mt-4">
              <Progress value={uploadProgress} className="w-full" />
              <p className="text-sm text-muted-foreground mt-1">
                Processing file...
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Validation Results */}
      {validationResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {validationResult.isValid ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-500" />
              )}
              Validation Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary Badges */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">
                Total Rows: {validationResult.totalRows}
              </Badge>
              <Badge variant="secondary">
                Valid Products: {validationResult.validRows}
              </Badge>
              <Badge variant="secondary">
                Relationships: {validationResult.relationships.length}
              </Badge>
              {validationResult.errors.length > 0 && (
                <Badge variant="destructive">
                  Errors: {validationResult.errors.length}
                </Badge>
              )}
            </div>

            {/* Error List */}
            {validationResult.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Validation Errors</AlertTitle>
                <AlertDescription>
                  <ScrollArea className="h-[150px] mt-2">
                    <ul className="list-disc list-inside space-y-1">
                      {validationResult.errors.map((err, i) => (
                        <li key={i} className="text-sm">{err}</li>
                      ))}
                    </ul>
                  </ScrollArea>
                </AlertDescription>
              </Alert>
            )}

            {/* Action Counts */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {validationResult.products.filter(p => p.action === 'UPDATE').length}
                </div>
                <div className="text-sm text-muted-foreground">Updates</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {validationResult.products.filter(p => p.action === 'INSERT').length}
                </div>
                <div className="text-sm text-muted-foreground">Inserts</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {validationResult.products.filter(p => p.action === 'DELETE').length}
                </div>
                <div className="text-sm text-muted-foreground">Deletes</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Diff Preview */}
      {showPreview && diffPreview.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Changes Preview ({diffPreview.length} changes)
            </CardTitle>
            <CardDescription>
              Review the changes that will be applied
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Field</TableHead>
                    <TableHead>Old Value</TableHead>
                    <TableHead></TableHead>
                    <TableHead>New Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {diffPreview.map((diff, i) => (
                    <TableRow key={`${diff.id}-${diff.field}-${i}`}>
                      <TableCell className="font-mono text-xs">
                        {diff.id.length > 20 ? `${diff.id.substring(0, 20)}...` : diff.id}
                      </TableCell>
                      <TableCell className="font-medium">
                        {diff.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{diff.field}</Badge>
                      </TableCell>
                      <TableCell className="text-red-600 bg-red-50 dark:bg-red-950/20">
                        {String(diff.oldValue)}
                      </TableCell>
                      <TableCell className="text-center">
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                      <TableCell className="text-green-600 bg-green-50 dark:bg-green-950/20 font-medium">
                        {String(diff.newValue)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Apply Button */}
      {validationResult && validationResult.validRows > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Ready to apply changes?</p>
                <p className="text-sm text-muted-foreground">
                  This will update {validationResult.products.filter(p => p.action === 'UPDATE').length} products
                  {validationResult.relationships.length > 0 && ` and ${validationResult.relationships.length} relationship mappings`}.
                </p>
              </div>
              <Button 
                onClick={handleApplyUpdates}
                disabled={isApplying}
                size="lg"
                className="min-w-[150px]"
              >
                {isApplying ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                Apply Updates
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
