import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  File, 
  Download, 
  Share2, 
  Trash2, 
  Lock, 
  Unlock, 
  Eye, 
  EyeOff, 
  Calendar, 
  Copy,
  Mail,
  Code,
  MoreHorizontal
} from 'lucide-react';

interface FileData {
  id: string;
  original_name: string;
  file_size: number;
  file_type: string;
  storage_path: string;
  is_public: boolean;
  is_locked: boolean;
  download_count: number;
  download_limit: number | null;
  expires_at: string | null;
  share_code: string | null;
  created_at: string;
  updated_at: string;
}

interface ShareLinkData {
  id: string;
  share_token: string;
  link_type: string;
  download_count: number;
  download_limit: number | null;
  expires_at: string | null;
  is_active: boolean;
  recipient_email: string | null;
}

export const FileManager: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [files, setFiles] = useState<FileData[]>([]);
  const [sharedLinks, setSharedLinks] = useState<{[fileId: string]: ShareLinkData[]}>({});
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<FileData | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareMethod, setShareMethod] = useState<'email' | 'public' | 'code'>('public');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [downloadLimit, setDownloadLimit] = useState<string>('');
  const [expiryDays, setExpiryDays] = useState<string>('7');
  const [sharePassword, setSharePassword] = useState('');

  useEffect(() => {
    if (user) {
      fetchFiles();
    }
  }, [user]);

  const fetchFiles = async () => {
    try {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFiles(data || []);

      // Fetch shared links for each file
      const fileIds = data?.map(f => f.id) || [];
      if (fileIds.length > 0) {
        const { data: linksData } = await supabase
          .from('shared_links')
          .select('*')
          .in('file_id', fileIds);

        const linksByFile = (linksData || []).reduce((acc, link) => {
          if (!acc[link.file_id]) acc[link.file_id] = [];
          acc[link.file_id].push(link);
          return acc;
        }, {} as {[fileId: string]: ShareLinkData[]});

        setSharedLinks(linksByFile);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error fetching files",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const generateShareCode = async (fileId: string) => {
    try {
      const { data, error } = await supabase.rpc('generate_share_code');
      if (error) throw error;
      
      // Update file with share code
      const { error: updateError } = await supabase
        .from('files')
        .update({ share_code: data })
        .eq('id', fileId);

      if (updateError) throw updateError;
      
      fetchFiles(); // Refresh files
      return data;
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error generating share code",
        description: error.message,
      });
    }
  };

  const createShareLink = async () => {
    if (!selectedFile) return;

    try {
      const expiresAt = expiryDays && expiryDays !== 'never' ? 
        new Date(Date.now() + parseInt(expiryDays) * 24 * 60 * 60 * 1000).toISOString() : 
        null;

      let passwordHash = null;
      if (sharePassword) {
        const { data: hashedPassword, error: hashError } = await supabase.rpc('hash_password', {
          password: sharePassword
        });
        if (hashError) throw hashError;
        passwordHash = hashedPassword;
      }

      const shareData = {
        file_id: selectedFile.id,
        link_type: shareMethod,
        share_token: Math.random().toString(36).substring(2) + Date.now().toString(36),
        download_limit: downloadLimit ? parseInt(downloadLimit) : null,
        expires_at: expiresAt,
        recipient_email: shareMethod === 'email' ? recipientEmail : null,
        password_hash: passwordHash,
      };

      const { data, error } = await supabase
        .from('shared_links')
        .insert(shareData)
        .select()
        .single();

      if (error) throw error;

      // Generate share code for code method
      if (shareMethod === 'code') {
        await generateShareCode(selectedFile.id);
      }

      const baseUrl = window.location.origin;
      let shareUrl = '';
      let copyText = '';
      
      if (shareMethod === 'code') {
        const { data: fileData } = await supabase
          .from('files')
          .select('share_code')
          .eq('id', selectedFile.id)
          .single();
        copyText = `Share Code: ${fileData?.share_code}`;
        shareUrl = `Use this code: ${fileData?.share_code}`;
      } else if (shareMethod === 'email') {
        shareUrl = `${baseUrl}/share/${data.share_token}`;
        copyText = shareUrl;
        
        // Send email via edge function
        try {
          const { error: emailError } = await supabase.functions.invoke('send-email', {
            body: {
              recipientEmail,
              shareUrl,
              fileName: selectedFile.original_name,
              subject: `File shared: ${selectedFile.original_name}`
            }
          });
          
          if (emailError) {
            console.warn('Email sending failed:', emailError.message);
            // Still continue with link creation even if email fails
          }
        } catch (emailError) {
          console.warn('Email sending failed:', emailError);
          // Still continue with link creation even if email fails
        }
      } else {
        shareUrl = `${baseUrl}/share/${data.share_token}`;
        copyText = shareUrl;
      }

      // Copy to clipboard for all methods except email
      if (shareMethod !== 'email') {
        await navigator.clipboard.writeText(copyText);
      }

      // Show appropriate success message
      let successMessage = '';
      if (shareMethod === 'code') {
        successMessage = `Share code copied: ${copyText.split(': ')[1]}`;
      } else if (shareMethod === 'email') {
        successMessage = `Share link created for ${recipientEmail}. Link: ${shareUrl}`;
      } else {
        successMessage = "Share link copied to clipboard";
      }

      toast({
        title: "Share link created",
        description: successMessage,
      });

      setShareDialogOpen(false);
      setSharePassword('');
      setRecipientEmail('');
      setDownloadLimit('');
      setExpiryDays('7');
      fetchFiles();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error creating share link",
        description: error.message,
      });
    }
  };

  const toggleFileVisibility = async (fileId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('files')
        .update({ is_public: !currentStatus })
        .eq('id', fileId)
        .eq('user_id', user?.id); // Ensure user can only update their own files

      if (error) throw error;
      
      fetchFiles();
      toast({
        title: "File visibility updated",
        description: `File is now ${!currentStatus ? 'public' : 'private'}`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error updating file",
        description: error.message,
      });
    }
  };

  const toggleFileLock = async (fileId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('files')
        .update({ is_locked: !currentStatus })
        .eq('id', fileId);

      if (error) throw error;
      
      fetchFiles();
      toast({
        title: "File lock updated",
        description: `File is now ${!currentStatus ? 'locked' : 'unlocked'}`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error updating file",
        description: error.message,
      });
    }
  };

  const deleteFile = async (fileId: string, storagePath: string) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('files')
        .remove([storagePath]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('files')
        .delete()
        .eq('id', fileId);

      if (dbError) throw dbError;

      fetchFiles();
      toast({
        title: "File deleted",
        description: "File has been permanently deleted",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error deleting file",
        description: error.message,
      });
    }
  };

  const downloadFile = async (file: FileData) => {
    try {
      const { data, error } = await supabase.storage
        .from('files')
        .download(file.storage_path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.original_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Update download count
      await supabase
        .from('files')
        .update({ download_count: file.download_count + 1 })
        .eq('id', file.id);

      fetchFiles();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error downloading file",
        description: error.message,
      });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading files...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Files</h1>
        <p className="text-muted-foreground">
          Manage your uploaded files and sharing settings.
        </p>
      </div>

      {files.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <File className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No files uploaded yet</h3>
            <p className="text-muted-foreground mb-4">Start by uploading your first file.</p>
            <Button asChild>
              <a href="/dashboard/upload">Upload Files</a>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {files.map((file) => (
            <Card key={file.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <File className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <h3 className="font-medium">{file.original_name}</h3>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span>{formatFileSize(file.file_size)}</span>
                        <span>{file.download_count} downloads</span>
                        <span>Uploaded {formatDate(file.created_at)}</span>
                      </div>
                      <div className="flex items-center space-x-2 mt-2">
                        <Badge variant={file.is_public ? "default" : "secondary"}>
                          {file.is_public ? "Public" : "Private"}
                        </Badge>
                        {file.is_locked && (
                          <Badge variant="destructive">Locked</Badge>
                        )}
                        {file.expires_at && new Date(file.expires_at) < new Date() && (
                          <Badge variant="destructive">Expired</Badge>
                        )}
                        {file.share_code && (
                          <Badge variant="outline">Code: {file.share_code}</Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => downloadFile(file)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleFileVisibility(file.id, file.is_public)}
                    >
                      {file.is_public ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleFileLock(file.id, file.is_locked)}
                    >
                      {file.is_locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                    </Button>

                    <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedFile(file)}
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Share File</DialogTitle>
                          <DialogDescription>
                            Create a sharing link for {selectedFile?.original_name}
                          </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="shareMethod">Share Method</Label>
                            <Select value={shareMethod} onValueChange={(value: any) => setShareMethod(value)}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select sharing method" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="public">
                                  <div className="flex items-center space-x-2">
                                    <Copy className="h-4 w-4" />
                                    <span>Direct Link</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="email">
                                  <div className="flex items-center space-x-2">
                                    <Mail className="h-4 w-4" />
                                    <span>Email Link</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="code">
                                  <div className="flex items-center space-x-2">
                                    <Code className="h-4 w-4" />
                                    <span>Share Code</span>
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {shareMethod === 'email' && (
                            <div>
                              <Label htmlFor="recipientEmail">Recipient Email</Label>
                              <Input
                                id="recipientEmail"
                                type="email"
                                value={recipientEmail}
                                onChange={(e) => setRecipientEmail(e.target.value)}
                                placeholder="Enter email address"
                              />
                            </div>
                          )}

                          <div>
                            <Label htmlFor="downloadLimit">Download Limit (optional)</Label>
                            <Input
                              id="downloadLimit"
                              type="number"
                              value={downloadLimit}
                              onChange={(e) => setDownloadLimit(e.target.value)}
                              placeholder="Unlimited"
                            />
                          </div>

                          <div>
                            <Label htmlFor="sharePassword">Password Protection (optional)</Label>
                            <Input
                              id="sharePassword"
                              type="password"
                              value={sharePassword}
                              onChange={(e) => setSharePassword(e.target.value)}
                              placeholder="Enter password to protect the link"
                            />
                          </div>

                          <div>
                            <Label htmlFor="expiryDays">Expires in (days)</Label>
                            <Select value={expiryDays} onValueChange={setExpiryDays}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">1 day</SelectItem>
                                <SelectItem value="7">7 days</SelectItem>
                                <SelectItem value="30">30 days</SelectItem>
                                <SelectItem value="90">90 days</SelectItem>
                                <SelectItem value="never">Never</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <DialogFooter>
                          <Button variant="outline" onClick={() => setShareDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={createShareLink}>
                            Create Share Link
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteFile(file.id, file.storage_path)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Show existing share links */}
                {sharedLinks[file.id] && sharedLinks[file.id].length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="text-sm font-medium mb-2">Active Share Links</h4>
                    <div className="space-y-2">
                      {sharedLinks[file.id].map((link) => {
                        const baseUrl = window.location.origin;
                        const shareUrl = link.link_type === 'code' 
                          ? `${baseUrl}/code` 
                          : `${baseUrl}/share/${link.share_token}`;
                        
                        return (
                          <div key={link.id} className="flex items-center justify-between text-xs p-2 bg-muted rounded">
                            <div className="flex-1">
                              <div className="flex items-center mb-1">
                                <Badge variant="outline" className="mr-2">
                                  {link.link_type}
                                </Badge>
                                {link.recipient_email && <span className="text-muted-foreground">{link.recipient_email}</span>}
                                <span className="ml-2">{link.download_count} downloads</span>
                                {link.download_limit && <span> / {link.download_limit}</span>}
                              </div>
                              <div className="flex items-center space-x-2">
                                <Input
                                  value={shareUrl}
                                  readOnly
                                  className="text-xs h-6 bg-background"
                                />
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-2"
                                  onClick={async () => {
                                    await navigator.clipboard.writeText(shareUrl);
                                    toast({
                                      title: "Link copied",
                                      description: "Share link copied to clipboard",
                                    });
                                  }}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                                {link.link_type === 'email' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 px-2"
                                    onClick={() => {
                                      const subject = `File shared: ${file.original_name}`;
                                      const body = `Hi,\n\nI've shared a file with you: ${file.original_name}\n\nAccess it here: ${shareUrl}\n\nBest regards`;
                                      window.open(`mailto:${link.recipient_email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
                                    }}
                                  >
                                    <Mail className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 ml-2">
                              {link.expires_at && (
                                <span className="text-muted-foreground">
                                  Expires {formatDate(link.expires_at)}
                                </span>
                              )}
                              <Badge variant={link.is_active ? "default" : "secondary"}>
                                {link.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};