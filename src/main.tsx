
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.tsx'
import './index.css'

// Create a client with optimized defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: 2,
    },
  },
})

console.log('=== Application Starting ===');
console.log('Environment check:', {
  mode: import.meta.env.MODE,
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL ? 'configured' : 'missing',
  supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'configured' : 'missing'
});

// Enhanced global error handling
window.addEventListener('error', (event) => {
  console.error('=== Global JavaScript Error ===');
  console.error('Message:', event.message);
  console.error('Source:', event.filename);
  console.error('Line:', event.lineno);
  console.error('Column:', event.colno);
  console.error('Error object:', event.error);
  console.error('Stack:', event.error?.stack);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('=== Unhandled Promise Rejection ===');
  console.error('Reason:', event.reason);
  console.error('Promise:', event.promise);
  
  // Prevent the default browser behavior
  event.preventDefault();
});

const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error('❌ Root element not found in DOM!');
  throw new Error('Root element not found');
}

console.log('✅ Root element found, creating React root...');
const root = createRoot(rootElement);

try {
  console.log('📦 Rendering App component...');
  root.render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
  console.log('✅ App rendered successfully');
} catch (error) {
  console.error('❌ Failed to render app:', error);
  console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
  
  // Fallback error UI
  rootElement.innerHTML = `
    <div style="min-height: 100vh; background: #000; color: #fff; display: flex; align-items: center; justify-content: center; flex-direction: column; font-family: system-ui;">
      <h1 style="color: #ef4444; margin-bottom: 16px;">Application Failed to Load</h1>
      <p style="margin-bottom: 20px; color: #9ca3af;">Check the console for detailed error information.</p>
      <button 
        onclick="window.location.reload()" 
        style="padding: 12px 24px; background: #dc2626; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;"
      >
        Reload Application
      </button>
      <div style="margin-top: 24px; padding: 16px; background: #1f2937; border-radius: 8px; max-width: 600px;">
        <h3 style="color: #f3f4f6; margin-bottom: 8px;">Error Details:</h3>
        <pre style="color: #ef4444; font-size: 12px; white-space: pre-wrap;">${error instanceof Error ? error.message : String(error)}</pre>
      </div>
    </div>
  `;
}
