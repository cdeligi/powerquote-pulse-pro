// Legacy Level 4 Configurator - Replaced by Level4RuntimeModal
// This file is kept for backward compatibility but should be removed once migration is complete

import React from 'react';
import { Level4RuntimeModal } from '@/components/level4/Level4RuntimeModal';
import { BOMItem } from '@/types/product';
import { Level4RuntimePayload } from '@/types/level4';

interface Level4ConfiguratorProps {
  bomItem: BOMItem;
  onSave: (payload: Level4RuntimePayload) => void;
  onCancel: () => void;
}

/**
 * @deprecated Use Level4RuntimeModal instead
 */
export const Level4Configurator: React.FC<Level4ConfiguratorProps> = ({ 
  bomItem, 
  onSave, 
  onCancel 
}) => {
  const handleSave = (payload: Level4RuntimePayload) => {
    onSave(payload);
  };

  return (
    <Level4RuntimeModal
      bomItem={bomItem}
      level3ProductId={bomItem.product.id}
      onSave={handleSave}
      onCancel={onCancel}
    />
  );
};