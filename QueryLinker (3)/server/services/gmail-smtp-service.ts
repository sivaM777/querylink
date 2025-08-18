import * as nodemailer from 'nodemailer';
import { EmailOptions } from './email-service';

export interface GmailSMTPConfig {
  user: string;
  pass: string;
  fromName?: string;
}

export interface EmailResult {
  success: boolean;
  provider: string;
  deliveryTime: number;
  messageId?: string;
  error?: string;
  previewUrl?: string;
}

export class GmailSMTPService {
  private static instance: GmailSMTPService;
  private transporter: nodemailer.Transporter | null = null;
  private isConfigured: boolean = false;
  private config: GmailSMTPConfig;

  constructor() {
    this.config = {
      user: process.env.GMAIL_SMTP_USER || 'Querylinker.app@gmail.com',
      pass: process.env.GMAIL_SMTP_PASSWORD || '',
      fromName: process.env.GMAIL_FROM_NAME || 'QueryLinker',
    };

    this.initializeTransporter();
  }

  static getInstance(): GmailSMTPService {
    if (!GmailSMTPService.instance) {
      GmailSMTPService.instance = new GmailSMTPService();
    }
    return GmailSMTPService.instance;
  }

  private initializeTransporter(): void {
    try {
      if (!this.config.pass) {
        console.warn('⚠️  GMAIL_SMTP_PASSWORD not configured. Gmail SMTP will not be available.');
        return;
      }

      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        host: 'smtp.gmail.com',
        port: 587,
        secure: false, // Use TLS
        auth: {
          user: this.config.user,
          pass: this.config.pass,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });

      this.isConfigured = true;
      console.log('✅ Gmail SMTP transporter initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Gmail SMTP transporter:', error);
      this.isConfigured = false;
    }
  }

  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    const startTime = Date.now();

    try {
      if (!this.isConfigured || !this.transporter) {
        const error = 'Gmail SMTP not configured properly';
        console.error('❌', error);
        this.logEmailToConsole(options);
        return {
          success: false,
          provider: 'gmail-smtp',
          deliveryTime: Date.now() - startTime,
          error,
        };
      }

      const mailOptions = {
        from: `${this.config.fromName} <${this.config.user}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      };

      const result = await this.transporter.sendMail(mailOptions);
      const deliveryTime = Date.now() - startTime;

      console.log(`✅ Email sent successfully via Gmail SMTP to ${options.to} (${deliveryTime}ms)`);
      console.log(`📧 Message ID: ${result.messageId}`);

      return {
        success: true,
        provider: 'gmail-smtp',
        deliveryTime,
        messageId: result.messageId,
      };
    } catch (error: any) {
      const deliveryTime = Date.now() - startTime;
      console.error('❌ Gmail SMTP send error:', error);
      
      // Fallback to console logging
      this.logEmailToConsole(options);

      return {
        success: false,
        provider: 'gmail-smtp',
        deliveryTime,
        error: error.message || 'Unknown email sending error',
      };
    }
  }

  private logEmailToConsole(options: EmailOptions): void {
    console.log('\n📧 ======= EMAIL SIMULATION (Gmail SMTP Fallback) =======');
    console.log(`To: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log('---');
    console.log(options.text || this.htmlToText(options.html));
    console.log('====================================================\n');
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

  generatePasswordResetEmail(name: string, resetLink: string, userEmail: string): { html: string; text: string } {
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
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .container {
            background-color: white;
            padding: 40px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 10px;
        }
        .subtitle {
            color: #666;
            font-size: 16px;
        }
        .button {
            display: inline-block;
            padding: 15px 35px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            border-radius: 10px;
            font-weight: bold;
            margin: 25px 0;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
            transition: all 0.3s ease;
        }
        .button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
        }
        .footer {
            margin-top: 40px;
            padding-top: 25px;
            border-top: 2px solid #f0f0f0;
            text-align: center;
            color: #666;
            font-size: 14px;
        }
        .warning {
            background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
            border: 1px solid #f59e0b;
            padding: 20px;
            border-radius: 10px;
            margin: 25px 0;
        }
        .security-icon {
            font-size: 24px;
            margin-bottom: 10px;
        }
        .link-box {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            word-break: break-all;
            color: #667eea;
            font-family: monospace;
            border-left: 4px solid #667eea;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🧠 QueryLinker</div>
            <div class="subtitle">AI-Powered ITSM Assistant</div>
            <h1 style="color: #333; margin-top: 20px;">Password Reset Request</h1>
        </div>
        
        <p>Hi <strong>${name}</strong>,</p>
        
        <p>You requested a password reset for your QueryLinker account (<strong>${userEmail}</strong>). We're here to help you regain access securely.</p>
        
        <div style="text-align: center;">
            <a href="${resetLink}" class="button">🔐 Reset Your Password</a>
        </div>
        
        <p>Alternatively, you can copy and paste this link into your browser:</p>
        <div class="link-box">${resetLink}</div>
        
        <div class="warning">
            <div class="security-icon">🛡️</div>
            <strong>Security Notice:</strong><br>
            • This link will expire in <strong>15 minutes</strong> for your security<br>
            • If you didn't request this reset, please ignore this email<br>
            • Never share this link with anyone else<br>
            • Contact our support team if you have concerns
        </div>
        
        <p>If you're having trouble clicking the button, copy and paste the link above into your web browser's address bar.</p>
        
        <div class="footer">
            <p><strong>QueryLinker Security Team</strong><br>
            Keeping your ITSM data safe and secure</p>
            <p>Questions? Contact us at <a href="mailto:support@querylinker.com" style="color: #667eea;">support@querylinker.com</a></p>
            <p>&copy; ${new Date().getFullYear()} QueryLinker. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;

    const text = `
🧠 QueryLinker - Password Reset Request

Hi ${name},

You requested a password reset for your QueryLinker account (${userEmail}).

Reset your password by clicking this link:
${resetLink}

🛡️ SECURITY NOTICE:
• This link will expire in 15 minutes for your security
• If you didn't request this reset, please ignore this email
• Never share this link with anyone else
• Contact our support team if you have concerns

If you're having trouble with the link, copy and paste it into your web browser.

Questions? Contact us at support@querylinker.com

© ${new Date().getFullYear()} QueryLinker. All rights reserved.
AI-Powered ITSM Assistant
`;

    return { html, text };
  }

  // Test the connection
  async testConnection(): Promise<boolean> {
    try {
      if (!this.transporter) {
        return false;
      }
      await this.transporter.verify();
      console.log('✅ Gmail SMTP connection verified successfully');
      return true;
    } catch (error) {
      console.error('❌ Gmail SMTP connection test failed:', error);
      return false;
    }
  }
}

export const gmailSMTPService = GmailSMTPService.getInstance();
