import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Shield, 
  Share, 
  Clock, 
  BarChart3, 
  Lock, 
  Zap,
  ArrowRight,
  Upload,
  Download,
  Eye
} from 'lucide-react';

const Index = () => {
  const { user, login, register, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Don't show landing page if authenticated user
  if (user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Welcome back!</h2>
          <p className="text-muted-foreground mb-4">You are logged in as {user.email}</p>
          <Button onClick={() => setLocation('/dashboard')}>Go to Dashboard</Button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password);
      }
      setLocation('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  const features = [
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Your files are protected with bank-level encryption and security measures."
    },
    {
      icon: Share,
      title: "Flexible Sharing",
      description: "Share via unique codes, email links, or direct downloads with custom permissions."
    },
    {
      icon: Clock,
      title: "Smart Expiry",
      description: "Set automatic expiry dates and download limits for enhanced security."
    },
    {
      icon: BarChart3,
      title: "Detailed Analytics",
      description: "Track downloads, monitor activity, and get insights on your shared files."
    },
    {
      icon: Lock,
      title: "File Locking",
      description: "Lock files to prevent unauthorized re-sharing or unwanted access."
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Upload and share files instantly with our optimized infrastructure."
    }
  ];

  const stats = [
    { label: "Files Shared", value: "1M+", icon: Upload },
    { label: "Downloads", value: "10M+", icon: Download },
    { label: "Active Users", value: "50K+", icon: Eye }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-primary" />
              <h1 className="text-xl font-bold">SecureShare</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => {
                const authForm = document.getElementById('auth-form');
                if (authForm) {
                  authForm.scrollIntoView({ behavior: 'smooth' });
                  setIsLogin(true);
                }
              }}>
                Sign In
              </Button>
              <Button onClick={() => {
                const authForm = document.getElementById('auth-form');
                if (authForm) {
                  authForm.scrollIntoView({ behavior: 'smooth' });
                  setIsLogin(false);
                }
              }}>
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
            Secure File Sharing
            <span className="block bg-gradient-primary bg-clip-text text-transparent">
              Made Simple
            </span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Share files securely with unique codes, email links, or direct downloads. 
            Track every download, set expiry dates, and maintain complete control over your content.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-lg px-8" onClick={() => {
              const authForm = document.getElementById('auth-form');
              if (authForm) {
                authForm.scrollIntoView({ behavior: 'smooth' });
                setIsLogin(false);
              }
            }}>
              Start Sharing
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8">
              <Download className="mr-2 h-5 w-5" />
              Download with Code
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <stat.icon className="h-8 w-8 mx-auto mb-4 text-primary" />
                <div className="text-3xl font-bold mb-2">{stat.value}</div>
                <div className="text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything you need for secure file sharing
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Professional-grade features designed for both individual users and teams.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-border bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <feature.icon className="h-8 w-8 text-primary mb-2" />
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Auth Section */}
      <section id="auth-form" className="py-20 px-4 sm:px-6 lg:px-8 bg-primary/5">
        <div className="max-w-md mx-auto">
          <Card className="border-border bg-card/90 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">
                {isLogin ? 'Sign In' : 'Create Account'}
              </CardTitle>
              <CardDescription>
                {isLogin ? 'Welcome back to SecureShare' : 'Join thousands of users who trust SecureShare'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="Enter your email"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter your password"
                    minLength={6}
                  />
                </div>

                {error && (
                  <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                    {error}
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
                </Button>
              </form>

              <div className="mt-4 text-center">
                <Button
                  variant="link"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError('');
                  }}
                  className="text-sm"
                >
                  {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Shield className="h-6 w-6 text-primary" />
              <span className="font-bold">SecureShare</span>
            </div>
            
            <div className="text-muted-foreground text-sm">
              © 2024 SecureShare. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
