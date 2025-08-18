import { getDatabase } from "../database/database";
import { chunkText } from "./chunker";
import { embeddingService } from "./embedding";
import { vectorSearch } from "./vector-search";
import axios from "axios";

interface Solution {
  id: string;
  system: string;
  external_id: string;
  title: string;
  description: string;
  content: string;
  snippet: string;
  status: string;
  priority: string;
  author: string;
  assignee?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  external_url: string;
  tags: string[];
  resolution?: string;
  steps?: string[];
  related_issues?: string[];
  attachments?: { name: string; url: string }[];
  keywords: string;
  category: string;
  severity: string;
  metadata: any;
}

interface SystemConfig {
  system: string;
  enabled: boolean;
  api_endpoint: string;
  auth_config: any;
  sync_interval: number;
}

class SolutionSyncService {
  private async executeQuery(query: string, params?: any[]): Promise<any> {
    try {
      const { executeQuery } = await import("../database/database");
      return await executeQuery(query, params);
    } catch (error) {
      console.warn("[SolutionSync] Database not available:", error.message);
      throw new Error("Database not available");
    }
  }

  constructor() {
    this.startPeriodicSync();
  }

  private static TOPICS: { key: string; title: string; description: string; tags: string[] }[] = [
    { key: "ssl-auth", title: "Authentication fails after SSL rotation", description: "401/403 after cert rotation in gateway", tags: ["authentication","ssl","gateway","security"] },
    { key: "db-timeout", title: "Database connection timeouts", description: "Application experiencing DB timeouts during peak hours", tags: ["database","performance","timeout"] },
    { key: "dns-cache", title: "DNS cache stale entries", description: "Service cannot reach upstream due to stale DNS cache", tags: ["network","dns","cache"] },
    { key: "oauth-redirect", title: "OAuth redirect_uri mismatch", description: "Login fails due to incorrect redirect URI", tags: ["oauth","login","sso"] },
    { key: "jwt-clock-skew", title: "JWT validation clock skew", description: "Intermittent 401 due to clock skew in JWT validation", tags: ["jwt","auth","time"] },
    { key: "kafka-lag", title: "Kafka consumer lag spike", description: "Backlog builds during deploy window", tags: ["kafka","stream","throughput"] },
    { key: "redis-oom", title: "Redis OOM eviction", description: "Cache evictions causing 5xx spikes", tags: ["redis","cache","memory"] },
    { key: "tls-1-0", title: "Legacy TLS 1.0 blocked", description: "Old clients fail handshake after policy change", tags: ["tls","security","compatibility"] },
    { key: "container-crashloop", title: "Container CrashLoopBackOff", description: "Service pods restart due to bad config", tags: ["kubernetes","deploy","config"] },
    { key: "s3-perms", title: "S3 access denied after policy update", description: "Uploads failing with 403", tags: ["s3","permissions","cloud"] },
    { key: "nginx-502", title: "NGINX 502 from upstream", description: "LB returns 502 due to upstream timeout", tags: ["nginx","load-balancer","timeout"] },
    { key: "node-leak", title: "Node.js memory leak", description: "Heap growth under load", tags: ["nodejs","memory","leak"] },
    { key: "index-migration", title: "DB index missing after migration", description: "Slow queries due to missed index", tags: ["database","migration","index"] },
    { key: "rate-limit", title: "API rate limit exceeded", description: "Third-party API returning 429", tags: ["api","rate-limit","throttle"] },
    { key: "dns-ttl", title: "Low DNS TTL floods resolver", description: "Resolver overwhelmed after deploy", tags: ["dns","performance"] },
    { key: "csp-block", title: "CSP blocks script", description: "Frontend fails after CSP tighten", tags: ["csp","frontend","security"] },
  ];

