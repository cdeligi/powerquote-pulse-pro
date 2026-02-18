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
    
    if (!credentials.email || !credentials.password) {
      setError('Please enter both email and password');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { error: authError } = await signIn(credentials.email, credentials.password);
      
      if (authError) {
        console.error('[LoginForm] Sign in error:', {
          errorCode: authError.code,
          errorMessage: authError.message,
          email: credentials.email
        });
        
        let errorMessage: string;
        switch (authError.code) {
          case 'PGRST116':
            errorMessage = 'User not found. Please check your email address.';
            break;
          case 'PGRST117':
            errorMessage = 'Incorrect password. Please try again.';
            break;
          case 'PGRST118':
            errorMessage = 'Email not confirmed. Please check your inbox for the confirmation email.';
            break;
          default:
            errorMessage = authError.message || 'An error occurred during sign in. Please try again.';
        }
        
        setError(errorMessage);
        setIsLoading(false);
      }
      // If successful, loading state will be managed by auth provider
    } catch (error: any) {
      console.error('[LoginForm] Unexpected error:', error);
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  const handleRegistrationSubmit = (_request: any) => {
    // Registration form now shows an inline confirmation (mobile-friendly) and triggers email notifications.
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
          <div className="flex items-center space-x-2">
            <Shield className="h-8 w-8 text-red-600" />
            <Zap className="h-8 w-8 text-red-600" />
          </div>
        </div>
        <p className="text-lg text-gray-600 dark:text-gray-300 mb-2">Your pipeline, powered by</p>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">PowerQuotePro</h2>
      </div>

      <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">Sign In</CardTitle>
          <CardDescription className="text-gray-500 dark:text-gray-400">
            Access your quoting dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive" className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-600">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-red-800 dark:text-red-400">
                  {error}
                </AlertDescription>
              </Alert>
            )}
            
            <div>
              <Label htmlFor="email" className="text-gray-700 dark:text-white">Email</Label>
              <Input
                id="email"
                type="email"
                value={credentials.email}
                onChange={(e) => setCredentials(prev => ({ ...prev, email: e.target.value }))}
                className="bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white"
                placeholder="Enter your email"
                required
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-gray-700 dark:text-white">Password</Label>
              <Input
                id="password"
                type="password"
                value={credentials.password}
                onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                className="bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white"
                placeholder="Enter your password"
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700 text-white"
              disabled={isLoading}
            >
              {isLoading ? "Starting..." : "Start Quoting"}
            </Button>
          </form>
          
          <div className="mt-4 text-center">
            <Button
              variant="outline"
              onClick={() => setShowRegistration(true)}
              className="w-full border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white bg-transparent dark:bg-gray-900"
            >
              Request Account Access
            </Button>
          </div>
          
          <div className="mt-6 text-sm text-gray-500 dark:text-gray-400">
            <p className="mb-2">Admin Account:</p>
            <div className="space-y-1 text-xs">
              <p>Email: cdeligi@qualitrolcorp.com</p>
              <p className="text-gray-400 dark:text-gray-500">Use your assigned password</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginForm;
