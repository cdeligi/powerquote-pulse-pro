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

interface ModernLoginPageProps {
  onLogin: (user: User) => void;
}

export function ModernLoginPage({ onLogin }: ModernLoginPageProps) {
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
    } catch (error: any) {
      console.error('[LoginForm] Unexpected error:', error);
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  const handleRegistrationSubmit = (request: any) => {
    alert('Registration request submitted successfully! You will receive an email notification once reviewed.');
    setShowRegistration(false);
  };

  if (showRegistration) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-4xl">
          <UserRegistrationForm 
            onSubmit={handleRegistrationSubmit}
            onBack={() => setShowRegistration(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Video Background */}
      <div className="absolute inset-0 -z-10">
        {/* Placeholder gradient until video is added */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-black" />
        {/* 
          Add video here:
          <video 
            autoPlay 
            muted 
            loop 
            playsInline 
            className="h-full w-full object-cover"
          >
            <source src="/path-to-industrial-video.mp4" type="video/mp4" />
          </video>
        */}
        {/* Dark overlay for contrast */}
        <div className="absolute inset-0 bg-black/50" />
      </div>

      {/* Content */}
      <div className="relative flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8">
          {/* Headline Stack */}
          <div className="text-center space-y-2">
            <div className="flex justify-center mb-4">
              <div className="flex items-center space-x-2">
                <Shield className="h-10 w-10 text-red-500" />
                <Zap className="h-10 w-10 text-red-500" />
              </div>
            </div>
            <p className="text-lg text-white/80 font-light">
              Your pipeline, powered by
            </p>
            <h1 className="text-5xl font-bold text-white tracking-tight">
              PowerQuotePro
            </h1>
          </div>

          {/* Glass Card */}
          <Card className="glass-card shadow-2xl border-white/10">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl text-white">Sign In</CardTitle>
              <CardDescription className="text-white/70">
                Access your quoting dashboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive" className="bg-red-950/50 border-red-500/50 backdrop-blur-sm">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-red-200">
                      {error}
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={credentials.email}
                    onChange={(e) => setCredentials(prev => ({ ...prev, email: e.target.value }))}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50 backdrop-blur-sm focus:bg-white/20 focus:border-white/40"
                    placeholder="Enter your email"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-white">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={credentials.password}
                    onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50 backdrop-blur-sm focus:bg-white/20 focus:border-white/40"
                    placeholder="Enter your password"
                    required
                  />
                </div>
                
                <Button
                  type="submit"
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold shadow-lg shadow-red-500/20"
                  disabled={isLoading}
                >
                  {isLoading ? "Starting..." : "Start Quoting"}
                </Button>
              </form>
              
              <div className="mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowRegistration(true)}
                  className="w-full border-white/20 text-white hover:bg-white/10 bg-transparent backdrop-blur-sm"
                >
                  Request Account Access
                </Button>
              </div>
              
              <div className="mt-6 text-sm text-white/60 space-y-2">
                <p className="font-medium text-white/80">Admin Account:</p>
                <div className="space-y-1 text-xs">
                  <p>Email: cdeligi@qualitrolcorp.com</p>
                  <p className="text-white/40">Use your assigned password</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
