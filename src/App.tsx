
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ErrorBoundary from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry on authentication errors
        if (error?.message?.includes('JWT') || error?.message?.includes('auth')) {
          return false;
        }
        // Retry up to 2 times for other errors
        return failureCount < 2;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
      refetchOnMount: true,
    },
  },
});

const App = () => {
  console.log('🚀 PowerQuotePro application starting...', {
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    environment: import.meta.env.MODE
  });
  
  return (
    <ErrorBoundary fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-center max-w-md p-6">
          <h2 className="text-2xl font-bold mb-4 text-red-400">PowerQuotePro Error</h2>
          <p className="text-gray-300 mb-6">
            The application encountered an unexpected error. This may be due to network connectivity, 
            server maintenance, or configuration issues.
          </p>
          <div className="space-y-3">
            <button 
              onClick={() => window.location.reload()} 
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
            >
              Reload Application
            </button>
            <button 
              onClick={() => {
                localStorage.clear();
                sessionStorage.clear();
                window.location.reload();
              }} 
              className="w-full px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Clear Data & Reload
            </button>
          </div>
          <div className="mt-6 p-3 bg-gray-900 rounded-lg">
            <p className="text-xs text-gray-400 mb-2">For technical support:</p>
            <p className="text-xs text-gray-300">
              Check browser console (F12) for detailed error information
            </p>
          </div>
        </div>
      </div>
    }>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ErrorBoundary fallback={
            <div className="min-h-screen bg-black flex items-center justify-center">
              <div className="text-white text-center max-w-md">
                <h2 className="text-xl mb-4">Authentication Error</h2>
                <p className="text-gray-400 mb-6">Unable to initialize authentication system.</p>
                <button 
                  onClick={() => window.location.reload()} 
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                >
                  Reload Application
                </button>
              </div>
            </div>
          }>
            <AuthProvider>
              <ErrorBoundary>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </BrowserRouter>
              </ErrorBoundary>
            </AuthProvider>
          </ErrorBoundary>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
