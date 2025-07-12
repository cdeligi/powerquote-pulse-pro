import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Package } from 'lucide-react';

interface BOMItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  partNumber?: string;
}

interface BOMDisplayProps {
  items?: BOMItem[];
  showPrices?: boolean;
}

export default function BOMDisplay({ items = [], showPrices = false }: BOMDisplayProps) {
  const totalValue = items.reduce((sum, item) => sum + item.totalPrice, 0);

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Bill of Materials
          <Badge variant="secondary" className="ml-auto">
            {items.length} items
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No items in BOM yet</p>
            <p className="text-sm">Add products to see them here</p>
          </div>
        ) : (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-800">
                  <TableHead className="text-gray-300">Item</TableHead>
                  <TableHead className="text-gray-300">Part Number</TableHead>
                  <TableHead className="text-gray-300 text-right">Qty</TableHead>
                  {showPrices && (
                    <>
                      <TableHead className="text-gray-300 text-right">Unit Price</TableHead>
                      <TableHead className="text-gray-300 text-right">Total</TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id} className="border-gray-800">
                    <TableCell>
                      <div>
                        <p className="text-white font-medium">{item.name}</p>
                        {item.description && (
                          <p className="text-gray-400 text-sm">{item.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-300 font-mono text-sm">
                      {item.partNumber || '—'}
                    </TableCell>
                    <TableCell className="text-right text-white">{item.quantity}</TableCell>
                    {showPrices && (
                      <>
                        <TableCell className="text-right text-white">
                          ${item.unitPrice.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-white font-medium">
                          ${item.totalPrice.toLocaleString()}
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {showPrices && (
              <div className="border-t border-gray-800 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300 font-medium">Total Value:</span>
                  <span className="text-white text-lg font-bold">${totalValue.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}