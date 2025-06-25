
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { BOMItem } from '@/types/product';
import { User } from '@/types/auth';
import { supabase } from '@/integrations/supabase/client';
import { calculateItemCost, calculateItemRevenue, calculateItemMargin } from '@/utils/marginCalculations';
import { 
  extractQTMSComponents, 
  validateQTMSComponents, 
  isDynamicProduct, 
  isQTMSConfiguration 
} from '@/utils/qtmsValidation';

interface QuoteSubmissionDialogProps {
  bomItems: BOMItem[];
  quoteFields: Record<string, any>;
  discountPercentage: number;
  discountJustification: string;
  onSubmit: (quoteId: string) => void;
  onClose: () => void;
  canSeePrices: boolean;
  user: User;
}

const QuoteSubmissionDialog = ({
  bomItems,
  quoteFields,
  discountPercentage,
  discountJustification,
  onSubmit,
  onClose,
  canSeePrices,
  user
}: QuoteSubmissionDialogProps) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateTotals = () => {
    const originalValue = bomItems.reduce((total, item) => {
      return total + calculateItemRevenue(item);
    }, 0);
    
    const discountAmount = originalValue * (discountPercentage / 100);
    const discountedValue = originalValue - discountAmount;
    
    return {
      originalValue,
      discountAmount,
      discountedValue
    };
  };

  const validateRequiredFields = () => {
    // Check for required quote fields that are empty
    const requiredFields = Object.keys(quoteFields).filter(key => 
      quoteFields[key] === '' || quoteFields[key] === null || quoteFields[key] === undefined
    );
    
    return requiredFields.length === 0;
  };

  const validateProductsExist = async () => {
    console.log('Validating products exist in database...');
    
    // Separate standard products from dynamic configurations
    const standardProducts: string[] = [];
    const dynamicConfigurations: BOMItem[] = [];
    
    bomItems.forEach(item => {
      if (isDynamicProduct(item)) {
        dynamicConfigurations.push(item);
      } else {
        standardProducts.push(item.product.id);
      }
    });

    console.log('Standard products to validate:', standardProducts);
    console.log('Dynamic configurations to validate:', dynamicConfigurations.length);

    // Validate standard products
    if (standardProducts.length > 0) {
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id')
        .in('id', standardProducts);
      
      if (productsError) {
        console.error('Error checking standard products:', productsError);
        throw new Error(`Failed to validate standard products: ${productsError.message}`);
      }
      
      const existingProductIds = new Set(products?.map(p => p.id) || []);
      const missingProducts = standardProducts.filter(id => !existingProductIds.has(id));
      
      if (missingProducts.length > 0) {
        console.error('Missing standard products in database:', missingProducts);
        throw new Error(`Standard products not found in database: ${missingProducts.join(', ')}`);
      }
    }

    // Validate components for dynamic configurations
    for (const config of dynamicConfigurations) {
      if (isQTMSConfiguration(config)) {
        const componentIds = extractQTMSComponents(config);
        console.log(`Validating QTMS configuration ${config.product.id} components:`, componentIds);
        
        const validationResult = await validateQTMSComponents(componentIds);
        
        if (!validationResult.isValid) {
          console.error(`QTMS configuration ${config.product.id} has missing components:`, validationResult.missingComponents);
          throw new Error(`QTMS configuration ${config.product.name} has missing components: ${validationResult.missingComponents.join(', ')}`);
        }
      }
    }
    
    console.log('All products and configurations validated successfully');
    return true;
  };

  const createBOMItemData = (item: BOMItem, quoteId: string) => {
    const itemRevenue = calculateItemRevenue(item);
    const itemCost = calculateItemCost(item);
    const itemMargin = calculateItemMargin(item);

    const baseData = {
      quote_id: quoteId,
      name: item.product.name,
      description: item.product.description || '',
      part_number: item.partNumber || item.product.partNumber || item.product.id,
      quantity: item.quantity,
      unit_price: item.product.price || 0,
      unit_cost: item.product.cost || (item.product.price || 0) * 0.6,
      total_price: itemRevenue,
      total_cost: itemCost,
      margin: itemMargin
    };

    // Use placeholder product IDs for dynamic configurations to avoid foreign key issues
    if (isDynamicProduct(item)) {
      if (isQTMSConfiguration(item)) {
        return {
          ...baseData,
          product_id: 'QTMS_CONFIGURATION',
          product_type: 'qtms_configuration',
          configuration_data: item.configuration || null
        };
      } else {
        return {
          ...baseData,
          product_id: 'DGA_CONFIGURATION',
          product_type: 'dga_configuration',
          configuration_data: item.configuration || null
        };
      }
    }

    return {
      ...baseData,
      product_id: item.product.id,
      product_type: 'standard'
    };
  };

  const handleSubmit = async () => {
    console.log('Starting quote submission for user:', user);
    
    if (!validateRequiredFields()) {
      setError('Please fill in all required fields');
      return;
    }

    if (!user || !user.id) {
      setError('User authentication required. Please log in again.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Validate products and configurations exist in database
      await validateProductsExist();
      
      const { originalValue, discountedValue } = calculateTotals();
      const quoteId = `QUOTE-${Date.now()}`;

      // Calculate total costs and margins using the utility functions
      const totalCost = bomItems.reduce((total, item) => {
        return total + calculateItemCost(item);
      }, 0);

      const originalMargin = originalValue > 0 ? ((originalValue - totalCost) / originalValue) * 100 : 0;
      const discountedMargin = discountedValue > 0 ? ((discountedValue - totalCost) / discountedValue) * 100 : 0;

      console.log('Submitting quote with data:', {
        quoteId,
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        originalValue,
        discountedValue,
        totalCost,
        originalMargin,
        discountedMargin
      });

      // Submit quote to database
      const { error: quoteError } = await supabase
        .from('quotes')
        .insert({
          id: quoteId,
          user_id: user.id,
          customer_name: quoteFields.customerName || 'Unknown Customer',
          oracle_customer_id: quoteFields.oracleCustomerId || '',
          sfdc_opportunity: quoteFields.sfdcOpportunity || `OPP-${Date.now()}`,
          priority: quoteFields.priority || 'Medium',
          shipping_terms: quoteFields.shippingTerms || 'Ex-Works',
          payment_terms: quoteFields.paymentTerms || '30',
          currency: quoteFields.currency || 'USD',
          original_quote_value: originalValue,
          discounted_value: discountedValue,
          requested_discount: discountPercentage,
          discount_justification: discountJustification,
          original_margin: originalMargin,
          discounted_margin: discountedMargin,
          total_cost: totalCost,
          gross_profit: discountedValue - totalCost,
          is_rep_involved: quoteFields.isRepInvolved || false,
          quote_fields: quoteFields,
          status: 'pending',
          submitted_by_name: user.name,
          submitted_by_email: user.email
        });

      if (quoteError) {
        console.error('Quote insertion error:', quoteError);
        throw new Error(`Failed to create quote: ${quoteError.message}`);
      }

      console.log('Quote created successfully, now creating BOM items...');

      // Submit BOM items with enhanced configuration data
      const bomItemsData = bomItems.map(item => createBOMItemData(item, quoteId));

      console.log('BOM items data to insert:', bomItemsData);

      const { error: bomError } = await supabase
        .from('bom_items')
        .insert(bomItemsData);

      if (bomError) {
        console.error('BOM items insertion error:', bomError);
        throw new Error(`Failed to create BOM items: ${bomError.message}`);
      }

      console.log('Quote and BOM items created successfully');
      onSubmit(quoteId);
    } catch (error) {
      console.error('Error submitting quote:', error);
      setError(error instanceof Error ? error.message : 'Failed to submit quote. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const { originalValue, discountAmount, discountedValue } = calculateTotals();
  const isValid = validateRequiredFields();

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center">
            <FileText className="mr-2 h-5 w-5" />
            Submit Quote Request
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* User Info Display */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Submitted By</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-300">Name:</span>
                  <span className="text-white">{user.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Email:</span>
                  <span className="text-white">{user.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Role:</span>
                  <span className="text-white capitalize">{user.role}</span>
                </div>
                {user.department && (
                  <div className="flex justify-between">
                    <span className="text-gray-300">Department:</span>
                    <span className="text-white">{user.department}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Validation Status */}
          {!isValid && (
            <Alert className="bg-red-900/20 border-red-600">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-400">
                Please fill in all required fields before submitting the quote.
              </AlertDescription>
            </Alert>
          )}

          {/* Quote Summary */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Quote Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-300">Total Items:</span>
                  <span className="text-white">{bomItems.length}</span>
                </div>
                
                {canSeePrices && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Original Value:</span>
                      <span className="text-white">${originalValue.toLocaleString()}</span>
                    </div>
                    
                    {discountPercentage > 0 && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-300">Discount ({discountPercentage}%):</span>
                          <span className="text-red-400">-${discountAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between font-bold border-t border-gray-600 pt-2">
                          <span className="text-white">Final Value:</span>
                          <span className="text-green-400">${discountedValue.toLocaleString()}</span>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* BOM Items Preview */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Bill of Materials</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {bomItems.map((item, index) => (
                  <div key={index} className="flex justify-between items-center text-sm">
                    <div>
                      <span className="text-white">{item.product.name}</span>
                      <span className="text-gray-400 ml-2">x{item.quantity}</span>
                      {isDynamicProduct(item) && (
                        <Badge variant="outline" className="ml-2 text-xs text-blue-400 border-blue-400">
                          Configured
                        </Badge>
                      )}
                    </div>
                    {canSeePrices && (
                      <span className="text-gray-300">
                        ${calculateItemRevenue(item).toLocaleString()}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quote Fields Preview */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Quote Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                {Object.entries(quoteFields).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-gray-400 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                    <span className="text-white">{value || '—'}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {error && (
            <Alert className="bg-red-900/20 border-red-600">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-400">
                {error}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex space-x-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-gray-600 text-white hover:bg-gray-800"
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-green-600 hover:bg-green-700 text-white"
            disabled={submitting || !isValid}
          >
            {submitting ? 'Submitting...' : 'Submit Quote'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default QuoteSubmissionDialog;
