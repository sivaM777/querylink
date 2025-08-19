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
  previewUrl?: string;
}

class InstantEmailService {
  private static instance: InstantEmailService;
  private transporter: any = null;
  private testAccount: any = null;

  static getInstance(): InstantEmailService {
    if (!InstantEmailService.instance) {
      InstantEmailService.instance = new InstantEmailService();
    }
    return InstantEmailService.instance;
  }

  async initialize() {
    if (this.transporter) return; // Already initialized

    try {
      // Create test account using Ethereal (works instantly, no signup needed)
      this.testAccount = await nodemailer.createTestAccount();
      
      // Create transporter using test account
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: this.testAccount.user,
          pass: this.testAccount.pass,
        },
      });

      console.log(`✅ Instant email service initialized`);
      console.log(`📧 Test account: ${this.testAccount.user}`);
      console.log(`🔗 View emails at: https://ethereal.email`);
    } catch (error) {
      console.error('❌ Failed to initialize instant email service:', error);
    }
  }

  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    const startTime = Date.now();

    // Initialize if not already done
    if (!this.transporter) {
      await this.initialize();
    }

    if (!this.transporter) {
      return {
        success: false,
        error: 'Email service not initialized',
        deliveryTime: Date.now() - startTime,
      };
    }

    try {
      const mailOptions = {
        from: `"QueryLinker Password Reset" <${this.testAccount.user}>`,
        to: options.to,
        subject: options.subject,
        text: options.text || this.htmlToText(options.html),
        html: options.html,
      };

      const info = await this.transporter.sendMail(mailOptions);
      const previewUrl = nodemailer.getTestMessageUrl(info);

      console.log(`✅ Email sent successfully to ${options.to}`);
      console.log(`📧 Message ID: ${info.messageId}`);
      console.log(`🌐 Preview URL: ${previewUrl}`);
      console.log(`🎯 OPEN THIS LINK TO SEE YOUR EMAIL: ${previewUrl}`);

      return {
        success: true,
        provider: 'ethereal-instant',
        messageId: info.messageId,
        deliveryTime: Date.now() - startTime,
        previewUrl: previewUrl,
      };
    } catch (error) {
      console.error('❌ Failed to send email:', error);
      return {
        success: false,
        error: String(error),
        provider: 'ethereal-instant',
        deliveryTime: Date.now() - startTime,
      };
    }
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
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
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
        .button {
            display: inline-block;
            padding: 14px 32px;
            background-color: #2563eb;
            color: white !important;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            margin: 24px 0;
        }
        .link-text {
            word-break: break-all;
            color: #2563eb;
            background-color: #f1f5f9;
            padding: 12px;
            border-radius: 6px;
            font-family: monospace;
        }
        .warning {
            background-color: #fef3c7;
            border: 1px solid #f59e0b;
            padding: 16px;
            border-radius: 8px;
            margin: 24px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🔗 QueryLinker</div>
            <h1>Reset Your Password</h1>
        </div>
        
        <p>Hi <strong>${name}</strong>,</p>
        
        <p>We received a request to reset your QueryLinker password. Click the button below:</p>
        
        <div style="text-align: center;">
            <a href="${resetLink}" class="button">Reset Your Password</a>
        </div>
        
        <p>Or copy this link:</p>
        <div class="link-text">${resetLink}</div>
        
        <div class="warning">
            <strong>🔒 Security Notice:</strong><br>
            • This link expires in 15 minutes<br>
            • If you didn't request this, ignore this email<br>
            • Never share this link
        </div>
        
        <p><strong>QueryLinker Team</strong><br>
        Email sent to: ${recipientEmail}</p>
    </div>
</body>
</html>`;

    const text = `
QueryLinker - Password Reset Request

Hi ${name},

We received a request to reset your QueryLinker password.

Reset link: ${resetLink}

🔒 SECURITY NOTICE:
• This link expires in 15 minutes
• If you didn't request this, ignore this email
• Never share this link

QueryLinker Team
Email sent to: ${recipientEmail}
`;

    return { html, text };
  }
}

export const instantEmailService = InstantEmailService.getInstance();
