import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface LegalDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentType: 'terms' | 'privacy';
}

const LegalDocumentModal = ({ isOpen, onClose, documentType }: LegalDocumentModalProps) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchContent = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('legal_pages')
        .select('content')
        .eq('slug', documentType)
        .single();

      if (error) throw error;

      setContent(data?.content || '');
    } catch (error) {
      console.error('Error fetching legal content:', error);
      setContent('Unable to load content. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchContent();
    }
  }, [isOpen, documentType]);

  const title = documentType === 'terms' ? 'Terms of Service' : 'Privacy Policy';

  // Simple markdown to HTML converter for basic formatting
  const formatContent = (text: string) => {
    return text
      .replace(/^# (.*$)/gim, '<h1 class="text-xl font-bold mb-4 text-white">$1</h1>')
      .replace(/^## (.*$)/gim, '<h2 class="text-lg font-semibold mb-3 text-white">$1</h2>')
      .replace(/^### (.*$)/gim, '<h3 class="text-md font-medium mb-2 text-white">$1</h3>')
      .replace(/^\- (.*$)/gim, '<li class="ml-4 mb-1 text-gray-300">$1</li>')
      .replace(/\n\n/g, '</p><p class="mb-3 text-gray-300">')
      .replace(/^(.*)$/gim, '<p class="mb-3 text-gray-300">$1</p>');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-800 max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-white">{title}</DialogTitle>
        </DialogHeader>
        
        <div className="overflow-y-auto max-h-[60vh] pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
              <span className="ml-2 text-white">Loading {title.toLowerCase()}...</span>
            </div>
          ) : (
            <div 
              className="prose prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: formatContent(content) }}
            />
          )}
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-800">
          <Button
            onClick={onClose}
            variant="outline"
            className="text-white border-gray-600 hover:bg-gray-800"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LegalDocumentModal;