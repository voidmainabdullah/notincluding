import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, ArrowLeft } from 'lucide-react';

export const SubscriptionSuccess: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
          <CardTitle className="text-2xl">Subscription Successful!</CardTitle>
          <CardDescription>
            Thank you for upgrading to Pro. Your subscription is now active.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg">
            <h3 className="font-medium mb-2">What's next?</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Unlimited file uploads</li>
              <li>• Advanced sharing options</li>
              <li>• Password protection</li>
              <li>• Custom expiry dates</li>
              <li>• Download analytics</li>
            </ul>
          </div>
          
          <Button 
            onClick={() => navigate('/dashboard')}
            className="w-full"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};