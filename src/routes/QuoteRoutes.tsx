import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import BOMBuilder from '@/components/bom/BOMBuilder';
import QuoteViewer from '@/components/bom/QuoteViewer';
import { BOMProvider } from '@/context/BOMContext';
import { useAuth } from '@/hooks/useAuth';
import { BOMItem } from '@/types/product';

const QuoteRoutes: React.FC = () => {
  const { user } = useAuth();
  
  const handleBOMUpdate = (items: BOMItem[]) => {
    // Handle BOM updates - this could be moved to a context or parent component
    console.log('BOM updated:', items);
  };

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Routes>
      {/* New quote route - opens BOM Builder in create mode */}
      <Route
        path="/new"
        element={
          <BOMProvider>
            <BOMBuilder
              onBOMUpdate={handleBOMUpdate}
              canSeePrices={true}
              canSeeCosts={user.role === 'ADMIN'}
            />
          </BOMProvider>
        }
      />
      
      {/* View quote route - opens quote in view-only mode */}
      <Route path="/:id" element={<QuoteViewer />} />
      
      {/* Redirect old configure routes to new format */}
      <Route
        path="/configure"
        element={
          <BOMProvider>
            <BOMBuilder
              onBOMUpdate={handleBOMUpdate}
              canSeePrices={true}
              canSeeCosts={user.role === 'ADMIN'}
            />
          </BOMProvider>
        }
      />
    </Routes>
  );
};

export default QuoteRoutes;