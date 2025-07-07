
import LoginForm from "@/components/auth/LoginForm";
import Dashboard from "@/components/dashboard/Dashboard";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

const Index = () => {
  console.log('Index component rendering...');
  
  const { user, loading, signOut } = useAuth();
  
  console.log('Auth state in Index:', { 
    user: user?.email || 'no user', 
    loading,
    timestamp: new Date().toISOString()
  });

  const handleLogout = async () => {
    console.log('Logout initiated...');
    try {
      const { error } = await signOut();
      if (error) {
        console.error('Logout error:', error);
      } else {
        console.log('Logout successful - redirecting to login');
      }
    } catch (err) {
      console.error('Unexpected logout error:', err);
    }
  };

  if (loading) {
    console.log('Showing loading state...');
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex items-center space-x-2 text-white">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading application...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('No authenticated user, showing login form...');
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <LoginForm onLogin={() => {
          console.log('Login callback triggered');
        }} />
      </div>
    );
  }

  console.log('User authenticated, rendering dashboard for:', user.email);
  return <Dashboard user={user} onLogout={handleLogout} />;
};

export default Index;
