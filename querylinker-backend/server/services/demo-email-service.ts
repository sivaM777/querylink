import { enhancedEmailService, EmailOptions, EmailResult } from './enhanced-email-service';

// Demo email service that works immediately without external dependencies
class DemoEmailService {
  private static instance: DemoEmailService;

  static getInstance(): DemoEmailService {
    if (!DemoEmailService.instance) {
      DemoEmailService.instance = new DemoEmailService();
    }
    return DemoEmailService.instance;
  }

  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    const startTime = Date.now();

    // For demo purposes, we'll simulate email sending and display the email content
    // In a real app, you would integrate with actual email services
    
    console.log('\n🎯 ============ DEMO EMAIL SENT ============');
    console.log(`📧 TO: ${options.to}`);
    console.log(`📧 SUBJECT: ${options.subject}`);
    console.log('📧 EMAIL CONTENT:');
    console.log('----------------------------------------');
    console.log(this.htmlToText(options.html));
    console.log('========================================\n');

    // Extract the reset link from the email content
    const resetLinkMatch = options.html.match(/href="([^"]*reset-password[^"]*)"/);
    if (resetLinkMatch) {
      console.log('🔗 DIRECT RESET LINK FOR TESTING:');
      console.log(`🌟 ${resetLinkMatch[1]}`);
      console.log('🌟 Copy this link and paste it in your browser to reset your password!\n');
    }

    // Simulate successful email delivery
    return {
      success: true,
      provider: 'demo',
      messageId: `demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      deliveryTime: Date.now() - startTime,
    };
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
    return enhancedEmailService.generatePasswordResetEmail(name, resetLink, recipientEmail);
  }
}

export const demoEmailService = DemoEmailService.getInstance();
