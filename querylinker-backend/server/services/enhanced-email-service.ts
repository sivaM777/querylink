import { Resend } from 'resend';
import sgMail from '@sendgrid/mail';
import * as nodemailer from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailResult {
  success: boolean;
  provider?: string;
  messageId?: string;
  error?: string;
  deliveryTime?: number;
}

export class EnhancedEmailService {
  private static instance: EnhancedEmailService;
  private resend?: Resend;
  private nodemailerTransporter?: any;
  private sendGridConfigured: boolean = false;
  private resendConfigured: boolean = false;
  private smtpConfigured: boolean = false;

  constructor() {
    this.initializeProviders();
  }

  static getInstance(): EnhancedEmailService {
    if (!EnhancedEmailService.instance) {
      EnhancedEmailService.instance = new EnhancedEmailService();
    }
    return EnhancedEmailService.instance;
  }

  private initializeProviders(): void {
    // Initialize Resend
    if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 're_demo_key_placeholder') {
      try {
        this.resend = new Resend(process.env.RESEND_API_KEY);
        this.resendConfigured = true;
        console.log('✅ Resend email service configured');
      } catch (error) {
        console.error('❌ Resend configuration failed:', error);
      }
    }

    // Initialize SendGrid
    if (process.env.SENDGRID_API_KEY) {
      try {
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        this.sendGridConfigured = true;
        console.log('✅ SendGrid email service configured');
      } catch (error) {
        console.error('❌ SendGrid configuration failed:', error);
      }
    }

