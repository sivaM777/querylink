import { Suggestion, ExtractedKeyword } from "@shared/querylinker-api";
import { InteractionModel, CacheModel } from "../database/database";

export interface UserProfile {
  userId: string;
  expertise_level: "beginner" | "intermediate" | "advanced" | "expert";
  primary_role: "developer" | "sysadmin" | "support" | "manager" | "analyst";
  team: string;
  preferences: {
    preferred_systems: string[];
    preferred_content_types: string[];
    interaction_patterns: {
      avg_suggestions_per_incident: number;
      link_rate: number;
      view_to_link_ratio: number;
      time_spent_per_suggestion: number;
    };
    content_preferences: {
      prefers_detailed_descriptions: boolean;
      prefers_recent_content: boolean;
      prefers_high_authority_sources: boolean;
      technical_depth_preference: "basic" | "intermediate" | "advanced";
    };
    system_expertise: {
      [system: string]: number; // 0-1 expertise score
    };
    topic_interests: {
      [topic: string]: number; // 0-1 interest score
    };
  };
  learning_data: {
    successful_patterns: Array<{
      keywords: string[];
      suggested_system: string;
      outcome: "linked" | "viewed" | "dismissed";
      context: any;
      timestamp: string;
    }>;
    feedback_scores: Array<{
      suggestion_id: string;
      implicit_score: number; // Derived from behavior
      explicit_score?: number; // If user provides rating
      timestamp: string;
    }>;
  };
  last_updated: string;
  confidence_score: number; // How confident we are in this profile
}

export interface TeamProfile {
  teamId: string;
  members: string[];
  collective_preferences: {
    most_used_systems: string[];
    common_incident_types: string[];
    effective_suggestion_patterns: any[];
    team_expertise_areas: string[];
  };
  collaboration_patterns: {
    knowledge_sharing_frequency: number;
    cross_training_indicators: number;
    specialization_level: number;
  };
}

export interface PreferenceRecommendation {
  type:
    | "system_priority"
    | "content_filtering"
    | "notification_settings"
    | "workflow_optimization";
  confidence: number;
  impact: "low" | "medium" | "high";
  recommendation: string;
  rationale: string;
  suggested_action: any;
}

export class UserPreferenceEngine {
  private static instance: UserPreferenceEngine;
  private userProfiles: Map<string, UserProfile> = new Map();
  private teamProfiles: Map<string, TeamProfile> = new Map();
  private preferenceLearningEnabled: boolean = true;

  constructor() {
    console.log(
      "[UserPreferenceEngine] Advanced user preference learning engine initialized",
    );
    this.startPeriodicLearning();
  }

  static getInstance(): UserPreferenceEngine {
    if (!UserPreferenceEngine.instance) {
      UserPreferenceEngine.instance = new UserPreferenceEngine();
    }
    return UserPreferenceEngine.instance;
  }

  /**
   * Get or create user profile
   */
  async getUserProfile(userId: string): Promise<UserProfile> {
    let profile = this.userProfiles.get(userId);

    if (!profile) {
      profile = await this.createUserProfile(userId);
      this.userProfiles.set(userId, profile);
    }

    return profile;
  }

  /**
   * Learn from user interaction
   */
  async learnFromInteraction(
    userId: string,
    suggestion: Suggestion,
    action: "linked" | "viewed" | "dismissed",
    context: {
      keywords: ExtractedKeyword[];
      incidentType?: string;
      urgency?: string;
      timeSpent?: number;
      searchPosition?: number;
    },
  ): Promise<void> {
    if (!this.preferenceLearningEnabled) return;

    try {
      const profile = await this.getUserProfile(userId);

      // Update interaction patterns
      this.updateInteractionPatterns(profile, action, context);

      // Update content preferences
      this.updateContentPreferences(profile, suggestion, action, context);

      // Update system expertise
      this.updateSystemExpertise(profile, suggestion.system, action);

      // Update topic interests
      this.updateTopicInterests(profile, context.keywords, action);

      // Record successful pattern
      this.recordSuccessfulPattern(profile, suggestion, action, context);

      // Calculate implicit feedback score
      const implicitScore = this.calculateImplicitFeedbackScore(
        action,
        context,
      );
      profile.learning_data.feedback_scores.push({
        suggestion_id: suggestion.id,
        implicit_score: implicitScore,
        timestamp: new Date().toISOString(),
      });

      // Update confidence score
      profile.confidence_score = this.calculateProfileConfidence(profile);
      profile.last_updated = new Date().toISOString();

      // Save updated profile
      this.userProfiles.set(userId, profile);

      console.log(
        `[UserPreferenceEngine] Learned from ${action} interaction for user ${userId} (confidence: ${profile.confidence_score.toFixed(2)})`,
      );
    } catch (error) {
      console.error(
        "[UserPreferenceEngine] Error learning from interaction:",
        error,
      );
    }
  }

