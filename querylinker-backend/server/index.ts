
import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo.js";
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
} from "./routes/querylinker.js";

import { handleSLADataFixed } from "./routes/sla-fixed.js";
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
} from "./routes/auth.js";
import { executeQuery } from "./database/database.js";
import {
  handleEmailTest,
  handleEmailStatus,
} from "./routes/email-test.js";
import { gmailSMTPService } from "./services/gmail-smtp-service.js";
import { solutionSyncService } from "./services/solution-sync-service.js";
import { semanticSearch } from "./services/semantic-search.js";

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration for frontend
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize services
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

// Background services
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
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);

    setImmediate(async () => {
      try {
        await executeQuery(`
          UPDATE user_sessions
          SET last_activity = CURRENT_TIMESTAMP
          WHERE token = $1 AND expires_at > CURRENT_TIMESTAMP
        `, [token]);
      } catch (error) {
        console.error('[Middleware] Error updating user activity:', error);
      }
    });
  }
  next();
};

app.use(trackUserActivity);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API routes
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
app.put("/api/auth/notifications/:notificationId/read", handleAuthMarkNotificationRead);

// Email service routes
app.post("/api/email/test", handleEmailTest);
app.get("/api/email/status", handleEmailStatus);

// QueryLinker API routes
app.post("/api/querylinker/search", handleSearch);
app.post("/api/querylinker/enhanced-search", handleEnhancedSearch);
app.post("/api/querylinker/link", handleLinkToIncident);
app.get("/api/querylinker/status", handleSystemStatus);

// All other QueryLinker routes...
app.get("/api/querylinker/analytics", handleAnalytics);
app.get("/api/querylinker/incidents/:incidentNumber/interactions", handleIncidentInteractions);
app.post("/api/querylinker/interactions/view", handleViewInteraction);
app.post("/api/querylinker/cache/cleanup", handleCacheCleanup);
app.get("/api/querylinker/ml/performance", handleMLPerformance);
app.post("/api/querylinker/ml/train", handleMLTrain);
app.get("/api/querylinker/recommendations", handleIntelligentRecommendations);
app.get("/api/querylinker/notifications", handleUserNotifications);
app.post("/api/querylinker/notifications/:id/read", handleMarkNotificationRead);
app.get("/api/querylinker/users/:userId/profile", handleUserProfile);
app.get("/api/querylinker/bi/export", handleBIExport);
app.post("/api/querylinker/resolve-incident", handleResolveIncident);
app.get("/api/querylinker/team-members", handleTeamMembers);
app.get("/api/querylinker/active-users", handleActiveUsers);
app.get("/api/querylinker/chat-messages", handleChatMessages);
app.post("/api/querylinker/send-message", handleSendMessage);
app.post("/api/querylinker/activity", handleActivityLog);
app.get("/api/querylinker/sla-data", handleSLADataFixed);
app.post("/api/querylinker/sla-create", handleCreateSLA);
app.post("/api/querylinker/sla-escalate", handleEscalateIncident);
app.get("/api/querylinker/sla-report", handleSLAReport);
app.get("/api/querylinker/knowledge-base", handleKnowledgeBase);
app.post("/api/querylinker/knowledge-base", handleCreateArticle);
app.get("/api/querylinker/knowledge-base/:articleId", handleViewArticle);
app.post("/api/querylinker/knowledge-base/:articleId/rate", handleRateArticle);
app.post("/api/querylinker/knowledge-base/:articleId/like", handleLikeArticle);
app.post("/api/querylinker/knowledge-base/:articleId/dislike", handleDislikeArticle);
app.get("/api/querylinker/solution/:solutionId", handleSolutionDetails);
app.get("/api/querylinker/sync-status", handleSyncStatus);
app.post("/api/querylinker/trigger-sync", handleTriggerSync);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 QueryLinker Backend running on port ${PORT}`);
});
