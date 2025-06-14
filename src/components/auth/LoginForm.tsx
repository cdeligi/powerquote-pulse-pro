
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, LoginCredentials } from "@/types/auth";
import { Shield, Zap, UserPlus } from "lucide-react";
import UserRegistrationForm from "./UserRegistrationForm";

interface LoginFormProps {
  onLogin: (user: User) => void;
}

const LoginForm = ({ onLogin }: LoginFormProps) => {
  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate authentication
    setTimeout(() => {
      // Demo users for different roles
      const demoUsers: Record<string, User> = {
        'sales1@qualitrol.com': {
          id: '1',
          name: 'Sarah Johnson',
          email: 'sales1@qualitrol.com',
          role: 'level1',
          department: 'Sales'
        },
        'sales2@qualitrol.com': {
          id: '2',
          name: 'Mike Chen',
          email: 'sales2@qualitrol.com',
          role: 'level2',
          department: 'Sales'
        },
        'admin@qualitrol.com': {
          id: '3',
          name: 'Jennifer Martinez',
          email: 'admin@qualitrol.com',
          role: 'admin',
          department: 'Operations'
        }
      };

      const user = demoUsers[credentials.email] || {
        id: '1',
        name: 'Demo User',
        email: credentials.email,
        role: 'level1' as const
      };

      onLogin(user);
      setIsLoading(false);
    }, 1000);
  };

  if (showRegistration) {
    return <UserRegistrationForm onBack={() => setShowRegistration(false)} />;
  }

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="text-center">
        <div className="flex justify-center mb-6">
          <div className="flex items-center space-x-2 text-white">
            <Shield className="h-8 w-8 text-red-600" />
            <Zap className="h-8 w-8 text-red-600" />
          </div>
        </div>
        <h2 className="text-3xl font-bold text-white">PowerQuotePro</h2>
        <p className="mt-2 text-gray-400">Qualitrol Transformer Solutions</p>
      </div>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Sign In</CardTitle>
          <CardDescription className="text-gray-400">
            Access your quoting dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-white">Email</Label>
              <Input
                id="email"
                type="email"
                value={credentials.email}
                onChange={(e) => setCredentials(prev => ({ ...prev, email: e.target.value }))}
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="Enter your email"
                required
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-white">Password</Label>
              <Input
                id="password"
                type="password"
                value={credentials.password}
                onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="Enter your password"
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700 text-white"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
          
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-700" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-gray-900 px-2 text-gray-400">Don't have an account?</span>
              </div>
            </div>
            
            <Button
              type="button"
              variant="outline"
              className="w-full mt-4 border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
              onClick={() => setShowRegistration(true)}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Request Account Access
            </Button>
          </div>
          
          <div className="mt-6 text-sm text-gray-400">
            <p className="mb-2">Demo Accounts:</p>
            <div className="space-y-1 text-xs">
              <p>Level 1: sales1@qualitrol.com</p>
              <p>Level 2: sales2@qualitrol.com</p>
              <p>Admin: admin@qualitrol.com</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginForm;