    // Initialize SMTP (Nodemailer)
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      try {
        this.nodemailerTransporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
          tls: {
            rejectUnauthorized: false, // Allow self-signed certificates
          },
        });
        this.smtpConfigured = true;
        console.log('✅ SMTP email service configured');
      } catch (error) {
        console.error('❌ SMTP configuration failed:', error);
      }
    }

    if (!this.resendConfigured && !this.sendGridConfigured && !this.smtpConfigured) {
      console.warn('⚠️  No email providers configured. Emails will be logged to console.');
    }
  }

  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    const startTime = Date.now();
    const fromEmail = process.env.FROM_EMAIL || 'QueryLinker <noreply@querylinker.com>';

    // Validate email address
    if (!this.isValidEmail(options.to)) {
      return {
        success: false,
        error: 'Invalid email address format',
        deliveryTime: Date.now() - startTime,
      };
    }

    // Try providers in order of preference: Resend -> SendGrid -> SMTP
    const providers = [
      { name: 'resend', configured: this.resendConfigured, method: this.sendWithResend.bind(this) },
      { name: 'sendgrid', configured: this.sendGridConfigured, method: this.sendWithSendGrid.bind(this) },
      { name: 'smtp', configured: this.smtpConfigured, method: this.sendWithSMTP.bind(this) },
    ];

    for (const provider of providers) {
      if (!provider.configured) continue;

      try {
        console.log(`📧 Attempting to send email via ${provider.name} to ${options.to}`);
        const result = await provider.method(options, fromEmail);
        
        if (result.success) {
          result.deliveryTime = Date.now() - startTime;
          console.log(`✅ Email sent successfully via ${provider.name} to ${options.to} (${result.deliveryTime}ms)`);
          return result;
        } else {
          console.warn(`⚠️  ${provider.name} failed: ${result.error}`);
        }
      } catch (error) {
        console.error(`❌ ${provider.name} error:`, error);
      }
    }

    // All providers failed - log to console as fallback
    console.error('🚨 All email providers failed. Logging to console.');
    this.logEmailToConsole(options);
    
    return {
      success: false,
      error: 'All email providers failed',
      deliveryTime: Date.now() - startTime,
    };
  }

  private async sendWithResend(options: EmailOptions, fromEmail: string): Promise<EmailResult> {
    if (!this.resend) {
      return { success: false, error: 'Resend not configured' };
    }

    try {
      const { data, error } = await this.resend.emails.send({
        from: fromEmail,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      if (error) {
        return { success: false, error: JSON.stringify(error), provider: 'resend' };
      }

      return {
        success: true,
        provider: 'resend',
        messageId: data?.id,
      };
    } catch (error) {
      return { success: false, error: String(error), provider: 'resend' };
    }
  }

  private async sendWithSendGrid(options: EmailOptions, fromEmail: string): Promise<EmailResult> {
    try {
      const msg = {
        to: options.to,
        from: fromEmail,
        subject: options.subject,
        text: options.text || this.htmlToText(options.html),
        html: options.html,
      };

      const response = await sgMail.send(msg);
      return {
        success: true,
        provider: 'sendgrid',
        messageId: response[0].headers['x-message-id'],
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.body?.errors?.[0]?.message || String(error),
        provider: 'sendgrid',
      };
    }
  }

  private async sendWithSMTP(options: EmailOptions, fromEmail: string): Promise<EmailResult> {
    if (!this.nodemailerTransporter) {
      return { success: false, error: 'SMTP not configured' };
    }

    try {
      const mailOptions = {
        from: fromEmail,
        to: options.to,
        subject: options.subject,
        text: options.text || this.htmlToText(options.html),
        html: options.html,
      };

      const info = await this.nodemailerTransporter.sendMail(mailOptions);
      return {
        success: true,
        provider: 'smtp',
        messageId: info.messageId,
      };
    } catch (error) {
      return { success: false, error: String(error), provider: 'smtp' };
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private logEmailToConsole(options: EmailOptions): void {
    console.log('\n📧 ======= EMAIL FALLBACK (CONSOLE) =======');
    console.log(`To: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log('---');
    console.log(options.text || this.htmlToText(options.html));
    console.log('=========================================\n');
  }

  private htmlToText(html: string): string {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
  }

  generatePasswordResetEmail(name: string, resetLink: string, recipientEmail?: string): { html: string; text: string } {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset - QueryLinker</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8fafc;
        }
        .container {
            background-color: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
            border: 1px solid #e2e8f0;
        }
        .header {
            text-align: center;
            margin-bottom: 32px;
        }
        .logo {
            font-size: 28px;
            font-weight: 700;
            color: #2563eb;
            margin-bottom: 8px;
        }
        .title {
            font-size: 24px;
            font-weight: 600;
            color: #1e293b;
            margin: 0;
        }
        .button {
            display: inline-block;
            padding: 14px 32px;
            background-color: #2563eb;
            color: white !important;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            margin: 24px 0;
            box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);
        }
        .button:hover {
            background-color: #1d4ed8;
        }
        .link-text {
            word-break: break-all;
            color: #2563eb;
            background-color: #f1f5f9;
            padding: 12px;
            border-radius: 6px;
            font-family: monospace;
            font-size: 14px;
        }
        .footer {
            margin-top: 40px;
            padding-top: 24px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            color: #64748b;
            font-size: 14px;
        }
        .warning {
            background-color: #fef3c7;
            border: 1px solid #f59e0b;
            border-left: 4px solid #f59e0b;
            padding: 16px;
            border-radius: 8px;
            margin: 24px 0;
        }
        .warning-title {
            font-weight: 600;
            color: #92400e;
            margin-bottom: 8px;
        }
        .warning-text {
            color: #92400e;
            font-size: 14px;
            line-height: 1.5;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🔗 QueryLinker</div>
            <h1 class="title">Reset Your Password</h1>
        </div>
        
        <p>Hi <strong>${name}</strong>,</p>
        
        <p>We received a request to reset the password for your QueryLinker account. Click the button below to create a new password:</p>
        
        <div style="text-align: center;">
            <a href="${resetLink}" class="button">Reset Your Password</a>
        </div>
        
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <div class="link-text">${resetLink}</div>
        
        <div class="warning">
            <div class="warning-title">🔒 Security Notice</div>
            <div class="warning-text">
                • This link will expire in 15 minutes for your security<br>
                • If you didn't request this reset, please ignore this email<br>
                • Never share this link with anyone<br>
                • Contact support if you continue having issues
            </div>
        </div>
        
        <p>If you're having trouble accessing your account, please don't hesitate to contact our support team.</p>
        
        <div class="footer">
            <p><strong>QueryLinker Security Team</strong><br>
            This email was sent to ${recipientEmail || '[recipient]'}<br>
            Questions? Email us at <a href="mailto:support@querylinker.com">support@querylinker.com</a></p>
            <p style="margin-top: 16px; font-size: 12px; color: #94a3b8;">
                &copy; ${new Date().getFullYear()} QueryLinker. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>`;

    const text = `
🔗 QueryLinker - Password Reset Request

Hi ${name},

We received a request to reset the password for your QueryLinker account.

Reset your password by clicking this link:
${resetLink}

🔒 SECURITY NOTICE:
• This link will expire in 15 minutes for your security
• If you didn't request this reset, please ignore this email
• Never share this link with anyone
• Contact support if you continue having issues

If you're having trouble with the link, copy and paste it into your web browser.

Questions? Contact our support team at support@querylinker.com

QueryLinker Security Team
© ${new Date().getFullYear()} QueryLinker. All rights reserved.
`;

    return { html, text };
  }

  async testEmailDelivery(testEmail: string): Promise<void> {
    console.log(`🧪 Testing email delivery to ${testEmail}...`);
    
    const testResult = await this.sendEmail({
      to: testEmail,
      subject: 'QueryLinker Email Service Test',
      html: `
        <h2>Email Service Test</h2>
        <p>This is a test email to verify email delivery is working properly.</p>
        <p>Timestamp: ${new Date().toISOString()}</p>
        <p>If you received this email, the service is working correctly!</p>
      `,
      text: `Email Service Test\n\nThis is a test email to verify email delivery is working properly.\nTimestamp: ${new Date().toISOString()}\n\nIf you received this email, the service is working correctly!`,
    });

    console.log('Test result:', testResult);
  }
}

export const enhancedEmailService = EnhancedEmailService.getInstance();