  private buildSolution(system: 'JIRA'|'GITHUB'|'CONFLUENCE'|'SN_KB', topic: {key:string; title:string; description:string; tags:string[]}, idx: number): Solution {
    const now = Date.now();
    const created = new Date(now - (idx+1)*86400000).toISOString();
    const updated = new Date(now - (idx)*43200000).toISOString();
    const idPrefix = system.toLowerCase();
    const external = system === 'GITHUB' ? (1000 + idx) : `${topic.key.toUpperCase()}-${idx+1}`;
    const title = topic.title;
    const description = topic.description;
    const content = `# ${title}\n\nProblem: ${description}.\n\nResolution: See steps below.`;
    return {
      id: `${idPrefix}-${topic.key}-${idx+1}`,
      system,
      external_id: String(external),
      title,
      description,
      content,
      snippet: description,
      status: system === 'JIRA' ? 'Resolved' : 'Published',
      priority: idx % 3 === 0 ? 'Critical' : idx % 3 === 1 ? 'High' : 'Medium',
      author: 'system@querylinker.local',
      assignee: undefined,
      created_at: created,
      updated_at: updated,
      resolved_at: system === 'JIRA' || system === 'GITHUB' ? updated : undefined,
      external_url: `https://example.com/${system.toLowerCase()}/${external}`,
      tags: topic.tags,
      resolution: `Applied fix for ${topic.key}`,
      steps: [
        `Diagnose ${topic.key} issue`,
        `Apply remediation for ${topic.key}`,
        `Validate resolution and monitor`
      ],
      related_issues: [],
      attachments: [],
      keywords: `${title} ${topic.tags.join(' ')}`,
      category: 'Ops',
      severity: idx % 3 === 0 ? 'High' : 'Medium',
      metadata: { topic: topic.key }
    };
  }

  /**
   * Start periodic sync for all enabled systems
   */
  private startPeriodicSync() {
    // Initial sync after 5 seconds
    setTimeout(() => {
      this.syncAllSystems();
    }, 5000);

    // Then sync every 5 minutes
    setInterval(() => {
      this.syncAllSystems();
    }, 5 * 60 * 1000);
  }

  /**
   * Sync all enabled systems
   */
  async syncAllSystems(): Promise<void> {
    console.log("[SolutionSync] Starting sync for all systems...");
    
    try {
      const configs = this.getSystemConfigs();
      
      for (const config of configs) {
        if (config.enabled) {
          await this.syncSystem(config);
        }
      }
      
      console.log("[SolutionSync] Completed sync for all systems");
    } catch (error) {
      console.error("[SolutionSync] Error during sync:", error);
    }
  }

  /**
   * Sync a specific system
   */
  async syncSystem(config: SystemConfig): Promise<void> {
    console.log(`[SolutionSync] Syncing ${config.system}...`);
    
    try {
      let solutions: Solution[] = [];
      
      switch (config.system) {
        case 'JIRA':
          solutions = await this.syncJira(config);
          break;
        case 'GITHUB':
          solutions = await this.syncGitHub(config);
          break;
        case 'CONFLUENCE':
          solutions = await this.syncConfluence(config);
          break;
        case 'SN_KB':
          solutions = await this.syncServiceNow(config);
          break;
        default:
          console.log(`[SolutionSync] Unknown system: ${config.system}`);
          return;
      }

      // Store solutions in database
      for (const solution of solutions) {
        await this.storeSolution(solution);
      }

      // Update sync status
      this.updateSyncStatus(config.system, 'success', solutions.length);
      
      console.log(`[SolutionSync] ✅ Synced ${solutions.length} solutions from ${config.system}`);
    } catch (error) {
      console.error(`[SolutionSync] ❌ Error syncing ${config.system}:`, error);
      this.updateSyncStatus(config.system, 'error', 0, error.message);
    }
  }

  /**
   * Sync from Jira (mock implementation with realistic data)
   */
  private async syncJira(config: SystemConfig): Promise<Solution[]> {
    // Generate a broad set of realistic Jira issues across topics
    return SolutionSyncService.TOPICS.map((t, i) => this.buildSolution('JIRA', t, i));
  }

  /**
   * Sync from GitHub (mock implementation)
   */
  private async syncGitHub(config: SystemConfig): Promise<Solution[]> {
    return SolutionSyncService.TOPICS.map((t, i) => this.buildSolution('GITHUB', t, i));
  }

  /**
   * Sync from Confluence (mock implementation)
   */
  private async syncConfluence(config: SystemConfig): Promise<Solution[]> {
    return SolutionSyncService.TOPICS.map((t, i) => this.buildSolution('CONFLUENCE', t, i));
  }

  /**
   * Sync from ServiceNow KB (mock implementation)
   */
  private async syncServiceNow(config: SystemConfig): Promise<Solution[]> {
    return SolutionSyncService.TOPICS.map((t, i) => this.buildSolution('SN_KB', t, i));
  }