  /**
   * Get personalized suggestion ranking for user
   */
  async getPersonalizedRanking(
    userId: string,
    suggestions: Suggestion[],
    context: {
      keywords: ExtractedKeyword[];
      incidentType?: string;
      urgency?: string;
    },
  ): Promise<Suggestion[]> {
    try {
      const profile = await this.getUserProfile(userId);

      // Score each suggestion based on user preferences
      const scoredSuggestions = suggestions.map((suggestion) => {
        const personalizedScore = this.calculatePersonalizedScore(
          profile,
          suggestion,
          context,
        );

        return {
          ...suggestion,
          personalized_score: personalizedScore,
          personalization_factors: this.getPersonalizationFactors(
            profile,
            suggestion,
          ),
        };
      });

      // Sort by personalized score
      return scoredSuggestions.sort(
        (a, b) => (b.personalized_score || 0) - (a.personalized_score || 0),
      );
    } catch (error) {
      console.error(
        "[UserPreferenceEngine] Error in personalized ranking:",
        error,
      );
      return suggestions; // Fallback to original order
    }
  }

  /**
   * Generate preference-based recommendations for user
   */
  async generatePreferenceRecommendations(
    userId: string,
  ): Promise<PreferenceRecommendation[]> {
    try {
      const profile = await this.getUserProfile(userId);
      const recommendations: PreferenceRecommendation[] = [];

      // System priority recommendations
      if (profile.preferences.preferred_systems.length > 0) {
        const topSystem = profile.preferences.preferred_systems[0];
        recommendations.push({
          type: "system_priority",
          confidence: 0.8,
          impact: "medium",
          recommendation: `Prioritize suggestions from ${topSystem} based on your interaction history`,
          rationale: `You have a ${(profile.preferences.system_expertise[topSystem] * 100).toFixed(0)}% success rate with ${topSystem}`,
          suggested_action: { system_boost: topSystem, boost_factor: 1.3 },
        });
      }

      // Content filtering recommendations
      if (profile.preferences.content_preferences.technical_depth_preference) {
        recommendations.push({
          type: "content_filtering",
          confidence: 0.7,
          impact: "medium",
          recommendation: `Filter suggestions to match your ${profile.preferences.content_preferences.technical_depth_preference} technical level`,
          rationale: "Based on your interaction patterns and role",
          suggested_action: {
            content_filter:
              profile.preferences.content_preferences
                .technical_depth_preference,
            filter_strength: 0.6,
          },
        });
      }

      // Workflow optimization
      if (profile.preferences.interaction_patterns.link_rate < 0.3) {
        recommendations.push({
          type: "workflow_optimization",
          confidence: 0.85,
          impact: "high",
          recommendation:
            "Consider refining search keywords - your current link rate is below average",
          rationale: `Your link rate of ${(profile.preferences.interaction_patterns.link_rate * 100).toFixed(0)}% suggests suggestions aren't well-matched`,
          suggested_action: {
            suggested_training: "keyword_optimization",
            target_improvement: 0.5,
          },
        });
      }

      return recommendations;
    } catch (error) {
      console.error(
        "[UserPreferenceEngine] Error generating recommendations:",
        error,
      );
      return [];
    }
  }

  /**
   * Get team-based insights and recommendations
   */
  async getTeamInsights(teamId: string): Promise<any> {
    try {
      const teamProfile = await this.getOrCreateTeamProfile(teamId);

      return {
        team_effectiveness: this.calculateTeamEffectiveness(teamProfile),
        knowledge_gaps: this.identifyKnowledgeGaps(teamProfile),
        collaboration_opportunities:
          this.findCollaborationOpportunities(teamProfile),
        training_recommendations:
          this.generateTeamTrainingRecommendations(teamProfile),
        system_adoption: this.analyzeSystemAdoption(teamProfile),
      };
    } catch (error) {
      console.error(
        "[UserPreferenceEngine] Error getting team insights:",
        error,
      );
      return null;
    }
  }

