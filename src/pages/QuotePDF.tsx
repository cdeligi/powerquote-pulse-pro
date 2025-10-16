import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { generateQuotePDF } from '@/utils/pdfGenerator';
import { Loader2 } from 'lucide-react';
import type { Quote } from '@/types/quote';
import type { BOMItem } from '@/types/bom';

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

        // Fetch BOM items
        const { data: bomItems, error: bomError } = await supabase
          .from('bom_items')
          .select('*')
          .eq('quote_id', quoteId);

        if (bomError) {
          setError('Failed to load quote items');
          setLoading(false);
          return;
        }

        // Generate PDF using existing utility
        await generateQuotePDF(bomItems || [], quote as Partial<Quote>, true, 'download');
        
        setLoading(false);
        
        // Close window after a short delay
        setTimeout(() => {
          window.close();
        }, 1000);
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
      <div className="text-center">
        <div className="text-green-500 text-6xl mb-4">✓</div>
        <p className="text-lg font-medium">PDF Generated Successfully</p>
        <p className="text-sm text-muted-foreground mt-2">This window will close automatically.</p>
      </div>
    </div>
  );
};

export default QuotePDF;
