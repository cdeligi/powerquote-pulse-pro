/**
 * Product theming system for consistent card styling across the app
 */

export interface ProductTheme {
  base: string;
  border: string;
  text: string;
  selected: string;
  badge: string;
  hoverBorder: string;
}

/**
 * Product theme mappings based on product codes/types
 */
export const PRODUCT_THEMES: Record<string, ProductTheme> = {
  'QTMS-LTX': {
    base: 'bg-sky-50 dark:bg-sky-950/20',
    border: 'border-sky-300 dark:border-sky-700',
    text: 'text-sky-900 dark:text-sky-100',
    selected: 'ring-2 ring-sky-500 shadow-lg shadow-sky-500/20',
    badge: 'bg-sky-100 text-sky-800 dark:bg-sky-800 dark:text-sky-100',
    hoverBorder: 'hover:border-sky-400 dark:hover:border-sky-600'
  },
  'QTMS-MTX': {
    base: 'bg-emerald-50 dark:bg-emerald-950/20',
    border: 'border-emerald-300 dark:border-emerald-700',
    text: 'text-emerald-900 dark:text-emerald-100',
    selected: 'ring-2 ring-emerald-500 shadow-lg shadow-emerald-500/20',
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-800 dark:text-emerald-100',
    hoverBorder: 'hover:border-emerald-400 dark:hover:border-emerald-600'
  },
  'QTMS-STX': {
    base: 'bg-amber-50 dark:bg-amber-950/20',
    border: 'border-amber-300 dark:border-amber-700',
    text: 'text-amber-900 dark:text-amber-100',
    selected: 'ring-2 ring-amber-500 shadow-lg shadow-amber-500/20',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-800 dark:text-amber-100',
    hoverBorder: 'hover:border-amber-400 dark:hover:border-amber-600'
  },
  DEFAULT: {
    base: 'bg-slate-50 dark:bg-slate-800/50',
    border: 'border-slate-300 dark:border-slate-600',
    text: 'text-slate-900 dark:text-slate-100',
    selected: 'ring-2 ring-slate-500 shadow-lg shadow-slate-500/20',
    badge: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-100',
    hoverBorder: 'hover:border-slate-400 dark:hover:border-slate-500'
  }
};

/**
 * Get theme for a product based on its code/name
 */
export function getProductTheme(productCode?: string, productName?: string): ProductTheme {
  if (!productCode && !productName) return PRODUCT_THEMES.DEFAULT;
  
  const searchKey = (productCode || productName || '').toUpperCase();
  
  // Check for QTMS variants
  if (searchKey.includes('LTX')) return PRODUCT_THEMES['QTMS-LTX'];
  if (searchKey.includes('MTX')) return PRODUCT_THEMES['QTMS-MTX'];
  if (searchKey.includes('STX')) return PRODUCT_THEMES['QTMS-STX'];
  
  return PRODUCT_THEMES.DEFAULT;
}

/**
 * Generate CSS classes for a themed card
 */
export function getThemedCardClasses(
  theme: ProductTheme,
  isSelected: boolean = false,
  includeHover: boolean = true
): string {
  const classes = [
    theme.base,
    theme.border,
    theme.text,
    'transition-all duration-200'
  ];
  
  if (includeHover) {
    classes.push(theme.hoverBorder);
  }
  
  if (isSelected) {
    classes.push(theme.selected);
  }
  
  return classes.join(' ');
}