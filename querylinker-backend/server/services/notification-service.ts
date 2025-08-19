import { EventEmitter } from "events";
import { Suggestion } from "@shared/querylinker-api";
import { InteractionModel } from "../database/database";

export interface NotificationEvent {
  id: string;
  type:
    | "high_effectiveness"
    | "trending_suggestion"
    | "system_alert"
    | "user_milestone"
    | "recommendation";
  title: string;
  message: string;
  priority: "low" | "medium" | "high" | "critical";
  data: any;
  userId?: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

export interface NotificationRule {
  id: string;
  name: string;
  type: NotificationEvent["type"];
  condition: (data: any) => boolean;
  template: (data: any) => { title: string; message: string };
  priority: NotificationEvent["priority"];
  enabled: boolean;
  cooldownMinutes: number;
}

export interface NotificationSubscriber {
  userId: string;
  preferences: {
    [key in NotificationEvent["type"]]?: {
      enabled: boolean;
      channels: ("web" | "email" | "slack")[];
      minPriority: NotificationEvent["priority"];
    };
  };
}

export class NotificationService extends EventEmitter {
  private static instance: NotificationService;
  private notifications: Map<string, NotificationEvent> = new Map();
  private subscribers: Map<string, NotificationSubscriber> = new Map();
  private rules: Map<string, NotificationRule> = new Map();
  private lastTriggered: Map<string, number> = new Map();

