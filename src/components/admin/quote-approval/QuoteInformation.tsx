
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Quote } from "@/hooks/useQuotes";

interface QuoteInformationProps {
  quote: Partial<Quote>;
}

export const QuoteInformation = ({ quote }: QuoteInformationProps) => {
  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white">Quote Information</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <Label className="text-gray-400">Customer</Label>
            <p className="text-white font-medium">{quote?.customer_name || 'N/A'}</p>
          </div>
          <div>
            <Label className="text-gray-400">Oracle ID</Label>
            <p className="text-white font-medium">{quote?.oracle_customer_id || 'N/A'}</p>
          </div>
          <div>
            <Label className="text-gray-400">SFDC Opportunity</Label>
            <p className="text-white font-medium">{quote?.sfdc_opportunity || 'N/A'}</p>
          </div>
          <div>
            <Label className="text-gray-400">Payment Terms</Label>
            <p className="text-white font-medium">{quote?.payment_terms || 'N/A'}</p>
          </div>
          <div>
            <Label className="text-gray-400">Shipping Terms</Label>
            <p className="text-white font-medium">{quote?.shipping_terms || 'N/A'}</p>
          </div>
          <div>
            <Label className="text-gray-400">Currency</Label>
            <p className="text-white font-medium">{quote?.currency || 'N/A'}</p>
          </div>
        </div>
        
        {quote?.quote_fields && Object.keys(quote.quote_fields).length > 0 && (
          <div className="mt-4">
            <Label className="text-gray-400">Additional Fields</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {Object.entries(quote.quote_fields).map(([key, value]) => (
                <div key={key} className="text-sm">
                  <span className="text-gray-400">{key}:</span>
                  <span className="text-white ml-2">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
