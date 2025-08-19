import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import {
  handleSearch,
  handleLinkToIncident,
  handleSystemStatus,
  handleAnalytics,
  handleIncidentInteractions,
  handleViewInteraction,
  handleCacheCleanup,
  handleMLPerformance,
  handleMLTrain,
  handleIntelligentRecommendations,
  handleUserNotifications,
  handleMarkNotificationRead,
  handleUserProfile,
  handleBIExport,
  handleResolveIncident,
  handleTeamMembers,
  handleActiveUsers,
  handleChatMessages,
  handleSendMessage,
  handleActivityLog,
  handleSLAData,
  handleKnowledgeBase,
  handleCreateArticle,
  handleViewArticle,
  handleRateArticle,
  handleLikeArticle,
  handleDislikeArticle,
  handleCreateSLA,
  handleEscalateIncident,
  handleSLAReport,
  handleSolutionDetails,
  handleEnhancedSearch,
  handleSyncStatus,
  handleTriggerSync,
} from "./routes/querylinker";

import { handleSLADataFixed } from "./routes/sla-fixed";
import {
  handleSignup,
  handleLogin,
  handleLogout,
  handleGetProfile,
  handleUpdateProfile,
  handleGetNotifications,
  handleMarkNotificationRead as handleAuthMarkNotificationRead,
  handleForgotPassword,
  handleResetPassword,
  handleGoogleOAuth,
  handleGoogleOAuthUrl,
  handleGoogleOAuthCallback,
  handleAppleOAuth,
  handleDeleteAccount,
  handleGetRecentActivity,
} from "./routes/auth";
import { executeQuery } from "./database/database";
import {
  handleEmailTest,
  handleEmailStatus,
} from "./routes/email-test";
import { gmailSMTPService } from "./services/gmail-smtp-service";
// Start background sync and enable semantic index at startup
import { solutionSyncService } from "./services/solution-sync-service";
import { semanticSearch } from "./services/semantic-search";

