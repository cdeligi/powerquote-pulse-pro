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
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, rgb(0,0,0) 1px, transparent 0)`,
          backgroundSize: '32px 32px'
        }} />
      </div>

      {/* Accent gradients */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-red-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-slate-500/5 rounded-full blur-3xl" />

      {/* Content */}
      <div className="relative flex min-h-screen items-center justify-center p-6 sm:p-8">
        <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          
          {/* Left side - Hero content */}
          <div className="space-y-12 text-center lg:text-left order-2 lg:order-1">
            {/* Logo and brand */}
            <div className="space-y-8">
              <div className="space-y-6">
                <img 
                  src={qualitrolLogo} 
                  alt="Qualitrol" 
                  className="h-10 w-auto mx-auto lg:mx-0"
                />
                <div className="space-y-3">
                  <h1 className="text-5xl sm:text-6xl font-bold text-slate-900 tracking-tight">
                    PowerQuotePro
                  </h1>
                  <p className="text-xl text-slate-600 font-light max-w-lg mx-auto lg:mx-0">
                    Quoting at the speed of opportunity
                  </p>
                </div>
              </div>
            </div>

            {/* Value propositions */}
            <div className="space-y-6 max-w-lg mx-auto lg:mx-0">
              <div className="flex items-start gap-4 text-left p-4 rounded-xl bg-white/50 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
                <div className="mt-0.5 p-2.5 rounded-lg bg-red-50 border border-red-100">
                  <Shield className="h-5 w-5 text-red-600" strokeWidth={2} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1.5">Enterprise-Grade Security</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">Secure quoting tool with different users access level</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 text-left p-4 rounded-xl bg-white/50 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
                <div className="mt-0.5 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <Zap className="h-5 w-5 text-slate-700" strokeWidth={2} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1.5">Instant Configuration</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">Build complex BOMs in minutes, not weeks</p>
                </div>
              </div>

              <div className="flex items-start gap-4 text-left p-4 rounded-xl bg-white/50 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
                <div className="mt-0.5 p-2.5 rounded-lg bg-red-50 border border-red-100">
                  <Activity className="h-5 w-5 text-red-600" strokeWidth={2} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1.5">Digital Quoting Approval Process</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">Every minute counts</p>
                </div>
              </div>
            </div>

            {/* Tagline */}
            <div className="pt-8 border-t border-slate-200">
              <p className="text-slate-500 text-sm leading-relaxed max-w-md mx-auto lg:mx-0">
                Trusted by power utility engineers worldwide for precision quoting
              </p>
            </div>
          </div>

          {/* Right side - Login card */}
          <div className="w-full max-w-md mx-auto lg:mx-0 order-1 lg:order-2">
            <Card className="shadow-xl border-slate-200 bg-white">
              <CardHeader className="space-y-2 pb-8 pt-8">
                <CardTitle className="text-3xl text-slate-900 font-bold">Welcome back</CardTitle>
                <CardDescription className="text-slate-600 text-base">
                  Sign in to your account
                </CardDescription>
              </CardHeader>
              <CardContent className="px-8 pb-8">
                <form onSubmit={handleSubmit} className="space-y-5">
                  {error && (
                    <Alert variant="destructive" className="bg-red-50 border-red-200">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-800">
                        {error}
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="space-y-2.5">
                    <Label htmlFor="email" className="text-slate-700 font-medium text-sm">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={credentials.email}
                      onChange={(e) => setCredentials(prev => ({ ...prev, email: e.target.value }))}
                      className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-red-500 focus:ring-red-500/20 h-11"
                      placeholder="name@company.com"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2.5">
                    <Label htmlFor="password" className="text-slate-700 font-medium text-sm">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={credentials.password}
                      onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                      className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-red-500 focus:ring-red-500/20 h-11"
                      placeholder="Enter your password"
                      required
                    />
                  </div>
                  
                  <Button
                    type="submit"
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-medium shadow-sm h-11 text-base mt-6"
                    disabled={isLoading}
                  >
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
                
                <div className="mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setShowRegistration(true)}
                    className="w-full border-slate-300 text-slate-700 hover:bg-slate-50 h-11 text-base font-medium"
                  >
                    Request Account Access
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}