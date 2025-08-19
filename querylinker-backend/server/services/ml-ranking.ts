import { Suggestion, ExtractedKeyword } from "@shared/querylinker-api";
import { InteractionModel } from "../database/database";

// ML Feature extraction for suggestion ranking
export interface MLFeatures {
  // Content features
  titleLength: number;
  snippetLength: number;
  keywordDensity: number;
  technicalTermCount: number;
  errorTermCount: number;

  // Historical features
  systemPopularity: number;
  historicalLinkRate: number;
  avgUserRating: number;
  recencyScore: number;
  authorCredibility: number;

  // Context features
  keywordMatch: number;
  semanticSimilarity: number;
  incidentTypeMatch: number;
  urgencyAlignment: number;

  // User features
  userExpertiseLevel: number;
  userPreferenceScore: number;
  teamPreferenceScore: number;

  // System features
  systemReliability: number;
  systemResponseTime: number;
  systemContentQuality: number;
}

export interface MLModelWeights {
  contentWeight: number;
  historicalWeight: number;
  contextWeight: number;
  userWeight: number;
  systemWeight: number;
}

export interface RankingContext {
  userId?: string;
  incidentType?: string;
  urgencyLevel?: "low" | "medium" | "high" | "critical";
  keywords: ExtractedKeyword[];
  userTeam?: string;
  previousInteractions?: any[];
}

export class MLRankingEngine {
  private static instance: MLRankingEngine;
  private modelWeights: MLModelWeights;
  private featureScalers: Record<string, { min: number; max: number }> = {};

  constructor() {
    // Initialize with default model weights (these would be learned from data)
    this.modelWeights = {
      contentWeight: 0.25, // How well the content matches
      historicalWeight: 0.3, // Historical performance
      contextWeight: 0.25, // Context relevance
      userWeight: 0.15, // User preferences
      systemWeight: 0.05, // System characteristics
    };

    this.initializeFeatureScalers();
    console.log(
      "[MLRankingEngine] Machine learning ranking engine initialized",
    );
  }

  static getInstance(): MLRankingEngine {
    if (!MLRankingEngine.instance) {
      MLRankingEngine.instance = new MLRankingEngine();
    }
    return MLRankingEngine.instance;
  }

  /**
   * Rank suggestions using ML-based scoring
   */
  async rankSuggestions(
    suggestions: Suggestion[],
    context: RankingContext,
  ): Promise<Suggestion[]> {
    console.log(
      `[MLRankingEngine] Ranking ${suggestions.length} suggestions with ML algorithm`,
    );

    // Extract features for each suggestion
    const scoredSuggestions = await Promise.all(
      suggestions.map(async (suggestion) => {
        const features = await this.extractFeatures(suggestion, context);
        const mlScore = this.calculateMLScore(features);

        return {
          ...suggestion,
          ml_score: mlScore,
          ml_features: features,
          final_score: mlScore, // Override the basic scoring
        };
      }),
    );

    // Sort by ML score (descending)
    const rankedSuggestions = scoredSuggestions.sort(
      (a, b) => (b.ml_score || 0) - (a.ml_score || 0),
    );

    console.log(
      `[MLRankingEngine] Top suggestion scored: ${rankedSuggestions[0]?.ml_score?.toFixed(3)} for "${rankedSuggestions[0]?.title}"`,
    );

    return rankedSuggestions;
  }

  /**
   * Extract ML features from suggestion and context
   */
  private async extractFeatures(
    suggestion: Suggestion,
    context: RankingContext,
  ): Promise<MLFeatures> {
    const features: MLFeatures = {
      // Content features
      titleLength: this.normalizeFeature(
        "titleLength",
        suggestion.title.length,
      ),
      snippetLength: this.normalizeFeature(
        "snippetLength",
        suggestion.snippet.length,
      ),
      keywordDensity: this.calculateKeywordDensity(
        suggestion,
        context.keywords,
      ),
      technicalTermCount: this.countTechnicalTerms(
        suggestion.title + " " + suggestion.snippet,
      ),
      errorTermCount: this.countErrorTerms(
        suggestion.title + " " + suggestion.snippet,
      ),

      // Historical features
      systemPopularity: await this.getSystemPopularity(suggestion.system),
      historicalLinkRate: await this.getHistoricalLinkRate(
        suggestion.id,
        suggestion.system,
      ),
      avgUserRating: await this.getAverageUserRating(suggestion.id),
      recencyScore: this.calculateRecencyScore(suggestion.created_date),
      authorCredibility: await this.getAuthorCredibility(suggestion.author),

      // Context features
      keywordMatch: this.calculateKeywordMatch(suggestion, context.keywords),
      semanticSimilarity: await this.calculateSemanticSimilarity(
        suggestion,
        context.keywords,
      ),
      incidentTypeMatch: this.calculateIncidentTypeMatch(
        suggestion,
        context.incidentType,
      ),
      urgencyAlignment: this.calculateUrgencyAlignment(
        suggestion,
        context.urgencyLevel,
      ),

      // User features
      userExpertiseLevel: await this.getUserExpertiseLevel(context.userId),
      userPreferenceScore: await this.getUserPreferenceScore(
        context.userId,
        suggestion,
      ),
      teamPreferenceScore: await this.getTeamPreferenceScore(
        context.userTeam,
        suggestion,
      ),

      // System features
      systemReliability: this.getSystemReliability(suggestion.system),
      systemResponseTime: this.getSystemResponseTime(suggestion.system),
      systemContentQuality: await this.getSystemContentQuality(
        suggestion.system,
      ),
    };

    return features;
  }

