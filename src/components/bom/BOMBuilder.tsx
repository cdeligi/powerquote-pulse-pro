import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package } from 'lucide-react';

interface BOMBuilderProps {
  isOpen?: boolean;
  onClose?: () => void;
  existingQuoteId?: string;
  mode?: string;
}

export default function BOMBuilder({ isOpen, onClose, existingQuoteId, mode }: BOMBuilderProps) {
  if (!isOpen) return null;
  
  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Package className="h-5 w-5" />
            BOM Builder
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-white space-y-4">
            <p>BOM Builder functionality will be implemented here.</p>
            <p className="text-gray-400">Mode: {mode}</p>
            {existingQuoteId && (
              <p className="text-gray-400">Editing Quote: {existingQuoteId}</p>
            )}
            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Features to Implement:</h3>
              <ul className="space-y-1 text-gray-300">
                <li>• Product Selection</li>
                <li>• Configuration Options</li>
                <li>• Pricing Calculations</li>
                <li>• Part Number Generation</li>
              </ul>
            </div>
            {onClose && (
              <Button 
                onClick={onClose}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Close
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}