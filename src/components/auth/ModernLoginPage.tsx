import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, LoginCredentials } from "@/types/auth";
import { Activity, Shield, Zap } from "lucide-react";
import UserRegistrationForm from "./UserRegistrationForm";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import qualitrolLogo from "@/assets/qualitrol-logo.png";

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
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)`,
          backgroundSize: '48px 48px'
        }} />
      </div>

      {/* Subtle gradient overlays with Qualitrol red accent */}
      <div className="absolute inset-0 bg-gradient-to-tr from-red-950/20 via-transparent to-slate-950/40" />
      <div className="absolute inset-0 bg-gradient-to-bl from-transparent via-slate-900/50 to-red-950/10" />

      {/* Content */}
      <div className="relative flex min-h-screen items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          
          {/* Left side - Hero content */}
          <div className="space-y-8 text-center lg:text-left">
            {/* Logo and brand */}
            <div className="space-y-6">
              <div className="flex flex-col items-center lg:items-start gap-4">
                <img 
                  src={qualitrolLogo} 
                  alt="Qualitrol" 
                  className="h-12 w-auto"
                />
                <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
                  PowerQuotePro
                </h1>
              </div>
              <p className="text-xl text-slate-300 font-light">
                Quoting at the speed of opportunity
              </p>
            </div>

            {/* Value propositions */}
            <div className="space-y-4 max-w-md mx-auto lg:mx-0">
              <div className="flex items-start gap-3 text-left">
                <div className="mt-1 p-2 rounded-lg bg-red-600/10 border border-red-500/20">
                  <Shield className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">Enterprise-Grade Security</h3>
                  <p className="text-sm text-slate-400">Secure quoting tool with different users access level</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 text-left">
                <div className="mt-1 p-2 rounded-lg bg-cyan-500/10 border border-cyan-400/20">
                  <Zap className="h-5 w-5 text-cyan-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">Instant Configuration</h3>
                  <p className="text-sm text-slate-400">Build complex BOMs in minutes, not weeks</p>
                </div>
              </div>

              <div className="flex items-start gap-3 text-left">
                <div className="mt-1 p-2 rounded-lg bg-red-600/10 border border-red-500/20">
                  <Activity className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">Digital Quoting Approval Process</h3>
                  <p className="text-sm text-slate-400">Every minute counts</p>
                </div>
              </div>
            </div>

            {/* Tagline */}
            <div className="pt-6 border-t border-slate-700/50">
              <p className="text-slate-400 text-sm italic">
                "Trusted by power utility engineers worldwide for precision quoting"
              </p>
            </div>
          </div>

          {/* Right side - Login card */}
          <div className="w-full max-w-md mx-auto lg:mx-0">
            <Card className="shadow-2xl border-slate-700/50 bg-slate-900/80 backdrop-blur-sm">
              <CardHeader className="space-y-1 pb-6">
                <CardTitle className="text-2xl text-white">Welcome Back</CardTitle>
                <CardDescription className="text-slate-400">
                  Sign in to access your quoting dashboard
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <Alert variant="destructive" className="bg-red-950/30 border-red-500/50">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-red-200">
                        {error}
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-200">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={credentials.email}
                      onChange={(e) => setCredentials(prev => ({ ...prev, email: e.target.value }))}
                      className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-red-500 focus:ring-red-500/20"
                      placeholder="your.email@company.com"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-slate-200">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={credentials.password}
                      onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                      className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-red-500 focus:ring-red-500/20"
                      placeholder="Enter your password"
                      required
                    />
                  </div>
                  
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-medium shadow-lg shadow-red-500/20 transition-all duration-200"
                    disabled={isLoading}
                  >
                    {isLoading ? "Signing In..." : "Sign In"}
                  </Button>
                </form>
                
                <div className="mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setShowRegistration(true)}
                    className="w-full border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white transition-all duration-200"
                  >
                    Request Account Access
                  </Button>
                </div>
                
                <div className="mt-6 pt-6 border-t border-slate-700/50 text-sm text-slate-400 space-y-2">
                  <p className="font-medium text-slate-300">Admin Test Account:</p>
                  <div className="space-y-1 text-xs">
                    <p>Email: cdeligi@qualitrolcorp.com</p>
                    <p className="text-slate-500">Use your assigned password</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}