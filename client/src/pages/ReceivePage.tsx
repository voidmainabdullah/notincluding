import React, { useState, useEffect } from 'react';
import { useRoute } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Download, Lock, Clock, AlertCircle } from 'lucide-react';

interface FileInfo {
  id: string;
  originalName: string;
  fileSize: number;
  fileType: string;
  downloadCount: number;
  downloadLimit: number | null;
  expiresAt: string | null;
  shareCode?: string;
  sharedLink?: {
    linkType: string;
    downloadCount: number;
    downloadLimit: number | null;
    expiresAt: string | null;
  };
}

const ReceivePage = () => {
  const [match, params] = useRoute('/receive/:token');
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (params?.token) {
      fetchFileInfo(params.token);
    }
  }, [params?.token]);

  const fetchFileInfo = async (token: string) => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch(`/api/shared/${token}${password ? `?password=${encodeURIComponent(password)}` : ''}`);
      const data = await response.json();

      if (!response.ok) {
        if (data.requiresPassword) {
          setRequiresPassword(true);
          setError('');
        } else {
          setError(data.error || 'Failed to load file information');
        }
        return;
      }

      setFileInfo(data);
      setRequiresPassword(false);
      setError('');
    } catch (err) {
      setError('Failed to load file information');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (params?.token) {
      fetchFileInfo(params.token);
    }
  };

  const handleDownload = async () => {
    if (!params?.token) return;

    try {
      setDownloading(true);
      setError('');

      const response = await fetch(`/api/download/shared/${params.token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const data = await response.json();
        if (data.requiresPassword) {
          setRequiresPassword(true);
          setError('Password required');
        } else {
          setError(data.error || 'Download failed');
        }
        return;
      }

      // Create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = fileInfo?.originalName || 'download';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Refresh file info to update download count
      if (params?.token) {
        fetchFileInfo(params.token);
      }
    } catch (err) {
      setError('Download failed');
    } finally {
      setDownloading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isExpired = fileInfo?.expiresAt && new Date() > new Date(fileInfo.expiresAt);
  const isLimitReached = fileInfo?.sharedLink?.downloadLimit && 
    fileInfo.sharedLink.downloadCount >= fileInfo.sharedLink.downloadLimit;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading file information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-16">
            <div className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-primary" />
              <h1 className="text-xl font-bold">SecureShare</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card className="border-border bg-card/90 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Download className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">
              {fileInfo ? 'File Ready for Download' : 'Access Required'}
            </CardTitle>
            <CardDescription>
              {fileInfo ? 'Your file is ready to download' : 'Please provide the required information'}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {error && (
              <div className="flex items-center space-x-2 p-4 bg-destructive/10 text-destructive rounded-md">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {requiresPassword && !fileInfo && (
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Password Required</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password to access file"
                    required
                  />
                </div>
                <Button type="submit" className="w-full">
                  <Lock className="mr-2 h-4 w-4" />
                  Access File
                </Button>
              </form>
            )}

            {fileInfo && (
              <>
                <div className="space-y-4">
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-2">{fileInfo.originalName}</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium">Size:</span> {formatFileSize(fileInfo.fileSize)}
                      </div>
                      <div>
                        <span className="font-medium">Type:</span> {fileInfo.fileType}
                      </div>
                      {fileInfo.sharedLink?.downloadLimit && (
                        <div>
                          <span className="font-medium">Downloads:</span> {fileInfo.sharedLink.downloadCount}/{fileInfo.sharedLink.downloadLimit}
                        </div>
                      )}
                      {fileInfo.sharedLink?.expiresAt && (
                        <div>
                          <span className="font-medium">Expires:</span> {new Date(fileInfo.sharedLink.expiresAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>

                  {(isExpired || isLimitReached) ? (
                    <div className="flex items-center space-x-2 p-4 bg-destructive/10 text-destructive rounded-md">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">
                        {isExpired ? 'This file has expired' : 'Download limit reached'}
                      </span>
                    </div>
                  ) : (
                    <>
                      {requiresPassword && (
                        <form onSubmit={handlePasswordSubmit} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="download-password">Password Required</Label>
                            <Input
                              id="download-password"
                              type="password"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              placeholder="Enter password to download"
                              required
                            />
                          </div>
                          <Button type="submit" className="w-full">
                            <Lock className="mr-2 h-4 w-4" />
                            Verify Password
                          </Button>
                        </form>
                      )}

                      {!requiresPassword && (
                        <Button 
                          onClick={handleDownload} 
                          className="w-full" 
                          size="lg"
                          disabled={downloading}
                        >
                          {downloading ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Downloading...
                            </>
                          ) : (
                            <>
                              <Download className="mr-2 h-4 w-4" />
                              Download File
                            </>
                          )}
                        </Button>
                      )}
                    </>
                  )}
                </div>

                <div className="text-center text-sm text-muted-foreground border-t pt-4">
                  Secured by SecureShare • Professional File Sharing
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ReceivePage;