
// Re-export all types and interfaces
export * from './interfaces';
export * from './quote-types';
export * from './type-guards';
export * from './sensor-config';
export * from './part-number-utils';

// Add missing Product type export
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  cost: number;
  category: string;
  subcategory: string;
}
