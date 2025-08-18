import {
  Suggestion,
  JiraIssue,
  ConfluencePage,
  GitHubIssue,
  ServiceNowKBArticle,
} from "@shared/querylinker-api";

// Configuration for external systems
interface SystemConfig {
  baseUrl: string;
  apiKey?: string;
  username?: string;
  enabled: boolean;
}

// Enable real API mode only if required env vars are present; otherwise fall back to demo mocks
const SYSTEM_CONFIGS: Record<string, SystemConfig> = {
  jira: {
    baseUrl: process.env.JIRA_BASE_URL || "https://demo.atlassian.net",
    apiKey: process.env.JIRA_API_KEY,
    username: process.env.JIRA_USERNAME,
    enabled: Boolean(process.env.JIRA_BASE_URL && process.env.JIRA_API_KEY && process.env.JIRA_USERNAME),
  },
  confluence: {
    baseUrl: process.env.CONFLUENCE_BASE_URL || "https://demo.atlassian.net/wiki",
    apiKey: process.env.CONFLUENCE_API_KEY,
    username: process.env.CONFLUENCE_USERNAME,
    enabled: Boolean(process.env.CONFLUENCE_BASE_URL && process.env.CONFLUENCE_API_KEY && process.env.CONFLUENCE_USERNAME),
  },
  github: {
    baseUrl: "https://api.github.com",
    apiKey: process.env.GITHUB_TOKEN,
    enabled: Boolean(process.env.GITHUB_TOKEN),
  },
  servicenow: {
    baseUrl: process.env.SERVICENOW_INSTANCE_URL || "https://demo.servicenow.com",
    apiKey: process.env.SERVICENOW_API_KEY,
    username: process.env.SERVICENOW_USERNAME,
    enabled: Boolean(process.env.SERVICENOW_INSTANCE_URL && process.env.SERVICENOW_API_KEY && process.env.SERVICENOW_USERNAME),
  },
};

