import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Share,
  Copy,
  Download,
  Eye,
  Clock,
  Shield,
  Trash2,
  ExternalLink
} from 'lucide-react';

interface SharedLink {
  id: string;
  share_token: string;
  password_hash: string | null;
  download_limit: number | null;
  download_count: number;
  expires_at: string | null;
  created_at: string;
  files: {
    original_name: string;
    file_size: number;
  };
}

export const SharedLinks: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sharedLinks, setSharedLinks] = useState<SharedLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSharedLinks();
    }
  }, [user]);

  const fetchSharedLinks = async () => {
    try {
      // Get user's files first
      const { data: userFiles } = await supabase
        .from('files')
        .select('id')
        .eq('user_id', user?.id);

      const fileIds = userFiles?.map(f => f.id) || [];

      if (fileIds.length === 0) {
        setSharedLinks([]);
        return;
      }

      // Get shared links for user's files
      const { data, error } = await supabase
        .from('shared_links')
        .select(`
          *,
          files!inner(original_name, file_size)
        `)
        .in('file_id', fileIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSharedLinks(data || []);
    } catch (error) {
      console.error('Error fetching shared links:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load shared links.",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (shareToken: string) => {
    const url = `${window.location.origin}/share/${shareToken}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: "Link copied",
        description: "Share link has been copied to clipboard.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Copy failed",
        description: "Could not copy link to clipboard.",
      });
    }
  };

  const deleteSharedLink = async (id: string) => {
    try {
      const { error } = await supabase
        .from('shared_links')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSharedLinks(prev => prev.filter(link => link.id !== id));
      toast({
        title: "Link deleted",
        description: "Shared link has been deleted successfully.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: "Could not delete the shared link.",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const isLimitReached = (downloadLimit: number | null, downloadCount: number) => {
    if (!downloadLimit) return false;
    return downloadCount >= downloadLimit;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-48"></div>
                <div className="h-3 bg-muted rounded w-32"></div>
              </CardHeader>
              <CardContent>
                <div className="h-10 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Shared Links</h1>
        <p className="text-muted-foreground">
          Manage and monitor your active file sharing links.
        </p>
      </div>

      {sharedLinks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Share className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No shared links yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create shared links from your files to start sharing securely.
            </p>
            <Button asChild>
              <a href="/dashboard/files">
                <Share className="mr-2 h-4 w-4" />
                Go to My Files
              </a>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sharedLinks.map((link) => {
            const expired = isExpired(link.expires_at);
            const limitReached = isLimitReached(link.download_limit, link.download_count);
            const inactive = expired || limitReached;
            
            return (
              <Card key={link.id} className={inactive ? 'opacity-60' : ''}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center">
                        <Share className="mr-2 h-5 w-5" />
                        {link.files.original_name}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {formatFileSize(link.files.file_size)} • Created {new Date(link.created_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      {link.password_hash && (
                        <Badge variant="secondary">
                          <Shield className="w-3 h-3 mr-1" />
                          Protected
                        </Badge>
                      )}
                      {expired && (
                        <Badge variant="destructive">Expired</Badge>
                      )}
                      {limitReached && (
                        <Badge variant="destructive">Limit Reached</Badge>
                      )}
                      {!inactive && (
                        <Badge variant="default">Active</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Input
                      value={`${window.location.origin}/share/${link.share_token}`}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(link.share_token)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`/share/${link.share_token}`, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center">
                      <Download className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>
                        {link.download_count} / {link.download_limit || '∞'} downloads
                      </span>
                    </div>
                    
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>
                        {link.expires_at 
                          ? `Expires ${new Date(link.expires_at).toLocaleDateString()}`
                          : 'Never expires'
                        }
                      </span>
                    </div>

                    <div className="flex items-center">
                      <Eye className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>
                        {link.password_hash ? 'Password protected' : 'Public access'}
                      </span>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteSharedLink(link.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};