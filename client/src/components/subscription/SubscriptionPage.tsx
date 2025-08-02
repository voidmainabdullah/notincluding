import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PriceCard } from './PriceCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Crown, Shield, Zap, Upload, Download, Link, Clock } from 'lucide-react';

export const SubscriptionPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const handleSubscribe = async (plan: 'monthly' | 'yearly') => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Authentication required",
        description: "Please log in to subscribe",
      });
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("No valid session found");
      }

      console.log('Attempting subscription with plan:', plan);
      
      const { data, error } = await supabase.functions.invoke('create-paddle-checkout', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: { plan }
      });

      console.log('Subscription response:', { data, error });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(error.message || 'Failed to create checkout session');
      }

      if (data?.error) {
        console.error('Paddle API error:', data.error);
        throw new Error(data.error);
      }

      if (data?.checkout_url) {
        console.log('Opening checkout URL:', data.checkout_url);
        // Open Paddle checkout in new tab
        window.open(data.checkout_url, '_blank');
        
        toast({
          title: "Checkout opened",
          description: "Complete your subscription in the new tab",
        });
      } else {
        throw new Error('No checkout URL received from Paddle');
      }
    } catch (error: any) {
      console.error('Subscription error:', error);
      toast({
        variant: "destructive",
        title: "Subscription error",
        description: error.message || "Failed to create subscription",
      });
    }
  };

  const features = {
    free: [
      "10 uploads per day",
      "Basic file sharing",
      "7-day link expiry",
      "Community support"
    ],
    pro: [
      "Unlimited uploads",
      "Advanced sharing options",
      "Custom expiry dates", 
      "Password protection",
      "Download analytics",
      "Priority support",
      "Custom branding",
      "API access"
    ]
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Choose Your Plan</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Upgrade to Pro for unlimited uploads and advanced features
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3 max-w-6xl mx-auto">
        {/* Free Plan */}
        <PriceCard
          title="Free"
          price="$0"
          period="forever"
          description="Perfect for getting started"
          features={features.free}
          onSubscribe={() => {
            toast({
              title: "Already on Free plan",
              description: "You're currently using the free plan",
            });
          }}
        />

        {/* Monthly Plan */}
        <PriceCard
          title="Pro Monthly"
          price="$3.99"
          period="month"
          description="Full access with monthly billing"
          features={features.pro}
          onSubscribe={() => handleSubscribe('monthly')}
        />

        {/* Yearly Plan */}
        <PriceCard
          title="Pro Yearly"
          price="$39.99"
          period="year"
          description="Save 17% with annual billing"
          features={features.pro}
          isPopular={true}
          onSubscribe={() => handleSubscribe('yearly')}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <Upload className="h-8 w-8 text-primary mx-auto mb-2" />
            <CardTitle className="text-lg">Unlimited Uploads</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center">
              Upload as many files as you need without daily limits
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="text-center">
            <Shield className="h-8 w-8 text-primary mx-auto mb-2" />
            <CardTitle className="text-lg">Advanced Security</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center">
              Password protection and custom expiry dates for your files
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="text-center">
            <Download className="h-8 w-8 text-primary mx-auto mb-2" />
            <CardTitle className="text-lg">Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center">
              Track downloads and monitor file sharing performance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="text-center">
            <Zap className="h-8 w-8 text-primary mx-auto mb-2" />
            <CardTitle className="text-lg">Priority Support</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center">
              Get faster response times and dedicated support
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Crown className="mr-2 h-5 w-5" />
            Why Choose Pro?
          </CardTitle>
          <CardDescription>
            Take your file sharing to the next level with professional features
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <h4 className="font-medium">Unlimited Daily Uploads</h4>
                <p className="text-sm text-muted-foreground">
                  No more waiting for daily limits to reset. Upload as much as you need.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <h4 className="font-medium">Custom Expiry Dates</h4>
                <p className="text-sm text-muted-foreground">
                  Set files to expire when you want, or never expire at all.
                </p>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <h4 className="font-medium">Password Protection</h4>
                <p className="text-sm text-muted-foreground">
                  Secure your sensitive files with password protection.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <h4 className="font-medium">Download Analytics</h4>
                <p className="text-sm text-muted-foreground">
                  Track who downloads your files and when.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};