  /**
   * Store solution in database
   */
  private async storeSolution(solution: Solution): Promise<void> {
    const stmt = this.getDb().prepare(`
      INSERT OR REPLACE INTO solutions (
        id, system, external_id, title, description, content, snippet,
        status, priority, author, assignee, created_at, updated_at, resolved_at,
        external_url, tags, resolution, steps, related_issues, attachments,
        keywords, category, severity, metadata, last_synced, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 'active')
    `);

    stmt.run(
      solution.id,
      solution.system,
      solution.external_id,
      solution.title,
      solution.description,
      solution.content,
      solution.snippet,
      solution.status,
      solution.priority,
      solution.author,
      solution.assignee,
      solution.created_at,
      solution.updated_at,
      solution.resolved_at,
      solution.external_url,
      JSON.stringify(solution.tags),
      solution.resolution,
      JSON.stringify(solution.steps),
      JSON.stringify(solution.related_issues),
      JSON.stringify(solution.attachments),
      solution.keywords,
      solution.category,
      solution.severity,
      JSON.stringify(solution.metadata)
    );

    // Index into vector store (best-effort)
    try {
      const chunks = chunkText((solution.content || solution.description || solution.snippet || "").toString());
      const embeddings = await embeddingService.embed(chunks.map((c) => c.content));
      chunks.forEach((c, i) => vectorSearch.indexChunk(solution.id, c.index, c.content, embeddings[i]));
    } catch (e) {
      console.warn("[SolutionSync] chunk/embed index failed", e);
    }
  }

  /**
   * Get system configurations
   */
  private getSystemConfigs(): SystemConfig[] {
    try {
      const stmt = this.getDb().prepare(`
        SELECT system, enabled, api_endpoint, auth_config, sync_interval
        FROM system_sync_config
        WHERE enabled = 1
      `);

      return stmt.all().map(row => ({
        ...row,
        auth_config: row.auth_config ? JSON.parse(row.auth_config) : {}
      }));
    } catch (error) {
      console.warn("[SolutionSync] Database not available, returning empty configs:", error.message);
      return [];
    }
  }

  /**
   * Update sync status for a system
   */
  private updateSyncStatus(system: string, status: string, count: number, error?: string): void {
    const stmt = this.getDb().prepare(`
      UPDATE system_sync_config 
      SET last_sync = CURRENT_TIMESTAMP, 
          last_sync_status = ?, 
          last_sync_error = ?,
          total_synced = total_synced + ?
      WHERE system = ?
    `);

    stmt.run(status, error || null, count, system);
  }

  /**
   * Extract keywords from text
   */
  private extractKeywords(text: string): string {
    // Simple keyword extraction - in production, this could use NLP
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !['this', 'that', 'with', 'from', 'they', 'been', 'have', 'were', 'said', 'each', 'which', 'their', 'time', 'will', 'about', 'would', 'there', 'could', 'other'].includes(word));
    
