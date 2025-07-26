import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Level1Product, Level2Product, Level3Product } from '@/types/product';
import { productDataService } from '@/services/productDataService';

// Query keys for cache management
export const productQueryKeys = {
  all: ['products'] as const,
  level1: () => [...productQueryKeys.all, 'level1'] as const,
  level2: () => [...productQueryKeys.all, 'level2'] as const,
  level3: () => [...productQueryKeys.all, 'level3'] as const,
  dga: () => [...productQueryKeys.all, 'dga'] as const,
  pd: () => [...productQueryKeys.all, 'pd'] as const,
};

// Hook for Level 1 products with caching
export const useLevel1Products = () => {
  return useQuery({
    queryKey: productQueryKeys.level1(),
    queryFn: () => productDataService.getLevel1Products(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes (replaces cacheTime)
    refetchOnWindowFocus: false,
  });
};

// Hook for Level 2 products with caching
export const useLevel2Products = () => {
  return useQuery({
    queryKey: productQueryKeys.level2(),
    queryFn: () => productDataService.getLevel2Products(),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

// Hook for Level 3 products with caching
export const useLevel3Products = () => {
  return useQuery({
    queryKey: productQueryKeys.level3(),
    queryFn: () => productDataService.getLevel3Products(),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

// Hook for DGA products with caching
export const useDGAProducts = () => {
  return useQuery({
    queryKey: productQueryKeys.dga(),
    queryFn: () => productDataService.getDGAProducts(),
    staleTime: 10 * 60 * 1000, // 10 minutes for specialty products
    gcTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
  });
};

// Hook for PD products with caching
export const usePDProducts = () => {
  return useQuery({
    queryKey: productQueryKeys.pd(),
    queryFn: () => productDataService.getPDProducts(),
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

// Hook for Level 2 products by category with caching
export const useLevel2ProductsByCategory = (category: 'dga' | 'pd' | 'qtms') => {
  return useQuery({
    queryKey: [...productQueryKeys.level2(), category],
    queryFn: () => productDataService.getLevel2ProductsByCategory(category),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: Boolean(category), // Only run if category is provided
  });
};

// Hook to prefetch products (for performance)
export const usePrefetchProducts = () => {
  const queryClient = useQueryClient();

  const prefetchLevel1 = () => {
    queryClient.prefetchQuery({
      queryKey: productQueryKeys.level1(),
      queryFn: () => productDataService.getLevel1Products(),
      staleTime: 5 * 60 * 1000,
    });
  };

  const prefetchLevel2 = () => {
    queryClient.prefetchQuery({
      queryKey: productQueryKeys.level2(),
      queryFn: () => productDataService.getLevel2Products(),
      staleTime: 5 * 60 * 1000,
    });
  };

  const prefetchDGA = () => {
    queryClient.prefetchQuery({
      queryKey: productQueryKeys.dga(),
      queryFn: () => productDataService.getDGAProducts(),
      staleTime: 10 * 60 * 1000,
    });
  };

  const prefetchPD = () => {
    queryClient.prefetchQuery({
      queryKey: productQueryKeys.pd(),
      queryFn: () => productDataService.getPDProducts(),
      staleTime: 10 * 60 * 1000,
    });
  };

  return {
    prefetchLevel1,
    prefetchLevel2,
    prefetchDGA,
    prefetchPD,
  };
};

// Hook to invalidate and refetch product data
export const useProductMutations = () => {
  const queryClient = useQueryClient();

  const invalidateAllProducts = () => {
    queryClient.invalidateQueries({ queryKey: productQueryKeys.all });
  };

  const invalidateLevel1 = () => {
    queryClient.invalidateQueries({ queryKey: productQueryKeys.level1() });
  };

  const invalidateLevel2 = () => {
    queryClient.invalidateQueries({ queryKey: productQueryKeys.level2() });
  };

  const invalidateDGA = () => {
    queryClient.invalidateQueries({ queryKey: productQueryKeys.dga() });
  };

  const invalidatePD = () => {
    queryClient.invalidateQueries({ queryKey: productQueryKeys.pd() });
  };

  return {
    invalidateAllProducts,
    invalidateLevel1,
    invalidateLevel2,
    invalidateDGA,
    invalidatePD,
  };
};