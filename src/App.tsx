
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ErrorBoundary from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// React Query provider moved to main.tsx

const App = () => {
  console.log('App component rendering...');
  
  return (
    <ErrorBoundary>
      <TooltipProvider>
        <AuthProvider>
          <ErrorBoundary fallback={
            <div className="min-h-screen bg-black flex items-center justify-center">
              <div className="text-white text-center max-w-md">
                <h2 className="text-xl mb-4">Application Loading Error</h2>
                <p className="text-gray-400 mb-6">The application encountered an issue while loading.</p>
                <div className="space-y-2">
                  <button 
                    onClick={() => window.location.reload()} 
                    className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  >
                    Reload Application
                  </button>
                  <button 
                    onClick={() => {
                      localStorage.clear();
                      window.location.reload();
                    }} 
                    className="w-full px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    Clear Data & Reload
                  </button>
                </div>
                <div className="mt-4 text-xs text-gray-500">
                  Press F12 and check the Console tab for detailed error information
                </div>
              </div>
            </div>
          }>
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
      </TooltipProvider>
    </ErrorBoundary>
  );
};

export default App;