  /**
   * Update user expertise based on successful resolutions
   */
  async updateUserExpertise(userId: string, incidentData: any): Promise<void> {
    try {
      const profile = await this.getUserProfile(userId);

      // Analyze incident complexity and resolution quality
      const complexityScore = this.assessIncidentComplexity(incidentData);
      const resolutionQuality = this.assessResolutionQuality(incidentData);

      // Update expertise level if warranted
      if (complexityScore > 0.7 && resolutionQuality > 0.8) {
        this.promoteExpertiseLevel(profile);
      }

      // Update topic expertise
      if (incidentData.tags) {
        incidentData.tags.forEach((tag: string) => {
          const currentScore = profile.preferences.topic_interests[tag] || 0;
          profile.preferences.topic_interests[tag] = Math.min(
            1,
            currentScore + 0.1,
          );
        });
      }

      this.userProfiles.set(userId, profile);
    } catch (error) {
      console.error(
        "[UserPreferenceEngine] Error updating user expertise:",
        error,
      );
    }
  }

  /**
   * Private helper methods
   */
  private async createUserProfile(userId: string): Promise<UserProfile> {
    // Get historical interaction data for this user
    const interactions = await InteractionModel.getInteractionsByUser(userId, 100);

    const profile: UserProfile = {
      userId,
      expertise_level: "intermediate", // Default, will be refined
      primary_role: "support", // Default, could be inferred from behavior
      team: "default",
      preferences: {
        preferred_systems: this.inferPreferredSystems(interactions),
        preferred_content_types: [],
        interaction_patterns: this.calculateInteractionPatterns(interactions),
        content_preferences: {
          prefers_detailed_descriptions: false,
          prefers_recent_content: true,
          prefers_high_authority_sources: true,
          technical_depth_preference: "intermediate",
        },
        system_expertise: this.calculateSystemExpertise(interactions),
        topic_interests: {},
      },
      learning_data: {
        successful_patterns: [],
        feedback_scores: [],
      },
      last_updated: new Date().toISOString(),
      confidence_score:
        interactions.length > 0 ? Math.min(0.8, interactions.length / 20) : 0.1,
    };

    return profile;
  }

