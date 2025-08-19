import { RequestHandler } from "express";
import { enhancedEmailService } from "../services/enhanced-email-service";

// Test email delivery endpoint (for development/admin use)
export const handleEmailTest: RequestHandler = async (req, res) => {
  try {
    const { email, provider } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email address is required",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    console.log(`🧪 Testing email delivery to ${email}${provider ? ` via ${provider}` : ''}`);

    const testResult = await enhancedEmailService.sendEmail({
      to: email,
      subject: 'QueryLinker Email Service Test',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: white; padding: 20px; border: 1px solid #e2e8f0; border-radius: 0 0 8px 8px; }
                .success { color: #16a34a; font-weight: bold; }
                .timestamp { color: #64748b; font-size: 14px; margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h2>🔗 QueryLinker Email Test</h2>
            </div>
            <div class="content">
                <p class="success">✅ Email delivery test successful!</p>
                <p>This email was sent to verify that the QueryLinker email service is working properly.</p>
                <p><strong>Test Details:</strong></p>
                <ul>
                    <li>Recipient: ${email}</li>
                    <li>Timestamp: ${new Date().toISOString()}</li>
                    <li>Service: QueryLinker Enhanced Email Service</li>
                </ul>
                <p>If you received this email, it means:</p>
                <ul>
                    <li>✅ Email service is properly configured</li>
                    <li>✅ SMTP/API credentials are working</li>
                    <li>✅ Email delivery is successful</li>
                    <li>✅ Spam filters are not blocking our emails</li>
                </ul>
                <p class="timestamp">Test performed at: ${new Date().toLocaleString()}</p>
            </div>
        </body>
        </html>
      `,
      text: `QueryLinker Email Service Test

✅ Email delivery test successful!

This email was sent to verify that the QueryLinker email service is working properly.

Test Details:
- Recipient: ${email}
- Timestamp: ${new Date().toISOString()}
- Service: QueryLinker Enhanced Email Service

If you received this email, it means:
✅ Email service is properly configured
✅ SMTP/API credentials are working
✅ Email delivery is successful
✅ Spam filters are not blocking our emails

Test performed at: ${new Date().toLocaleString()}`,
    });

    res.json({
      success: true,
      message: "Email test completed",
      result: {
        emailSent: testResult.success,
        provider: testResult.provider,
        messageId: testResult.messageId,
        deliveryTime: testResult.deliveryTime,
        error: testResult.error,
      },
    });

  } catch (error) {
    console.error("Email test error:", error);
    res.status(500).json({
      success: false,
      message: "Email test failed",
      error: String(error),
    });
  }
};

// Email configuration status endpoint
export const handleEmailStatus: RequestHandler = async (req, res) => {
  try {
    const status = {
      resend: {
        configured: !!(process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 're_demo_key_placeholder'),
        keyPresent: !!process.env.RESEND_API_KEY,
        keyValid: process.env.RESEND_API_KEY !== 're_demo_key_placeholder',
      },
      sendgrid: {
        configured: !!process.env.SENDGRID_API_KEY,
        keyPresent: !!process.env.SENDGRID_API_KEY,
      },
      smtp: {
        configured: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
        host: !!process.env.SMTP_HOST,
        credentials: !!(process.env.SMTP_USER && process.env.SMTP_PASS),
      },
      fromEmail: process.env.FROM_EMAIL || 'QueryLinker <noreply@querylinker.com>',
    };

    const anyConfigured = status.resend.configured || status.sendgrid.configured || status.smtp.configured;

    res.json({
      success: true,
      emailServiceConfigured: anyConfigured,
      providers: status,
      recommendations: !anyConfigured ? [
        "Configure at least one email provider (Resend, SendGrid, or SMTP)",
        "Set RESEND_API_KEY environment variable for Resend",
        "Set SENDGRID_API_KEY environment variable for SendGrid", 
        "Set SMTP_HOST, SMTP_USER, SMTP_PASS for SMTP configuration",
        "Verify FROM_EMAIL domain with your email provider",
      ] : [],
    });

  } catch (error) {
    console.error("Email status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get email status",
      error: String(error),
    });
  }
};
