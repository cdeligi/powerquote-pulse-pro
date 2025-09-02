
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { BOMItem } from '@/types/product';
import { Level4BOMValue } from '@/types/level4';

interface BOMContextType {
  bomItems: BOMItem[];
  setBomItems: React.Dispatch<React.SetStateAction<BOMItem[]>>;
  addBOMItem: (item: BOMItem) => void;
  updateBOMItem: (id: string, updates: Partial<BOMItem>) => void;
  removeBOMItem: (id: string) => void;
  selectedItems: Set<string>;
  setSelectedItems: React.Dispatch<React.SetStateAction<Set<string>>>;
  toggleItemSelection: (id: string) => void;
  level4Values: Record<string, Level4BOMValue>;
  setLevel4Value: (bomItemId: string, value: Level4BOMValue) => void;
  getLevel4Summary: (bomItemId: string) => string | null;
}

const BOMContext = createContext<BOMContextType | undefined>(undefined);

export const useBOMContext = () => {
  const context = useContext(BOMContext);
  if (!context) {
    throw new Error('useBOMContext must be used within a BOMProvider');
  }
  return context;
};

interface BOMProviderProps {
  children: ReactNode;
}

export const BOMProvider: React.FC<BOMProviderProps> = ({ children }) => {
  const [bomItems, setBomItems] = useState<BOMItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [level4Values, setLevel4Values] = useState<Record<string, Level4BOMValue>>({});

  const addBOMItem = (item: BOMItem) => {
    setBomItems(prev => [...prev, { ...item, id: item.id || `item-${Date.now()}` }]);
  };

  const updateBOMItem = (id: string, updates: Partial<BOMItem>) => {
    setBomItems(prev => 
      prev.map(item => 
        item.id === id ? { ...item, ...updates } : item
      )
    );
  };

  const removeBOMItem = (id: string) => {
    setBomItems(prev => prev.filter(item => item.id !== id));
    // Clean up related data
    setSelectedItems(prev => {
      const newSelected = new Set(prev);
      newSelected.delete(id);
      return newSelected;
    });
    setLevel4Values(prev => {
      const newValues = { ...prev };
      delete newValues[id];
      return newValues;
    });
  };

  const toggleItemSelection = (id: string) => {
    setSelectedItems(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      return newSelected;
    });
  };

  const setLevel4Value = (bomItemId: string, value: Level4BOMValue) => {
    setLevel4Values(prev => ({
      ...prev,
      [bomItemId]: value
    }));
  };

  const getLevel4Summary = (bomItemId: string): string | null => {
    const value = level4Values[bomItemId];
    if (!value || !value.entries.length) return null;
    
    return `L4: ${value.entries.length} selection${value.entries.length !== 1 ? 's' : ''} configured`;
  };

  const value: BOMContextType = {
    bomItems,
    setBomItems,
    addBOMItem,
    updateBOMItem,
    removeBOMItem,
    selectedItems,
    setSelectedItems,
    toggleItemSelection,
    level4Values,
    setLevel4Value,
    getLevel4Summary,
  };

  return <BOMContext.Provider value={value}>{children}</BOMContext.Provider>;
};