  private inferPreferredSystems(interactions: any[]): string[] {
    const systemCounts = interactions.reduce((acc: any, interaction) => {
      acc[interaction.system] = (acc[interaction.system] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(systemCounts)
      .sort(([, a]: any, [, b]: any) => b - a)
      .slice(0, 3)
      .map(([system]) => system);
  }

  private calculateInteractionPatterns(interactions: any[]): any {
    const linkInteractions = interactions.filter(
      (i) => i.action_type === "link",
    );
    const viewInteractions = interactions.filter(
      (i) => i.action_type === "view",
    );

    return {
      avg_suggestions_per_incident: 2.5, // Default
      link_rate:
        interactions.length > 0
          ? linkInteractions.length / interactions.length
          : 0,
      view_to_link_ratio:
        linkInteractions.length > 0
          ? viewInteractions.length / linkInteractions.length
          : 0,
      time_spent_per_suggestion: 30, // Default seconds
    };
  }

  private calculateSystemExpertise(interactions: any[]): {
    [system: string]: number;
  } {
    const systemExpertise: { [system: string]: number } = {};

    interactions.forEach((interaction) => {
      if (interaction.action_type === "link") {
        const currentScore = systemExpertise[interaction.system] || 0;
        systemExpertise[interaction.system] = Math.min(1, currentScore + 0.1);
      }
    });

    return systemExpertise;
  }

  private updateInteractionPatterns(
    profile: UserProfile,
    action: string,
    context: any,
  ): void {
    const patterns = profile.preferences.interaction_patterns;

    // Update link rate (exponential moving average)
    const isLink = action === "linked";
    patterns.link_rate = patterns.link_rate * 0.9 + (isLink ? 1 : 0) * 0.1;

    // Update time spent if available
    if (context.timeSpent) {
      patterns.time_spent_per_suggestion =
        patterns.time_spent_per_suggestion * 0.9 + context.timeSpent * 0.1;
    }
  }

  private updateContentPreferences(
    profile: UserProfile,
    suggestion: Suggestion,
    action: string,
    context: any,
  ): void {
    const prefs = profile.preferences.content_preferences;

    // Learn from successful links
    if (action === "linked") {
      // Prefer detailed descriptions if long snippets are linked
      if (suggestion.snippet.length > 200) {
        prefs.prefers_detailed_descriptions = true;
      }

      // Learn recency preference
      if (suggestion.created_date) {
        const daysSinceCreated =
          Math.abs(Date.now() - new Date(suggestion.created_date).getTime()) /
          (1000 * 60 * 60 * 24);
        prefs.prefers_recent_content = daysSinceCreated < 30;
      }
    }
  }

  private updateSystemExpertise(
    profile: UserProfile,
    system: string,
    action: string,
  ): void {
    const currentExpertise = profile.preferences.system_expertise[system] || 0;

    if (action === "linked") {
      profile.preferences.system_expertise[system] = Math.min(
        1,
        currentExpertise + 0.05,
      );
    } else if (action === "dismissed") {
      profile.preferences.system_expertise[system] = Math.max(
        0,
        currentExpertise - 0.02,
      );
    }
  }

  private updateTopicInterests(
    profile: UserProfile,
    keywords: ExtractedKeyword[],
    action: string,
  ): void {
    keywords.forEach((keyword) => {
      const currentInterest =
        profile.preferences.topic_interests[keyword.word] || 0;

      if (action === "linked") {
        profile.preferences.topic_interests[keyword.word] = Math.min(
          1,
          currentInterest + 0.1 * keyword.weight,
        );
      }
    });
  }

  private recordSuccessfulPattern(
    profile: UserProfile,
    suggestion: Suggestion,
    action: string,
    context: any,
  ): void {
    if (action === "linked") {
      profile.learning_data.successful_patterns.push({
        keywords: context.keywords.map((k) => k.word),
        suggested_system: suggestion.system,
        outcome: action,
        context: {
          incident_type: context.incidentType,
          urgency: context.urgency,
          position: context.searchPosition,
        },
        timestamp: new Date().toISOString(),
      });

      // Keep only recent patterns (last 100)
      if (profile.learning_data.successful_patterns.length > 100) {
        profile.learning_data.successful_patterns =
          profile.learning_data.successful_patterns.slice(-100);
      }
    }
  }

  private calculateImplicitFeedbackScore(action: string, context: any): number {
    let score = 0;

    switch (action) {
      case "linked":
        score = 1.0; // High positive feedback
        break;
      case "viewed":
        score = context.timeSpent > 10 ? 0.6 : 0.3; // Medium feedback based on time
        break;
      case "dismissed":
        score = 0.1; // Low negative feedback
        break;
    }

    // Adjust based on position in search results
    if (context.searchPosition) {
      score *= Math.max(0.5, 1 - (context.searchPosition - 1) * 0.1);
    }

    return score;
  }

  private calculatePersonalizedScore(
    profile: UserProfile,
    suggestion: Suggestion,
    context: any,
  ): number {
    let score = 0;

    // System preference boost
    const systemExpertise =
      profile.preferences.system_expertise[suggestion.system] || 0.5;
    score += systemExpertise * 0.3;

    // Topic interest alignment
    const topicScore =
      context.keywords.reduce((acc: number, keyword) => {
        return (
          acc +
          (profile.preferences.topic_interests[keyword.word] || 0) *
            keyword.weight
        );
      }, 0) / context.keywords.length;
    score += topicScore * 0.4;

    // Content preference alignment
    if (
      profile.preferences.content_preferences.prefers_detailed_descriptions &&
      suggestion.snippet.length > 200
    ) {
      score += 0.1;
    }

    if (
      profile.preferences.content_preferences.prefers_recent_content &&
      suggestion.created_date
    ) {
      const daysSinceCreated =
        Math.abs(Date.now() - new Date(suggestion.created_date).getTime()) /
        (1000 * 60 * 60 * 24);
      if (daysSinceCreated < 7) score += 0.1;
    }

    // Successful pattern matching
    const patternMatch = this.findSimilarSuccessfulPatterns(
      profile,
      context.keywords.map((k) => k.word),
      suggestion.system,
    );
    score += patternMatch * 0.2;

    return Math.max(0, Math.min(1, score));
  }

  private getPersonalizationFactors(
    profile: UserProfile,
    suggestion: Suggestion,
  ): any {
    return {
      system_expertise:
        profile.preferences.system_expertise[suggestion.system] || 0,
      user_confidence: profile.confidence_score,
      expertise_level: profile.expertise_level,
      preferred_system: profile.preferences.preferred_systems.includes(
        suggestion.system,
      ),
    };
  }

  private findSimilarSuccessfulPatterns(
    profile: UserProfile,
    keywords: string[],
    system: string,
  ): number {
    const patterns = profile.learning_data.successful_patterns.filter(
      (p) => p.suggested_system === system,
    );

    let bestMatch = 0;
    patterns.forEach((pattern) => {
      const intersection = pattern.keywords.filter((k) =>
        keywords.includes(k),
      ).length;
      const union = new Set([...pattern.keywords, ...keywords]).size;
      const similarity = union > 0 ? intersection / union : 0;
      bestMatch = Math.max(bestMatch, similarity);
    });

    return bestMatch;
  }

  private calculateProfileConfidence(profile: UserProfile): number {
    const interactionCount =
      profile.learning_data.successful_patterns.length +
      profile.learning_data.feedback_scores.length;
    const timeWeight = Math.min(
      1,
      (Date.now() - new Date(profile.last_updated).getTime()) /
        (30 * 24 * 60 * 60 * 1000),
    ); // 30 days

    return Math.min(
      0.95,
      Math.max(0.1, (interactionCount / 50) * (1 - timeWeight * 0.3)),
    );
  }

  private async getOrCreateTeamProfile(teamId: string): Promise<TeamProfile> {
    let teamProfile = this.teamProfiles.get(teamId);

    if (!teamProfile) {
      teamProfile = {
        teamId,
        members: [], // Would be populated from team data
        collective_preferences: {
          most_used_systems: [],
          common_incident_types: [],
          effective_suggestion_patterns: [],
          team_expertise_areas: [],
        },
        collaboration_patterns: {
          knowledge_sharing_frequency: 0.5,
          cross_training_indicators: 0.3,
          specialization_level: 0.7,
        },
      };

      this.teamProfiles.set(teamId, teamProfile);
    }

    return teamProfile;
  }

  private calculateTeamEffectiveness(teamProfile: TeamProfile): number {
    // Simplified team effectiveness calculation
    return 0.75; // Placeholder
  }

  private identifyKnowledgeGaps(teamProfile: TeamProfile): string[] {
    // Analyze team expertise gaps
    return ["Authentication Systems", "Network Troubleshooting"]; // Placeholder
  }

  private findCollaborationOpportunities(teamProfile: TeamProfile): any[] {
    // Identify collaboration opportunities
    return []; // Placeholder
  }

  private generateTeamTrainingRecommendations(teamProfile: TeamProfile): any[] {
    // Generate training recommendations
    return []; // Placeholder
  }

  private analyzeSystemAdoption(teamProfile: TeamProfile): any {
    // Analyze system adoption patterns
    return {}; // Placeholder
  }

  private assessIncidentComplexity(incidentData: any): number {
    // Assess incident complexity
    return 0.5; // Placeholder
  }

  private assessResolutionQuality(incidentData: any): number {
    // Assess resolution quality
    return 0.8; // Placeholder
  }

  private promoteExpertiseLevel(profile: UserProfile): void {
    const levels = ["beginner", "intermediate", "advanced", "expert"];
    const currentIndex = levels.indexOf(profile.expertise_level);
    if (currentIndex < levels.length - 1) {
      profile.expertise_level = levels[currentIndex + 1] as any;
      console.log(
        `[UserPreferenceEngine] User ${profile.userId} promoted to ${profile.expertise_level} level`,
      );
    }
  }

  private startPeriodicLearning(): void {
    // Update user profiles periodically
    setInterval(
      () => {
        this.performPeriodicLearning();
      },
      60 * 60 * 1000,
    ); // Every hour

    console.log("[UserPreferenceEngine] Periodic learning started");
  }

  private async performPeriodicLearning(): Promise<void> {
    try {
      // Analyze recent interactions and update profiles
      console.log("[UserPreferenceEngine] Performing periodic learning update");

      // In a real implementation, this would:
      // 1. Fetch recent interactions from database
      // 2. Update user profiles based on new data
      // 3. Retrain preference models
      // 4. Update team profiles
    } catch (error) {
      console.error(
        "[UserPreferenceEngine] Error in periodic learning:",
        error,
      );
    }
  }

  /**
   * Export user profile for analysis
   */
  exportUserProfile(userId: string): UserProfile | null {
    return this.userProfiles.get(userId) || null;
  }

  /**
   * Get learning statistics
   */
  getLearningStats(): any {
    const profiles = Array.from(this.userProfiles.values());

    return {
      total_users: profiles.length,
      avg_confidence:
        profiles.reduce((sum, p) => sum + p.confidence_score, 0) /
        profiles.length,
      expertise_distribution: profiles.reduce((acc: any, p) => {
        acc[p.expertise_level] = (acc[p.expertise_level] || 0) + 1;
        return acc;
      }, {}),
      total_learning_events: profiles.reduce(
        (sum, p) => sum + p.learning_data.successful_patterns.length,
        0,
      ),
    };
  }
}

// Export singleton instance
export const userPreferenceEngine = UserPreferenceEngine.getInstance();
