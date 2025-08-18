# Quick Email Setup for Real Delivery

## 🚀 Option 1: Resend (Recommended - 5 minutes)

1. **Sign up at [resend.com](https://resend.com)**
2. **Get your API key** from the dashboard
3. **Set the environment variable**:
   ```bash
   # Use DevServerControl to set:
   RESEND_API_KEY=re_your_actual_api_key_here
   ```
4. **Restart the server** and emails will be delivered!

## 🚀 Option 2: Gmail SMTP (If you have Gmail)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**: 
   - Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
   - Create app password for "Mail"
3. **Set environment variables**:
   ```bash
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-actual-email@gmail.com
   SMTP_PASS=your-16-character-app-password
   ```

## 🧪 For Now - Demo Mode Works!

I've set up a demo email service that:
- ✅ **Shows you the email content** in server logs
- ✅ **Gives you the direct reset link** to test with
- ✅ **Works immediately** without any external setup

## 📧 How to Use Demo Mode

1. **Try forgot password** - it will show "success"
2. **Check server logs** - you'll see the email content and reset link
3. **Copy the reset link** from logs and paste in browser
4. **Test password reset** - it works end-to-end!

The demo mode is perfect for development and testing the full flow.

## 🔄 Switch to Real Email Later

When ready for production:
1. Set up Resend API key (takes 5 minutes)
2. Change back to `enhancedEmailService` in `server/routes/auth.ts`
3. Real emails will be delivered to users

For now, the demo mode gives you a fully working password reset system!