export class ExternalSystemAPI {
  /**
   * Search Jira for issues matching keywords
   */
  static async searchJira(
    query: string,
    maxResults: number = 5,
  ): Promise<Suggestion[]> {
    if (!SYSTEM_CONFIGS.jira.enabled) {
      return this.getMockJiraResults(query, maxResults);
    }

    try {
      const auth = `Basic ${Buffer.from(`${SYSTEM_CONFIGS.jira.username}:${SYSTEM_CONFIGS.jira.apiKey}`).toString("base64")}`;
      const url = `${SYSTEM_CONFIGS.jira.baseUrl}/rest/api/2/search?jql=text~"${encodeURIComponent(query)}"&maxResults=${maxResults}`;
      const response = await fetch(url, {
        headers: {
          Authorization: auth,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });
      if (!response.ok) throw new Error(`Jira ${response.status}`);
      const data = await response.json();
      const issues = (data.issues || []).map((i: any) => ({
        key: i.key,
        summary: i.fields?.summary || i.key,
        description: i.fields?.description || "",
        created: i.fields?.created,
        reporter: i.fields?.reporter?.displayName || "unknown",
      }));
      const mapped = issues.slice(0, maxResults).map((issue: any) => ({
        system: "JIRA" as const,
        title: issue.summary,
        id: issue.key,
        snippet: issue.description || "",
        link: `/solution/${issue.key}`,
        external_url: `${SYSTEM_CONFIGS.jira.baseUrl}/browse/${issue.key}`,
        icon: "🔧",
        actions: ["link", "view"],
        created_date: issue.created,
        author: issue.reporter,
      }));
      return mapped.length ? mapped : this.getMockJiraResults(query, maxResults);
    } catch (error) {
      console.error("Error searching Jira:", error);
      return [];
    }
  }

  /**
   * Search Confluence for pages matching keywords
   */
  static async searchConfluence(
    query: string,
    maxResults: number = 5,
  ): Promise<Suggestion[]> {
    if (!SYSTEM_CONFIGS.confluence.enabled) {
      return this.getMockConfluenceResults(query, maxResults);
    }

    try {
      const auth = `Basic ${Buffer.from(`${SYSTEM_CONFIGS.confluence.username}:${SYSTEM_CONFIGS.confluence.apiKey}`).toString("base64")}`;
      const url = `${SYSTEM_CONFIGS.confluence.baseUrl}/rest/api/content/search?cql=text~"${encodeURIComponent(query)}"&limit=${maxResults}`;
      const response = await fetch(url, {
        headers: {
          Authorization: auth,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });
      if (!response.ok) throw new Error(`Confluence ${response.status}`);
      const data = await response.json();
      const pages = (data.results || []).map((p: any) => ({
        id: p.id,
        title: p.title,
        excerpt: p?.excerpt || "",
        created: p.version?.when,
        author: p.version?.by?.displayName || "unknown",
      }));
      const mapped = pages.slice(0, maxResults).map((page: any) => ({
        system: "CONFLUENCE" as const,
        title: page.title,
        id: page.id,
        snippet: page.excerpt,
        link: `/solution/${page.id}`,
        external_url: `${SYSTEM_CONFIGS.confluence.baseUrl}/pages/${page.id}`,
        icon: "📋",
        actions: ["link", "view"],
        created_date: page.created,
        author: page.author,
      }));
      return mapped.length ? mapped : this.getMockConfluenceResults(query, maxResults);
    } catch (error) {
      console.error("Error searching Confluence:", error);
      return [];
    }
  }

  /**
   * Search GitHub for issues matching keywords
   */
  static async searchGitHub(
    query: string,
    maxResults: number = 5,
    repo?: string,
  ): Promise<Suggestion[]> {
    if (!SYSTEM_CONFIGS.github.enabled) {
      return this.getMockGitHubResults(query, maxResults);
    }

    try {
      const searchQuery = repo ? `${query} repo:${repo}` : query;
      const url = `${SYSTEM_CONFIGS.github.baseUrl}/search/issues?q=${encodeURIComponent(searchQuery)}&per_page=${maxResults}`;
      const response = await fetch(url, {
        headers: {
          Authorization: `token ${SYSTEM_CONFIGS.github.apiKey}`,
          Accept: "application/vnd.github.v3+json",
        },
      });
      if (!response.ok) throw new Error(`GitHub ${response.status}`);
      const data = await response.json();
      const issues = (data.items || []).map((i: any) => ({
        number: i.number,
        title: i.title,
        body: i.body,
        created_at: i.created_at,
        user: i.user?.login || "unknown",
      }));
      const mapped = issues.slice(0, maxResults).map((issue: any) => ({
        system: "GITHUB" as const,
        title: issue.title,
        id: `ISSUE-${issue.number}`,
        snippet: issue.body,
        link: `/solution/ISSUE-${issue.number}`,
        external_url: `https://github.com/search?q=${encodeURIComponent(`#${issue.number} ${issue.title}`)}`,
        icon: "🐙",
        actions: ["link", "view"],
        created_date: issue.created_at,
        author: issue.user,
      }));
      return mapped.length ? mapped : this.getMockGitHubResults(query, maxResults);
    } catch (error) {
      console.error("Error searching GitHub:", error);
      return [];
    }
  }

  /**
   * Search ServiceNow KB for articles matching keywords
   */
  static async searchServiceNowKB(
    query: string,
    maxResults: number = 5,
  ): Promise<Suggestion[]> {
    if (!SYSTEM_CONFIGS.servicenow.enabled) {
      return this.getMockServiceNowResults(query, maxResults);
    }

    try {
      const auth = `Basic ${Buffer.from(`${SYSTEM_CONFIGS.servicenow.username}:${SYSTEM_CONFIGS.servicenow.apiKey}`).toString("base64")}`;
      const url = `${SYSTEM_CONFIGS.servicenow.baseUrl}/api/now/table/kb_knowledge?sysparm_query=short_descriptionLIKE${encodeURIComponent(query)}^ORtextLIKE${encodeURIComponent(query)}&sysparm_fields=sys_id,short_description,text,sys_created_on,sys_created_by&sysparm_limit=${maxResults}`;
      const response = await fetch(url, {
        headers: {
          Authorization: auth,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });
      if (!response.ok) throw new Error(`ServiceNow ${response.status}`);
      const data = await response.json();
      const records = (data.result || []).map((r: any) => ({
        sys_id: r.sys_id,
        short_description: r.short_description,
        text: r.text,
        sys_created_on: r.sys_created_on,
        sys_created_by: r.sys_created_by,
      }));
      const mapped = records.slice(0, maxResults).map((article: any) => ({
        system: "SN_KB" as const,
        title: article.short_description,
        id: article.sys_id,
        snippet: article.text,
        link: `/solution/${article.sys_id}`,
        external_url: `${SYSTEM_CONFIGS.servicenow.baseUrl}/kb_view.do?sysparm_article=${article.sys_id}`,
        icon: "📚",
        actions: ["link", "view"],
        created_date: article.sys_created_on,
        author: article.sys_created_by,
      }));
      return mapped.length ? mapped : this.getMockServiceNowResults(query, maxResults);
    } catch (error) {
      console.error("Error searching ServiceNow KB:", error);
      return [];
    }
  }

  // Mock data generators for demo purposes
  private static getMockJiraResults(
    query: string,
    maxResults: number,
  ): Suggestion[] {
    const mockIssues = [
      {
        key: "JIRA-2031",
        summary: "Portal Authentication Issues After Patch Deployment",
        description:
          "Users report 401 errors following security patch 4.3.2. Root cause identified as expired SSL certificates. Resolution: Updated SSL certificates and cleared browser cache. Affects 50% of users.",
        created: "2024-01-15T10:30:00Z",
        reporter: "portal.team",
      },
      {
        key: "JIRA-1987",
        summary: "LDAP Authentication Failures During Peak Hours",
        description:
          "Intermittent authentication failures during high traffic periods. Investigation revealed connection pool exhaustion. Solution: Increased LDAP connection pool size and implemented connection retry logic.",
        created: "2024-01-12T14:20:00Z",
        reporter: "identity.team",
      },
      {
        key: "JIRA-2156",
        summary: "SSO Token Expiration Causing Login Loops",
        description:
          "Users experiencing login loops due to SSO token expiration not being handled properly. Fixed by implementing proper token refresh mechanism and session management.",
        created: "2024-01-18T09:15:00Z",
        reporter: "sso.team",
      },
      {
        key: "JIRA-1892",
        summary: "Multi-Factor Authentication Bypass Issue",
        description:
          "Critical security issue where MFA could be bypassed under certain conditions. Immediate patch deployed to fix authentication flow validation.",
        created: "2024-01-10T16:45:00Z",
        reporter: "security.team",
      },
      {
        key: "JIRA-2241",
        summary: "API Authentication Rate Limiting",
        description:
          "Third-party API calls failing due to authentication rate limits. Implemented exponential backoff retry logic and request queuing mechanism.",
        created: "2024-01-22T11:30:00Z",
        reporter: "api.team",
      },
      {
        key: "JIRA-2019",
        summary: "Password Reset Email Delivery Failures",
        description:
          "Password reset emails not being delivered to users. Root cause: SMTP configuration issue after email provider change. Fixed SMTP settings and implemented delivery monitoring.",
        created: "2024-01-14T13:20:00Z",
        reporter: "email.team",
      },
      {
        key: "JIRA-2088",
        summary: "Session Timeout Configuration Issues",
        description:
          "Users being logged out too frequently due to aggressive session timeout settings. Adjusted timeout values and implemented user preference for session duration.",
        created: "2024-01-16T15:10:00Z",
        reporter: "portal.team",
      },
      {
        key: "JIRA-1934",
        summary: "OAuth Provider Integration Problems",
        description:
          "Google OAuth integration failing after provider API changes. Updated OAuth configuration and implemented fallback authentication methods.",
        created: "2024-01-08T12:00:00Z",
        reporter: "oauth.team",
      },
    ];

    // Filter and randomize results based on query relevance
    const relevantIssues = mockIssues.filter(
      (issue) =>
        this.calculateRelevance(
          query,
          issue.summary + " " + issue.description,
        ) > 0.3, // Higher threshold for better relevance
    );

    // Sort by relevance score
    const sortedIssues = relevantIssues.sort((a, b) => {
      const scoreA = this.calculateRelevance(query, a.summary + " " + a.description);
      const scoreB = this.calculateRelevance(query, b.summary + " " + b.description);
      return scoreB - scoreA;
    });

    return sortedIssues
      .slice(0, Math.min(maxResults, sortedIssues.length))
      .map((issue) => ({
        system: "JIRA" as const,
        title: issue.summary,
        id: issue.key,
        snippet: issue.description,
        link: `/solution/${issue.key}`,
        external_url: `https://demo.atlassian.net/browse/${issue.key}`,
        icon: "🔧",
        actions: ["link", "view"],
        relevance_score: this.calculateRelevance(
          query,
          issue.summary + " " + issue.description,
        ),
        created_date: issue.created,
        author: issue.reporter,
      }));
  }

  private static getMockConfluenceResults(
    query: string,
    maxResults: number,
  ): Suggestion[] {
    const mockPages = [
      {
        id: "CONF-445",
        title: "Authentication Troubleshooting Guide",
        excerpt:
          "Comprehensive step-by-step guide for resolving common 401 authentication errors in portal applications. Includes SSL certificate validation, session management, and LDAP configuration troubleshooting.",
        created: "2024-01-08T11:15:00Z",
        author: "it.admin",
      },
      {
        id: "CONF-892",
        title: "Patch Deployment Best Practices",
        excerpt:
          "Guidelines for deploying security patches while minimizing user impact. Includes rollback procedures, testing protocols, and user communication strategies.",
        created: "2024-01-05T16:45:00Z",
        author: "deploy.team",
      },
      {
        id: "CONF-567",
        title: "SSO Configuration and Troubleshooting",
        excerpt:
          "Detailed documentation on Single Sign-On setup, configuration, and common troubleshooting scenarios. Covers SAML, OAuth, and OpenID Connect implementations.",
        created: "2024-01-12T09:30:00Z",
        author: "sso.team",
      },
      {
        id: "CONF-734",
        title: "Multi-Factor Authentication Implementation Guide",
        excerpt:
          "Complete guide for implementing MFA across enterprise applications. Includes TOTP, SMS, and hardware token configurations with security best practices.",
        created: "2024-01-15T14:20:00Z",
        author: "security.team",
      },
      {
        id: "CONF-901",
        title: "LDAP Integration and User Provisioning",
        excerpt:
          "Comprehensive guide for LDAP integration, user provisioning, and group synchronization. Includes troubleshooting connection issues and performance optimization.",
        created: "2024-01-10T10:45:00Z",
        author: "identity.team",
      },
      {
        id: "CONF-623",
        title: "API Authentication and Authorization",
        excerpt:
          "Best practices for implementing secure API authentication using JWT tokens, API keys, and OAuth 2.0. Includes rate limiting and security considerations.",
        created: "2024-01-18T13:15:00Z",
        author: "api.team",
      },
      {
        id: "CONF-456",
        title: "Session Management and Security",
        excerpt:
          "Guidelines for implementing secure session management, including timeout policies, session storage, and security headers configuration.",
        created: "2024-01-20T11:00:00Z",
        author: "security.team",
      },
      {
        id: "CONF-789",
        title: "Password Policy and Reset Procedures",
        excerpt:
          "Enterprise password policy guidelines and automated password reset procedures. Includes security requirements and user experience considerations.",
        created: "2024-01-22T15:30:00Z",
        author: "identity.team",
      },
    ];

    // Filter by relevance and sort
    const relevantPages = mockPages.filter(
      (page) =>
        this.calculateRelevance(query, page.title + " " + page.excerpt) > 0.3,
    );

    const sortedPages = relevantPages.sort((a, b) => {
      const scoreA = this.calculateRelevance(query, a.title + " " + a.excerpt);
      const scoreB = this.calculateRelevance(query, b.title + " " + b.excerpt);
      return scoreB - scoreA;
    });

    return sortedPages.slice(0, maxResults).map((page) => ({
      system: "CONFLUENCE" as const,
      title: page.title,
      id: page.id,
      snippet: page.excerpt,
      link: `/solution/${page.id}`,
      external_url: `${SYSTEM_CONFIGS.confluence.baseUrl}/display/IT/${page.id}`,
      icon: "📋",
      actions: ["link", "view"],
      relevance_score: this.calculateRelevance(
        query,
        page.title + " " + page.excerpt,
      ),
      created_date: page.created,
      author: page.author,
    }));
  }

  private static getMockGitHubResults(
    query: string,
    maxResults: number,
  ): Suggestion[] {
    const mockIssues = [
      {
        number: 789,
        title: "Fix: Portal 401 errors after security update",
        body: "PR #789: Updated authentication middleware to handle new security headers after patch 4.3.2. Resolves session timeout issues and implements proper token refresh mechanism.",
        created_at: "2024-01-12T13:20:00Z",
        user: "devops-team",
      },
      {
        number: 654,
        title: "Authentication service improvements",
        body: "Enhance error handling for authentication failures. Better logging and user feedback for 401/403 errors. Includes retry logic and circuit breaker pattern.",
        created_at: "2024-01-07T09:10:00Z",
        user: "security-team",
      },
      {
        number: 823,
        title: "LDAP connection pool optimization",
        body: "Optimize LDAP connection pool settings to prevent authentication failures during peak hours. Implements connection pooling and retry mechanisms.",
        created_at: "2024-01-15T11:45:00Z",
        user: "identity-team",
      },
      {
        number: 756,
        title: "SSO token refresh implementation",
        body: "Implement automatic SSO token refresh to prevent login loops. Handles token expiration gracefully and maintains user session continuity.",
        created_at: "2024-01-10T14:30:00Z",
        user: "sso-team",
      },
      {
        number: 891,
        title: "MFA bypass vulnerability fix",
        body: "Critical security fix: Patch MFA bypass vulnerability in authentication flow. Implements proper validation and security checks.",
        created_at: "2024-01-08T16:20:00Z",
        user: "security-team",
      },
      {
        number: 734,
        title: "Password reset email delivery fix",
        body: "Fix SMTP configuration issues causing password reset emails to fail. Implements delivery monitoring and fallback mechanisms.",
        created_at: "2024-01-14T10:15:00Z",
        user: "email-team",
      },
      {
        number: 667,
        title: "OAuth provider integration update",
        body: "Update OAuth provider integration to handle API changes. Implements fallback authentication methods and improved error handling.",
        created_at: "2024-01-11T12:00:00Z",
        user: "oauth-team",
      },
      {
        number: 912,
        title: "Session timeout configuration",
        body: "Implement configurable session timeout settings. Allows users to customize session duration and implements proper session cleanup.",
        created_at: "2024-01-16T15:45:00Z",
        user: "portal-team",
      },
    ];

    // Filter by relevance and sort
    const relevantIssues = mockIssues.filter(
      (issue) =>
        this.calculateRelevance(query, issue.title + " " + issue.body) > 0.3,
    );

    const sortedIssues = relevantIssues.sort((a, b) => {
      const scoreA = this.calculateRelevance(query, a.title + " " + a.body);
      const scoreB = this.calculateRelevance(query, b.title + " " + b.body);
      return scoreB - scoreA;
    });

    return sortedIssues.slice(0, maxResults).map((issue) => ({
      system: "GITHUB" as const,
      title: issue.title,
      id: `ISSUE-${issue.number}`,
      snippet: issue.body,
      link: `/solution/ISSUE-${issue.number}`,
      external_url: `https://github.com/company/portal/issues/${issue.number}`,
      icon: "🐙",
      actions: ["link", "view"],
      relevance_score: this.calculateRelevance(
        query,
        issue.title + " " + issue.body,
      ),
      created_date: issue.created_at,
      author: issue.user,
    }));
  }

  private static getMockServiceNowResults(
    query: string,
    maxResults: number,
  ): Suggestion[] {
    const mockArticles = [
      {
        sys_id: "KB001234",
        short_description: "Portal Authentication Error Resolution",
        text: "Comprehensive guide for resolving portal authentication failures including SSL certificate renewal, LDAP configuration updates, and session management troubleshooting.",
        sys_created_on: "2024-01-03T10:30:00Z",
        sys_created_by: "kb.admin",
      },
      {
        sys_id: "KB001567",
        short_description: "SSO Configuration Best Practices",
        text: "Step-by-step guide for configuring Single Sign-On across enterprise applications. Includes SAML setup, OAuth configuration, and troubleshooting common SSO issues.",
        sys_created_on: "2024-01-05T14:20:00Z",
        sys_created_by: "sso.team",
      },
      {
        sys_id: "KB001892",
        short_description: "Multi-Factor Authentication Setup Guide",
        text: "Complete implementation guide for MFA across all enterprise systems. Covers TOTP, SMS, and hardware token configurations with security best practices.",
        sys_created_on: "2024-01-08T09:15:00Z",
        sys_created_by: "security.team",
      },
      {
        sys_id: "KB002134",
        short_description: "LDAP Integration Troubleshooting",
        text: "Troubleshooting guide for LDAP integration issues including connection problems, authentication failures, and user provisioning errors.",
        sys_created_on: "2024-01-10T11:45:00Z",
        sys_created_by: "identity.team",
      },
      {
        sys_id: "KB002456",
        short_description: "Password Reset Process Documentation",
        text: "Standard operating procedures for password reset processes including automated workflows, security requirements, and user communication protocols.",
        sys_created_on: "2024-01-12T16:30:00Z",
        sys_created_by: "helpdesk.team",
      },
      {
        sys_id: "KB002789",
        short_description: "API Authentication Security Guidelines",
        text: "Security guidelines for implementing API authentication including JWT tokens, API keys, rate limiting, and OAuth 2.0 best practices.",
        sys_created_on: "2024-01-15T13:20:00Z",
        sys_created_by: "api.team",
      },
      {
        sys_id: "KB003012",
        short_description: "Session Management Configuration",
        text: "Configuration guide for secure session management including timeout policies, session storage, security headers, and user experience optimization.",
        sys_created_on: "2024-01-18T10:00:00Z",
        sys_created_by: "portal.team",
      },
      {
        sys_id: "KB003345",
        short_description: "OAuth Provider Integration Guide",
        text: "Integration guide for OAuth providers including Google, Microsoft, and custom providers. Covers configuration, troubleshooting, and fallback mechanisms.",
        sys_created_on: "2024-01-20T15:45:00Z",
        sys_created_by: "oauth.team",
      },
    ];

    // Filter by relevance and sort
    const relevantArticles = mockArticles.filter(
      (article) =>
        this.calculateRelevance(query, article.short_description + " " + article.text) > 0.3,
    );

    const sortedArticles = relevantArticles.sort((a, b) => {
      const scoreA = this.calculateRelevance(query, a.short_description + " " + a.text);
      const scoreB = this.calculateRelevance(query, b.short_description + " " + b.text);
      return scoreB - scoreA;
    });

    return sortedArticles.slice(0, maxResults).map((article) => ({
      system: "SN_KB" as const,
      title: article.short_description,
      id: article.sys_id,
      snippet: article.text,
      link: `/solution/${article.sys_id}`,
      external_url: `https://demo.servicenow.com/kb_view.do?sysparm_article=${article.sys_id}`,
      icon: "📚",
      actions: ["link", "view"],
      relevance_score: this.calculateRelevance(
        query,
        article.short_description + " " + article.text,
      ),
      created_date: article.sys_created_on,
      author: article.sys_created_by,
    }));
  }

  /**
   * Calculate relevance score based on keyword matches
   */
  private static calculateRelevance(query: string, content: string): number {
    const queryWords = query.toLowerCase().split(/\s+/);
    const contentLower = content.toLowerCase();

    let score = 0;
    queryWords.forEach((word) => {
      if (contentLower.includes(word)) {
        score += 1;
        // Bonus for exact word matches
        if (contentLower.includes(` ${word} `)) {
          score += 0.5;
        }
      }
    });

    return Math.round((score / queryWords.length) * 100) / 100;
  }
}
