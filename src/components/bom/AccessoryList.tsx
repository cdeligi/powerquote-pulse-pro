import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Level3Product } from '@/types/product';

interface AccessoryListProps {
  level3Products: Level3Product[];
  codeMap: Record<string, {
    template: string;
    slot_span: number;
    is_standard?: boolean;
    standard_position?: number | null;
    designated_only?: boolean;
    designated_positions?: number[];
    outside_chassis?: boolean;
    notes?: string | null;
    exclusive_in_slots?: boolean;
    color?: string | null;
  }>;
  selectedAccessories: Set<string>;
  onToggleAccessory: (id: string) => void;
  title?: string;
  description?: string;
}

const AccessoryList = ({
  level3Products,
  codeMap,
  selectedAccessories,
  onToggleAccessory,
  title = "Accessories",
  description = "Optional accessories for this chassis"
}: AccessoryListProps) => {
  // Filter accessories (outside_chassis items)
  const accessories = level3Products
    .filter(p => codeMap[p.id]?.outside_chassis)
    .map(p => {
      const def = codeMap[p.id];
      const template = def?.template;
      const partNumber = template ? String(template).replace(/\{[^}]+\}/g, '') : (p.partNumber || '');
      return {
        product: p,
        selected: selectedAccessories.has(p.id),
        color: def?.color || null,
        partNumber,
        isStandard: def?.is_standard || false
      };
    });

  if (accessories.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {accessories.map(({ product, selected, color, partNumber, isStandard }) => (
            <div
              key={product.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                {/* Color indicator */}
                {color && (
                  <div
                    className="w-4 h-4 rounded border border-border"
                    style={{ backgroundColor: color }}
                  />
                )}
                
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{product.name}</span>
                    {isStandard && (
                      <Badge variant="secondary" className="text-xs">
                        Standard
                      </Badge>
                    )}
                  </div>
                  
                  {product.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {product.description}
                    </p>
                  )}
                  
                  {partNumber && (
                    <p className="text-xs font-mono text-muted-foreground mt-1">
                      Part #: {partNumber}
                    </p>
                  )}
                </div>
              </div>

              <Button
                variant={selected ? "default" : "outline"}
                size="sm"
                onClick={() => onToggleAccessory(product.id)}
              >
                {selected ? 'Remove' : 'Add'}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default AccessoryList;