  /**
   * Calculate ML score using weighted feature combination
   */
  private calculateMLScore(features: MLFeatures): number {
    const contentScore =
      features.titleLength * 0.15 +
      features.snippetLength * 0.1 +
      features.keywordDensity * 0.3 +
      features.technicalTermCount * 0.25 +
      features.errorTermCount * 0.2;

    const historicalScore =
      features.systemPopularity * 0.2 +
      features.historicalLinkRate * 0.35 +
      features.avgUserRating * 0.25 +
      features.recencyScore * 0.15 +
      features.authorCredibility * 0.05;

    const contextScore =
      features.keywordMatch * 0.4 +
      features.semanticSimilarity * 0.3 +
      features.incidentTypeMatch * 0.2 +
      features.urgencyAlignment * 0.1;

    const userScore =
      features.userExpertiseLevel * 0.3 +
      features.userPreferenceScore * 0.4 +
      features.teamPreferenceScore * 0.3;

    const systemScore =
      features.systemReliability * 0.4 +
      features.systemResponseTime * 0.3 +
      features.systemContentQuality * 0.3;

    // Weighted combination
    const finalScore =
      contentScore * this.modelWeights.contentWeight +
      historicalScore * this.modelWeights.historicalWeight +
      contextScore * this.modelWeights.contextWeight +
      userScore * this.modelWeights.userWeight +
      systemScore * this.modelWeights.systemWeight;

    return Math.max(0, Math.min(1, finalScore)); // Clamp between 0 and 1
  }

  /**
   * Feature extraction helper methods
   */
  private calculateKeywordDensity(
    suggestion: Suggestion,
    keywords: ExtractedKeyword[],
  ): number {
    const text = (suggestion.title + " " + suggestion.snippet).toLowerCase();
    const keywordWords = keywords.map((k) => k.word.toLowerCase());
    const words = text.split(/\s+/);

    const matchCount = words.filter((word) =>
      keywordWords.includes(word),
    ).length;
    return words.length > 0 ? matchCount / words.length : 0;
  }

  private countTechnicalTerms(text: string): number {
    const technicalTerms = [
      "api",
      "database",
      "server",
      "authentication",
      "ssl",
      "token",
      "session",
      "timeout",
      "configuration",
      "deployment",
      "patch",
      "update",
      "version",
      "error",
      "exception",
      "failure",
      "bug",
      "issue",
      "problem",
    ];

    const lowerText = text.toLowerCase();
    return technicalTerms.filter((term) => lowerText.includes(term)).length;
  }

  private countErrorTerms(text: string): number {
    const errorTerms = [
      "error",
      "fail",
      "broken",
      "issue",
      "problem",
      "bug",
      "crash",
      "timeout",
    ];
    const lowerText = text.toLowerCase();
    return errorTerms.filter((term) => lowerText.includes(term)).length;
  }

  private calculateKeywordMatch(
    suggestion: Suggestion,
    keywords: ExtractedKeyword[],
  ): number {
    const text = (suggestion.title + " " + suggestion.snippet).toLowerCase();
    const keywordWords = keywords.map((k) => k.word.toLowerCase());

    let score = 0;
    keywordWords.forEach((keyword) => {
      if (text.includes(keyword)) {
        score += 0.5; // Base match
        if (text.includes(` ${keyword} `)) {
          score += 0.3; // Word boundary match bonus
        }
        if (suggestion.title.toLowerCase().includes(keyword)) {
          score += 0.2; // Title match bonus
        }
      }
    });

    return Math.min(1, score / keywordWords.length);
  }

  private calculateRecencyScore(dateString?: string): number {
    if (!dateString) return 0.5; // Default for missing dates

    const created = new Date(dateString);
    const now = new Date();
    const daysDiff =
      Math.abs(now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);

    // Exponential decay: newer content scores higher
    return Math.exp(-daysDiff / 30); // Half-life of 30 days
  }

  private calculateIncidentTypeMatch(
    suggestion: Suggestion,
    incidentType?: string,
  ): number {
    if (!incidentType) return 0.5;

    const typeKeywords = {
      authentication: ["auth", "login", "password", "token", "sso"],
      performance: ["slow", "timeout", "latency", "performance", "speed"],
      connectivity: ["network", "connection", "vpn", "firewall", "dns"],
      deployment: ["deploy", "release", "patch", "update", "rollout"],
    };

    const keywords = typeKeywords[incidentType.toLowerCase()] || [];
    const text = (suggestion.title + " " + suggestion.snippet).toLowerCase();

    const matches = keywords.filter((keyword) => text.includes(keyword)).length;
    return keywords.length > 0 ? matches / keywords.length : 0.5;
  }

