import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { generateQuotePDF } from '@/utils/pdfGenerator';
import { Loader2 } from 'lucide-react';
import type { Quote } from '@/types/quote';
import type { BOMItem } from '@/types/product';
import {
  buildRackLayoutFromAssignments,
  deserializeSlotAssignments,
  type SerializedSlotAssignment,
} from '@/utils/slotAssignmentUtils';

const ensureRecord = (value: unknown): Record<string, any> | null => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, any>;
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, any>)
        : null;
    } catch {
      return null;
    }
  }
  return null;
};

const ensureArray = (value: unknown): unknown[] | null => {
  if (Array.isArray(value)) {
    return value as unknown[];
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as unknown[]) : null;
    } catch {
      return null;
    }
  }
  return null;
};

const extractSlotAssignments = (item: any): SerializedSlotAssignment[] | undefined => {
  const candidates = [
    item?.slotAssignments,
    item?.slot_assignments,
    item?.configuration?.slotAssignments,
    item?.configuration?.slot_assignments,
    item?.configuration_data?.slotAssignments,
    item?.configuration_data?.slot_assignments,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate as SerializedSlotAssignment[];
    }
  }

  return undefined;
};

const extractRackConfiguration = (item: any): any => {
  const candidates = [
    item?.rackConfiguration,
    item?.rack_configuration,
    item?.configuration?.rackConfiguration,
    item?.configuration?.rack_configuration,
    item?.configuration_data?.rackConfiguration,
    item?.configuration_data?.rack_configuration,
  ];

  for (const candidate of candidates) {
    if (candidate && typeof candidate === 'object') {
      return candidate;
    }
  }

  return undefined;
};

const mapDraftItemsToBomItems = (items: any[]): BOMItem[] =>
  items.map((item: any) => {
    const storedSlotAssignments = extractSlotAssignments(item);
    const slotAssignments = deserializeSlotAssignments(storedSlotAssignments);
    const rackLayout = extractRackConfiguration(item) || buildRackLayoutFromAssignments(storedSlotAssignments);
    const productPrice = item.unit_price || item.product?.price || 0;

    return {
      id: item.id || crypto.randomUUID(),
      product: {
        id: item.product?.id || item.id || crypto.randomUUID(),
        name: item.name || item.product?.name || 'Unknown Product',
        partNumber: item.partNumber || item.part_number || item.product?.partNumber || 'TBD',
        description: item.description || item.product?.description || '',
        price: productPrice,
      },
      quantity: item.quantity || 1,
      enabled: item.enabled !== false,
      partNumber: item.partNumber || item.part_number || item.product?.partNumber || 'TBD',
      slotAssignments,
      rackConfiguration: rackLayout,
      level4Config: item.level4Config || null,
      level4Selections: item.level4Selections || null,
      parentProduct: item.parentProduct || null,
      configuration: item.configuration || null,
    } as BOMItem;
  });

const mapBomRowsToBomItems = (rows: any[]): BOMItem[] =>
  rows.map(row => {
    const storedSlotAssignments = extractSlotAssignments(row?.configuration_data);
    const slotAssignments = deserializeSlotAssignments(storedSlotAssignments);
    const rackLayout = extractRackConfiguration(row?.configuration_data) || buildRackLayoutFromAssignments(storedSlotAssignments);

    return {
      id: row.id || crypto.randomUUID(),
      product: {
        id: row.product_id || row.id || crypto.randomUUID(),
        name: row.name || 'Unknown Product',
        partNumber: row.part_number || row.partNumber || 'TBD',
        description: row.description || '',
        price: row.unit_price || 0,
      },
      parentProduct: null,
      configuration: row.configuration_data || null,
      quantity: row.quantity || 1,
      enabled: row.enabled !== false,
      partNumber: row.part_number || 'TBD',
      slotAssignments,
      rackConfiguration: rackLayout,
      level4Config: row.configuration_data?.level4Config || null,
      level4Selections: row.configuration_data?.level4Selections || null,
    } as BOMItem;
  });

const QuotePDF = () => {
  const { quoteId } = useParams<{ quoteId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const generatePDF = async () => {
      if (!quoteId) {
        setError('Quote ID is required');
        setLoading(false);
        return;
      }

      try {
        // Fetch quote data
        const { data: quote, error: quoteError } = await supabase
          .from('quotes')
          .select('*')
          .eq('id', quoteId)
          .single();

        if (quoteError || !quote) {
          setError('Quote not found or you do not have access to it');
          setLoading(false);
          return;
        }

        // Fetch BOM items from persistent storage
        const { data: bomRows, error: bomError } = await supabase
          .from('bom_items')
          .select(`
            *,
            bom_level4_values (
              id,
              level4_config_id,
              entries
            )
          `)
          .eq('quote_id', quoteId);

        const normalizedDraftBom = ensureRecord(quote.draft_bom);
        const draftItems = ensureArray(normalizedDraftBom ? normalizedDraftBom['items'] : undefined);
        const hasDraftItems = Array.isArray(draftItems) && draftItems.length > 0;

        let resolvedBomItems: BOMItem[] = [];

        if (hasDraftItems && quote.status === 'draft') {
          resolvedBomItems = mapDraftItemsToBomItems(draftItems as any[]);
        } else if (!bomError && Array.isArray(bomRows) && bomRows.length > 0) {
          resolvedBomItems = mapBomRowsToBomItems(bomRows as any[]);
        } else if (hasDraftItems) {
          console.warn('QuotePDF: falling back to draft_bom data for quote', quoteId);
          resolvedBomItems = mapDraftItemsToBomItems(draftItems as any[]);
        } else {
          if (bomError) {
            throw new Error('Failed to load quote items');
          }
        }

        // Generate PDF using normalized BOM items
        await generateQuotePDF(resolvedBomItems, quote as Partial<Quote>, true, 'download');
        
        setLoading(false);
      } catch (err: any) {
        console.error('Error generating PDF:', err);
        setError(err.message || 'Failed to generate PDF');
        setLoading(false);
      }
    };

    generatePDF();
  }, [quoteId, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-lg font-medium">Generating PDF...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold mb-2">Error</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center max-w-md">
        <div className="text-green-500 text-6xl mb-4">✓</div>
        <p className="text-lg font-medium mb-2">PDF Generated Successfully</p>
        <p className="text-sm text-muted-foreground mb-6">Your quote has been downloaded to your device.</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => window.close()}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
          >
            Close Window
          </button>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuotePDF;
