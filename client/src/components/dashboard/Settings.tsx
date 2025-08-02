import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Settings as SettingsIcon,
  User,
  Shield,
  Trash2,
  Crown,
  AlertTriangle
} from 'lucide-react';

export const Settings: React.FC = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
      setDisplayName(user.user_metadata?.display_name || user.email?.split('@')[0] || '');
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();
      
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const updateDisplayName = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { display_name: displayName }
      });

      if (error) throw error;

      toast({
        title: "Profile updated",
        description: "Your display name has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteAccount = async () => {
    if (!user) return;
    
    const confirmed = window.confirm(
      'Are you sure you want to delete your account? This action cannot be undone and will permanently delete all your files and data.'
    );
    
    if (!confirmed) return;

    try {
      // Delete user files from storage
      const { data: files } = await supabase
        .from('files')
        .select('storage_path')
        .eq('user_id', user.id);

      if (files) {
        const filePaths = files.map(f => f.storage_path);
        if (filePaths.length > 0) {
          await supabase.storage
            .from('files')
            .remove(filePaths);
        }
      }

      // Delete user data
      await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);

      await supabase
        .from('files')
        .delete()
        .eq('user_id', user.id);

      toast({
        title: "Account deleted",
        description: "Your account and all data have been permanently deleted.",
      });

      // Sign out after successful deletion
      await signOut();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Deletion failed",
        description: error.message,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences.
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="mr-2 h-5 w-5" />
              Profile Information
            </CardTitle>
            <CardDescription>
              Update your personal information and account details.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                value={user?.email || ''} 
                disabled 
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed. Contact support if you need to update your email.
              </p>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="displayName">Display Name</Label>
              <div className="flex gap-2">
                <Input 
                  id="displayName" 
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your display name"
                />
                <Button 
                  onClick={updateDisplayName}
                  disabled={loading}
                >
                  Update
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Crown className="mr-2 h-5 w-5" />
              Subscription
            </CardTitle>
            <CardDescription>
              Your current subscription plan and usage.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Current Plan</p>
                <p className="text-sm text-muted-foreground">
                  {profile?.subscription_tier === 'pro' ? 'Pro Plan' : 'Free Plan'}
                </p>
              </div>
              <Badge variant={profile?.subscription_tier === 'pro' ? 'default' : 'secondary'}>
                {profile?.subscription_tier === 'pro' ? 'Pro' : 'Free'}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Daily Upload Limit</p>
                <p className="text-sm text-muted-foreground">
                  {profile?.subscription_tier === 'pro' ? 
                    `${profile?.daily_upload_count || 0} files uploaded today (unlimited)` :
                    `${profile?.daily_upload_count || 0} / ${profile?.daily_upload_limit || 10} files used today`
                  }
                </p>
              </div>
            </div>

            {profile?.subscription_tier !== 'pro' && (
              <Button asChild>
                <a href="/subscription">
                  <Crown className="mr-2 h-4 w-4" />
                  Upgrade to Pro
                </a>
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="mr-2 h-5 w-5" />
              Security
            </CardTitle>
            <CardDescription>
              Manage your account security settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-medium mb-2">Account Security</p>
              <p className="text-sm text-muted-foreground mb-4">
                Your account is secured with email authentication. All file uploads and shares are encrypted.
              </p>
              <Button variant="outline" onClick={() => signOut()}>
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center text-destructive">
              <AlertTriangle className="mr-2 h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>
              Permanently delete your account and all associated data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  Once you delete your account, there is no going back. Please be certain.
                </p>
              </div>
              <Button 
                variant="destructive" 
                onClick={deleteAccount}
                className="w-full"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Account Permanently
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};