  constructor() {
    super();
    this.initializeDefaultRules();
    console.log(
      "[NotificationService] Real-time notification system initialized",
    );
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Initialize default notification rules
   */
  private initializeDefaultRules(): void {
    const defaultRules: NotificationRule[] = [
      {
        id: "high-effectiveness-suggestion",
        name: "High Effectiveness Suggestion",
        type: "high_effectiveness",
        condition: (data) =>
          data.effectiveness_score > 0.85 && data.link_count >= 5,
        template: (data) => ({
          title: "High-Performance Suggestion Detected",
          message: `"${data.title}" has achieved ${(data.effectiveness_score * 100).toFixed(1)}% effectiveness with ${data.link_count} successful links`,
        }),
        priority: "high",
        enabled: true,
        cooldownMinutes: 60,
      },
      {
        id: "trending-suggestion",
        name: "Trending Suggestion",
        type: "trending_suggestion",
        condition: (data) =>
          data.recent_links >= 3 && data.time_window_hours <= 2,
        template: (data) => ({
          title: "Trending Suggestion Alert",
          message: `"${data.title}" has received ${data.recent_links} links in the last ${data.time_window_hours} hours`,
        }),
        priority: "medium",
        enabled: true,
        cooldownMinutes: 30,
      },
      {
        id: "system-performance-alert",
        name: "System Performance Alert",
        type: "system_alert",
        condition: (data) =>
          data.system_effectiveness < 0.3 || data.error_rate > 0.1,
        template: (data) => ({
          title: "System Performance Warning",
          message: `${data.system} performance has dropped to ${(data.system_effectiveness * 100).toFixed(1)}% effectiveness`,
        }),
        priority: "high",
        enabled: true,
        cooldownMinutes: 120,
      },
      {
        id: "user-milestone",
        name: "User Milestone Achievement",
        type: "user_milestone",
        condition: (data) =>
          data.links_count % 25 === 0 && data.links_count > 0,
        template: (data) => ({
          title: "Milestone Achieved!",
          message: `You've successfully linked ${data.links_count} suggestions to incidents`,
        }),
        priority: "low",
        enabled: true,
        cooldownMinutes: 1440, // Daily
      },
      {
        id: "optimization-recommendation",
        name: "System Optimization Recommendation",
        type: "recommendation",
        condition: (data) => data.optimization_score > 0.8,
        template: (data) => ({
          title: "Optimization Opportunity",
          message: data.recommendation_text,
        }),
        priority: "medium",
        enabled: true,
        cooldownMinutes: 720, // Twice daily
      },
    ];

    defaultRules.forEach((rule) => this.rules.set(rule.id, rule));
  }

  /**
   * Process suggestion interaction and check for notification triggers
   */
  async processSuggestionInteraction(
    suggestion: Suggestion,
    userId?: string,
  ): Promise<void> {
    try {
      // Get recent analytics for this suggestion
      const analytics = await this.getRecentSuggestionAnalytics(suggestion.id);

      // Check high effectiveness rule
      if (analytics.effectiveness_score && analytics.link_count) {
        await this.checkAndTriggerRule("high-effectiveness-suggestion", {
          ...suggestion,
          effectiveness_score: analytics.effectiveness_score,
          link_count: analytics.link_count,
        });
      }

      // Check trending rule
      if (analytics.recent_links && analytics.time_window_hours) {
        await this.checkAndTriggerRule("trending-suggestion", {
          ...suggestion,
          recent_links: analytics.recent_links,
          time_window_hours: analytics.time_window_hours,
        });
      }

      // Check user milestone
      if (userId) {
        const userStats = await this.getUserStats(userId);
        await this.checkAndTriggerRule(
          "user-milestone",
          {
            userId,
            links_count: userStats.total_links,
          },
          userId,
        );
      }
    } catch (error) {
      console.error(
        "[NotificationService] Error processing suggestion interaction:",
        error,
      );
    }
  }

  /**
   * Check system performance and trigger alerts
   */
  async checkSystemPerformance(): Promise<void> {
    try {
      const systemStats = InteractionModel.getSystemPopularity(24); // Last 24 hours

      for (const system of systemStats) {
        const effectiveness = system.link_rate / 100;
        const errorRate = 1 - effectiveness; // Simplified error rate calculation

        await this.checkAndTriggerRule("system-performance-alert", {
          system: system.system,
          system_effectiveness: effectiveness,
          error_rate: errorRate,
          link_count: system.link_count,
        });
      }
    } catch (error) {
      console.error(
        "[NotificationService] Error checking system performance:",
        error,
      );
    }
  }

  /**
   * Generate optimization recommendations
   */
  async generateOptimizationRecommendations(): Promise<void> {
    try {
      const analytics = InteractionModel.getAnalytics(7); // Last week
      const recommendations = this.analyzeAndGenerateRecommendations(analytics);

      for (const recommendation of recommendations) {
        await this.checkAndTriggerRule("optimization-recommendation", {
          optimization_score: recommendation.score,
          recommendation_text: recommendation.text,
          category: recommendation.category,
        });
      }
    } catch (error) {
      console.error(
        "[NotificationService] Error generating recommendations:",
        error,
      );
    }
  }

  /**
   * Check rule conditions and trigger notifications
   */
  private async checkAndTriggerRule(
    ruleId: string,
    data: any,
    targetUserId?: string,
  ): Promise<void> {
    const rule = this.rules.get(ruleId);
    if (!rule || !rule.enabled) return;

    // Check cooldown
    const lastTriggered = this.lastTriggered.get(ruleId) || 0;
    const cooldownMs = rule.cooldownMinutes * 60 * 1000;
    if (Date.now() - lastTriggered < cooldownMs) return;

    // Check condition
    if (!rule.condition(data)) return;

    // Generate notification
    const template = rule.template(data);
    const notification: NotificationEvent = {
      id: `${ruleId}-${Date.now()}`,
      type: rule.type,
      title: template.title,
      message: template.message,
      priority: rule.priority,
      data,
      userId: targetUserId,
      timestamp: new Date().toISOString(),
      read: false,
      actionUrl: this.generateActionUrl(rule.type, data),
    };

    // Store and emit notification
    this.notifications.set(notification.id, notification);
    this.lastTriggered.set(ruleId, Date.now());

    this.emit("notification", notification);

    console.log(
      `[NotificationService] Triggered notification: ${notification.title}`,
    );

    // Send through configured channels
    await this.sendNotification(notification, targetUserId);
  }

  /**
   * Send notification through configured channels
   */
  private async sendNotification(
    notification: NotificationEvent,
    userId?: string,
  ): Promise<void> {
    const subscriber = userId ? this.subscribers.get(userId) : null;
    const preferences = subscriber?.preferences[notification.type];

    if (preferences && !preferences.enabled) return;
    if (
      preferences &&
      !this.meetsMinPriority(notification.priority, preferences.minPriority)
    )
      return;

    const channels = preferences?.channels || ["web"];

    for (const channel of channels) {
      try {
        switch (channel) {
          case "web":
            this.emit("web-notification", notification);
            break;
          case "email":
            await this.sendEmailNotification(notification, userId);
            break;
          case "slack":
            await this.sendSlackNotification(notification, userId);
            break;
        }
      } catch (error) {
        console.error(
          `[NotificationService] Error sending ${channel} notification:`,
          error,
        );
      }
    }
  }

  /**
   * Get user notifications
   */
  getUserNotifications(
    userId: string,
    unreadOnly: boolean = false,
  ): NotificationEvent[] {
    const userNotifications = Array.from(this.notifications.values())
      .filter((n) => !n.userId || n.userId === userId)
      .filter((n) => !unreadOnly || !n.read)
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );

    return userNotifications;
  }

  /**
   * Mark notification as read
   */
  markNotificationRead(notificationId: string, userId?: string): boolean {
    const notification = this.notifications.get(notificationId);
    if (!notification) return false;
    if (notification.userId && notification.userId !== userId) return false;

    notification.read = true;
    this.notifications.set(notificationId, notification);

    this.emit("notification-read", notification);
    return true;
  }

