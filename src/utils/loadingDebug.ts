
export const loadingDebugUtils = {
  clearAllStorage: () => {
    console.log('🔧 Clearing all storage...');
    localStorage.clear();
    sessionStorage.clear();
    console.log('✅ Storage cleared');
  },

  checkAuthState: async () => {
    console.log('🔍 Checking auth state...');
    const { supabase } = await import('@/integrations/supabase/client');
    
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      console.log('Auth session:', session?.user?.email || 'No session');
      console.log('Auth error:', error);
      
      if (session?.user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        console.log('Profile:', profile);
        console.log('Profile error:', profileError);
      }
    } catch (err) {
      console.error('Auth check failed:', err);
    }
  },

  checkProductService: () => {
    console.log('🔍 Checking product service...');
    const { productDataService } = require('@/services/productDataService');
    console.log('Product service debug info:', productDataService.getDebugInfo());
  },

  forceReload: () => {
    console.log('🔄 Force reloading page...');
    window.location.reload();
  },

  runFullDiagnostic: async () => {
    console.log('🩺 Running full diagnostic...');
    await loadingDebugUtils.checkAuthState();
    loadingDebugUtils.checkProductService();
    console.log('✅ Diagnostic complete');
  }
};

// Expose to window for easy debugging
if (typeof window !== 'undefined') {
  (window as any).loadingDebug = loadingDebugUtils;
}
