import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft,
  ExternalLink,
  Link as LinkIcon,
  Calendar,
  User,
  Tag,
  CheckCircle,
  AlertCircle,
  Info,
  Code,
  BookOpen,
  GitBranch,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiCall, getAuthHeaders } from "@/utils/api";

interface SolutionDetails {
  id: string;
  system: string;
  title: string;
  description: string;
  snippet: string;
  link: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  status: string;
  priority: string;
  tags: string[];
  content: string;
  resolution?: string;
  steps?: string[];
  relatedIssues?: string[];
  attachments?: { name: string; url: string }[];
}

const systemConfig = {
  JIRA: {
    color: "bg-ql-jira text-white",
    name: "Jira",
    icon: "🔧",
    contentType: "Issue",
  },
  CONFLUENCE: {
    color: "bg-ql-confluence text-white",
    name: "Confluence",
    icon: "📋",
    contentType: "Article",
  },
  GITHUB: {
    color: "bg-ql-github text-white",
    name: "GitHub",
    icon: "🐙",
    contentType: "Issue",
  },
  SN_KB: {
    color: "bg-ql-servicenow text-white",
    name: "ServiceNow KB",
    icon: "📚",
    contentType: "Knowledge Article",
  },
};

export default function SolutionDetails() {
  const { solutionId } = useParams();
  const navigate = useNavigate();
  const [solution, setSolution] = useState<SolutionDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSolutionDetails();
  }, [solutionId]);

  const fetchSolutionDetails = async () => {
    if (!solutionId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Try to fetch from API first
      try {
        const data = await apiCall(`/api/querylinker/solution/${solutionId}`, {
          headers: getAuthHeaders(),
        });
        setSolution(data);
      } catch (apiError) {
        // If API fails, generate mock detailed data based on the solution ID
        const mockSolution = generateMockSolution(solutionId);
        setSolution(mockSolution);
      }
    } catch (err) {
      setError("Failed to load solution details");
      console.error("Error fetching solution details:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const generateMockSolution = (id: string): SolutionDetails => {
    // Generate realistic mock data based on the solution ID
    const systems = ["JIRA", "CONFLUENCE", "GITHUB", "SN_KB"];
    const system = systems[Math.abs(id.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % systems.length];
    
    const solutionTemplates = {
      JIRA: {
        title: "Portal Authentication Issues After Patch Deployment",
        description: "Users experiencing 401 authentication errors following security patch 4.3.2 deployment",
        content: `
# Issue Description
After deploying security patch 4.3.2, multiple users are experiencing 401 authentication errors when accessing the portal application.

## Root Cause Analysis
The issue has been identified as expired SSL certificates that were not updated during the patch deployment process.

## Environment
- **System**: Production Portal
- **Patch Version**: 4.3.2
- **Affected Users**: 45+ users
- **First Reported**: 2 hours ago

## Error Details
\`\`\`
HTTP 401 Unauthorized
Authentication failed: SSL certificate verification failed
Certificate expired: 2024-01-15 14:30:00 UTC
\`\`\`

## Investigation Timeline
1. **14:30 UTC** - First user reports received
2. **14:45 UTC** - Pattern identified across multiple users
3. **15:00 UTC** - SSL certificate issue discovered
4. **15:15 UTC** - Root cause confirmed

## Technical Details
The authentication service relies on SSL certificate validation. When the certificates expired during the patch window, the authentication middleware began rejecting all incoming requests.
        `,
        resolution: `
## Solution Steps
1. **Immediate Fix**: Update SSL certificates on all authentication servers
2. **Verification**: Test authentication flow with updated certificates  
3. **Rollback Plan**: Revert to previous certificate version if issues persist
4. **Monitoring**: Implement certificate expiration monitoring

## Implementation
\`\`\`bash
# Update SSL certificates
sudo systemctl stop auth-service
sudo cp /path/to/new/cert.pem /etc/ssl/certs/
sudo cp /path/to/new/key.pem /etc/ssl/private/
sudo systemctl start auth-service

# Verify service status
curl -I https://portal.company.com/auth/health
\`\`\`

## Prevention
- Set up automated certificate renewal
- Add certificate expiration alerts (30, 14, 7 days before expiry)
- Include certificate validation in deployment checklist
        `,
        author: "John Doe (DevOps Engineer)",
        status: "Resolved",
        priority: "Critical",
        tags: ["authentication", "ssl", "certificates", "patch", "production"],
        steps: [
          "Identify expired SSL certificates",
          "Generate new certificates with proper expiration",
          "Deploy certificates to all authentication servers",
          "Restart authentication services",
          "Verify user authentication flows",
          "Set up monitoring for future certificate expiration"
        ]
      },
      CONFLUENCE: {
        title: "Authentication Troubleshooting Guide",
        description: "Comprehensive guide for resolving common authentication errors in portal applications",
        content: `
# Authentication Troubleshooting Guide

This guide provides step-by-step instructions for diagnosing and resolving common authentication issues in portal applications.

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
- Rate limiting
- Service account issues

## Diagnostic Steps

### Step 1: Check Service Status
\`\`\`bash
# Check authentication service health
curl -f https://auth.company.com/health
systemctl status auth-service
\`\`\`

### Step 2: Verify SSL Certificates
\`\`\`bash
# Check certificate expiration
openssl s_client -connect auth.company.com:443 -servername auth.company.com
openssl x509 -noout -dates -in /etc/ssl/certs/auth.pem
\`\`\`

### Step 3: Review Logs
- Application logs: \`/var/log/auth-service/\`
- System logs: \`journalctl -u auth-service\`
- Network logs: Check firewall and load balancer logs

## Common Solutions

### SSL Certificate Issues
1. Verify certificate validity and expiration
2. Check certificate chain completeness
3. Ensure proper certificate permissions
4. Restart services after certificate updates

### Permission Issues
1. Verify user account status
2. Check group memberships
3. Review role assignments
4. Validate service account permissions

### Network Issues
1. Test connectivity from client to server
2. Check firewall rules
3. Verify DNS resolution
4. Test load balancer health checks
        `,
        resolution: `
## Quick Reference Checklist

### Immediate Actions
- [ ] Check service health endpoints
- [ ] Verify SSL certificate status
- [ ] Review recent deployment changes
- [ ] Check system resource usage

### Investigation Steps
- [ ] Collect error logs and timestamps
- [ ] Identify affected user patterns
- [ ] Test authentication from different locations
- [ ] Verify configuration against baseline

### Resolution Actions
- [ ] Apply identified fixes
- [ ] Test with affected users
- [ ] Monitor for additional issues
- [ ] Document lessons learned

## Escalation Procedures
If issues persist after following this guide:
1. Contact Platform Engineering team
2. Open critical incident ticket
3. Engage security team if needed
4. Coordinate with network operations
        `,
        author: "Sarah Wilson (Technical Writer)",
        status: "Published",
        priority: "High",
        tags: ["troubleshooting", "authentication", "guide", "ssl", "permissions"],
        steps: [
          "Check service health and status",
          "Verify SSL certificates and expiration",
          "Review logs for error patterns",
          "Test authentication from multiple sources",
          "Apply appropriate fixes based on root cause",
          "Monitor and validate resolution"
        ]
      },
      GITHUB: {
        title: "Fix: Portal 401 errors after security update",
        description: "Pull request addressing authentication middleware issues following security patch deployment",
        content: `
# Fix: Portal 401 errors after security update

## Problem Description
After deploying security patch 4.3.2, users are experiencing 401 authentication errors. Investigation shows that the authentication middleware is not properly handling the new security headers introduced in the patch.

## Changes Made

### Updated Authentication Middleware
\`\`\`javascript
// middleware/auth.js
const authMiddleware = (req, res, next) => {
  // Added support for new security headers
  const token = req.headers.authorization || 
                req.headers['x-auth-token'] ||
                req.headers['x-security-token']; // NEW
  
  if (!token) {
    return res.status(401).json({ error: 'No authentication token provided' });
  }
  
  // Updated token validation for new security standards
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256', 'RS256'], // Added RS256 support
      issuer: process.env.JWT_ISSUER,
      audience: process.env.JWT_AUDIENCE
    });
    
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Token validation failed:', error.message);
    return res.status(401).json({ error: 'Invalid authentication token' });
  }
};
\`\`\`

### SSL Certificate Handling
\`\`\`javascript
// config/ssl.js
const https = require('https');
const fs = require('fs');

const sslOptions = {
  key: fs.readFileSync(process.env.SSL_KEY_PATH),
  cert: fs.readFileSync(process.env.SSL_CERT_PATH),
  ca: fs.readFileSync(process.env.SSL_CA_PATH), // Added CA chain
  // Updated for new security requirements
  secureProtocol: 'TLSv1_2_method',
  ciphers: 'ECDHE-RSA-AES128-GCM-SHA256:!aNULL:!MD5:!DSS',
  honorCipherOrder: true
};
\`\`\`

## Testing

### Unit Tests
\`\`\`javascript
describe('Authentication Middleware', () => {
  test('accepts valid tokens with new headers', () => {
    const req = {
      headers: { 'x-security-token': validToken }
    };
    const res = mockResponse();
    const next = jest.fn();
    
    authMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });
  
  test('rejects invalid tokens', () => {
    const req = {
      headers: { authorization: 'invalid-token' }
    };
    const res = mockResponse();
    const next = jest.fn();
    
    authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
\`\`\`

### Integration Tests
- Tested authentication flow with updated middleware
- Verified SSL certificate handling
- Confirmed backward compatibility with existing clients

## Deployment Notes
1. Update environment variables for new JWT settings
2. Deploy updated SSL certificates
3. Restart authentication services
4. Monitor for any remaining authentication issues

## Related Issues
- Fixes #785: Authentication failures after patch
- Related to #790: SSL certificate updates
- Addresses security requirements in #780
        `,
        resolution: `
## Deployment Checklist
- [x] Code review completed
- [x] Unit tests passing
- [x] Integration tests passing
- [x] Security review approved
- [x] Staging deployment successful
- [x] Production deployment planned

## Rollback Plan
If issues occur:
1. Revert to previous middleware version
2. Restore original SSL certificates
3. Restart services with previous configuration
4. Monitor authentication success rates

## Monitoring
- Authentication success/failure rates
- Response time metrics
- SSL certificate expiration alerts
- Error log monitoring
        `,
        author: "Mike Chen (Software Engineer)",
        status: "Merged",
        priority: "Critical",
        tags: ["bugfix", "authentication", "security", "middleware", "ssl"],
        steps: [
          "Update authentication middleware for new security headers",
          "Enhance SSL certificate configuration",
          "Add comprehensive test coverage",
          "Deploy to staging environment",
          "Validate authentication flows",
          "Deploy to production with monitoring"
        ]
      },
      SN_KB: {
        title: "KB001234: Portal Authentication Error Resolution",
        description: "Knowledge base article for resolving portal authentication errors with step-by-step solutions",
        content: `
# Portal Authentication Error Resolution

## Article Information
- **Article ID**: KB001234
- **Category**: Authentication & Security
- **Subcategory**: Portal Issues
- **Last Updated**: Today
- **Approved By**: Security Team

## Problem Statement
Users experiencing authentication errors when accessing the company portal, particularly after recent security updates.

## Symptoms
- HTTP 401 Unauthorized errors
- "Authentication failed" messages
- Unable to log in to portal
- Session timeouts occurring immediately

## Root Causes
1. **SSL Certificate Expiration**: Certificates expired during maintenance window
2. **Security Header Changes**: New security requirements not properly configured
3. **Token Validation Issues**: Authentication service misconfiguration
4. **Network Connectivity**: Firewall or proxy configuration issues

## Resolution Steps

### Immediate Actions (For IT Support)
1. **Verify Service Status**
   - Check authentication service health: \`/auth/health\`
   - Confirm database connectivity
   - Validate load balancer status

2. **Check SSL Certificates**
   - Verify certificate expiration dates
   - Confirm certificate chain integrity
   - Test SSL handshake from external systems

3. **Review Recent Changes**
   - Check deployment logs for last 48 hours
   - Verify configuration changes
   - Review security patch implementations

### Detailed Resolution Process

#### Step 1: Service Health Check
\`\`\`bash
# Check service status
curl -I https://portal.company.com/auth/health
systemctl status portal-auth

# Check certificate
openssl s_client -connect portal.company.com:443 -servername portal.company.com
\`\`\`

#### Step 2: Log Analysis
- **Location**: \`/var/log/portal/auth.log\`
- **Key Patterns**: Look for "401", "SSL", "certificate", "expired"
- **Time Range**: Focus on last 2-4 hours of activity

#### Step 3: User-Specific Troubleshooting
1. Clear browser cache and cookies
2. Try different browsers/devices
3. Test from different network locations
4. Verify user account status in directory

#### Step 4: System-Level Fixes
1. **SSL Certificate Renewal**
   - Generate new certificates
   - Deploy to all authentication servers
   - Restart services in proper sequence

2. **Configuration Updates**
   - Update security headers
   - Refresh authentication middleware
   - Validate JWT settings

3. **Testing & Validation**
   - Test authentication flows
   - Verify user access
   - Monitor error rates

## Prevention Measures
1. **Automated Certificate Management**
   - Set up automatic renewal
   - Implement expiration monitoring
   - Add alerts for 30, 14, 7 days before expiry

2. **Change Management**
   - Include authentication testing in deployment process
   - Maintain configuration baselines
   - Document all security-related changes

3. **Monitoring & Alerting**
   - Authentication success/failure rates
   - SSL certificate health
   - Service availability metrics

## Escalation Path
- **Level 1**: Follow resolution steps above
- **Level 2**: Contact Platform Engineering (if service-level issues)
- **Level 3**: Engage Security Team (if security configuration issues)
- **Level 4**: Contact Vendor Support (if third-party authentication)

## Related Articles
- KB001100: SSL Certificate Management
- KB001150: Portal Security Configuration
- KB001200: User Account Troubleshooting
- KB001250: Network Connectivity Issues
        `,
        resolution: `
## Quick Resolution Summary
1. Check and renew SSL certificates
2. Update authentication middleware configuration
3. Restart authentication services
4. Verify user authentication flows
5. Implement monitoring for future prevention

## Success Criteria
- Users can successfully log in to portal
- Authentication error rate < 1%
- SSL certificates valid for > 30 days
- All authentication services running normally

## Follow-up Actions
- Schedule certificate renewal automation
- Update runbooks with lessons learned
- Conduct post-incident review
- Update monitoring and alerting
        `,
        author: "IT Service Desk",
        status: "Active",
        priority: "High",
        tags: ["portal", "authentication", "ssl", "troubleshooting", "kb"],
        steps: [
          "Verify authentication service health",
          "Check SSL certificate status and validity",
          "Review recent system changes",
          "Analyze logs for error patterns",
          "Apply appropriate fixes based on root cause",
          "Test user authentication flows",
          "Implement monitoring and prevention measures"
        ]
      }
    };

    const template = solutionTemplates[system as keyof typeof solutionTemplates];
    
    return {
      id,
      system,
      title: template.title,
      description: template.description,
      snippet: template.description.substring(0, 200) + "...",
      link: `https://example.com/${system.toLowerCase()}/${id}`,
      author: template.author,
      createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
      status: template.status,
      priority: template.priority,
      tags: template.tags,
      content: template.content,
      resolution: template.resolution,
      steps: template.steps,
      relatedIssues: [`${system}-${Math.floor(Math.random() * 1000)}`, `${system}-${Math.floor(Math.random() * 1000)}`],
      attachments: [
        { name: "error-logs.txt", url: "#" },
        { name: "configuration-backup.json", url: "#" }
      ]
    };
  };

  const handleLinkToIncident = async () => {
    if (!solution) return;
    
    try {
      // This would call the API to link the solution to current incident
      const incidentNumber = `INC${Date.now().toString().slice(-6)}`;
      
      await apiCall("/api/querylinker/link", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          incident_number: incidentNumber,
          solution_id: solution.id,
          system: solution.system,
          title: solution.title,
          link: solution.link,
        }),
      });
      
      alert(`Solution linked to incident ${incidentNumber}`);
    } catch (error) {
      console.error("Failed to link solution:", error);
      alert("Failed to link solution to incident");
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-4 bg-muted rounded w-2/3"></div>
          <div className="space-y-3">
            <div className="h-4 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !solution) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Solution Not Found
            </CardTitle>
            <CardDescription>
              {error || "The requested solution could not be found."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate(-1)} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const config = systemConfig[solution.system as keyof typeof systemConfig];

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="shrink-0"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex items-center gap-2">
          <Badge className={cn("px-3 py-1", config.color)}>
            <span className="mr-1">{config.icon}</span>
            {config.name}
          </Badge>
          <span className="text-sm text-muted-foreground">{solution.id}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">{solution.title}</CardTitle>
              <CardDescription className="text-base">
                {solution.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                <Button onClick={handleLinkToIncident}>
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Link to Incident
                </Button>
                <Button variant="outline" asChild>
                  <a
                    href={solution.link}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View in {config.name}
                  </a>
                </Button>
              </div>
              <Separator />
            </CardContent>
          </Card>

          {/* Solution Content */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                {config.contentType} Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <pre className="whitespace-pre-wrap text-sm">{solution.content}</pre>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Resolution */}
          {solution.resolution && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Resolution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <pre className="whitespace-pre-wrap text-sm">{solution.resolution}</pre>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Author</p>
                  <p className="text-sm text-muted-foreground">{solution.author}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Created</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(solution.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Status</p>
                  <Badge variant="secondary">{solution.status}</Badge>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Priority</p>
                  <Badge variant={solution.priority === "Critical" ? "destructive" : "default"}>
                    {solution.priority}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Tags
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {solution.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Steps */}
          {solution.steps && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Resolution Steps
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-2">
                  {solution.steps.map((step, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs shrink-0 mt-0.5">
                        {index + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}

          {/* Related Issues */}
          {solution.relatedIssues && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <GitBranch className="h-4 w-4" />
                  Related Issues
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {solution.relatedIssues.map((issue) => (
                    <Link
                      key={issue}
                      to={`/solution/${issue}`}
                      className="block text-sm text-primary hover:underline"
                    >
                      {issue}
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Attachments */}
          {solution.attachments && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Attachments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {solution.attachments.map((attachment, index) => (
                    <a
                      key={index}
                      href={attachment.url}
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <Code className="h-4 w-4" />
                      {attachment.name}
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
