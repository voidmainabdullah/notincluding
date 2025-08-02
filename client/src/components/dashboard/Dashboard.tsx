import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Files, 
  Share, 
  Download, 
  TrendingUp, 
  Upload,
  Clock,
  Shield,
  Zap
} from 'lucide-react';

interface DashboardStats {
  totalFiles: number;
  totalShares: number;
  totalDownloads: number;
  dailyUploadCount: number;
  dailyUploadLimit: number;
  subscriptionTier: string;
}

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardStats();
    }
  }, [user]);

  const fetchDashboardStats = async () => {
    try {
      // Fetch user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('daily_upload_count, daily_upload_limit, subscription_tier')
        .eq('id', user?.id)
        .single();

      // Fetch file count
      const { count: fileCount } = await supabase
        .from('files')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id);

      // Fetch share count - Get shared links for user's files
      const { data: userFiles } = await supabase
        .from('files')
        .select('id')
        .eq('user_id', user?.id);
      
      const fileIds = userFiles?.map(f => f.id) || [];
      
      const { count: shareCount } = await supabase
        .from('shared_links')
        .select('*', { count: 'exact', head: true })
        .in('file_id', fileIds);

      // Fetch download count
      const { count: downloadCount } = await supabase
        .from('download_logs')
        .select('*', { count: 'exact', head: true })
        .in('file_id', fileIds);

      setStats({
        totalFiles: fileCount || 0,
        totalShares: shareCount || 0,
        totalDownloads: downloadCount || 0,
        dailyUploadCount: profile?.daily_upload_count || 0,
        dailyUploadLimit: profile?.subscription_tier === 'pro' ? 999 : (profile?.daily_upload_limit || 10),
        subscriptionTier: profile?.subscription_tier || 'free',
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 bg-muted rounded w-24"></div>
                <div className="h-4 w-4 bg-muted rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-16"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const uploadProgress = stats ? (stats.subscriptionTier === 'pro' ? 0 : (stats.dailyUploadCount / stats.dailyUploadLimit) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's an overview of your file sharing activity.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={stats?.subscriptionTier === 'pro' ? 'default' : 'secondary'}>
            {stats?.subscriptionTier === 'pro' ? (
              <>
                <Zap className="w-3 h-3 mr-1" />
                Pro
              </>
            ) : (
              'Free'
            )}
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Files</CardTitle>
            <Files className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalFiles}</div>
            <p className="text-xs text-muted-foreground">
              Files uploaded to your account
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Shared Links</CardTitle>
            <Share className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalShares}</div>
            <p className="text-xs text-muted-foreground">
              Active sharing links created
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Downloads</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalDownloads}</div>
            <p className="text-xs text-muted-foreground">
              Total file downloads
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Usage</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.subscriptionTier === 'pro' ? 
                `${stats?.dailyUploadCount}/∞` : 
                `${stats?.dailyUploadCount}/${stats?.dailyUploadLimit}`
              }
            </div>
            {stats?.subscriptionTier !== 'pro' && (
              <Progress value={uploadProgress} className="mt-2" />
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.subscriptionTier === 'pro' ? 'Unlimited uploads' : 'Daily upload limit'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Upload className="mr-2 h-5 w-5" />
              Quick Upload
            </CardTitle>
            <CardDescription>
              Upload files quickly and start sharing them instantly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" asChild>
              <Link to="/dashboard/upload">
                <Upload className="mr-2 h-4 w-4" />
                Upload Files
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Share className="mr-2 h-5 w-5" />
              Request Files
            </CardTitle>
            <CardDescription>
              Create secure links for others to send files to you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline" asChild>
              <Link to="/dashboard/receive">
                <Share className="mr-2 h-4 w-4" />
                Request Files
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="mr-2 h-5 w-5" />
              Security Features
            </CardTitle>
            <CardDescription>
              Your files are protected with enterprise-grade security.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center text-sm">
              <Clock className="mr-2 h-4 w-4 text-success" />
              Automatic expiry dates
            </div>
            <div className="flex items-center text-sm">
              <Shield className="mr-2 h-4 w-4 text-success" />
              Download limits
            </div>
            <div className="flex items-center text-sm">
              <Files className="mr-2 h-4 w-4 text-success" />
              File locking
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Zap className="mr-2 h-5 w-5" />
              Upgrade to Pro
            </CardTitle>
            <CardDescription>
              Unlock unlimited uploads and advanced features.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" asChild>
              <Link to="/subscription">
                <Zap className="mr-2 h-4 w-4" />
                View Plans
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};