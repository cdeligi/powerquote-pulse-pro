
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Quote } from "@/hooks/useQuotes";
import { useConfiguredQuoteFields } from "@/hooks/useConfiguredQuoteFields";

interface QuoteInformationProps {
  quote: Partial<Quote>;
}

export const QuoteInformation = ({ quote }: QuoteInformationProps) => {
  const { formattedFields } = useConfiguredQuoteFields(quote?.quote_fields);
  const priorityBadgeClass = quote?.priority === 'Urgent'
    ? 'bg-red-500'
    : quote?.priority === 'High'
      ? 'bg-orange-500'
      : quote?.priority === 'Medium'
        ? 'bg-yellow-500'
        : 'bg-green-500';

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white">Quote Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {quote?.id && (
            <div>
              <Label className="text-gray-400">Quote ID</Label>
              <p className="text-white font-medium font-mono">{quote.id}</p>
            </div>
          )}
          {(quote?.submitted_by_name || quote?.submitted_by_email) && (
            <div>
              <Label className="text-gray-400">Requested By</Label>
              <p className="text-white font-medium">
                {quote?.submitted_by_name || quote?.submitted_by_email}
              </p>
            </div>
          )}
          {quote?.priority && (
            <div>
              <Label className="text-gray-400">Priority</Label>
              <div className="mt-1">
                <Badge className={`${priorityBadgeClass} text-white`}>{quote.priority}</Badge>
              </div>
            </div>
          )}
        </div>

        {formattedFields.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {formattedFields.map((field) => (
              <div key={field.id} className="space-y-1">
                <Label className="text-gray-400">{field.label}</Label>
                <p className="text-white font-medium break-words">{field.formattedValue}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">
            No configured quote fields were submitted with this request.
          </p>
        )}

      </CardContent>
    </Card>
  );
};
