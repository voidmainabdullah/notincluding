import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Copy, Share, Mail, QrCode, Link } from 'lucide-react';

export const FileReceiver: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [receiverName, setReceiverName] = useState('');
  const [description, setDescription] = useState('');
  const [receiveUrl, setReceiveUrl] = useState('');

  const generateReceiveLink = () => {
    if (!user) return;
    
    const baseUrl = window.location.origin;
    const receiveToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const url = `${baseUrl}/receive/${receiveToken}`;
    setReceiveUrl(url);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(receiveUrl);
      toast({
        title: "Link copied",
        description: "Receive link copied to clipboard",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Copy failed",
        description: "Failed to copy link to clipboard",
      });
    }
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent(`Send me files - ${receiverName || 'File Request'}`);
    const body = encodeURIComponent(`Hi!\n\nPlease send me files using this secure link:\n${receiveUrl}\n\n${description ? `Description: ${description}\n\n` : ''}Thanks!`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Request Files</h1>
        <p className="text-muted-foreground">
          Create a secure link to request files from others.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Create File Request</CardTitle>
            <CardDescription>
              Generate a secure link that others can use to send files to you.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="receiverName">Request Name (Optional)</Label>
              <Input
                id="receiverName"
                value={receiverName}
                onChange={(e) => setReceiverName(e.target.value)}
                placeholder="e.g., Project Documents, Photos, etc."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add instructions or details about what files you need..."
                rows={3}
              />
            </div>

            <Button onClick={generateReceiveLink} className="w-full">
              <Share className="mr-2 h-4 w-4" />
              Generate Receive Link
            </Button>
          </CardContent>
        </Card>

        {receiveUrl && (
          <Card>
            <CardHeader>
              <CardTitle>Share Your Receive Link</CardTitle>
              <CardDescription>
                Share this link with people you want to receive files from.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Receive Link</Label>
                <div className="flex space-x-2">
                  <Input 
                    value={receiveUrl} 
                    readOnly 
                    className="font-mono text-sm"
                  />
                  <Button onClick={copyToClipboard} size="sm" variant="outline">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button onClick={shareViaEmail} variant="outline" size="sm">
                  <Mail className="mr-2 h-4 w-4" />
                  Email
                </Button>
                <Button 
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: 'Send me files',
                        text: description || 'Please send me files using this secure link',
                        url: receiveUrl,
                      });
                    } else {
                      copyToClipboard();
                    }
                  }}
                  variant="outline" 
                  size="sm"
                >
                  <Link className="mr-2 h-4 w-4" />
                  Share
                </Button>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">How it works:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Share this link with anyone</li>
                  <li>• They can upload files directly to your account</li>
                  <li>• You'll receive notifications when files are uploaded</li>
                  <li>• Files are secure and only accessible by you</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent File Requests</CardTitle>
          <CardDescription>
            Files that have been sent to you through receive links.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <QrCode className="mx-auto h-12 w-12 mb-4" />
            <p>No files received yet</p>
            <p className="text-sm">Files sent to your receive links will appear here</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};