  private calculateUrgencyAlignment(
    suggestion: Suggestion,
    urgencyLevel?: string,
  ): number {
    if (!urgencyLevel) return 0.5;

    const urgencyKeywords = {
      critical: ["critical", "urgent", "emergency", "outage", "down"],
      high: ["important", "priority", "escalate", "asap"],
      medium: ["normal", "standard", "regular"],
      low: ["minor", "low", "future", "enhancement"],
    };

    const keywords = urgencyKeywords[urgencyLevel.toLowerCase()] || [];
    const text = (suggestion.title + " " + suggestion.snippet).toLowerCase();

    const matches = keywords.filter((keyword) => text.includes(keyword)).length;
    return keywords.length > 0 ? matches / keywords.length : 0.5;
  }

  /**
   * Database-based feature calculations
   */
  private async getSystemPopularity(system: string): Promise<number> {
    try {
      const popularity = await InteractionModel.getSystemPopularity(30);
      const systemData = popularity.find((s: any) => s.system === system);
      return systemData ? Math.min(1, systemData.link_count / 100) : 0.5;
    } catch {
      return 0.5;
    }
  }

  private async getHistoricalLinkRate(
    suggestionId: string,
    system: string,
  ): Promise<number> {
    try {
      // In a real implementation, this would query historical data for this specific suggestion
      const effective = await InteractionModel.getMostEffectiveSuggestions(100);
      const suggestionData = effective.find(
        (s: any) => s.suggestion_id === suggestionId,
      );
      return suggestionData ? Math.min(1, suggestionData.link_count / 20) : 0.3;
    } catch {
      return 0.3;
    }
  }

  private async getAverageUserRating(suggestionId: string): Promise<number> {
    // Placeholder for user rating system
    return 0.7; // Default rating
  }

  private async getAuthorCredibility(author?: string): Promise<number> {
    // Placeholder for author credibility scoring
    return author ? 0.8 : 0.5;
  }

  private async getUserExpertiseLevel(userId?: string): Promise<number> {
    // Placeholder for user expertise calculation
    return userId ? 0.7 : 0.5;
  }

  private async getUserPreferenceScore(
    userId?: string,
    suggestion?: Suggestion,
  ): Promise<number> {
    // Placeholder for user preference learning
    return userId && suggestion ? 0.6 : 0.5;
  }

  private async getTeamPreferenceScore(
    team?: string,
    suggestion?: Suggestion,
  ): Promise<number> {
    // Placeholder for team preference analysis
    return team && suggestion ? 0.6 : 0.5;
  }

  private async calculateSemanticSimilarity(
    suggestion: Suggestion,
    keywords: ExtractedKeyword[],
  ): Promise<number> {
    // Placeholder for semantic similarity (would use embeddings in production)
    return this.calculateKeywordMatch(suggestion, keywords) * 0.8;
  }

  private getSystemReliability(system: string): number {
    const reliability = {
      JIRA: 0.95,
      CONFLUENCE: 0.9,
      GITHUB: 0.92,
      SN_KB: 0.88,
    };
    return reliability[system] || 0.85;
  }

  private getSystemResponseTime(system: string): number {
    const responseTimes = {
      JIRA: 0.85, // Good response time
      CONFLUENCE: 0.8, // Moderate response time
      GITHUB: 0.9, // Fast response time
      SN_KB: 0.75, // Slower response time
    };
    return responseTimes[system] || 0.8;
  }

  private async getSystemContentQuality(system: string): Promise<number> {
    const quality = {
      JIRA: 0.85,
      CONFLUENCE: 0.9,
      GITHUB: 0.8,
      SN_KB: 0.88,
    };
    return quality[system] || 0.82;
  }

  /**
   * Feature normalization
   */
  private normalizeFeature(featureName: string, value: number): number {
    const scaler = this.featureScalers[featureName];
    if (!scaler) return Math.min(1, value / 100); // Default normalization

    return Math.max(
      0,
      Math.min(1, (value - scaler.min) / (scaler.max - scaler.min)),
    );
  }

  private initializeFeatureScalers(): void {
    this.featureScalers = {
      titleLength: { min: 0, max: 200 },
      snippetLength: { min: 0, max: 500 },
      // Add more feature scalers based on training data
    };
  }

  /**
   * Model training and updating
   */
  async updateModelWeights(trainingData: any[]): Promise<void> {
    // Placeholder for model training
    console.log(
      "[MLRankingEngine] Model weights updated with",
      trainingData.length,
      "training examples",
    );
  }

  async retrainModel(): Promise<void> {
    // Placeholder for full model retraining
    console.log(
      "[MLRankingEngine] Model retrained with latest interaction data",
    );
  }
}

// Export singleton instance
export const mlRankingEngine = MLRankingEngine.getInstance();
