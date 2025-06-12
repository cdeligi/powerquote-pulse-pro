
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import LoginForm from "@/components/auth/LoginForm";
import Dashboard from "@/components/dashboard/Dashboard";
import { User } from "@/types/auth";

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  const handleLogin = (userData: User) => {
    setUser(userData);
    console.log("User logged in:", userData);
  };

  const handleLogout = () => {
    setUser(null);
    console.log("User logged out");
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <LoginForm onLogin={handleLogin} />
      </div>
    );
  }

  return <Dashboard user={user} onLogout={handleLogout} />;
};

export default Index;
