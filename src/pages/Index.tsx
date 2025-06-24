
import LoginForm from "@/components/auth/LoginForm";
import Dashboard from "@/components/dashboard/Dashboard";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

const Index = () => {
  const { user, loading, signIn, signOut } = useAuth();

  const handleLogout = async () => {
    const { error } = await signOut();
    if (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex items-center space-x-2 text-white">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <LoginForm onLogin={() => {}} signIn={signIn} />
      </div>
    );
  }

  return <Dashboard user={user} onLogout={handleLogout} />;
};

export default Index;
