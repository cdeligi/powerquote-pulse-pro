import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ExchangeRateDisplayProps {
  currentCurrency: string;
  rates: any | null;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export const ExchangeRateDisplay = ({ 
  currentCurrency, 
  rates, 
  onRefresh,
  isRefreshing = false 
}: ExchangeRateDisplayProps) => {
  if (!rates) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {currentCurrency} - Rates Loading
        </Badge>
      </div>
    );
  }

  const fetchedAt = rates.fetchedAt ? new Date(rates.fetchedAt) : null;
  const isStale = fetchedAt && (Date.now() - fetchedAt.getTime()) > 3600000; // 1 hour

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <div className="flex items-center gap-2">
          <Badge 
            variant={isStale ? "destructive" : "secondary"} 
            className="cursor-pointer flex items-center gap-1"
          >
            {isStale && <AlertCircle className="h-3 w-3" />}
            {currentCurrency}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="h-7 w-7 p-0"
          >
            <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="w-64">
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Exchange Rates (USD Base)</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {Object.entries(rates.rates || {}).map(([currency, rate]) => (
              <div key={currency} className="flex justify-between">
                <span className="font-medium">{currency}:</span>
                <span>{Number(rate).toFixed(4)}</span>
              </div>
            ))}
          </div>
          {fetchedAt && (
            <div className="text-xs text-muted-foreground mt-2 pt-2 border-t">
              Last updated: {formatDistanceToNow(fetchedAt, { addSuffix: true })}
            </div>
          )}
          {isStale && (
            <div className="text-xs text-destructive mt-2">
              ⚠️ Rates are more than 1 hour old. Click refresh to update.
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};
