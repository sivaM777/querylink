import * as nodemailer from "nodemailer";

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

class ProfessionalEmailService {
  private static instance: ProfessionalEmailService;
  private transporter: any = null;
  private testAccount: any = null;

  static getInstance(): ProfessionalEmailService {
    if (!ProfessionalEmailService.instance) {
      ProfessionalEmailService.instance = new ProfessionalEmailService();
    }
    return ProfessionalEmailService.instance;
  }

  async initialize() {
    if (this.transporter) return;

    try {
      this.testAccount = await nodemailer.createTestAccount();

      this.transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: this.testAccount.user,
          pass: this.testAccount.pass,
        },
      });

      console.log(`✅ Professional email service initialized`);
      console.log(`📧 Test account: ${this.testAccount.user}`);
    } catch (error) {
      console.error(
        "❌ Failed to initialize professional email service:",
        error,
      );
    }
  }

  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    const startTime = Date.now();

    if (!this.transporter) {
      await this.initialize();
    }

    if (!this.transporter) {
      return {
        success: false,
        error: "Email service not initialized",
        deliveryTime: Date.now() - startTime,
      };
    }

    try {
      const mailOptions = {
        from: `"QueryLinker Security" <security@querylinker.com>`,
        to: options.to,
        subject: options.subject,
        text: options.text || this.htmlToText(options.html),
        html: options.html,
      };

      const info = await this.transporter.sendMail(mailOptions);
      const previewUrl = nodemailer.getTestMessageUrl(info);

      console.log(`✅ Professional email sent to ${options.to}`);
      console.log(`📧 Message ID: ${info.messageId}`);
      console.log(`🌐 Preview URL: ${previewUrl}`);

      return {
        success: true,
        provider: "professional-ethereal",
        messageId: info.messageId,
        deliveryTime: Date.now() - startTime,
        previewUrl: previewUrl,
      };
    } catch (error) {
      console.error("❌ Failed to send professional email:", error);
      return {
        success: false,
        error: String(error),
        provider: "professional-ethereal",
        deliveryTime: Date.now() - startTime,
      };
    }
  }

  private htmlToText(html: string): string {
    return html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .trim();
  }

  generatePasswordResetEmail(
    name: string,
    resetLink: string,
    recipientEmail?: string,
  ): { html: string; text: string } {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset - QueryLinker</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
            background-color: #0d1117;
            color: #e6edf3;
            line-height: 1.6;
            padding: 20px;
        }
        
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background: linear-gradient(135deg, #161b22 0%, #21262d 100%);
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        }
        
        .header {
            background: linear-gradient(135deg, #238636 0%, #2ea043 100%);
            padding: 30px;
            text-align: center;
            position: relative;
        }
        
        .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 20"><defs><pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="0.5"/></pattern></defs><rect width="100" height="20" fill="url(%23grid)"/></svg>');
            opacity: 0.3;
        }
        
        .logo {
            position: relative;
            z-index: 1;
        }
        
        .logo h1 {
            font-size: 32px;
            font-weight: 700;
            color: white;
            margin-bottom: 8px;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }
        
        .logo p {
            color: rgba(255, 255, 255, 0.9);
            font-size: 16px;
            font-weight: 500;
        }
        
        .content {
            padding: 40px 30px;
        }
        
        .greeting {
            font-size: 18px;
            font-weight: 600;
            color: #f0f6fc;
            margin-bottom: 24px;
        }
        
        .message {
            font-size: 16px;
            color: #c9d1d9;
            margin-bottom: 32px;
            line-height: 1.7;
        }
        
        .action-section {
            text-align: center;
            margin: 40px 0;
        }
        
        .reset-button {
            display: inline-block;
            background: linear-gradient(135deg, #238636 0%, #2ea043 100%);
            color: white !important;
            text-decoration: none;
            padding: 16px 32px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            box-shadow: 0 4px 16px rgba(35, 134, 54, 0.4);
            transition: all 0.3s ease;
            border: 1px solid #2ea043;
        }
        
        .reset-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(35, 134, 54, 0.5);
        }
        
        .link-fallback {
            margin-top: 24px;
            padding: 20px;
            background-color: #21262d;
            border: 1px solid #30363d;
            border-radius: 8px;
        }
        
        .link-fallback p {
            font-size: 14px;
            color: #8b949e;
            margin-bottom: 12px;
        }
        
        .link-text {
            font-family: 'SF Mono', Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
            font-size: 14px;
            background-color: #161b22;
            border: 1px solid #30363d;
            border-radius: 6px;
            padding: 12px;
            word-break: break-all;
            color: #79c0ff;
        }
        
        .security-notice {
            background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
            border: 1px solid #fbbf24;
            border-left: 4px solid #f59e0b;
            border-radius: 8px;
            padding: 20px;
            margin: 32px 0;
        }
        
        .security-notice h3 {
            color: #fbbf24;
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
        }
        
        .security-notice h3::before {
            content: '🔒';
            margin-right: 8px;
        }
        
        .security-notice ul {
            list-style: none;
            padding: 0;
        }
        
        .security-notice li {
            color: #d1d5db;
            font-size: 14px;
            margin-bottom: 8px;
            padding-left: 20px;
            position: relative;
        }
        
        .security-notice li::before {
            content: '•';
            color: #fbbf24;
            font-weight: bold;
            position: absolute;
            left: 0;
        }
        
        .footer {
            background-color: #161b22;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #30363d;
        }
        
        .footer-content {
            font-size: 14px;
            color: #8b949e;
            line-height: 1.7;
        }
        
        .footer-links {
            margin-top: 20px;
        }
        
        .footer-links a {
            color: #58a6ff;
            text-decoration: none;
            margin: 0 12px;
            font-size: 14px;
        }
        
        .footer-links a:hover {
            text-decoration: underline;
        }
        
        .timestamp {
            margin-top: 20px;
            font-size: 12px;
            color: #6e7681;
            font-family: 'SF Mono', Monaco, Consolas, monospace;
        }
        
        @media (max-width: 640px) {
            .email-container {
                margin: 10px;
                border-radius: 8px;
            }
            
            .header, .content, .footer {
                padding: 20px;
            }
            
            .logo h1 {
                font-size: 28px;
            }
            
            .reset-button {
                padding: 14px 24px;
                font-size: 15px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo">
                <h1>🔗 QueryLinker</h1>
                <p>Security Team</p>
            </div>
        </div>
        
        <div class="content">
            <div class="greeting">
                Hi ${name},
            </div>
            
            <div class="message">
                We received a request to reset your password for your QueryLinker account. 
                If you requested this password reset, click the button below to create a new password.
            </div>
            
            <div class="action-section">
                <a href="${resetLink}" class="reset-button">Reset Your Password</a>
            </div>
            
            <div class="link-fallback">
                <p>If the button above doesn't work, copy and paste this link into your browser:</p>
                <div class="link-text">${resetLink}</div>
            </div>
            
            <div class="security-notice">
                <h3>Security Notice</h3>
                <ul>
                    <li>This link will expire in 15 minutes for your security</li>
                    <li>If you didn't request this reset, please ignore this email</li>
                    <li>Never share this link with anyone</li>
                    <li>Contact our security team if you have concerns</li>
                </ul>
            </div>
            
            <div class="message">
                If you're having trouble accessing your account or have any security concerns, 
                please don't hesitate to contact our security team immediately.
            </div>
        </div>
        
        <div class="footer">
            <div class="footer-content">
                <strong>QueryLinker Security Team</strong><br>
                This email was sent to <strong>${recipientEmail}</strong><br>
                Our security systems monitor all password reset activities.
            </div>
            
            <div class="footer-links">
                <a href="mailto:security@querylinker.com">Security Support</a>
                <a href="https://querylinker.com/security">Security Center</a>
                <a href="https://querylinker.com/privacy">Privacy Policy</a>
            </div>
            
            <div class="timestamp">
                Sent: ${new Date().toISOString()}<br>
                QueryLinker Security System
            </div>
        </div>
    </div>
</body>
</html>`;

    const text = `
🔗 QueryLinker - Password Reset Request

Hi ${name},

We received a request to reset your password for your QueryLinker account.

Reset your password using this link:
${resetLink}

🔒 SECURITY NOTICE:
• This link will expire in 15 minutes for your security
• If you didn't request this reset, please ignore this email
• Never share this link with anyone
• Contact our security team if you have concerns

If you're having trouble with the link, copy and paste it into your web browser.

Questions or security concerns? Contact us at security@querylinker.com

QueryLinker Security Team
Sent: ${new Date().toISOString()}
`;

    return { html, text };
  }
}

export const professionalEmailService = ProfessionalEmailService.getInstance();
