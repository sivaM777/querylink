import { InteractionModel, UserInteraction } from "../database/database";
import { Suggestion } from "@shared/querylinker-api";

export interface InteractionData {
  userId?: string;
  incidentNumber: string;
  suggestion: Suggestion;
  actionType: "link" | "view" | "dismiss";
  sessionId?: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface AnalyticsData {
  systemPopularity: any[];
  interactionTrends: any[];
  effectiveSuggestions: any[];
  userActivity: any[];
}

export class InteractionService {
  private static instance: InteractionService;

  constructor() {
    console.log(
      "[InteractionService] Interaction tracking service initialized",
    );
  }

  static getInstance(): InteractionService {
    if (!InteractionService.instance) {
      InteractionService.instance = new InteractionService();
    }
    return InteractionService.instance;
  }

  /**
   * Record user interaction with a suggestion
   */
  async recordInteraction(data: InteractionData): Promise<number | null> {
    try {
      const interactionRecord: Omit<
        UserInteraction,
        "interaction_id" | "timestamp"
      > = {
        user_id: data.userId || "anonymous",
        incident_number: data.incidentNumber,
        suggestion_id: data.suggestion.id,
        system: data.suggestion.system,
        suggestion_title: data.suggestion.title,
        suggestion_link: data.suggestion.link,
        action_type: data.actionType,
      };

      const interactionId =
        InteractionModel.recordInteraction(interactionRecord);

      console.log(
        "[InteractionService] Recorded",
        data.actionType,
        "interaction:",
        {
          interactionId,
          user: data.userId || "anonymous",
          incident: data.incidentNumber,
          suggestion: data.suggestion.id,
          system: data.suggestion.system,
        },
      );

      // Trigger any post-interaction processing
      await this.processInteractionEffects(data, interactionId);

      return interactionId;
    } catch (error) {
      console.error("[InteractionService] Error recording interaction:", error);
      return null;
    }
  }

  /**
   * Get interaction history for an incident
   */
  async getIncidentInteractions(
    incidentNumber: string,
  ): Promise<UserInteraction[]> {
    try {
      const interactions =
        InteractionModel.getInteractionsByIncident(incidentNumber);
      console.log(
        "[InteractionService] Retrieved",
        interactions.length,
        "interactions for incident",
        incidentNumber,
      );
      return interactions;
    } catch (error) {
      console.error(
        "[InteractionService] Error getting incident interactions:",
        error,
      );
      return [];
    }
  }

  /**
   * Get user interaction history
   */
  async getUserInteractions(
    userId: string,
    limit: number = 50,
  ): Promise<UserInteraction[]> {
    try {
      const interactions = InteractionModel.getInteractionsByUser(
        userId,
        limit,
      );
      console.log(
        "[InteractionService] Retrieved",
        interactions.length,
        "interactions for user",
        userId,
      );
      return interactions;
    } catch (error) {
      console.error(
        "[InteractionService] Error getting user interactions:",
        error,
      );
      return [];
    }
  }

  /**
   * Get comprehensive analytics data
   */
  async getAnalytics(days: number = 30): Promise<AnalyticsData> {
    try {
      const [systemPopularity, interactionTrends, effectiveSuggestions] =
        await Promise.all([
          this.getSystemPopularity(days),
          this.getInteractionTrends(days),
          this.getMostEffectiveSuggestions(10),
        ]);

      return {
        systemPopularity,
        interactionTrends,
        effectiveSuggestions,
        userActivity: [], // Will be populated based on user data
      };
    } catch (error) {
      console.error("[InteractionService] Error getting analytics:", error);
      return {
        systemPopularity: [],
        interactionTrends: [],
        effectiveSuggestions: [],
        userActivity: [],
      };
    }
  }

  /**
   * Get system popularity rankings
   */
  async getSystemPopularity(days: number = 30): Promise<any[]> {
    try {
      const popularity = await InteractionModel.getSystemPopularity(days);

      // Enhance with additional metrics
      const enhancedPopularity = popularity.map((system: any) => ({
        ...system,
        effectiveness_score: this.calculateEffectivenessScore(system),
        recommendation: this.getSystemRecommendation(system),
      }));

      console.log(
        "[InteractionService] Retrieved system popularity for",
        days,
        "days",
      );
      return enhancedPopularity;
    } catch (error) {
      console.error(
        "[InteractionService] Error getting system popularity:",
        error,
      );
      return [];
    }
  }

  /**
   * Get interaction trends over time
   */
  async getInteractionTrends(days: number = 30): Promise<any[]> {
    try {
      const trends = InteractionModel.getAnalytics(days);

      // Process trends data for charts
      const processedTrends = this.processTrendsData(trends);

      console.log(
        "[InteractionService] Retrieved interaction trends for",
        days,
        "days",
      );
      return processedTrends;
    } catch (error) {
      console.error(
        "[InteractionService] Error getting interaction trends:",
        error,
      );
      return [];
    }
  }

  /**
   * Get most effective suggestions
   */
  async getMostEffectiveSuggestions(limit: number = 10): Promise<any[]> {
    try {
      const suggestions = InteractionModel.getMostEffectiveSuggestions(limit);

      // Enhance with effectiveness metrics
      const enhancedSuggestions = suggestions.map((suggestion: any) => ({
        ...suggestion,
        effectiveness_rating: this.calculateSuggestionEffectiveness(suggestion),
        impact_level: this.categorizeSuggestionImpact(suggestion),
      }));

      console.log(
        "[InteractionService] Retrieved",
        limit,
        "most effective suggestions",
      );
      return enhancedSuggestions;
    } catch (error) {
      console.error(
        "[InteractionService] Error getting effective suggestions:",
        error,
      );
      return [];
    }
  }

