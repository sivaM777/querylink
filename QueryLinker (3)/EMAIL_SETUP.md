# Email Service Configuration Guide

The QueryLinker application now includes a robust email service with multiple provider support for password reset functionality.

## 🔧 Email Providers Supported

### 1. Resend (Recommended)
- **Setup**: Sign up at [resend.com](https://resend.com)
- **Environment Variables**:
  ```bash
  RESEND_API_KEY=re_your_api_key_here
  FROM_EMAIL=QueryLinker <noreply@yourdomain.com>
  ```
- **Domain Verification**: Verify your sending domain in Resend dashboard
- **Benefits**: Modern API, excellent deliverability, easy setup

### 2. SendGrid
- **Setup**: Sign up at [sendgrid.com](https://sendgrid.com)
- **Environment Variables**:
  ```bash
  SENDGRID_API_KEY=SG.your_api_key_here
  FROM_EMAIL=QueryLinker <noreply@yourdomain.com>
  ```
- **Domain Verification**: Set up sender authentication in SendGrid
- **Benefits**: Reliable, scalable, detailed analytics

### 3. SMTP (Gmail, Outlook, custom SMTP)
- **Environment Variables**:
  ```bash
  SMTP_HOST=smtp.gmail.com
  SMTP_PORT=587
  SMTP_SECURE=false
  SMTP_USER=your-email@gmail.com
  SMTP_PASS=your-app-password
  FROM_EMAIL=QueryLinker <your-email@gmail.com>
  ```

## 🚀 Quick Setup Instructions

### Option A: Using Resend (Recommended)
1. Sign up at [resend.com](https://resend.com)
2. Verify your domain or use their testing domain
3. Generate an API key
4. Set environment variables using DevServerControl:
   ```
   RESEND_API_KEY=re_your_actual_key
   FROM_EMAIL=QueryLinker <noreply@yourdomain.com>
   ```

### Option B: Using Gmail SMTP
1. Enable 2FA on your Gmail account
2. Generate an App Password: [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Set environment variables:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-16-char-app-password
   FROM_EMAIL=QueryLinker <your-email@gmail.com>
   ```

## 🧪 Testing Email Delivery

### 1. Check Email Service Status
```bash
curl http://localhost:8080/api/email/status
```

### 2. Send Test Email
```bash
curl -X POST http://localhost:8080/api/email/test \
  -H "Content-Type: application/json" \
  -d '{"email": "your-test-email@gmail.com"}'
```

### 3. Test Multiple Domains
Test with different email providers to ensure deliverability:
- Gmail: your-test@gmail.com
- Outlook: your-test@outlook.com
- Yahoo: your-test@yahoo.com

## 📧 Domain Authentication (Important for Production)

### SPF Record
Add this TXT record to your domain DNS:
```
v=spf1 include:_spf.resend.com ~all
```

### DKIM
Resend/SendGrid will provide DKIM records to add to your DNS.

### DMARC
Add this TXT record for DMARC:
```
v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com
```

## 🔍 Troubleshooting

### Common Issues

1. **"All email providers failed"**
   - Check API keys are correct
   - Verify environment variables are set
   - Check internet connectivity

2. **Emails going to spam**
   - Set up SPF, DKIM, DMARC records
   - Use a verified sending domain
   - Avoid spam trigger words in subject/content

3. **SMTP authentication failed**
   - Ensure 2FA is enabled (for Gmail)
   - Use App Password, not regular password
   - Check SMTP settings are correct

### Debug Steps

1. Check email service configuration:
   ```bash
   curl http://localhost:8080/api/email/status
   ```

2. Check server logs for detailed error messages

3. Test with different email addresses

4. Verify DNS records for your domain

## 🎯 Production Recommendations

1. **Use Resend or SendGrid** for production (not SMTP)
2. **Verify your sending domain** with your email provider
3. **Set up proper DNS records** (SPF, DKIM, DMARC)
4. **Monitor email delivery rates** and bounces
5. **Use a dedicated subdomain** for transactional emails (e.g., mail.yourdomain.com)

## 🔐 Security Notes

- Never commit API keys to version control
- Use environment variables for all sensitive configuration
- Regularly rotate API keys
- Monitor email sending for unusual activity
- Set up rate limiting for forgot password requests

## 📊 Email Analytics

Monitor these metrics:
- Delivery rate
- Open rate
- Bounce rate
- Spam complaints
- Click-through rate (for reset links)

The enhanced email service logs delivery results and timing for debugging purposes.
