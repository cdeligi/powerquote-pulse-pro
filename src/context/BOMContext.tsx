
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { BOMItem } from '@/types/product';

interface BOMContextType {
  bomItems: BOMItem[];
  setBomItems: React.Dispatch<React.SetStateAction<BOMItem[]>>;
  addBOMItem: (item: BOMItem) => void;
  updateBOMItem: (id: string, updates: Partial<BOMItem>) => void;
  removeBOMItem: (id: string) => void;
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
  };

  const value: BOMContextType = {
    bomItems,
    setBomItems,
    addBOMItem,
    updateBOMItem,
    removeBOMItem,
  };

  return <BOMContext.Provider value={value}>{children}</BOMContext.Provider>;
};
