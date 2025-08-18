import { ExtractedKeyword } from "@shared/querylinker-api";

// Common technical terms and their weights
const TECHNICAL_TERMS = new Set([
  "401",
  "403",
  "404",
  "500",
  "error",
  "timeout",
  "ssl",
  "certificate",
  "authentication",
  "authorization",
  "login",
  "password",
  "token",
  "session",
  "api",
  "rest",
  "soap",
  "json",
  "xml",
  "database",
  "connection",
  "server",
  "patch",
  "update",
  "deployment",
  "version",
  "release",
  "migration",
  "portal",
  "gateway",
  "proxy",
  "firewall",
  "vpn",
  "ldap",
  "saml",
  "oauth",
]);

// Stop words to exclude
const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "but",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "with",
  "by",
  "from",
  "up",
  "about",
  "into",
  "through",
  "during",
  "before",
  "after",
  "above",
  "below",
  "between",
  "among",
  "through",
  "during",
  "before",
  "after",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "could",
  "should",
  "may",
  "might",
  "must",
  "this",
  "that",
  "these",
  "those",
  "i",
  "me",
  "my",
  "myself",
  "we",
  "our",
  "ours",
  "ourselves",
  "you",
  "your",
  "yours",
  "yourself",
  "yourselves",
  "he",
  "him",
  "his",
  "himself",
  "she",
  "her",
  "hers",
  "herself",
  "it",
  "its",
  "itself",
  "they",
  "them",
  "their",
  "theirs",
  "themselves",
]);

// Error patterns and their weights
const ERROR_PATTERNS = [
  { pattern: /\b\d{3}\b/g, type: "error" as const, weight: 3 }, // HTTP status codes
  {
    pattern: /error|exception|failure|fault|problem/gi,
    type: "error" as const,
    weight: 2.5,
  },
  {
    pattern: /timeout|slow|performance|latency/gi,
    type: "error" as const,
    weight: 2,
  },
  {
    pattern: /patch|update|version|release/gi,
    type: "technical" as const,
    weight: 2,
  },
  {
    pattern: /login|auth|password|token|certificate/gi,
    type: "technical" as const,
    weight: 2.5,
  },
];

export class KeywordExtractor {
  /**
   * Extract keywords from incident description using simple NLP techniques
   */
  static extractKeywords(
    text: string,
    maxKeywords: number = 8,
  ): ExtractedKeyword[] {
    if (!text || text.trim().length === 0) {
      return [];
    }

    const keywords: Map<string, ExtractedKeyword> = new Map();

    // Extract error patterns and technical terms
    this.extractPatternKeywords(text, keywords);

    // Extract regular words
    this.extractWordKeywords(text, keywords);

    // Convert to array and sort by weight
    const keywordArray = Array.from(keywords.values())
      .sort((a, b) => b.weight - a.weight)
      .slice(0, maxKeywords);

    return keywordArray;
  }

  /**
   * Extract keywords using predefined patterns
   */
  private static extractPatternKeywords(
    text: string,
    keywords: Map<string, ExtractedKeyword>,
  ) {
    ERROR_PATTERNS.forEach(({ pattern, type, weight }) => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach((match) => {
          const normalized = match.toLowerCase().trim();
          if (normalized.length > 1) {
            keywords.set(normalized, {
              word: normalized,
              weight: weight,
              type: type,
            });
          }
        });
      }
    });
  }

  /**
   * Extract keywords from regular words
   */
  private static extractWordKeywords(
    text: string,
    keywords: Map<string, ExtractedKeyword>,
  ) {
    // Split text into words and normalize
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ") // Remove punctuation
      .split(/\s+/)
      .filter((word) => word.length > 2)
      .filter((word) => !STOP_WORDS.has(word));

    // Count word frequency
    const wordFreq: Map<string, number> = new Map();
    words.forEach((word) => {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    });

    // Calculate weights for words
    wordFreq.forEach((frequency, word) => {
      if (!keywords.has(word)) {
        let weight = frequency;
        let type: ExtractedKeyword["type"] = "noun";

        // Boost technical terms
        if (TECHNICAL_TERMS.has(word)) {
          weight *= 2;
          type = "technical";
        }

        // Boost longer words (likely more specific)
        if (word.length > 6) {
          weight *= 1.5;
        }

        // Boost capitalized words (likely proper nouns or acronyms)
        if (text.includes(word.toUpperCase()) && word.length > 2) {
          weight *= 1.3;
        }

        keywords.set(word, {
          word: word,
          weight: weight,
          type: type,
        });
      }
    });
  }

  /**
   * Generate search query string from keywords
   */
  static generateSearchQuery(keywords: ExtractedKeyword[]): string {
    return keywords
      .slice(0, 5) // Use top 5 keywords
      .map((kw) => kw.word)
      .join(" ");
  }

  /**
   * Generate system-specific search queries
   */
  static generateSystemQueries(keywords: ExtractedKeyword[]) {
    const topKeywords = keywords.slice(0, 5);

    return {
      jira: topKeywords.map((kw) => `text ~ "${kw.word}"`).join(" OR "),
      confluence: topKeywords.map((kw) => `text ~ "${kw.word}"`).join(" AND "),
      github: topKeywords.map((kw) => kw.word).join(" "),
      servicenow: topKeywords
        .map((kw) => `short_descriptionLIKE${kw.word}`)
        .join("^OR"),
    };
  }
}