  /**
   * Generate recommendations for improving suggestion quality
   */
  async getRecommendations(): Promise<string[]> {
    try {
      const recommendations: string[] = [];

      const systemPopularity = await this.getSystemPopularity(30);
      const effectiveSuggestions = await this.getMostEffectiveSuggestions(5);

      // Analyze patterns and generate recommendations
      if (systemPopularity.length > 0) {
        const topSystem = systemPopularity[0];
        if (topSystem.link_rate < 20) {
          recommendations.push(
            `Consider improving ${topSystem.system} suggestion quality - current link rate is only ${topSystem.link_rate}%`,
          );
        }
      }

      if (effectiveSuggestions.length < 3) {
        recommendations.push(
          "Monitor suggestion effectiveness - few highly effective suggestions found",
        );
      }

      // Check for system imbalances
      const systemCounts = systemPopularity.reduce((acc: any, sys: any) => {
        acc[sys.system] = sys.link_count;
        return acc;
      }, {});

      const maxLinks = Math.max(...(Object.values(systemCounts) as number[]));
      const minLinks = Math.min(...(Object.values(systemCounts) as number[]));

      if (maxLinks > 0 && minLinks / maxLinks < 0.1) {
        recommendations.push(
          "Consider balancing suggestion sources - some systems are underutilized",
        );
      }

      console.log(
        "[InteractionService] Generated",
        recommendations.length,
        "recommendations",
      );
      return recommendations;
    } catch (error) {
      console.error(
        "[InteractionService] Error generating recommendations:",
        error,
      );
      return [
        "Unable to generate recommendations due to data processing error",
      ];
    }
  }

  /**
   * Process post-interaction effects (e.g., updating suggestion rankings)
   */
  private async processInteractionEffects(
    data: InteractionData,
    interactionId: number,
  ): Promise<void> {
    try {
      // Future: Update suggestion ranking algorithms based on user feedback
      // Future: Trigger notifications for highly effective suggestions
      // Future: Update user preference models

      console.log(
        "[InteractionService] Processing effects for interaction",
        interactionId,
      );
    } catch (error) {
      console.error(
        "[InteractionService] Error processing interaction effects:",
        error,
      );
    }
  }

  /**
   * Calculate effectiveness score for a system
   */
  private calculateEffectivenessScore(systemData: any): number {
    const linkRate = systemData.link_rate || 0;
    const incidentCoverage = Math.min(systemData.incident_count / 100, 1) * 100; // Normalize to incidents
    const userAdoption = Math.min(systemData.user_count / 50, 1) * 100; // Normalize to users

    // Weighted average: 50% link rate, 30% incident coverage, 20% user adoption
    return (
      Math.round(
        (linkRate * 0.5 + incidentCoverage * 0.3 + userAdoption * 0.2) * 100,
      ) / 100
    );
  }

  /**
   * Get recommendation for system improvement
   */
  private getSystemRecommendation(systemData: any): string {
    const linkRate = systemData.link_rate || 0;
    const linkCount = systemData.link_count || 0;

    if (linkRate < 10) {
      return "Low relevance - review suggestion algorithms";
    } else if (linkRate < 25) {
      return "Moderate relevance - optimize search queries";
    } else if (linkCount < 5) {
      return "Good relevance but low usage - increase visibility";
    } else {
      return "Performing well - maintain current configuration";
    }
  }

  /**
   * Process trends data for visualization
   */
  private processTrendsData(rawTrends: any[]): any[] {
    // Group by date and calculate daily totals
    const dailyTotals: { [key: string]: any } = {};

    rawTrends.forEach((trend) => {
      const date = trend.interaction_date;
      if (!dailyTotals[date]) {
        dailyTotals[date] = {
          date,
          total_interactions: 0,
          unique_incidents: new Set(),
          systems: {},
        };
      }

      dailyTotals[date].total_interactions += trend.total_interactions;
      dailyTotals[date].unique_incidents.add(trend.unique_incidents);
      dailyTotals[date].systems[trend.system] = trend.total_interactions;
    });

    // Convert to array format suitable for charts
    return Object.values(dailyTotals).map((day: any) => ({
      ...day,
      unique_incidents: day.unique_incidents.size,
    }));
  }

  /**
   * Calculate suggestion effectiveness rating
   */
  private calculateSuggestionEffectiveness(suggestionData: any): number {
    const linkCount = suggestionData.link_count || 0;
    const incidentCount = suggestionData.incident_count || 0;
    const userCount = suggestionData.user_count || 0;

    // Formula: links per incident + user diversity bonus
    const linksPerIncident = incidentCount > 0 ? linkCount / incidentCount : 0;
    const userDiversityBonus = Math.min(userCount / 10, 1); // Bonus for being used by many users

    return Math.round((linksPerIncident + userDiversityBonus) * 100) / 100;
  }

  /**
   * Categorize suggestion impact level
   */
  private categorizeSuggestionImpact(suggestionData: any): string {
    const linkCount = suggestionData.link_count || 0;
    const incidentCount = suggestionData.incident_count || 0;

    if (linkCount >= 20 && incidentCount >= 15) {
      return "High Impact";
    } else if (linkCount >= 10 && incidentCount >= 8) {
      return "Medium Impact";
    } else if (linkCount >= 5 && incidentCount >= 3) {
      return "Low Impact";
    } else {
      return "Minimal Impact";
    }
  }
}

// Export singleton instance
export const interactionService = InteractionService.getInstance();
