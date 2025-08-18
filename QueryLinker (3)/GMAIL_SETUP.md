# Gmail SMTP Setup for QueryLinker

## 🔧 Setting up Gmail SMTP for Password Reset Emails

Follow these steps to configure Gmail SMTP for sending password reset emails in QueryLinker.

### Step 1: Enable 2-Factor Authentication
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable 2-Factor Authentication if not already enabled

### Step 2: Generate App Password
1. Go to [App Passwords](https://myaccount.google.com/apppasswords)
2. Select "Mail" as the app and "Other" as the device
3. Enter "QueryLinker" as the device name
4. Copy the 16-character app password (format: `xxxx xxxx xxxx xxxx`)

### Step 3: Configure Environment Variables

Add these variables to your `.env` file:

```env
# Gmail SMTP Configuration
GMAIL_SMTP_USER=Querylinker.app@gmail.com
GMAIL_SMTP_PASSWORD=wedjkgxxdcujezch
GMAIL_FROM_NAME=QueryLinker
```

**Important**: Replace `wedjkgxxdcujezch` with your actual 16-character app password.

### Step 4: Test the Configuration

The service will automatically test the connection when the server starts. Look for:

```
✅ Gmail SMTP transporter initialized successfully
✅ Gmail SMTP connection verified successfully
```

### 🔐 Security Best Practices

1. **Never commit credentials**: Add `.env` to your `.gitignore`
2. **Use environment variables**: Keep credentials out of source code
3. **Rotate passwords**: Regenerate app passwords periodically
4. **Monitor usage**: Check Gmail's sent folder for email delivery

### 📧 Email Template Features

The Gmail SMTP service includes:
- ✨ Modern gradient design matching QueryLinker branding
- 🛡️ Security warnings and best practices
- 📱 Mobile-responsive HTML templates
- 🔗 Secure password reset links with 15-minute expiry
- 📊 Detailed logging and error handling

### 🚨 Troubleshooting

**Connection Errors:**
- Verify 2FA is enabled on your Google account
- Double-check the app password (16 characters, no spaces)
- Ensure the Gmail account has sufficient sending limits

**Email Not Received:**
- Check spam/junk folders
- Verify the recipient email address
- Check Gmail's sent folder to confirm delivery

**Fallback Behavior:**
If Gmail SMTP fails, the system will:
1. Log the email content to the console
2. Show appropriate error messages to users
3. Continue normal operation without breaking

### 📈 Production Considerations

For production deployments:
- Use dedicated email accounts for different environments
- Implement email delivery monitoring
- Set up alerting for failed email deliveries
- Consider Gmail sending limits (500 emails/day for free accounts)

### 🔄 Alternative Configurations

You can also use:
- **SendGrid**: Set `RESEND_API_KEY` in the existing email service
- **Nodemailer**: Configure other SMTP providers
- **Multiple providers**: The system supports fallback chains

---

**Ready to test?** Save your `.env` file and restart the server. Try the "Forgot Password" feature on the login page!
