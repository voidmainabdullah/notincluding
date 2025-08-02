import nodemailer from 'nodemailer';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private isConfigured = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    try {
      // Check for email configuration
      const emailConfig: EmailConfig = {
        host: process.env.SMTP_HOST || '',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASS || ''
        }
      };

      // Only create transporter if configuration is provided
      if (emailConfig.host && emailConfig.auth.user && emailConfig.auth.pass) {
        this.transporter = nodemailer.createTransport(emailConfig);
        this.isConfigured = true;
        console.log('Email service configured successfully');
      } else {
        console.log('Email service not configured - missing SMTP settings');
      }
    } catch (error) {
      console.error('Failed to initialize email service:', error);
    }
  }

  async sendFileShareEmail(
    recipientEmail: string,
    senderEmail: string,
    fileName: string,
    shareUrl: string,
    message?: string
  ): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      console.error('Email service not configured');
      return false;
    }

    try {
      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: recipientEmail,
        subject: `${senderEmail} shared a file with you: ${fileName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🔐 SecureShare</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Secure File Sharing</p>
            </div>
            
            <div style="padding: 40px; background: #ffffff;">
              <h2 style="color: #333; margin-bottom: 20px;">You've received a file!</h2>
              
              <p style="color: #666; font-size: 16px; line-height: 1.6;">
                <strong>${senderEmail}</strong> has shared a file with you using SecureShare.
              </p>
              
              <div style="background: #f8f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #333;"><strong>File:</strong> ${fileName}</p>
                ${message ? `<p style="margin: 10px 0 0 0; color: #666;"><strong>Message:</strong> ${message}</p>` : ''}
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${shareUrl}" 
                   style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                          color: white; 
                          padding: 15px 30px; 
                          text-decoration: none; 
                          border-radius: 5px; 
                          font-weight: bold;
                          display: inline-block;">
                  Download File
                </a>
              </div>
              
              <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;">
                <p style="color: #999; font-size: 14px; text-align: center;">
                  This link is secure and may have download limits or expiry dates.<br>
                  Powered by SecureShare - Professional File Sharing
                </p>
              </div>
            </div>
          </div>
        `
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`File share email sent to ${recipientEmail} for file: ${fileName}`);
      return true;
    } catch (error) {
      console.error('Failed to send file share email:', error);
      return false;
    }
  }

  async sendWelcomeEmail(userEmail: string, displayName: string): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      return false;
    }

    try {
      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: userEmail,
        subject: 'Welcome to SecureShare!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🔐 Welcome to SecureShare</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Secure File Sharing Platform</p>
            </div>
            
            <div style="padding: 40px; background: #ffffff;">
              <h2 style="color: #333; margin-bottom: 20px;">Hello ${displayName}!</h2>
              
              <p style="color: #666; font-size: 16px; line-height: 1.6;">
                Thank you for joining SecureShare! Your account has been created successfully.
              </p>
              
              <div style="background: #f8f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #333; margin-top: 0;">What you can do with SecureShare:</h3>
                <ul style="color: #666; line-height: 1.8;">
                  <li>Upload and share files securely</li>
                  <li>Set password protection and expiry dates</li>
                  <li>Track downloads and analytics</li>
                  <li>Share via unique codes, emails, or direct links</li>
                  <li>Manage your files with professional tools</li>
                </ul>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.APP_URL || 'http://localhost:5000'}/dashboard" 
                   style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                          color: white; 
                          padding: 15px 30px; 
                          text-decoration: none; 
                          border-radius: 5px; 
                          font-weight: bold;
                          display: inline-block;">
                  Go to Dashboard
                </a>
              </div>
              
              <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;">
                <p style="color: #999; font-size: 14px; text-align: center;">
                  Need help? Contact our support team.<br>
                  SecureShare - Professional File Sharing Platform
                </p>
              </div>
            </div>
          </div>
        `
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Welcome email sent to ${userEmail}`);
      return true;
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      return false;
    }
  }

  isEmailConfigured(): boolean {
    return this.isConfigured;
  }
}

export const emailService = new EmailService();