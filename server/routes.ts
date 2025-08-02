import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { emailService } from "./email";
import { insertUserSchema, insertProfileSchema, insertFileSchema, insertSharedLinkSchema, insertDownloadLogSchema } from "@shared/schema";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import fs from "fs";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const upload = multer({ dest: 'uploads/' });

// Middleware to verify JWT token
function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password } = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: 'User already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create user
      const user = await storage.createUser({ email, password: hashedPassword });
      
      // Create profile
      const profile = await storage.createProfile({
        id: user.id,
        email: user.email,
        displayName: user.email.split('@')[0],
        subscriptionTier: 'free',
        subscriptionStatus: 'active',
        dailyUploadCount: 0,
        dailyUploadLimit: 10,
        lastUploadReset: new Date().toISOString().split('T')[0],
      });

      // Generate JWT token
      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });

      res.json({ 
        user: { id: user.id, email: user.email }, 
        profile,
        token 
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      // Find user
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Verify password
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Get profile
      const profile = await storage.getProfile(user.id);

      // Generate JWT token
      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });

      res.json({ 
        user: { id: user.id, email: user.email }, 
        profile,
        token 
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Profile routes
  app.get("/api/profile", authenticateToken, async (req: any, res) => {
    try {
      const profile = await storage.getProfile(req.user.id);
      if (!profile) {
        return res.status(404).json({ error: 'Profile not found' });
      }
      res.json(profile);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/profile", authenticateToken, async (req: any, res) => {
    try {
      const updates = req.body;
      const profile = await storage.updateProfile(req.user.id, updates);
      if (!profile) {
        return res.status(404).json({ error: 'Profile not found' });
      }
      res.json(profile);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // File routes
  app.get("/api/files", authenticateToken, async (req: any, res) => {
    try {
      const files = await storage.getUserFiles(req.user.id);
      res.json(files);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/files/upload", authenticateToken, upload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      // Check upload limits
      const profile = await storage.getProfile(req.user.id);
      if (!profile) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      if (profile.dailyUploadCount >= profile.dailyUploadLimit) {
        return res.status(429).json({ error: 'Daily upload limit exceeded' });
      }

      // Generate share code if requested
      const shareCode = req.body.generateShareCode ? storage.generateShareCode() : null;

      // Create file record
      const file = await storage.createFile({
        userId: req.user.id,
        originalName: req.file.originalname,
        fileSize: req.file.size,
        fileType: req.file.mimetype,
        storagePath: req.file.path,
        shareCode,
        isPublic: req.body.isPublic === 'true',
        downloadLimit: req.body.downloadLimit ? parseInt(req.body.downloadLimit) : null,
        expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : null,
      });

      // Update upload count
      await storage.updateProfile(req.user.id, {
        dailyUploadCount: profile.dailyUploadCount + 1,
      });

      res.json(file);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/files/:id", authenticateToken, async (req: any, res) => {
    try {
      const file = await storage.getFile(req.params.id);
      if (!file || file.userId !== req.user.id) {
        return res.status(404).json({ error: 'File not found' });
      }
      res.json(file);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/files/:id", authenticateToken, async (req: any, res) => {
    try {
      const file = await storage.getFile(req.params.id);
      if (!file || file.userId !== req.user.id) {
        return res.status(404).json({ error: 'File not found' });
      }

      // Delete physical file
      try {
        fs.unlinkSync(file.storagePath);
      } catch (e) {
        // File might not exist on disk
      }

      // Delete from storage
      await storage.deleteFile(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Download file by share code
  app.get("/api/download/code/:shareCode", async (req, res) => {
    try {
      const file = await storage.getFileByShareCode(req.params.shareCode);
      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }

      // Check if file is expired
      if (file.expiresAt && new Date() > file.expiresAt) {
        return res.status(410).json({ error: 'File has expired' });
      }

      // Check download limit
      if (file.downloadLimit && file.downloadCount >= file.downloadLimit) {
        return res.status(429).json({ error: 'Download limit exceeded' });
      }

      // Log download
      await storage.createDownloadLog({
        fileId: file.id,
        downloadMethod: 'code',
        downloaderIp: req.ip,
        downloaderUserAgent: req.get('User-Agent') || null,
      });

      // Update download count
      await storage.updateFile(file.id, {
        downloadCount: file.downloadCount + 1,
      });

      // Send file
      res.download(file.storagePath, file.originalName);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Email sharing route
  app.post("/api/share/email", authenticateToken, async (req: any, res) => {
    try {
      const { fileId, recipientEmail, message, password, expiresAt, downloadLimit } = req.body;
      
      // Verify user owns the file
      const file = await storage.getFile(fileId);
      if (!file || file.userId !== req.user.id) {
        return res.status(404).json({ error: 'File not found' });
      }

      // Get user profile for sender info
      const profile = await storage.getProfile(req.user.id);
      if (!profile) {
        return res.status(404).json({ error: 'User profile not found' });
      }

      // Create shared link for email
      const shareToken = storage.generateShareToken();
      const sharedLinkData = {
        fileId,
        linkType: 'email',
        shareToken,
        recipientEmail,
        passwordHash: password ? storage.hashFilePassword(password) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        downloadLimit: downloadLimit || null,
        downloadCount: 0,
        isActive: true
      };

      const sharedLink = await storage.createSharedLink(sharedLinkData);
      
      // Construct share URL
      const baseUrl = process.env.APP_URL || `http://localhost:5000`;
      const shareUrl = `${baseUrl}/receive/${shareToken}`;

      // Send email
      const emailSent = await emailService.sendFileShareEmail(
        recipientEmail,
        req.user.email,
        file.originalName,
        shareUrl,
        message
      );

      if (!emailSent) {
        // Delete the created link if email failed
        await storage.deleteSharedLink(sharedLink.id);
        return res.status(500).json({ 
          error: 'Failed to send email. Please check email configuration.', 
          emailConfigured: emailService.isEmailConfigured() 
        });
      }

      res.json({ 
        success: true, 
        sharedLink,
        emailSent: true,
        shareUrl
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Shared links routes
  app.post("/api/shared-links", authenticateToken, async (req: any, res) => {
    try {
      const data = insertSharedLinkSchema.parse(req.body);
      
      // Verify user owns the file
      const file = await storage.getFile(data.fileId);
      if (!file || file.userId !== req.user.id) {
        return res.status(404).json({ error: 'File not found' });
      }

      // Hash password if provided
      if (data.passwordHash) {
        data.passwordHash = storage.hashPassword(data.passwordHash);
      }

      const sharedLink = await storage.createSharedLink(data);
      res.json(sharedLink);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/shared-links/:token", async (req, res) => {
    try {
      const link = await storage.getSharedLink(req.params.token);
      if (!link || !link.isActive) {
        return res.status(404).json({ error: 'Share link not found' });
      }

      // Check if link is expired
      if (link.expiresAt && new Date() > link.expiresAt) {
        return res.status(410).json({ error: 'Share link has expired' });
      }

      const file = await storage.getFile(link.fileId);
      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }

      res.json({ file, link });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Download via shared link
  app.post("/api/download/link/:token", async (req, res) => {
    try {
      const { password } = req.body;
      const link = await storage.getSharedLink(req.params.token);
      
      if (!link || !link.isActive) {
        return res.status(404).json({ error: 'Share link not found' });
      }

      // Check password if required
      if (link.passwordHash && !storage.validatePassword(password, link.passwordHash)) {
        return res.status(401).json({ error: 'Invalid password' });
      }

      // Check if link is expired
      if (link.expiresAt && new Date() > link.expiresAt) {
        return res.status(410).json({ error: 'Share link has expired' });
      }

      // Check download limit
      if (link.downloadLimit && link.downloadCount >= link.downloadLimit) {
        return res.status(429).json({ error: 'Download limit exceeded' });
      }

      const file = await storage.getFile(link.fileId);
      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }

      // Log download
      await storage.createDownloadLog({
        fileId: file.id,
        sharedLinkId: link.id,
        downloadMethod: 'link',
        downloaderIp: req.ip,
        downloaderUserAgent: req.get('User-Agent') || null,
      });

      // Update download counts
      await storage.updateSharedLink(link.id, {
        downloadCount: link.downloadCount + 1,
      });
      
      await storage.updateFile(file.id, {
        downloadCount: file.downloadCount + 1,
      });

      // Send file
      res.download(file.storagePath, file.originalName);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Email sharing (simplified - in production would use actual email service)
  app.post("/api/send-email", authenticateToken, async (req: any, res) => {
    try {
      const { recipientEmail, subject, shareUrl, fileName } = req.body;
      
      // In a real implementation, you would integrate with an email service here
      // For now, we'll just simulate success
      console.log(`Would send email to ${recipientEmail} with subject "${subject}" and link ${shareUrl} for file ${fileName}`);
      
      res.json({ success: true, message: 'Email would be sent in production' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Analytics routes
  app.get("/api/analytics/downloads/:fileId", authenticateToken, async (req: any, res) => {
    try {
      const file = await storage.getFile(req.params.fileId);
      if (!file || file.userId !== req.user.id) {
        return res.status(404).json({ error: 'File not found' });
      }

      const logs = await storage.getFileDownloadLogs(req.params.fileId);
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Subscription routes (simplified - would integrate with payment provider)
  app.post("/api/subscription/upgrade", authenticateToken, async (req: any, res) => {
    try {
      // In production, this would integrate with Paddle or Stripe
      const profile = await storage.updateProfile(req.user.id, {
        subscriptionTier: 'pro',
        dailyUploadLimit: 999, // Unlimited
      });
      
      res.json({ success: true, profile });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  // Public file access routes (no authentication required)
  app.get("/api/public/file/:shareCode", async (req, res) => {
    try {
      const { shareCode } = req.params;
      const { password } = req.query;
      
      // Find file by share code
      const file = await storage.getFileByShareCode(shareCode);
      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }

      // Check if file is public
      if (!file.isPublic) {
        return res.status(403).json({ error: 'File is not publicly accessible' });
      }

      // Check if file is locked and password is required
      if (file.isLocked && !password) {
        return res.status(401).json({ error: 'Password required', requiresPassword: true });
      }

      // Validate password if file is locked
      if (file.isLocked && password) {
        const isValidPassword = storage.validatePassword(password as string, file.shareCode || '');
        if (!isValidPassword) {
          return res.status(401).json({ error: 'Invalid password' });
        }
      }

      // Check expiry
      if (file.expiresAt && new Date() > file.expiresAt) {
        return res.status(410).json({ error: 'File has expired' });
      }

      // Check download limit
      if (file.downloadLimit && file.downloadCount >= file.downloadLimit) {
        return res.status(410).json({ error: 'Download limit exceeded' });
      }

      res.json({
        id: file.id,
        originalName: file.originalName,
        fileSize: file.fileSize,
        fileType: file.fileType,
        downloadCount: file.downloadCount,
        downloadLimit: file.downloadLimit,
        expiresAt: file.expiresAt,
        shareCode: file.shareCode
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/public/download/:shareCode", async (req, res) => {
    try {
      const { shareCode } = req.params;
      const { password } = req.query;
      
      // Find file by share code
      const file = await storage.getFileByShareCode(shareCode);
      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }

      // Check if file is public
      if (!file.isPublic) {
        return res.status(403).json({ error: 'File is not publicly accessible' });
      }

      // Check if file is locked and validate password
      if (file.isLocked) {
        if (!password) {
          return res.status(401).json({ error: 'Password required', requiresPassword: true });
        }
        const isValidPassword = storage.validatePassword(password as string, file.shareCode || '');
        if (!isValidPassword) {
          return res.status(401).json({ error: 'Invalid password' });
        }
      }

      // Check expiry
      if (file.expiresAt && new Date() > file.expiresAt) {
        return res.status(410).json({ error: 'File has expired' });
      }

      // Check download limit
      if (file.downloadLimit && file.downloadCount >= file.downloadLimit) {
        return res.status(410).json({ error: 'Download limit exceeded' });
      }

      // Check if file exists on disk
      const filePath = path.join(process.cwd(), file.storagePath);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found on server' });
      }

      // Increment download count
      await storage.updateFile(file.id, { downloadCount: file.downloadCount + 1 });

      // Log download
      await storage.createDownloadLog({
        fileId: file.id,
        downloadMethod: 'public_link',
        downloaderIp: req.ip || req.connection.remoteAddress,
        downloaderUserAgent: req.get('User-Agent')
      });

      // Send file
      res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
      res.setHeader('Content-Type', file.fileType);
      res.sendFile(filePath);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Shared link access routes
  app.get("/api/shared/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const { password } = req.query;
      
      // Find shared link
      const sharedLink = await storage.getSharedLink(token);
      if (!sharedLink) {
        return res.status(404).json({ error: 'Shared link not found' });
      }

      // Check if link is active
      if (!sharedLink.isActive) {
        return res.status(410).json({ error: 'Shared link is inactive' });
      }

      // Check expiry
      if (sharedLink.expiresAt && new Date() > sharedLink.expiresAt) {
        return res.status(410).json({ error: 'Shared link has expired' });
      }

      // Check download limit
      if (sharedLink.downloadLimit && sharedLink.downloadCount >= sharedLink.downloadLimit) {
        return res.status(410).json({ error: 'Download limit exceeded' });
      }

      // Check password if required
      if (sharedLink.passwordHash) {
        if (!password) {
          return res.status(401).json({ error: 'Password required', requiresPassword: true });
        }
        const isValidPassword = storage.validatePassword(password as string, sharedLink.passwordHash);
        if (!isValidPassword) {
          return res.status(401).json({ error: 'Invalid password' });
        }
      }

      // Get file details
      const file = await storage.getFile(sharedLink.fileId);
      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }

      res.json({
        id: file.id,
        originalName: file.originalName,
        fileSize: file.fileSize,
        fileType: file.fileType,
        sharedLink: {
          linkType: sharedLink.linkType,
          downloadCount: sharedLink.downloadCount,
          downloadLimit: sharedLink.downloadLimit,
          expiresAt: sharedLink.expiresAt
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Download via shared link with password
  app.post("/api/download/shared/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const { password } = req.body;
      
      // Find shared link
      const sharedLink = await storage.getSharedLink(token);
      if (!sharedLink || !sharedLink.isActive) {
        return res.status(404).json({ error: 'Shared link not found' });
      }

      // Check expiry
      if (sharedLink.expiresAt && new Date() > sharedLink.expiresAt) {
        return res.status(410).json({ error: 'Shared link has expired' });
      }

      // Check download limit  
      if (sharedLink.downloadLimit && sharedLink.downloadCount >= sharedLink.downloadLimit) {
        return res.status(410).json({ error: 'Download limit exceeded' });
      }

      // Validate password if required
      if (sharedLink.passwordHash) {
        if (!password) {
          return res.status(401).json({ error: 'Password required', requiresPassword: true });
        }
        const isValidPassword = storage.validateFilePassword(password, sharedLink.passwordHash);
        if (!isValidPassword) {
          return res.status(401).json({ error: 'Invalid password' });
        }
      }

      // Get file
      const file = await storage.getFile(sharedLink.fileId);
      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }

      // Check if file exists on disk
      const filePath = path.join(process.cwd(), file.storagePath);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found on server' });
      }

      // Increment download count
      await storage.updateSharedLink(sharedLink.id, { downloadCount: sharedLink.downloadCount + 1 });

      // Log download
      await storage.createDownloadLog({
        fileId: file.id,
        sharedLinkId: sharedLink.id,
        downloadMethod: 'shared_link',
        downloaderIp: req.ip || req.connection.remoteAddress,
        downloaderUserAgent: req.get('User-Agent')
      });

      // Send file
      res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
      res.setHeader('Content-Type', file.fileType);
      res.sendFile(filePath);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Paddle webhook for subscription handling
  app.post("/api/paddle/webhook", async (req, res) => {
    try {
      const { alert_name, user_email, subscription_id, status, product_id } = req.body;
      
      console.log('Paddle webhook received:', { alert_name, user_email, subscription_id, status, product_id });

      if (alert_name === 'subscription_created' || alert_name === 'subscription_updated') {
        // Find user by email
        const user = await storage.getUserByEmail(user_email);
        if (user) {
          // Update subscription status
          const subscriptionTier = product_id === process.env.PADDLE_PRO_PRODUCT_ID ? 'pro' : 'free';
          await storage.updateProfile(user.id, {
            subscriptionTier,
            subscriptionStatus: status,
            subscriptionEndDate: null, // Set based on subscription data if available
            dailyUploadLimit: subscriptionTier === 'pro' ? 100 : 10
          });
          console.log(`Updated subscription for user ${user_email} to ${subscriptionTier}`);
        }
      }

      if (alert_name === 'subscription_cancelled') {
        const user = await storage.getUserByEmail(user_email);
        if (user) {
          await storage.updateProfile(user.id, {
            subscriptionTier: 'free',
            subscriptionStatus: 'cancelled',
            dailyUploadLimit: 10
          });
          console.log(`Cancelled subscription for user ${user_email}`);
        }
      }

      res.status(200).json({ success: true });
    } catch (error: any) {
      console.error('Error processing Paddle webhook:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create Paddle checkout session
  app.post("/api/subscription/create-checkout", authenticateToken, async (req: any, res) => {
    try {
      const { priceId } = req.body;
      
      // Get user profile
      const profile = await storage.getProfile(req.user.id);
      if (!profile) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      // Check if Paddle is configured
      if (!process.env.PADDLE_VENDOR_ID || !process.env.PADDLE_API_KEY) {
        return res.status(500).json({ 
          error: 'Payment system not configured. Please contact support.',
          configured: false
        });
      }

      // Return Paddle configuration for frontend to handle
      res.json({
        success: true,
        paddle: {
          vendorId: process.env.PADDLE_VENDOR_ID,
          productId: priceId,
          userEmail: profile.email,
          configured: true
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Email configuration status endpoint
  app.get("/api/system/email-status", authenticateToken, async (req: any, res) => {
    res.json({
      configured: emailService.isEmailConfigured(),
      features: {
        emailSharing: emailService.isEmailConfigured(),
        welcomeEmails: emailService.isEmailConfigured()
      }
    });
  });

  return httpServer;
}