    return [...new Set(words)].slice(0, 10).join(' ');
  }

  // Content generation methods for different systems
  private generateJiraContent(issue: any): string {
    return `# ${issue.summary}

**Issue Key:** ${issue.key}
**Status:** ${issue.status}
**Priority:** ${issue.priority}
**Assignee:** ${issue.assignee}
**Reporter:** ${issue.reporter}

## Description
${issue.description}

## Root Cause
The issue was identified as expired SSL certificates that were not updated during the patch deployment process.

## Resolution
${issue.resolution || 'Resolution in progress...'}

## Technical Details
- **Environment:** Production
- **Affected Systems:** Portal Authentication Service
- **Impact:** 45+ users experiencing authentication failures
- **Fix Version:** 4.3.3

## Next Steps
- Update SSL certificates on authentication servers
- Implement certificate expiration monitoring
- Add automated renewal process
`;
  }

  private generateJiraSteps(issue: any): string[] {
    if (issue.status === 'Resolved') {
      return [
        "Identify expired SSL certificates in authentication service",
        "Generate new certificates with proper expiration dates",
        "Deploy certificates to all authentication servers",
        "Restart authentication services in sequence",
        "Verify user authentication flows are working",
        "Set up monitoring for future certificate expiration"
      ];
    }
    return [
      "Investigate reported authentication issues",
      "Analyze system logs for error patterns",
      "Identify root cause of authentication failures",
      "Develop and test solution",
      "Deploy fix to production environment"
    ];
  }

  private generateGitHubContent(issue: any): string {
    return `# ${issue.title}

**Issue #${issue.number}**
**Status:** ${issue.state}
**Author:** ${issue.user.login}

## Description
${issue.body}

## Changes Made
- Updated authentication middleware to handle new security headers
- Fixed SSL certificate validation logic
- Added comprehensive error handling
- Implemented backward compatibility

## Code Changes
\`\`\`javascript
// Updated authentication middleware
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization || 
                req.headers['x-auth-token'] ||
                req.headers['x-security-token'];
  
  if (!token) {
    return res.status(401).json({ error: 'No authentication token provided' });
  }
  
  // Enhanced token validation
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256', 'RS256'],
      issuer: process.env.JWT_ISSUER
    });
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid authentication token' });
  }
};
\`\`\`

## Testing
- Unit tests updated and passing
- Integration tests cover new security headers
- Manual testing in staging environment completed
`;
  }

  private generateGitHubSteps(issue: any): string[] {
    return [
      "Update authentication middleware for new security headers",
      "Enhance SSL certificate configuration",
      "Add comprehensive test coverage",
      "Deploy to staging environment for testing",
      "Validate authentication flows work correctly",
      "Deploy to production with monitoring"
    ];
  }

  private generateConfluenceContent(page: any): string {
    return `# ${page.title}

## Overview
This guide provides comprehensive instructions for troubleshooting authentication issues in portal applications.

## Common Authentication Errors

### 401 Unauthorized Errors
Most commonly caused by:
- Expired or invalid credentials
- SSL certificate issues
- Misconfigured authentication services
- Network connectivity problems

### 403 Forbidden Errors
Usually indicates:
- Insufficient user permissions
- IP address restrictions
- Rate limiting applied
- Service account configuration issues

## Diagnostic Steps

### Step 1: Check Service Health
\`\`\`bash
# Verify authentication service status
curl -f https://auth.company.com/health
systemctl status auth-service
\`\`\`

### Step 2: Verify SSL Certificates
\`\`\`bash
# Check certificate expiration
openssl s_client -connect auth.company.com:443
openssl x509 -noout -dates -in /etc/ssl/certs/auth.pem
\`\`\`

### Step 3: Review Application Logs
- Check application logs: \`/var/log/auth-service/\`
- Review system logs: \`journalctl -u auth-service\`
- Examine network logs for connectivity issues

## Resolution Procedures

### SSL Certificate Issues
1. Verify certificate validity and expiration dates
2. Check certificate chain completeness
3. Ensure proper file permissions on certificates
4. Restart services after certificate updates

### Permission Issues
1. Verify user account status in directory
2. Check group memberships and role assignments
3. Review service account permissions
4. Validate API key configurations

## Prevention Measures
- Implement automated certificate renewal
- Set up expiration monitoring and alerts
- Maintain configuration baselines
- Regular security audits and testing
`;
  }

  private generateConfluenceSteps(page: any): string[] {
    return [
      "Check authentication service health and status",
      "Verify SSL certificate validity and expiration",
      "Review application and system logs for errors",
      "Test authentication from multiple sources",
      "Apply appropriate fixes based on root cause analysis",
      "Monitor system and validate resolution"
    ];
  }

  private generateServiceNowContent(article: any): string {
    return `# ${article.short_description}

**Article:** ${article.number}
**Category:** ${article.kb_category}
**Status:** ${article.workflow_state}
**Knowledge Base:** ${article.kb_knowledge_base}

## Problem Statement
Users experiencing authentication errors when accessing the company portal, particularly after recent security updates.

## Symptoms
- HTTP 401 Unauthorized errors
- "Authentication failed" messages in browser
- Unable to log in to portal applications
- Session timeouts occurring immediately after login

## Root Causes
1. **SSL Certificate Expiration:** Certificates expired during maintenance
2. **Security Header Changes:** New requirements not properly configured
3. **Token Validation Issues:** Authentication service misconfiguration
4. **Network Configuration:** Firewall or proxy issues

## Resolution Steps

### Immediate Actions
1. **Verify Service Status**
   - Check authentication service health endpoint
   - Confirm database connectivity
   - Validate load balancer configuration

2. **Check SSL Certificates**
   - Verify certificate expiration dates
   - Confirm certificate chain integrity
   - Test SSL handshake from external systems

### Detailed Resolution Process

#### Step 1: Service Health Verification
\`\`\`bash
# Check service status
curl -I https://portal.company.com/auth/health
systemctl status portal-auth
\`\`\`

#### Step 2: Certificate Analysis
\`\`\`bash
# Verify certificate details
openssl s_client -connect portal.company.com:443 -servername portal.company.com
\`\`\`

#### Step 3: Log Review
- **Location:** \`/var/log/portal/auth.log\`
- **Patterns:** Search for "401", "SSL", "certificate", "expired"
- **Time Range:** Focus on last 2-4 hours of activity

#### Step 4: User-Specific Troubleshooting
1. Clear browser cache and cookies
2. Try different browsers or devices
3. Test from different network locations
4. Verify user account status

## Prevention Measures
1. **Automated Certificate Management**
   - Set up automatic certificate renewal
   - Implement expiration monitoring (30, 14, 7 days)
   - Add alerts for certificate health

2. **Change Management Process**
   - Include authentication testing in deployments
   - Maintain configuration baselines
   - Document all security-related changes

3. **Monitoring and Alerting**
   - Authentication success/failure rate monitoring
   - SSL certificate health checks
   - Service availability metrics

## Escalation Path
- **Level 1:** Follow resolution steps above
- **Level 2:** Contact Platform Engineering (service issues)
- **Level 3:** Engage Security Team (configuration issues)
- **Level 4:** Contact Vendor Support (third-party auth)

## Related Articles
- KB001100: SSL Certificate Management
- KB001150: Portal Security Configuration
- KB001200: User Account Troubleshooting
`;
  }

  private generateServiceNowSteps(article: any): string[] {
    return [
      "Verify authentication service health and connectivity",
      "Check SSL certificate status and validity dates",
      "Review recent system changes and deployments",
      "Analyze application logs for error patterns",
      "Apply fixes based on identified root cause",
      "Test user authentication flows end-to-end",
      "Implement monitoring and prevention measures"
    ];
  }

  /**
   * Get solution by ID
   */
  getSolutionById(solutionId: string): any {
    const stmt = this.getDb().prepare(`
      SELECT * FROM solutions WHERE id = ?
    `);
    
    const solution = stmt.get(solutionId);
    if (solution) {
      // Parse JSON fields
      solution.tags = JSON.parse(solution.tags || '[]');
      solution.steps = JSON.parse(solution.steps || '[]');
      solution.related_issues = JSON.parse(solution.related_issues || '[]');
      solution.attachments = JSON.parse(solution.attachments || '[]');
      solution.metadata = JSON.parse(solution.metadata || '{}');
    }
    
    return solution;
  }

  /**
   * Search solutions
   */
  searchSolutions(query: string, system?: string, limit: number = 10): any[] {
    let sql = `
      SELECT * FROM solutions 
      WHERE (title LIKE ? OR description LIKE ? OR keywords LIKE ?)
      AND sync_status = 'active'
    `;
    let params = [`%${query}%`, `%${query}%`, `%${query}%`];
    
    if (system) {
      sql += ` AND system = ?`;
      params.push(system);
    }
    
    sql += ` ORDER BY updated_at DESC LIMIT ?`;
    params.push(limit);
    
    const stmt = this.db.prepare(sql);
    const solutions = stmt.all(...params);
    
    return solutions.map(solution => ({
      ...solution,
      tags: JSON.parse(solution.tags || '[]'),
      steps: JSON.parse(solution.steps || '[]'),
      related_issues: JSON.parse(solution.related_issues || '[]'),
      attachments: JSON.parse(solution.attachments || '[]'),
      metadata: JSON.parse(solution.metadata || '{}')
    }));
  }

  /**
   * Get sync status for all systems
   */
  getSyncStatus(): any[] {
    const stmt = this.getDb().prepare(`
      SELECT * FROM system_sync_config ORDER BY system
    `);
    
    return stmt.all();
  }
}

// Export singleton instance
export const solutionSyncService = new SolutionSyncService();