  /**
   * Subscribe user to notifications
   */
  subscribeUser(subscription: NotificationSubscriber): void {
    this.subscribers.set(subscription.userId, subscription);
    console.log(
      `[NotificationService] User ${subscription.userId} subscribed to notifications`,
    );
  }

  /**
   * Update notification rule
   */
  updateRule(ruleId: string, updates: Partial<NotificationRule>): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) return false;

    this.rules.set(ruleId, { ...rule, ...updates });
    console.log(`[NotificationService] Rule ${ruleId} updated`);
    return true;
  }

  /**
   * Helper methods
   */
  private async getRecentSuggestionAnalytics(
    suggestionId: string,
  ): Promise<any> {
    // Simplified analytics - in production this would be more sophisticated
    const effective = InteractionModel.getMostEffectiveSuggestions(100);
    const suggestion = effective.find(
      (s: any) => s.suggestion_id === suggestionId,
    );

    return {
      effectiveness_score: suggestion ? suggestion.effectiveness_rating : 0,
      link_count: suggestion ? suggestion.link_count : 0,
      recent_links: suggestion ? Math.min(suggestion.link_count, 5) : 0,
      time_window_hours: 2,
    };
  }

  private async getUserStats(userId: string): Promise<any> {
    const interactions = InteractionModel.getInteractionsByUser(userId, 1000);
    const linkInteractions = interactions.filter(
      (i) => i.action_type === "link",
    );

    return {
      total_links: linkInteractions.length,
      total_views: interactions.filter((i) => i.action_type === "view").length,
      systems_used: new Set(interactions.map((i) => i.system)).size,
    };
  }

  private analyzeAndGenerateRecommendations(
    analytics: any[],
  ): Array<{ score: number; text: string; category: string }> {
    const recommendations: Array<{
      score: number;
      text: string;
      category: string;
    }> = [];

    // Analyze system performance patterns
    const systemPerformance = analytics.reduce((acc: any, item) => {
      if (!acc[item.system]) acc[item.system] = { total: 0, incidents: 0 };
      acc[item.system].total += item.total_interactions;
      acc[item.system].incidents += item.unique_incidents;
      return acc;
    }, {});

    // Generate recommendations based on patterns
    Object.entries(systemPerformance).forEach(
      ([system, data]: [string, any]) => {
        if (data.total < 5) {
          recommendations.push({
            score: 0.85,
            text: `Consider improving ${system} integration - low usage detected (${data.total} interactions)`,
            category: "integration",
          });
        }
      },
    );

    return recommendations;
  }

  private generateActionUrl(
    type: NotificationEvent["type"],
    data: any,
  ): string {
    switch (type) {
      case "high_effectiveness":
        return `/analytics?highlight=${data.id}`;
      case "system_alert":
        return `/analytics?system=${data.system}`;
      case "recommendation":
        return "/analytics?tab=recommendations";
      default:
        return "/analytics";
    }
  }

  private meetsMinPriority(
    notificationPriority: NotificationEvent["priority"],
    minPriority: NotificationEvent["priority"],
  ): boolean {
    const priorityLevels = { low: 1, medium: 2, high: 3, critical: 4 };
    return priorityLevels[notificationPriority] >= priorityLevels[minPriority];
  }

  private async sendEmailNotification(
    notification: NotificationEvent,
    userId?: string,
  ): Promise<void> {
    // Placeholder for email integration
    console.log(
      `[NotificationService] Email notification sent: ${notification.title}`,
    );
  }

  private async sendSlackNotification(
    notification: NotificationEvent,
    userId?: string,
  ): Promise<void> {
    // Placeholder for Slack integration
    console.log(
      `[NotificationService] Slack notification sent: ${notification.title}`,
    );
  }

  /**
   * Start background monitoring
   */
  startMonitoring(): void {
    // Check system performance every 30 minutes
    setInterval(
      () => {
        this.checkSystemPerformance();
      },
      30 * 60 * 1000,
    );

    // Generate recommendations every 4 hours
    setInterval(
      () => {
        this.generateOptimizationRecommendations();
      },
      4 * 60 * 60 * 1000,
    );

    console.log("[NotificationService] Background monitoring started");
  }

  /**
   * Get notification statistics
   */
  getNotificationStats(): any {
    const notifications = Array.from(this.notifications.values());
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    return {
      total: notifications.length,
      unread: notifications.filter((n) => !n.read).length,
      last_24h: notifications.filter(
        (n) => now - new Date(n.timestamp).getTime() < dayMs,
      ).length,
      by_type: notifications.reduce((acc: any, n) => {
        acc[n.type] = (acc[n.type] || 0) + 1;
        return acc;
      }, {}),
      by_priority: notifications.reduce((acc: any, n) => {
        acc[n.priority] = (acc[n.priority] || 0) + 1;
        return acc;
      }, {}),
    };
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();

// Start monitoring when module loads
notificationService.startMonitoring();
