import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private static instance: EmailService;
  private isConfigured: boolean;

  constructor() {
    this.isConfigured = !!process.env.RESEND_API_KEY;
    
    if (!this.isConfigured) {
      console.warn('⚠️  RESEND_API_KEY not configured. Emails will be logged to console instead.');
    }
  }

  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      if (!this.isConfigured) {
        // Fallback to console logging when not configured
        this.logEmailToConsole(options);
        return true;
      }

      const { data, error } = await resend.emails.send({
        from: process.env.FROM_EMAIL || 'QueryLinker <noreply@querylinker.com>',
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      if (error) {
        console.error('Email sending failed:', error);
        // Fallback to console logging if email fails
        this.logEmailToConsole(options);
        return false;
      }

      console.log(`✅ Email sent successfully to ${options.to} (ID: ${data?.id})`);
      return true;
    } catch (error) {
      console.error('Email service error:', error);
      // Fallback to console logging
      this.logEmailToConsole(options);
      return false;
    }
  }

  private logEmailToConsole(options: EmailOptions): void {
    console.log('\n📧 ======= EMAIL SIMULATION =======');
    console.log(`To: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log('---');
    console.log(options.text || this.htmlToText(options.html));
    console.log('================================\n');
  }

  private htmlToText(html: string): string {
    // Simple HTML to text conversion
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

  generatePasswordResetEmail(name: string, resetLink: string): { html: string; text: string } {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset - QueryLinker</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background-color: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 10px;
        }
        .button {
            display: inline-block;
            padding: 12px 30px;
            background-color: #2563eb;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            margin: 20px 0;
        }
        .button:hover {
            background-color: #1d4ed8;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            text-align: center;
            color: #666;
            font-size: 14px;
        }
        .warning {
            background-color: #fef3c7;
            border: 1px solid #f59e0b;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🔗 QueryLinker</div>
            <h1>Password Reset Request</h1>
        </div>
        
        <p>Hi ${name},</p>
        
        <p>You requested a password reset for your QueryLinker account. Click the button below to reset your password:</p>
        
        <div style="text-align: center;">
            <a href="${resetLink}" class="button">Reset Your Password</a>
        </div>
        
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #2563eb;">${resetLink}</p>
        
        <div class="warning">
            <strong>⚠️ Security Notice:</strong><br>
            • This link will expire in 15 minutes<br>
            • If you didn't request this reset, please ignore this email<br>
            • Never share this link with anyone
        </div>
        
        <p>If you're having trouble clicking the button, you can copy and paste the link above into your web browser.</p>
        
        <div class="footer">
            <p>This email was sent from QueryLinker.<br>
            If you have questions, contact us at support@querylinker.com</p>
            <p>&copy; ${new Date().getFullYear()} QueryLinker. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;

    const text = `
Password Reset Request - QueryLinker

Hi ${name},

You requested a password reset for your QueryLinker account.

Reset your password by clicking this link:
${resetLink}

SECURITY NOTICE:
• This link will expire in 15 minutes
• If you didn't request this reset, please ignore this email
• Never share this link with anyone

If you're having trouble with the link, copy and paste it into your web browser.

Questions? Contact us at support@querylinker.com

© ${new Date().getFullYear()} QueryLinker. All rights reserved.
`;

    return { html, text };
  }
}

export const emailService = EmailService.getInstance();
