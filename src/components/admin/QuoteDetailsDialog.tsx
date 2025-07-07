
/**
 * © 2025 Qualitrol Corp. All rights reserved.
 * Confidential and proprietary. Unauthorized copying or distribution is prohibited.
 */

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import BOMBuilder from '@/components/bom/BOMBuilder';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  DollarSign, 
  Package, 
  User, 
  Calendar,
  Settings,
  Edit3
} from 'lucide-react';

interface QuoteDetailsDialogProps {
  quote: any;
  isOpen: boolean;
  onClose: () => void;
  onQuoteUpdated?: () => void;
}

const QuoteDetailsDialog: React.FC<QuoteDetailsDialogProps> = ({
  quote,
  isOpen,
  onClose,
  onQuoteUpdated
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [bomItems, setBomItems] = useState<any[]>([]);
  const [showBOMBuilder, setShowBOMBuilder] = useState(false);

  React.useEffect(() => {
    if (quote && isOpen) {
      fetchBOMItems();
    }
  }, [quote, isOpen]);

  const fetchBOMItems = async () => {
    if (!quote) return;
    
    try {
      const { data, error } = await supabase
        .from('bom_items')
        .select('*')
        .eq('quote_id', quote.id);

      if (error) throw error;
      setBomItems(data || []);
    } catch (error) {
      console.error('Error fetching BOM items:', error);
    }
  };

  const handleStatusUpdate = async (newStatus: string, notes?: string) => {
    if (!quote || !user) return;

    setLoading(true);
    try {
      const updateData: any = {
        status: newStatus,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString()
      };

      if (notes) {
        updateData.approval_notes = notes;
      }

      const { error } = await supabase
        .from('quotes')
        .update(updateData)
        .eq('id', quote.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Quote ${newStatus === 'approved' ? 'approved' : 'rejected'} successfully`,
      });

      onQuoteUpdated?.();
      onClose();
    } catch (error) {
      console.error('Error updating quote:', error);
      toast({
        title: "Error",
        description: "Failed to update quote status",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    }
  };

  if (!quote) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white flex items-center gap-2">
              <Package className="w-5 h-5" />
              Quote Details - {quote.id}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Quote Header */}
            <Card className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-gray-900 dark:text-white">{quote.customer_name}</CardTitle>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                      Oracle ID: {quote.oracle_customer_id} | SFDC: {quote.sfdc_opportunity}
                    </p>
                  </div>
                  <Badge className={`${getStatusColor(quote.status)} flex items-center gap-1`}>
                    {getStatusIcon(quote.status)}
                    {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                  </Badge>
                </div>
              </CardHeader>
            </Card>

            {/* Financial Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-blue-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Original Value</span>
                  </div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    ${quote.original_quote_value?.toFixed(2) || '0.00'}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Discounted Value</span>
                  </div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    ${quote.discounted_value?.toFixed(2) || '0.00'}
                  </p>
                  {quote.requested_discount > 0 && (
                    <p className="text-sm text-red-600 dark:text-red-400">
                      -{quote.requested_discount}% discount
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Margin</span>
                  </div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {quote.discounted_margin?.toFixed(1) || '0.0'}%
                  </p>
                  {user?.role === 'admin' || user?.role === 'finance' ? (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Cost: ${quote.total_cost?.toFixed(2) || '0.00'}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            </div>

            {/* BOM Items */}
            <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Bill of Materials ({bomItems.length} items)
                  </CardTitle>
                  {(user?.role === 'admin' || user?.role === 'finance') && (
                    <Button
                      onClick={() => setShowBOMBuilder(true)}
                      variant="outline"
                      size="sm"
                      className="border-blue-300 text-blue-600 hover:bg-blue-50 dark:border-blue-600 dark:text-blue-400 dark:hover:bg-blue-900"
                    >
                      <Edit3 className="w-4 h-4 mr-2" />
                      Edit Configuration
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {bomItems.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-white">{item.name}</h4>
                        {item.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">{item.description}</p>
                        )}
                        {item.configuration_data && (
                          <div className="flex items-center gap-2 mt-1">
                            <Settings className="w-3 h-3 text-gray-500" />
                            <span className="text-xs text-gray-500 dark:text-gray-500">
                              Configured
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {item.quantity} × ${item.unit_price?.toFixed(2) || '0.00'}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          = ${((item.quantity || 0) * (item.unit_price || 0)).toFixed(2)}
                        </p>
                        {(user?.role === 'admin' || user?.role === 'finance') && (
                          <p className="text-xs text-gray-500 dark:text-gray-500">
                            Margin: {item.unit_price > 0 ? (((item.unit_price - (item.unit_cost || 0)) / item.unit_price) * 100).toFixed(1) : '0.0'}%
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quote Information */}
            {quote.quote_fields && (
              <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="text-gray-900 dark:text-white">Quote Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Payment Terms</p>
                      <p className="font-medium text-gray-900 dark:text-white">{quote.payment_terms}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Shipping Terms</p>
                      <p className="font-medium text-gray-900 dark:text-white">{quote.shipping_terms}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Discount Justification */}
            {quote.discount_justification && (
              <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="text-gray-900 dark:text-white">Discount Justification</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 dark:text-gray-300">{quote.discount_justification}</p>
                </CardContent>
              </Card>
            )}

            {/* Submission Info */}
            <Card className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Submitted by {quote.submitted_by_name} ({quote.submitted_by_email})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {new Date(quote.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            {quote.status === 'pending' && (user?.role === 'admin' || user?.role === 'finance') && (
              <div className="flex gap-3">
                <Button
                  onClick={() => handleStatusUpdate('approved')}
                  disabled={loading}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve Quote
                </Button>
                <Button
                  onClick={() => handleStatusUpdate('rejected')}
                  disabled={loading}
                  variant="destructive"
                  className="flex-1"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject Quote
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* BOM Builder Modal for Admin Editing */}
      <BOMBuilder
        isOpen={showBOMBuilder}
        onClose={() => setShowBOMBuilder(false)}
        existingQuoteId={quote.id}
        mode="admin-edit"
      />
    </>
  );
};

export default QuoteDetailsDialog;
