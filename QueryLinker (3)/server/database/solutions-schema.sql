-- Solutions database schema
-- This table stores solution data from all connected systems

CREATE TABLE IF NOT EXISTS solutions (
    id TEXT PRIMARY KEY,
    system TEXT NOT NULL, -- 'JIRA', 'GITHUB', 'CONFLUENCE', 'SN_KB'
    external_id TEXT NOT NULL, -- Original ID in the external system
    title TEXT NOT NULL,
    description TEXT,
    content TEXT, -- Full content/body of the solution
    snippet TEXT, -- Short description/summary
    status TEXT, -- Status in the original system
    priority TEXT,
    author TEXT,
    assignee TEXT,
    created_at DATETIME,
    updated_at DATETIME,
    resolved_at DATETIME,
    external_url TEXT, -- Original URL in external system
    tags TEXT, -- JSON array of tags
    resolution TEXT, -- Resolution/solution content
    steps TEXT, -- JSON array of resolution steps
    related_issues TEXT, -- JSON array of related issue IDs
    attachments TEXT, -- JSON array of attachment metadata
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    -- Search and indexing
    keywords TEXT, -- Extracted keywords for search
    category TEXT,
    severity TEXT,
    -- Sync metadata
    last_synced DATETIME DEFAULT CURRENT_TIMESTAMP,
    sync_status TEXT DEFAULT 'active', -- 'active', 'error', 'deleted'
    sync_error TEXT,
    -- Additional metadata
    metadata TEXT, -- JSON for system-specific data
    UNIQUE(system, external_id)
);

-- Index for fast searching
CREATE INDEX IF NOT EXISTS idx_solutions_search ON solutions(system, status, keywords);
CREATE INDEX IF NOT EXISTS idx_solutions_updated ON solutions(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_solutions_priority ON solutions(priority, created_at DESC);

-- Vector search: chunked solution text + JSON-encoded embeddings
CREATE TABLE IF NOT EXISTS solution_chunks (
    id TEXT PRIMARY KEY,
    solution_id TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    embedding TEXT, -- JSON array of floats (stored as TEXT for SQLite)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (solution_id) REFERENCES solutions(id)
);

CREATE INDEX IF NOT EXISTS idx_solution_chunks_solution_id ON solution_chunks(solution_id);
CREATE INDEX IF NOT EXISTS idx_solution_chunks_chunk_index ON solution_chunks(chunk_index);

-- Lightweight records schema to support the Express + SQLite edition
CREATE TABLE IF NOT EXISTS systems (
    system_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    base_url TEXT,
    auth_type TEXT,
    last_sync_at DATETIME
);

CREATE TABLE IF NOT EXISTS records (
    record_id INTEGER PRIMARY KEY AUTOINCREMENT,
    system_id INTEGER,
    external_id TEXT,
    title TEXT,
    body TEXT,
    tags TEXT,
    url TEXT,
    status TEXT,
    source_type TEXT,
    created_at DATETIME,
    updated_at DATETIME,
    UNIQUE(system_id, external_id)
);

CREATE TABLE IF NOT EXISTS record_embeddings (
    record_id INTEGER,
    vector TEXT, -- JSON array of floats
    model TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(record_id) REFERENCES records(record_id)
);

CREATE TABLE IF NOT EXISTS incidents (
    incident_id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    description TEXT,
    priority TEXT,
    service TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS incident_embeddings (
    incident_id INTEGER,
    vector TEXT, -- JSON array of floats
    model TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(incident_id) REFERENCES incidents(incident_id)
);

CREATE TABLE IF NOT EXISTS links (
    incident_id INTEGER,
    record_id INTEGER,
    similarity_score REAL,
    rank INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(incident_id) REFERENCES incidents(incident_id),
    FOREIGN KEY(record_id) REFERENCES records(record_id)
);

-- Table for tracking solution interactions
CREATE TABLE IF NOT EXISTS solution_interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    solution_id TEXT NOT NULL,
    user_id TEXT,
    interaction_type TEXT NOT NULL, -- 'view', 'link', 'vote', 'search'
    interaction_data TEXT, -- JSON data about the interaction
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (solution_id) REFERENCES solutions(id)
);

-- Table for solution-to-incident links
CREATE TABLE IF NOT EXISTS solution_incident_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    solution_id TEXT NOT NULL,
    incident_number TEXT NOT NULL,
    linked_by TEXT,
    linked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    effectiveness_rating INTEGER, -- 1-5 rating of how helpful this was
    feedback TEXT,
    FOREIGN KEY (solution_id) REFERENCES solutions(id)
);

-- Table for system sync configuration
CREATE TABLE IF NOT EXISTS system_sync_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    system TEXT NOT NULL UNIQUE,
    enabled BOOLEAN DEFAULT 1,
    api_endpoint TEXT,
    auth_config TEXT, -- JSON with auth details
    sync_interval INTEGER DEFAULT 300, -- seconds
    last_sync DATETIME,
    last_sync_status TEXT,
    last_sync_error TEXT,
    total_synced INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default sync configurations
INSERT OR IGNORE INTO system_sync_config (system, api_endpoint, sync_interval) VALUES 
('JIRA', 'https://api.atlassian.com', 300),
('GITHUB', 'https://api.github.com', 600),
('CONFLUENCE', 'https://api.atlassian.com', 900),
('SN_KB', 'https://instance.service-now.com/api', 1200);
