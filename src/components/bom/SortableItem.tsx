
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { BOMItem } from '@/types/product';
import { BOMItemCard } from './BOMItemCard';

interface SortableItemProps {
  item: BOMItem;
  onEdit?: (item: BOMItem) => void;
  onDelete?: (id: string) => void;
  canSeePrices?: boolean;
}

export const SortableItem: React.FC<SortableItemProps> = ({ item, onEdit, onDelete, canSeePrices }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: item.id! });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <BOMItemCard 
        item={item} 
        onEdit={onEdit} 
        onDelete={onDelete} 
        canSeePrices={canSeePrices} 
      />
    </div>
  );
};
