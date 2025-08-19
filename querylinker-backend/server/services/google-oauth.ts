import { OAuth2Client } from 'google-auth-library';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  console.warn('⚠️  Google OAuth credentials not configured. Using demo mode.');
}

export class GoogleOAuthService {
  private client: OAuth2Client;
  private readonly redirectUri: string;

  constructor() {
    this.client = new OAuth2Client(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET
    );
    
    // Use environment variable for redirect URI
    this.redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8080/oauth-callback';
  }

  /**
   * Generate Google OAuth authorization URL
   */
  generateAuthUrl(): string {
    if (!GOOGLE_CLIENT_ID) {
      throw new Error('Google OAuth not configured');
    }

    const authUrl = this.client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email'
      ],
      redirect_uri: this.redirectUri,
      prompt: 'select_account'
    });

    return authUrl;
  }

  /**
   * Exchange authorization code for tokens and get user info
   */
  async getUserInfo(code: string) {
    if (!GOOGLE_CLIENT_ID) {
      throw new Error('Google OAuth not configured');
    }

    try {
      // Exchange code for tokens
      const { tokens } = await this.client.getToken({
        code,
        redirect_uri: this.redirectUri
      });

      // Set credentials to get user info
      this.client.setCredentials(tokens);

      // Verify and get user information
      const ticket = await this.client.verifyIdToken({
        idToken: tokens.id_token!,
        audience: GOOGLE_CLIENT_ID
      });

      const payload = ticket.getPayload();
      
      if (!payload) {
        throw new Error('Invalid Google token payload');
      }

      return {
        id: payload.sub,
        email: payload.email!,
        name: payload.name!,
        picture: payload.picture,
        verified_email: payload.email_verified
      };
    } catch (error) {
      console.error('Google OAuth error:', error);
      throw new Error('Failed to authenticate with Google');
    }
  }

  /**
   * Verify Google ID token directly (for client-side authentication)
   */
  async verifyIdToken(idToken: string) {
    if (!GOOGLE_CLIENT_ID) {
      throw new Error('Google OAuth not configured');
    }

    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: GOOGLE_CLIENT_ID
      });

      const payload = ticket.getPayload();
      
      if (!payload) {
        throw new Error('Invalid Google token payload');
      }

      return {
        id: payload.sub,
        email: payload.email!,
        name: payload.name!,
        picture: payload.picture,
        verified_email: payload.email_verified
      };
    } catch (error) {
      console.error('Google ID token verification error:', error);
      throw new Error('Failed to verify Google ID token');
    }
  }
}

export const googleOAuthService = new GoogleOAuthService();