export function createServer() {
  const app = express();

  // TEMP: Debug route for checking active solutions in DB
  try {
    const debugActiveSolutions = require("./routes/debug-active-solutions").default;
    app.use(debugActiveSolutions);
  } catch (e) {
    console.warn("[Debug] Could not load debug-active-solutions route:", e);
  }

  // Initialize Gmail SMTP service on startup
  console.log('🔧 Initializing Gmail SMTP service...');
  gmailSMTPService.testConnection().then(success => {
    if (success) {
      console.log('✅ Gmail SMTP service ready for password reset emails');
    } else {
      console.log('⚠️  Gmail SMTP not configured - password reset emails will use fallback');
    }
  }).catch(error => {
    console.error('❌ Gmail SMTP initialization error:', error);
  });

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Kick off semantic indexing in the background after server boot
  setTimeout(() => {
    try {
      void solutionSyncService.syncAllSystems();
      void semanticSearch.indexAll();
    } catch (e) {
      console.warn('[Startup] Background sync/index failed', e);
    }
  }, 2000);

  // User activity tracking middleware
  const trackUserActivity = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Only track activity for authenticated requests
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      // Update user activity timestamp in background (don't block the request)
      setImmediate(async () => {
        try {
          await executeQuery(`
            UPDATE user_sessions
            SET last_activity = CURRENT_TIMESTAMP
            WHERE token = $1 AND expires_at > CURRENT_TIMESTAMP
          `, [token]);
        } catch (error) {
          // Silently handle errors to not affect the main request
          console.error('[Middleware] Error updating user activity:', error);
        }
      });
    }

    next();
  };

  // Apply activity tracking to all routes
  app.use(trackUserActivity);

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Authentication routes
  app.post("/api/auth/signup", handleSignup);
  app.post("/api/auth/login", handleLogin);
  app.post("/api/auth/logout", handleLogout);
  app.post("/api/auth/forgot-password", handleForgotPassword);
  app.post("/api/auth/reset-password", handleResetPassword);
  app.get("/api/auth/google/url", handleGoogleOAuthUrl);
  app.post("/api/auth/google/callback", handleGoogleOAuthCallback);
  app.post("/api/auth/google", handleGoogleOAuth);
  app.post("/api/auth/apple", handleAppleOAuth);
  app.get("/api/auth/profile", handleGetProfile);
  app.put("/api/auth/profile", handleUpdateProfile);
  app.delete("/api/auth/account", handleDeleteAccount);
  app.get("/api/auth/recent-activity", handleGetRecentActivity);
  app.get("/api/auth/notifications", handleGetNotifications);
  app.put(
    "/api/auth/notifications/:notificationId/read",
    handleAuthMarkNotificationRead,
  );

  // Email service testing and status routes (for admin/development)
  app.post("/api/email/test", handleEmailTest);
  app.get("/api/email/status", handleEmailStatus);

  // QueryLinker API routes
  app.post("/api/querylinker/search", handleSearch);
  app.post("/api/querylinker/enhanced-search", handleEnhancedSearch);
  app.post("/api/querylinker/link", handleLinkToIncident);
  app.get("/api/querylinker/status", handleSystemStatus);
  // Integration endpoints
  const { handleListIntegrations, handleConnectIntegration, handleDisconnectIntegration } = require('./routes/querylinker');
  app.get("/api/integrations", handleListIntegrations);
  app.post("/api/integrations/connect", handleConnectIntegration);
  app.post("/api/integrations/disconnect", handleDisconnectIntegration);

  // Analytics and interaction tracking routes
  app.get("/api/querylinker/analytics", handleAnalytics);
  app.get(
    "/api/querylinker/incidents/:incidentNumber/interactions",
    handleIncidentInteractions,
  );
  app.post("/api/querylinker/interactions/view", handleViewInteraction);
  app.post("/api/querylinker/cache/cleanup", handleCacheCleanup);

  // Advanced ML and AI routes
  app.get("/api/querylinker/ml/performance", handleMLPerformance);
  app.post("/api/querylinker/ml/train", handleMLTrain);
  app.get("/api/querylinker/recommendations", handleIntelligentRecommendations);
  app.get("/api/querylinker/notifications", handleUserNotifications);
  app.post(
    "/api/querylinker/notifications/:id/read",
    handleMarkNotificationRead,
  );
  app.get("/api/querylinker/users/:userId/profile", handleUserProfile);
  app.get("/api/querylinker/bi/export", handleBIExport);

  // Incident resolution and team collaboration routes
  app.post("/api/querylinker/resolve-incident", handleResolveIncident);
  app.get("/api/querylinker/team-members", handleTeamMembers);
  app.get("/api/querylinker/active-users", handleActiveUsers);
  app.get("/api/querylinker/chat-messages", handleChatMessages);
  app.post("/api/querylinker/send-message", handleSendMessage);

  // Enhanced feature routes
  app.post("/api/querylinker/activity", handleActivityLog);

  // SLA Management routes
  app.get("/api/querylinker/sla-data", handleSLAData);
  app.post("/api/querylinker/sla-create", handleCreateSLA);
  app.post("/api/querylinker/sla-escalate", handleEscalateIncident);
  app.get("/api/querylinker/sla-report", handleSLAReport);

  // Knowledge Base routes
  app.get("/api/querylinker/knowledge-base", handleKnowledgeBase);
  app.post("/api/querylinker/knowledge-base", handleCreateArticle);
  app.get("/api/querylinker/knowledge-base/:articleId", handleViewArticle);
  app.post(
    "/api/querylinker/knowledge-base/:articleId/rate",
    handleRateArticle,
  );
  app.post(
    "/api/querylinker/knowledge-base/:articleId/like",
    handleLikeArticle,
  );
  app.post(
    "/api/querylinker/knowledge-base/:articleId/dislike",
    handleDislikeArticle,
  );

  // Solution details route
  app.get("/api/querylinker/solution/:solutionId", handleSolutionDetails);

  // Sync management routes
  app.get("/api/querylinker/sync-status", handleSyncStatus);
  app.post("/api/querylinker/trigger-sync", handleTriggerSync);

  return app;
}
