
export const dataDebugUtils = {
  clearLocalStorage: () => {
    console.log('Clearing all product data from localStorage...');
    localStorage.removeItem('level1Products');
    localStorage.removeItem('level2Products');
    localStorage.removeItem('level3Products');
    localStorage.removeItem('level4Products');
    localStorage.removeItem('assetTypes');
    localStorage.removeItem('analogSensorTypes');
    localStorage.removeItem('bushingTapModels');
    console.log('LocalStorage cleared');
  },

  logStorageState: () => {
    console.log('=== Current Storage State ===');
    console.log('Level 1 Products:', JSON.parse(localStorage.getItem('level1Products') || '[]').length);
    console.log('Level 2 Products:', JSON.parse(localStorage.getItem('level2Products') || '[]').length);
    console.log('Level 3 Products:', JSON.parse(localStorage.getItem('level3Products') || '[]').length);
    console.log('Level 4 Products:', JSON.parse(localStorage.getItem('level4Products') || '[]').length);
    console.log('Asset Types:', JSON.parse(localStorage.getItem('assetTypes') || '[]').length);
  },

  validateProductRelationships: (l1Products: any[], l2Products: any[], l3Products: any[]) => {
    console.log('=== Validating Product Relationships ===');
    
    // Check Level 2 products have valid Level 1 parents
    const invalidL2 = l2Products.filter(l2 => 
      !l1Products.find(l1 => l1.id === l2.parentProductId)
    );
    if (invalidL2.length > 0) {
      console.warn('Level 2 products with invalid parents:', invalidL2.map(p => p.name));
    }

    // Check Level 3 products have valid Level 2 parents
    const invalidL3 = l3Products.filter(l3 => 
      !l2Products.find(l2 => l2.id === l3.parentProductId)
    );
    if (invalidL3.length > 0) {
      console.warn('Level 3 products with invalid parents:', invalidL3.map(p => p.name));
    }

    console.log('Relationship validation complete');
  }
};

// Expose to window for debugging
if (typeof window !== 'undefined') {
  (window as any).dataDebug = dataDebugUtils;
}
