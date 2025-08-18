import { RequestHandler } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { getDatabase, executeQuery } from "../database/database";
import { enhancedEmailService } from "../services/enhanced-email-service";
import { demoEmailService } from "../services/demo-email-service";
import { instantEmailService } from "../services/instant-email-service";
import { professionalEmailService } from "../services/professional-email-service";
import { gmailSMTPService } from "../services/gmail-smtp-service";
import { googleOAuthService } from "../services/google-oauth";

const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-this-in-production";
const JWT_EXPIRES_IN = "7d";

interface User {
  user_id: number;
  email: string;
  full_name: string;
  role: string;
  avatar_url?: string;
  created_at: string;
  last_login?: string;
  preferences?: string;
}

// Register new user
export const handleSignup: RequestHandler = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    const db = getDatabase();

    // Check if user already exists
    const existingUser = db
      .prepare("SELECT email FROM users WHERE email = ?")
      .get(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const result = db
      .prepare(
        `
      INSERT INTO users (email, password_hash, full_name, role)
      VALUES (?, ?, ?, ?)
    `,
      )
      .run(email, passwordHash, fullName, "user");

    const userId = result.lastInsertRowid as number;

    // Get created user
    const user = db
      .prepare(
        `
      SELECT user_id, email, full_name, role, avatar_url, created_at, preferences
      FROM users WHERE user_id = ?
    `,
      )
      .get(userId) as User;

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.user_id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN },
    );

    // Store session
    const sessionExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    db.prepare(
      `
      INSERT INTO user_sessions (user_id, token, expires_at, device_info, ip_address)
      VALUES (?, ?, ?, ?, ?)
    `,
    ).run(
      userId,
      token,
      sessionExpiry.toISOString(),
      req.headers["user-agent"],
      req.ip,
    );

    // Create welcome notification
    db.prepare(
      `
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (?, ?, ?, ?)
    `,
    ).run(
      userId,
      "Welcome to QueryLinker!",
      "Your account has been created successfully. Start by connecting your first system.",
      "success",
    );

    res.json({
      success: true,
      message: "Account created successfully",
      user: {
        id: user.user_id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        avatarUrl: user.avatar_url,
        preferences: user.preferences ? JSON.parse(user.preferences) : {},
      },
      token,
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Login user
export const handleLogin: RequestHandler = async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const db = getDatabase();

    // Get user by email
    const user = db
      .prepare(
        `
      SELECT user_id, email, password_hash, full_name, role, avatar_url, preferences, is_active
      FROM users WHERE email = ?
    `,
      )
      .get(email) as User & { password_hash: string; is_active: number };

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: "Account is deactivated",
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Update last login
    db.prepare(
      "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = ?",
    ).run(user.user_id);

    // Generate JWT token
    const expiresIn = rememberMe ? "30d" : JWT_EXPIRES_IN;
    const token = jwt.sign(
      { userId: user.user_id, email: user.email },
      JWT_SECRET,
      { expiresIn },
    );

    // Store session
    const sessionDays = rememberMe ? 30 : 7;
    const sessionExpiry = new Date(
      Date.now() + sessionDays * 24 * 60 * 60 * 1000,
    );
    db.prepare(
      `
      INSERT INTO user_sessions (user_id, token, expires_at, device_info, ip_address)
      VALUES (?, ?, ?, ?, ?)
    `,
    ).run(
      user.user_id,
      token,
      sessionExpiry.toISOString(),
      req.headers["user-agent"],
      req.ip,
    );

    res.json({
      success: true,
      message: "Login successful",
      user: {
        id: user.user_id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        avatarUrl: user.avatar_url,
        preferences: user.preferences ? JSON.parse(user.preferences) : {},
      },
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Logout user
export const handleLogout: RequestHandler = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (token) {
      const db = getDatabase();
      db.prepare("DELETE FROM user_sessions WHERE token = ?").run(token);
    }

    res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get current user profile
export const handleGetProfile: RequestHandler = async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const db = getDatabase();
    const user = db
      .prepare(
        `
      SELECT user_id, email, full_name, role, avatar_url, created_at, last_login, preferences
      FROM users WHERE user_id = ? AND is_active = 1
    `,
      )
      .get(userId) as User;

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      user: {
        id: user.user_id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        avatarUrl: user.avatar_url,
        createdAt: user.created_at,
        lastLogin: user.last_login,
        preferences: user.preferences ? JSON.parse(user.preferences) : {},
      },
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Update user profile
export const handleUpdateProfile: RequestHandler = async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    const { fullName, avatarUrl, preferences } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const db = getDatabase();

    // Check if user exists
    const existingUser = db
      .prepare("SELECT user_id FROM users WHERE user_id = ?")
      .get(userId);

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update user profile - handle partial updates
    if (fullName !== undefined || avatarUrl !== undefined) {
      db.prepare(
        `
        UPDATE users
        SET full_name = COALESCE(?, full_name),
            avatar_url = COALESCE(?, avatar_url),
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `,
      ).run(fullName || null, avatarUrl || null, userId);
    }

    // Update preferences separately if provided
    if (preferences !== undefined) {
      db.prepare(
        `
        UPDATE users
        SET preferences = ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `,
      ).run(JSON.stringify(preferences), userId);
    }

    // Get updated user
    const user = db
      .prepare(
        `
      SELECT user_id, email, full_name, role, avatar_url, preferences, created_at, last_login
      FROM users WHERE user_id = ?
    `,
      )
      .get(userId) as User;

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: user.user_id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        avatarUrl: user.avatar_url,
        createdAt: user.created_at,
        lastLogin: user.last_login,
        preferences: user.preferences ? JSON.parse(user.preferences) : {},
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get user notifications
export const handleGetNotifications: RequestHandler = async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const db = getDatabase();
    const notifications = db
      .prepare(
        `
      SELECT notification_id, title, message, type, is_read, action_url, created_at
      FROM notifications 
      WHERE user_id = ? AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
      ORDER BY created_at DESC
      LIMIT 50
    `,
      )
      .all(userId);

    const unreadCount = db
      .prepare(
        `
      SELECT COUNT(*) as count
      FROM notifications 
      WHERE user_id = ? AND is_read = 0 AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
    `,
      )
      .get(userId) as { count: number };

    res.json({
      success: true,
      notifications,
      unreadCount: unreadCount.count,
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Mark notification as read
export const handleMarkNotificationRead: RequestHandler = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.headers["x-user-id"];

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const db = getDatabase();
    const result = db
      .prepare(
        `
      UPDATE notifications 
      SET is_read = 1 
      WHERE notification_id = ? AND user_id = ?
    `,
      )
      .run(notificationId, userId);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    res.json({
      success: true,
      message: "Notification marked as read",
    });
  } catch (error) {
    console.error("Mark notification error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Password recovery
export const handleForgotPassword: RequestHandler = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const db = getDatabase();

    // Check if user exists
    const user = db
      .prepare(
        "SELECT user_id, email, full_name FROM users WHERE email = ? AND is_active = 1",
      )
      .get(email) as { user_id: number; email: string; full_name: string };

    if (!user) {
      // Don't reveal if email exists or not for security
      return res.json({
        success: true,
        message:
          "If an account exists with this email, you will receive a password reset link.",
      });
    }

    // Generate reset token with crypto random
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Store reset token in dedicated table
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Clean up old tokens for this user
    db.prepare("DELETE FROM password_reset_tokens WHERE user_id = ?").run(
      user.user_id,
    );

    // Insert new token
    db.prepare(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at)
       VALUES (?, ?, ?)`,
    ).run(user.user_id, hashedToken, expiresAt.toISOString());

    // Send password reset email via Gmail SMTP
    // Use the deployed URL instead of localhost for mobile compatibility
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;
    const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;
    const emailContent = gmailSMTPService.generatePasswordResetEmail(
      user.full_name,
      resetLink,
      user.email,
    );

    const emailResult = await gmailSMTPService.sendEmail({
      to: user.email,
      subject: "🔐 Password Reset Request - QueryLinker Security",
      html: emailContent.html,
      text: emailContent.text,
    });

    // Log detailed email delivery results and handle failures appropriately
    if (emailResult.success) {
      console.log(
        `✅ Password reset email sent successfully via ${emailResult.provider} to ${email} (${emailResult.deliveryTime}ms)`,
      );
      if (emailResult.messageId) {
        console.log(`📧 Message ID: ${emailResult.messageId}`);
      }

      // Update notification with success details and preview link
      let successMessage = `Password reset email sent successfully to ${email}. Check your email and follow the instructions to reset your password.`;
      if (emailResult.previewUrl) {
        successMessage += ` You can also view the email here: ${emailResult.previewUrl}`;
        console.log(`🎯 EMAIL PREVIEW FOR USER: ${emailResult.previewUrl}`);
      }

      db.prepare(
        `UPDATE notifications SET message = ? WHERE user_id = ? AND title = 'Password Reset Requested'`,
      ).run(successMessage, user.user_id);
    } else {
      console.error(`❌ Failed to send password reset email to ${email}`);
      console.error(`Error: ${emailResult.error}`);
      console.error(`Delivery time: ${emailResult.deliveryTime}ms`);

      // Update notification with fallback message
      db.prepare(
        `UPDATE notifications SET message = ?, type = ? WHERE user_id = ? AND title = 'Password Reset Requested'`,
      ).run(
        "Password reset request received. If you don't receive an email within 5 minutes, please try again or contact support.",
        "warning",
        user.user_id,
      );

      // In production, trigger alert for failed email deliveries
      // You could integrate with monitoring services like Sentry, DataDog, etc.
      console.log(
        "🚨 ALERT: Email delivery failure detected - consider checking email service configuration",
      );
    }

    // Create notification for user
    db.prepare(
      `INSERT INTO notifications (user_id, title, message, type, action_url)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(
      user.user_id,
      "Password Reset Requested",
      "A password reset link has been sent to your email address. Check your email to continue.",
      "info",
      "/reset-password",
    );

    res.json({
      success: true,
      message:
        "If an account exists with this email, you will receive a password reset link.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Reset password
export const handleResetPassword: RequestHandler = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Token and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    const db = getDatabase();

    // Hash the token to match what was stored
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Check if token exists and is valid
    const resetToken = db
      .prepare(
        `
        SELECT user_id, expires_at, used
        FROM password_reset_tokens
        WHERE token = ? AND expires_at > datetime('now') AND used = 0
      `,
      )
      .get(hashedToken) as {
      user_id: number;
      expires_at: string;
      used: number;
    };

    if (!resetToken) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    // Hash new password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    db.prepare(
      "UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?",
    ).run(passwordHash, resetToken.user_id);

    // Mark token as used
    db.prepare(
      "UPDATE password_reset_tokens SET used = 1, used_at = CURRENT_TIMESTAMP WHERE token = ?",
    ).run(hashedToken);

    // Invalidate all user sessions
    db.prepare("DELETE FROM user_sessions WHERE user_id = ?").run(
      resetToken.user_id,
    );

    // Create notification
    db.prepare(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES (?, ?, ?, ?)`,
    ).run(
      resetToken.user_id,
      "Password Changed",
      "Your password has been successfully updated. All devices have been logged out for security.",
      "success",
    );

    res.json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get Google OAuth URL
export const handleGoogleOAuthUrl: RequestHandler = async (req, res) => {
  try {
    const authUrl = googleOAuthService.generateAuthUrl();

    res.json({
      success: true,
      authUrl
    });
  } catch (error) {
    console.error("Google OAuth URL error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate Google OAuth URL"
    });
  }
};

// Handle Google OAuth callback
export const handleGoogleOAuthCallback: RequestHandler = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Authorization code is required"
      });
    }

    // Get user info from Google
    const googleUser = await googleOAuthService.getUserInfo(code);

    const db = getDatabase();
    const isNewUser = !db
      .prepare("SELECT user_id FROM users WHERE email = ?")
      .get(googleUser.email);

    // Check if user exists
    let user = db
      .prepare(
        "SELECT user_id, email, full_name, role, avatar_url, preferences FROM users WHERE email = ?"
      )
      .get(googleUser.email) as User;

    if (!user) {
      // Create new user
      const result = db
        .prepare(
          `INSERT INTO users (email, password_hash, full_name, role, avatar_url, email_verified)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
        .run(
          googleUser.email,
          "", // No password for OAuth users
          googleUser.name,
          "user",
          googleUser.picture || null,
          1,
        );

      const userId = result.lastInsertRowid as number;

      user = db
        .prepare(
          `SELECT user_id, email, full_name, role, avatar_url, preferences
           FROM users WHERE user_id = ?`
        )
        .get(userId) as User;

      // Create welcome notification
      db.prepare(
        `INSERT INTO notifications (user_id, title, message, type)
         VALUES (?, ?, ?, ?)`
      ).run(
        userId,
        "Welcome to QueryLinker!",
        "Your Google account has been linked successfully.",
        "success",
      );
    }

    // Update last login
    db.prepare(
      "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = ?"
    ).run(user.user_id);

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.user_id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN },
    );

    // Store session
    const sessionExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    db.prepare(
      `INSERT INTO user_sessions (user_id, token, expires_at, device_info, ip_address)
       VALUES (?, ?, ?, ?, ?)`
    ).run(
      user.user_id,
      token,
      sessionExpiry.toISOString(),
      req.headers["user-agent"],
      req.ip,
    );

    res.json({
      success: true,
      message: `Welcome ${isNewUser ? "to" : "back to"} QueryLinker!`,
      user: {
        id: user.user_id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        avatarUrl: user.avatar_url,
        preferences: user.preferences ? JSON.parse(user.preferences) : {},
      },
      token,
      isNewUser,
    });
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    res.status(500).json({
      success: false,
      message: "Authentication failed"
    });
  }
};

// OAuth Google login
export const handleGoogleOAuth: RequestHandler = async (req, res) => {
  try {
    const { credential, email, name, picture } = req.body;

    if (!credential && !email) {
      return res.status(400).json({
        success: false,
        message: "Google credential or email is required",
      });
    }

    // Use provided data from frontend or defaults for demo
    const googleUser = {
      email: email || "user@gmail.com",
      name: name || "Google User",
      picture: picture || "https://lh3.googleusercontent.com/a/default-user",
    };

    const db = getDatabase();
    const isNewUser = !db
      .prepare("SELECT user_id FROM users WHERE email = ?")
      .get(googleUser.email);

    // Check if user exists
    let user = db
      .prepare(
        "SELECT user_id, email, full_name, role, avatar_url, preferences FROM users WHERE email = ?",
      )
      .get(googleUser.email) as User;

    if (!user) {
      // Create new user
      const result = db
        .prepare(
          `INSERT INTO users (email, password_hash, full_name, role, avatar_url, email_verified)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run(
          googleUser.email,
          "", // No password for OAuth users
          googleUser.name,
          "user",
          googleUser.picture,
          1,
        );

      const userId = result.lastInsertRowid as number;

      user = db
        .prepare(
          `SELECT user_id, email, full_name, role, avatar_url, preferences
           FROM users WHERE user_id = ?`,
        )
        .get(userId) as User;

      // Create welcome notification
      db.prepare(
        `INSERT INTO notifications (user_id, title, message, type)
         VALUES (?, ?, ?, ?)`,
      ).run(
        userId,
        "Welcome to QueryLinker!",
        "Your Google account has been linked successfully.",
        "success",
      );
    }

    // Update last login
    db.prepare(
      "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = ?",
    ).run(user.user_id);

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.user_id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN },
    );

    // Store session
    const sessionExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    db.prepare(
      `INSERT INTO user_sessions (user_id, token, expires_at, device_info, ip_address)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(
      user.user_id,
      token,
      sessionExpiry.toISOString(),
      req.headers["user-agent"],
      req.ip,
    );

    // Send welcome email (simulated)
    const currentDate = new Date().toLocaleString();
    const firstName = user.full_name.split(" ")[0];

    console.log(`📧 Welcome Email Sent to: ${user.email}`);
    console.log(
      `Subject: Welcome to QueryLinker — You've Signed In Successfully`,
    );
    console.log(`\nBody:`);
    console.log(`Hi ${firstName},`);
    console.log(
      `\nThank you for signing in to QueryLinker using your Google account (${user.email}).`,
    );
    console.log(
      `\nYour sign-in was successful, and you can now start exploring QueryLinker to manage and track your queries more efficiently.`,
    );
    console.log(`\nAccount Details:`);
    console.log(`Name: ${user.full_name}`);
    console.log(`Email: ${user.email}`);
    console.log(`Sign-in Date: ${currentDate}`);
    console.log(
      `\nIf this wasn't you, please secure your Google account immediately and contact our support team.`,
    );
    console.log(`\nWe're excited to have you onboard! 🚀`);
    console.log(`\nBest regards,`);
    console.log(`QueryLinker Team`);
    console.log(`support@querylinker.com | https://querylinker.com`);
    console.log(`---`);

    res.json({
      success: true,
      message: `Welcome ${isNewUser ? "to" : "back to"} QueryLinker! Check your email for welcome details.`,
      user: {
        id: user.user_id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        avatarUrl: user.avatar_url,
        preferences: user.preferences ? JSON.parse(user.preferences) : {},
      },
      token,
      isNewUser,
    });
  } catch (error) {
    console.error("Google OAuth error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// OAuth Apple login
export const handleAppleOAuth: RequestHandler = async (req, res) => {
  try {
    const { identityToken, user } = req.body;

    if (!identityToken) {
      return res.status(400).json({
        success: false,
        message: "Apple identity token is required",
      });
    }

    // In a real implementation, you would verify the Apple JWT token
    // For demo purposes, we'll simulate this
    const appleUser = {
      email: user?.email || "user@icloud.com",
      name: user?.name
        ? `${user.name.firstName} ${user.name.lastName}`
        : "Apple User",
    };

    const db = getDatabase();

    // Check if user exists
    let existingUser = db
      .prepare(
        "SELECT user_id, email, full_name, role, avatar_url, preferences FROM users WHERE email = ?",
      )
      .get(appleUser.email) as User;

    if (!existingUser) {
      // Create new user
      const result = db
        .prepare(
          `INSERT INTO users (email, password_hash, full_name, role, email_verified)
           VALUES (?, ?, ?, ?, ?)`,
        )
        .run(
          appleUser.email,
          "", // No password for OAuth users
          appleUser.name,
          "user",
          1,
        );

      const userId = result.lastInsertRowid as number;

      existingUser = db
        .prepare(
          `SELECT user_id, email, full_name, role, avatar_url, preferences
           FROM users WHERE user_id = ?`,
        )
        .get(userId) as User;

      // Create welcome notification
      db.prepare(
        `INSERT INTO notifications (user_id, title, message, type)
         VALUES (?, ?, ?, ?)`,
      ).run(
        userId,
        "Welcome to QueryLinker!",
        "Your Apple ID has been linked successfully.",
        "success",
      );
    }

    // Update last login
    db.prepare(
      "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = ?",
    ).run(existingUser.user_id);

    // Generate JWT token
    const token = jwt.sign(
      { userId: existingUser.user_id, email: existingUser.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN },
    );

    // Store session
    const sessionExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    db.prepare(
      `INSERT INTO user_sessions (user_id, token, expires_at, device_info, ip_address)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(
      existingUser.user_id,
      token,
      sessionExpiry.toISOString(),
      req.headers["user-agent"],
      req.ip,
    );

    res.json({
      success: true,
      message: "Apple login successful",
      user: {
        id: existingUser.user_id,
        email: existingUser.email,
        fullName: existingUser.full_name,
        role: existingUser.role,
        avatarUrl: existingUser.avatar_url,
        preferences: existingUser.preferences
          ? JSON.parse(existingUser.preferences)
          : {},
      },
      token,
    });
  } catch (error) {
    console.error("Apple OAuth error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Delete user account
export const handleDeleteAccount: RequestHandler = async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    const { password } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const db = getDatabase();

    // Get user to verify password
    const user = db
      .prepare(
        "SELECT user_id, email, password_hash FROM users WHERE user_id = ?",
      )
      .get(userId) as User & { password_hash: string };

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Verify password if provided (for accounts with passwords)
    if (user.password_hash && password) {
      const bcrypt = await import("bcryptjs");
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: "Invalid password",
        });
      }
    }

    // Begin transaction to delete all user data
    const deleteTransaction = db.transaction(() => {
      // Delete user sessions
      db.prepare("DELETE FROM user_sessions WHERE user_id = ?").run(userId);

      // Delete user notifications
      db.prepare("DELETE FROM notifications WHERE user_id = ?").run(userId);

      // Delete user interactions
      db.prepare("DELETE FROM user_interactions WHERE user_id = ?").run(userId);

      // Delete password reset tokens
      db.prepare("DELETE FROM password_reset_tokens WHERE user_id = ?").run(userId);

      // Finally delete the user
      db.prepare("DELETE FROM users WHERE user_id = ?").run(userId);
    });

    deleteTransaction();

    res.json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error) {
    console.error("Delete account error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get recent activity
export const handleGetRecentActivity: RequestHandler = async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    const limit = parseInt(req.query.limit as string) || 10;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const db = getDatabase();

    // Get recent user interactions and activities
    const recentActivities = db
      .prepare(
        `
        SELECT
          'interaction' as type,
          action_type as action,
          suggestion_title as title,
          system,
          timestamp
        FROM user_interactions
        WHERE user_id = ?
        UNION ALL
        SELECT
          'notification' as type,
          type as action,
          title,
          'system' as system,
          created_at as timestamp
        FROM notifications
        WHERE user_id = ?
        ORDER BY timestamp DESC
        LIMIT ?
      `,
      )
      .all(userId, userId, limit);

    // Format activities for frontend
    const formattedActivities = recentActivities.map((activity: any) => ({
      id: `${activity.type}-${activity.timestamp}`,
      type: activity.type,
      action: activity.action,
      title: activity.title || 'Unknown activity',
      system: activity.system,
      timestamp: activity.timestamp,
      time: activity.timestamp ? new Date(activity.timestamp).toLocaleTimeString() : 'Just now',
      message: formatActivityMessage(activity),
      color: getActivityColor(activity.type, activity.action),
    }));

    res.json({
      success: true,
      activities: formattedActivities,
      total: formattedActivities.length,
    });
  } catch (error) {
    console.error("Get recent activity error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Helper function to format activity messages
function formatActivityMessage(activity: any): string {
  switch (activity.type) {
    case 'interaction':
      return `${activity.action === 'link' ? 'Clicked' : 'Viewed'} ${activity.title || 'suggestion'} in ${activity.system}`;
    case 'notification':
      return activity.title || 'System notification';
    default:
      return 'Unknown activity';
  }
}

// Helper function to get activity colors
function getActivityColor(type: string, action: string): string {
  switch (type) {
    case 'interaction':
      return action === 'link' ? 'bg-blue-500' : 'bg-green-500';
    case 'notification':
      return 'bg-purple-500';
    default:
      return 'bg-gray-500';
  }
}

// Create notification (for internal use)
export const createNotification = (
  userId: number,
  title: string,
  message: string,
  type: string = "info",
  actionUrl?: string,
) => {
  try {
    const db = getDatabase();
    db.prepare(
      `
      INSERT INTO notifications (user_id, title, message, type, action_url)
      VALUES (?, ?, ?, ?, ?)
    `,
    ).run(userId, title, message, type, actionUrl);
  } catch (error) {
    console.error("Create notification error:", error);
  }
};
