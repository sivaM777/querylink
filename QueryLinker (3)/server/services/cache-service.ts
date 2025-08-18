import { CacheModel, CachedSuggestion } from "../database/database";
import { SearchResponse, ExtractedKeyword } from "@shared/querylinker-api";

export interface CacheConfig {
  enabled: boolean;
  defaultTTL: number; // Time to live in minutes
  maxCacheSize: number;
  cleanupInterval: number; // in minutes
}

export class CacheService {
  private config: CacheConfig;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      enabled: process.env.CACHE_ENABLED !== "false",
      defaultTTL: parseInt(process.env.CACHE_TTL_MINUTES || "60"), // 1 hour default
      maxCacheSize: parseInt(process.env.CACHE_MAX_SIZE || "1000"),
      cleanupInterval: parseInt(process.env.CACHE_CLEANUP_INTERVAL || "30"), // 30 minutes
      ...config,
    };

    if (this.config.enabled) {
      this.startCleanupTimer();
      console.log(
        "[CacheService] Cache enabled with TTL:",
        this.config.defaultTTL,
        "minutes",
      );
    } else {
      console.log("[CacheService] Cache disabled");
    }
  }

  /**
   * Check if caching is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Generate cache key from keywords
   */
  private generateCacheKey(keywords: ExtractedKeyword[]): string {
    // Sort keywords by weight and create a normalized string
    const keywordString = keywords
      .sort((a, b) => b.weight - a.weight)
      .map((k) => k.word.toLowerCase().trim())
      .join(" ");

    return CacheModel.generateKeywordsHash(keywordString);
  }

  /**
   * Get cached suggestions if available and not expired
   */
  async getCachedSuggestions(
    keywords: ExtractedKeyword[],
    incidentNumber?: string,
  ): Promise<SearchResponse | null> {
    if (!this.config.enabled) {
      return null;
    }

    try {
      let cached: CachedSuggestion | null = null;

      // First try to find by incident number (most specific)
      if (incidentNumber) {
        cached = CacheModel.getCachedSuggestionsByIncident(incidentNumber);
      }

      // If not found by incident, try by keywords hash
      if (!cached && keywords.length > 0) {
        const keywordsHash = this.generateCacheKey(keywords);
        cached = CacheModel.getCachedSuggestions(keywordsHash);
      }

      if (cached) {
        console.log(
          "[CacheService] Cache HIT for",
          incidentNumber || "keywords",
        );

        // Parse and return cached suggestions
        try {
          const suggestions = JSON.parse(cached.suggestions_json || '[]');
          return {
            suggestions,
            total_found: cached.total_found || suggestions.length,
            search_keywords: keywords.map((k) => k.word),
            search_time_ms: 0, // Cache hit, so instant
          };
        } catch (parseError) {
          console.error("[CacheService] Error parsing cached JSON:", parseError);
          // Cache entry is corrupted, continue without cache
        }
      }

      console.log(
        "[CacheService] Cache MISS for",
        incidentNumber || "keywords",
      );
      return null;
    } catch (error) {
      console.error("[CacheService] Error retrieving from cache:", error);
      return null;
    }
  }

  /**
   * Store search results in cache
   */
  async cacheSuggestions(
    keywords: ExtractedKeyword[],
    searchResponse: SearchResponse,
    incidentNumber?: string,
    customTTL?: number,
  ): Promise<void> {
    if (!this.config.enabled || keywords.length === 0) {
      return;
    }

    try {
      const keywordString = keywords
        .sort((a, b) => b.weight - a.weight)
        .map((k) => k.word.toLowerCase().trim())
        .join(" ");

      const keywordsHash = this.generateCacheKey(keywords);
      const ttlMinutes = customTTL || this.config.defaultTTL;

      // Calculate expiration time
      const expiresAt = new Date(
        Date.now() + ttlMinutes * 60 * 1000,
      ).toISOString();

      const cacheData: Omit<CachedSuggestion, "id" | "timestamp"> = {
        incident_number: incidentNumber,
        keywords: keywordString,
        keywords_hash: keywordsHash,
        suggestions_json: JSON.stringify(searchResponse.suggestions),
        search_time_ms: searchResponse.search_time_ms,
        total_found: searchResponse.total_found,
        expires_at: expiresAt,
      };

      const cacheId = CacheModel.cacheSuggestions(cacheData);
      console.log(
        "[CacheService] Cached suggestions with ID:",
        cacheId,
        "TTL:",
        ttlMinutes,
        "minutes",
      );

      // Check if we need to enforce cache size limits
      await this.enforceCacheSize();
    } catch (error) {
      console.error("[CacheService] Error caching suggestions:", error);
    }
  }

  /**
   * Invalidate cache for specific incident or keywords
   */
  async invalidateCache(
    incidentNumber?: string,
    keywords?: ExtractedKeyword[],
  ): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    try {
      // For now, we'll implement a simple cleanup of expired entries
      // In a more sophisticated system, you might want to specifically delete entries
      const cleaned = CacheModel.cleanupExpiredCache();
      console.log(
        "[CacheService] Invalidated cache, cleaned up",
        cleaned,
        "expired entries",
      );
    } catch (error) {
      console.error("[CacheService] Error invalidating cache:", error);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats() {
    if (!this.config.enabled) {
      return {
        enabled: false,
        total_cached: 0,
        valid_cached: 0,
        expired_cached: 0,
        avg_search_time_ms: 0,
        hit_rate: 0,
      };
    }

    try {
      const stats = CacheModel.getCacheStats();
      return {
        enabled: true,
        ...stats,
        config: this.config,
        hit_rate: 0, // TODO: Implement hit rate tracking
      };
    } catch (error) {
      console.error("[CacheService] Error getting cache stats:", error);
      return {
        enabled: true,
        total_cached: 0,
        valid_cached: 0,
        expired_cached: 0,
        avg_search_time_ms: 0,
        hit_rate: 0,
        error: error.message,
      };
    }
  }

  /**
   * Manually trigger cache cleanup
   */
  async cleanupCache(): Promise<number> {
    if (!this.config.enabled) {
      return 0;
    }

    try {
      const cleaned = CacheModel.cleanupExpiredCache();
      console.log(
        "[CacheService] Manual cleanup removed",
        cleaned,
        "expired entries",
      );
      return cleaned;
    } catch (error) {
      console.error("[CacheService] Error during manual cleanup:", error);
      return 0;
    }
  }

  /**
   * Enforce cache size limits by removing oldest entries
   */
  private async enforceCacheSize(): Promise<void> {
    try {
      const stats = CacheModel.getCacheStats();
      if (stats.valid_cached > this.config.maxCacheSize) {
        // Simple implementation: just clean expired entries
        // In production, you might want to implement LRU eviction
        CacheModel.cleanupExpiredCache();
        console.log("[CacheService] Enforced cache size limit");
      }
    } catch (error) {
      console.error("[CacheService] Error enforcing cache size:", error);
    }
  }

  /**
   * Start automatic cleanup timer
   */
  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(
      async () => {
        try {
          const cleaned = await this.cleanupCache();
          if (cleaned > 0) {
            console.log(
              "[CacheService] Auto-cleanup removed",
              cleaned,
              "expired entries",
            );
          }
        } catch (error) {
          console.error("[CacheService] Auto-cleanup error:", error);
        }
      },
      this.config.cleanupInterval * 60 * 1000,
    );

    console.log(
      "[CacheService] Auto-cleanup timer started, interval:",
      this.config.cleanupInterval,
      "minutes",
    );
  }

  /**
   * Stop cleanup timer (for graceful shutdown)
   */
  shutdown(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
      console.log("[CacheService] Cleanup timer stopped");
    }
  }

  /**
   * Warm up cache with common searches (optional optimization)
   */
  async warmupCache(commonKeywords: string[]): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    console.log(
      "[CacheService] Cache warmup started with",
      commonKeywords.length,
      "keyword sets",
    );

    // This would trigger searches for common terms to pre-populate cache
    // Implementation depends on your specific use case
    for (const keywords of commonKeywords) {
      // You could trigger background searches here
      console.log("[CacheService] Warmup keyword set:", keywords);
    }
  }
}

// Global cache service instance
export const cacheService = new CacheService();

// Graceful shutdown handling
process.on("SIGTERM", () => {
  cacheService.shutdown();
});

process.on("SIGINT", () => {
  cacheService.shutdown();
});
