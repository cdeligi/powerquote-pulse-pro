
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, LoginCredentials } from "@/types/auth";
import { Shield, Zap } from "lucide-react";

interface LoginFormProps {
  onLogin: (user: User) => void;
}

const LoginForm = ({ onLogin }: LoginFormProps) => {
  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);

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

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="text-center">
        <div className="flex justify-center mb-6">
          <img 
            src="/lovable-uploads/cc373a5b-67a2-4d94-b6bf-cc2883c8d347.png" 
            alt="Qualitrol Logo"
            className="h-16 w-auto"
          />
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
