import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface BOMBuilderProps {
  isOpen?: boolean;
  onClose?: () => void;
  existingQuoteId?: string;
  mode?: string;
}

export default function BOMBuilder({ isOpen, onClose, existingQuoteId, mode }: BOMBuilderProps) {
  if (!isOpen) return null;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>BOM Builder</CardTitle>
      </CardHeader>
      <CardContent>
        <p>BOM Builder functionality will be available soon.</p>
        <button onClick={onClose}>Close</button>
      </CardContent>
    </Card>
  );
}