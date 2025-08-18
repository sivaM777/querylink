import { Suggestion } from "@shared/querylinker-api";

export class ResultAggregator {
  /**
   * Aggregate results from multiple systems, remove duplicates, and rank by relevance
   */
  static aggregateAndRank(
    allResults: Suggestion[],
    maxResults: number = 10,
  ): { suggestions: Suggestion[]; totalFound: number } {
    // Remove duplicates based on title similarity
    const uniqueResults = this.removeDuplicates(allResults);

    // Rank by relevance score and other factors
    const rankedResults = this.rankResults(uniqueResults);

    // Limit to max results
    const finalResults = rankedResults.slice(0, maxResults);

    return {
      suggestions: finalResults,
      totalFound: uniqueResults.length,
    };
  }

  /**
   * Remove duplicate suggestions based on title similarity
   */
  private static removeDuplicates(results: Suggestion[]): Suggestion[] {
    const uniqueResults: Suggestion[] = [];
    const seenTitles = new Set<string>();

    for (const result of results) {
      const normalizedTitle = this.normalizeTitle(result.title);

      // Check if we've seen a similar title
      let isDuplicate = false;
      for (const seenTitle of seenTitles) {
        if (this.calculateSimilarity(normalizedTitle, seenTitle) > 0.8) {
          isDuplicate = true;
          break;
        }
      }

      if (!isDuplicate) {
        uniqueResults.push(result);
        seenTitles.add(normalizedTitle);
      }
    }

    return uniqueResults;
  }

  /**
   * Rank results by multiple factors
   */
  private static rankResults(results: Suggestion[]): Suggestion[] {
    return results
      .map((result) => ({
        ...result,
        final_score: this.calculateFinalScore(result),
      }))
      .sort((a, b) => (b.final_score || 0) - (a.final_score || 0));
  }

  /**
   * Calculate final ranking score based on multiple factors
   */
  private static calculateFinalScore(suggestion: Suggestion): number {
    let score = 0;

    // Base relevance score (0-1)
    const relevanceScore = suggestion.relevance_score || 0;
    score += relevanceScore * 40; // 40% weight

    // System-specific scoring
    const systemWeights = {
      JIRA: 1.2, // Issues are high priority
      SN_KB: 1.1, // Knowledge base is very relevant
      CONFLUENCE: 1.0, // Documentation is helpful
      GITHUB: 0.9, // Code issues might be less immediately actionable
    };
    score *= systemWeights[suggestion.system] || 1.0;

    // Recency bonus (newer content gets bonus)
    if (suggestion.created_date) {
      const daysOld = this.getDaysOld(suggestion.created_date);
      if (daysOld < 7) {
        score *= 1.3; // 30% bonus for content less than a week old
      } else if (daysOld < 30) {
        score *= 1.1; // 10% bonus for content less than a month old
      }
    }

    // Title quality bonus
    const titleLength = suggestion.title.length;
    if (titleLength > 20 && titleLength < 100) {
      score *= 1.05; // Prefer descriptive but not overly long titles
    }

    // Snippet quality bonus
    if (suggestion.snippet && suggestion.snippet.length > 50) {
      score *= 1.02; // Prefer suggestions with good descriptions
    }

    // Error/technical term bonus
    const titleLower = suggestion.title.toLowerCase();
    const technicalTerms = [
      "error",
      "fix",
      "issue",
      "problem",
      "solution",
      "resolved",
      "patch",
      "update",
    ];
    const technicalTermCount = technicalTerms.filter((term) =>
      titleLower.includes(term),
    ).length;
    score *= 1 + technicalTermCount * 0.1; // 10% bonus per technical term

    return Math.round(score * 100) / 100;
  }

  /**
   * Normalize title for duplicate detection
   */
  private static normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s]/g, "") // Remove punctuation
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim();
  }

  /**
   * Calculate similarity between two strings using Jaccard similarity
   */
  private static calculateSimilarity(str1: string, str2: string): number {
    const words1 = new Set(str1.split(/\s+/));
    const words2 = new Set(str2.split(/\s+/));

    const intersection = new Set(
      [...words1].filter((word) => words2.has(word)),
    );
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  /**
   * Calculate days since creation
   */
  private static getDaysOld(dateString: string): number {
    const created = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  /**
   * Generate search summary
   */
  static generateSearchSummary(
    keywords: string[],
    totalFound: number,
    searchTimeMs: number,
  ): string {
    const keywordList = keywords.slice(0, 3).join(", ");
    return `Found ${totalFound} results for "${keywordList}" in ${searchTimeMs}ms`;
  }

  /**
   * Categorize suggestions by system for better organization
   */
  static categorizeBySystems(
    suggestions: Suggestion[],
  ): Record<string, Suggestion[]> {
    const categorized: Record<string, Suggestion[]> = {
      JIRA: [],
      CONFLUENCE: [],
      GITHUB: [],
      SN_KB: [],
    };

    suggestions.forEach((suggestion) => {
      if (categorized[suggestion.system]) {
        categorized[suggestion.system].push(suggestion);
      }
    });

    return categorized;
  }
}
