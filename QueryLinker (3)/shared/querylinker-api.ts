// QueryLinker API Types

export interface SearchRequest {
  incident_number: string;
  short_description: string;
  description: string;
  max_results: number;
}

export interface Suggestion {
  system:
    | "JIRA"
    | "CONFLUENCE"
    | "GITHUB"
    | "SN_KB"
    | "SLACK"
    | "MS_TEAMS"
    | "ZENDESK"
    | "LINEAR"
    | "NOTION"
    | "SN_ITSM";
  title: string;
  id: string;
  snippet: string;
  link: string;
  icon: string;
  actions: string[];
  relevance_score?: number;
  created_date?: string;
  author?: string;
}

export interface SearchResponse {
  suggestions: Suggestion[];
  total_found: number;
  search_keywords: string[];
  search_time_ms: number;
}

// Enhanced semantic suggest API shapes
export interface EnhancedSuggestRequest {
  query: string;
  systems?: string[];
  maxResults?: number;
  use_semantic?: boolean;
}

export interface EnhancedSuggestResponse {
  suggestions: Suggestion[];
  total_found: number;
  search_keywords: string[];
  search_time_ms: number;
  source: string;
}

export interface LinkRequest {
  incident_number: string;
  suggestion_id: string;
  system: string;
  title: string;
  link: string;
}

export interface LinkResponse {
  status: "success" | "error";
  message: string;
  link_id?: string;
  interaction_id?: string;
}

// External System API Types
export interface JiraIssue {
  key: string;
  fields: {
    summary: string;
    description: string;
    created: string;
    reporter: {
      displayName: string;
    };
  };
}

export interface ConfluencePage {
  id: string;
  title: string;
  excerpt: string;
  content: {
    view: {
      value: string;
    };
  };
  _links: {
    webui: string;
  };
  version: {
    when: string;
    by: {
      displayName: string;
    };
  };
}

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string;
  html_url: string;
  created_at: string;
  user: {
    login: string;
  };
}

export interface ServiceNowKBArticle {
  sys_id: string;
  short_description: string;
  text: string;
  sys_created_on: string;
  sys_created_by: string;
}

// Keyword extraction types
export interface ExtractedKeyword {
  word: string;
  weight: number;
  type: "noun" | "verb" | "adjective" | "technical" | "error";
}

// Analytics types
export interface SystemPopularity {
  system: string;
  link_count: number;
  incident_count: number;
  user_count: number;
  link_rate: number;
  effectiveness_score: number;
  recommendation: string;
}

export interface InteractionTrend {
  date: string;
  total_interactions: number;
  unique_incidents: number;
  systems: Record<string, number>;
}

export interface EffectiveSuggestion {
  suggestion_id: string;
  system: string;
  suggestion_title: string;
  link_count: number;
  incident_count: number;
  user_count: number;
  effectiveness_rating: number;
  impact_level: string;
}

export interface AnalyticsResponse {
  period: {
    days: number;
    start_date: string;
    end_date: string;
  };
  system_popularity: SystemPopularity[];
  interaction_trends: InteractionTrend[];
  effective_suggestions: EffectiveSuggestion[];
  cache_performance: any;
  recommendations: string[];
  summary: {
    total_interactions: number;
    unique_incidents: number;
    active_users: number;
    avg_effectiveness: number;
  };
}
