-- Initialize Knowledge Base with sample articles
INSERT OR IGNORE INTO knowledge_articles (kb_id, title, content, category, tags, author, priority, views, likes, rating) VALUES
('KB001', 'Resolving Database Connection Issues', 
'# Database Connection Troubleshooting Guide

## Overview
This guide provides step-by-step instructions for diagnosing and resolving database connectivity problems.

## Common Symptoms
- Connection timeouts
- Authentication failures
- Network connectivity errors

## Troubleshooting Steps

### 1. Check Network Connectivity

ping database-server.company.com
telnet database-server.company.com 5432


### 2. Verify Credentials
- Check username and password
- Verify database name
- Confirm user permissions

### 3. Connection Pool Settings
Review connection pool configuration:
- Maximum connections
- Connection timeout
- Idle timeout

### 4. Firewall Rules
Ensure proper firewall rules are in place:
- Database port (usually 5432 for PostgreSQL, 3306 for MySQL)
- Application server IP whitelist

## Resolution
Most database connection issues are resolved by:
1. Restarting the connection pool
2. Updating firewall rules
3. Refreshing authentication tokens

For persistent issues, contact the database team.',
'troubleshooting', 
'["database", "connection", "troubleshooting", "networking"]', 
'John Doe', 
'high', 
234, 
18, 
4.5),

('KB002', 'SSL Certificate Renewal Process',
'# SSL Certificate Renewal Guide

## Before You Begin
- Access to certificate management system
- Administrative privileges
- Backup of current certificates

## Renewal Process

### 1. Generate Certificate Signing Request (CSR)

openssl req -new -newkey rsa:2048 -nodes -keyout server.key -out server.csr
```

### 2. Submit CSR to Certificate Authority
- Login to CA portal
- Submit CSR
- Validate domain ownership

### 3. Download and Install Certificate
```bash
# Copy certificate files
cp server.crt /etc/ssl/certs/
cp server.key /etc/ssl/private/
```

### 4. Update Configuration
Update web server configuration to use new certificates.

### 5. Test Certificate
```bash
openssl x509 -in server.crt -text -noout
```

## Post-Renewal Tasks
- Update monitoring systems
- Notify stakeholders
- Schedule calendar reminder for next renewal',
'how-to',
'["ssl", "security", "certificates", "renewal"]',
'Jane Smith',
'medium',
156,
12,
4.2),

('KB003', 'Network Firewall Configuration Best Practices',
'# Firewall Configuration Best Practices

## Security Principles
1. **Principle of Least Privilege**: Only allow necessary traffic
2. **Defense in Depth**: Multiple layers of security
3. **Regular Auditing**: Review and update rules periodically

## Configuration Guidelines

### Inbound Rules
- Block all traffic by default
- Allow specific services on specific ports
- Use source IP restrictions where possible

### Outbound Rules
- Control egress traffic
- Monitor for data exfiltration
- Log suspicious activity

### Rule Management
- Document all rules
- Regular rule review and cleanup
- Version control for configurations

## Monitoring and Logging
- Enable comprehensive logging
- Set up alerts for policy violations
- Regular log analysis

## Compliance Considerations
Ensure firewall configuration meets:
- Industry regulations (PCI DSS, HIPAA, etc.)
- Company security policies
- Audit requirements',
'best-practices',
'["network", "firewall", "security", "compliance"]',
'Mike Wilson',
'high',
89,
8,
4.7),

('KB004', 'Authentication Service Timeout Issues',
'# Authentication Service Timeout Issues

## Problem Description
Users experiencing timeout errors when attempting to authenticate with the central authentication service.

## Known Causes
1. **Network latency** between client and auth server
2. **Database performance** issues on auth backend
3. **Load balancer** configuration problems
4. **Session management** conflicts

## Immediate Workarounds
- Retry authentication after 30 seconds
- Clear browser cache and cookies
- Use alternative authentication method if available

## Permanent Solutions
### For Administrators
1. Increase timeout values in auth service configuration
2. Optimize database queries
3. Review load balancer health checks
4. Update session management settings

### Configuration Changes
```yaml
auth_service:
  timeout: 30s
  retry_attempts: 3
  connection_pool_size: 50
```

## Monitoring
Set up alerts for:
- Response time > 10 seconds
- Error rate > 5%
- Connection pool exhaustion',
'known-issues',
'["authentication", "timeout", "service", "troubleshooting"]',
'Sarah Johnson',
'medium',
67,
5,
3.8);

-- Initialize SLA Definitions
INSERT OR IGNORE INTO sla_definitions (name, priority_level, target_hours, description, is_active) VALUES
('Critical Incidents', 'critical', 1, 'Critical priority incidents must be resolved within 1 hour', 1),
('High Priority Issues', 'high', 4, 'High priority issues must be resolved within 4 hours', 1),
('Medium Priority Requests', 'medium', 24, 'Medium priority requests must be resolved within 24 hours', 1),
('Low Priority Tasks', 'low', 72, 'Low priority tasks must be resolved within 72 hours', 1);

-- Initialize some SLA Performance data
INSERT OR IGNORE INTO sla_performance (incident_id, sla_id, start_time, target_time, actual_resolution_time, status) VALUES
('INC0010001', 1, datetime('now', '-2 hours'), datetime('now', '-1 hour'), datetime('now', '-30 minutes'), 'met'),
('INC0010002', 2, datetime('now', '-6 hours'), datetime('now', '-2 hours'), datetime('now', '-1 hour'), 'met'),
('INC0010003', 1, datetime('now', '-3 hours'), datetime('now', '-2 hours'), NULL, 'breached'),
('INC0010004', 3, datetime('now', '-12 hours'), datetime('now', '+12 hours'), NULL, 'active'),
('INC0010005', 2, datetime('now', '-8 hours'), datetime('now', '-4 hours'), datetime('now', '-2 hours'), 'met'),
('INC0010006', 4, datetime('now', '-48 hours'), datetime('now', '+24 hours'), NULL, 'active'),
('INC0010007', 1, datetime('now', '-4 hours'), datetime('now', '-3 hours'), NULL, 'breached'),
('INC0010008', 3, datetime('now', '-18 hours'), datetime('now', '+6 hours'), NULL, 'active');

-- Sample users for testing (password is 'password123' for all)
-- Hash generated with: bcrypt.hashSync('password123', 12)
INSERT OR IGNORE INTO users (email, password_hash, full_name, role, email_verified, is_active, created_at)
VALUES
('admin@querylinker.com', '$2a$12$k8vFJl8aEqVxQZz1f9zc8eGr7cCz1LCUqYvQ2j9KJ7kFh9Oj5.FX.', 'Admin User', 'admin', 1, 1, datetime('now')),
('user@querylinker.com', '$2a$12$k8vFJl8aEqVxQZz1f9zc8eGr7cCz1LCUqYvQ2j9KJ7kFh9Oj5.FX.', 'Regular User', 'user', 1, 1, datetime('now')),
('test@example.com', '$2a$12$k8vFJl8aEqVxQZz1f9zc8eGr7cCz1LCUqYvQ2j9KJ7kFh9Oj5.FX.', 'Test User', 'user', 1, 1, datetime('now')),
('demo@demo.com', '$2a$12$k8vFJl8aEqVxQZz1f9zc8eGr7cCz1LCUqYvQ2j9KJ7kFh9Oj5.FX.', 'Demo User', 'user', 1, 1, datetime('now'));
