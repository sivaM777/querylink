# Google OAuth Setup Guide

## Issue Resolution: Google OAuth Redirect Fix

The redirect issue you're experiencing is caused by **mismatched redirect URI configuration** between your application and Google Cloud Console.

## Step-by-Step Fix

### 1. Update Environment Configuration

Create or update your `.env` file with the following:

```bash
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-actual-google-client-id
GOOGLE_CLIENT_SECRET=your-actual-google-client-secret

# Base URL for redirects
BASE_URL=http://localhost:8080

# Environment-specific redirect URI
GOOGLE_REDIRECT_URI=http://localhost:8080/oauth-callback
```

### 2. Google Cloud Console Configuration

1. **Go to**: https://console.cloud.google.com/
2. **Navigate to**: APIs & Services → Credentials
3. **Find your OAuth 2.0 Client ID**
4. **Update Authorized redirect URIs**:
   - `http://localhost:8080/oauth-callback` (for development)
   - `https://yourdomain.com/oauth-callback` (for production)

### 3. Verify Current Configuration

The backend is now configured to use the environment variable `GOOGLE_REDIRECT_URI` which defaults to `http://localhost:8080/oauth-callback`.

### 4. Test the OAuth Flow

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Click "Sign in with Google"** - it should now redirect to the correct Google OAuth page instead of the account chooser.

3. **After authentication**, you should be redirected to `http://localhost:8080/oauth-callback` which will process the authentication.

### 5. Production Deployment

For production, update your environment variables:

```bash
GOOGLE_REDIRECT_URI=https://yourdomain.com/oauth-callback
BASE_URL=https://yourdomain.com
```

### 6. Common Issues and Solutions

| Issue | Solution |
|-------|----------|
| Redirect URI mismatch | Ensure the URI in Google Cloud Console exactly matches `GOOGLE_REDIRECT_URI` |
| Account chooser redirect | This happens when redirect URI is invalid - fix the URI configuration |
| localhost vs production | Use environment variables to switch between development and production URIs |

### 7. Verification Steps

1. Check that `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set correctly
2. Verify the redirect URI in Google Cloud Console matches your `GOOGLE_REDIRECT_URI`
3. Ensure the OAuth callback route (`/oauth-callback`) exists in your frontend
4. Check browser console for any redirect-related errors

## Quick Test Command

To verify the OAuth URL generation:

```bash
curl http://localhost:8080/api/auth/google/url
```

This should return a valid Google OAuth URL instead of redirecting to the account chooser.
