
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, LoginCredentials } from "@/types/auth";
import { Shield, Zap } from "lucide-react";
import UserRegistrationForm from "./UserRegistrationForm";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface LoginFormProps {
  onLogin: (user: User) => void;
}

const LoginForm = ({ onLogin }: LoginFormProps) => {
  const { signIn } = useAuth();
  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      const { error } = await signIn(credentials.email, credentials.password);
      
      if (error) {
        console.error('Login error:', error);
        if (error.message?.includes('Invalid login credentials')) {
          setError('Invalid email or password. Please check your credentials and try again.');
        } else if (error.message?.includes('Email not confirmed')) {
          setError('Please check your email and click the confirmation link before signing in.');
        } else {
          setError(error.message || 'An error occurred during sign in. Please try again.');
        }
      }
      // Success will be handled by the auth hook in the parent component
    } catch (error) {
      console.error('Unexpected error:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegistrationSubmit = (request: any) => {
    console.log('Registration request submitted:', request);
    alert('Registration request submitted successfully! You will receive an email notification once reviewed.');
    setShowRegistration(false);
  };

  if (showRegistration) {
    return (
      <div className="w-full max-w-4xl space-y-8">
        <UserRegistrationForm 
          onSubmit={handleRegistrationSubmit}
          onBack={() => setShowRegistration(false)}
        />
      </div>
    );
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
            {error && (
              <Alert className="bg-red-900/20 border-red-600">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-red-400">
                  {error}
                </AlertDescription>
              </Alert>
            )}
            
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
          
          <div className="mt-4 text-center">
            <Button
              variant="outline"
              onClick={() => setShowRegistration(true)}
              className="w-full border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white bg-gray-900"
            >
              Request Account Access
            </Button>
          </div>
          
          <div className="mt-6 text-sm text-gray-400">
            <p className="mb-2">Admin Account:</p>
            <div className="space-y-1 text-xs">
              <p>Email: cdeligi@qualitrolcorp.com</p>
              <p className="text-gray-500">Use your assigned password</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginForm;
