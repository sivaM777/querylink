-- IT Intelligence Feed Tables
CREATE TABLE IF NOT EXISTS intelligence_sources (
    source_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'github', 'stackoverflow', 'reddit', etc.
    api_endpoint TEXT,
    config_json TEXT, -- API keys, rate limits, etc.
    is_active BOOLEAN DEFAULT 1,
    last_sync DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS intelligence_items (
    item_id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id INTEGER NOT NULL,
    external_id VARCHAR(255) NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    url TEXT NOT NULL,
    author VARCHAR(255),
    published_at DATETIME,
    severity_score INTEGER DEFAULT 0, -- 0-100
    category VARCHAR(100),
    tags TEXT, -- JSON array
    metadata TEXT, -- JSON for source-specific data
    status VARCHAR(20) DEFAULT 'new', -- new, read, archived
    interaction_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (source_id) REFERENCES intelligence_sources(source_id),
    UNIQUE(source_id, external_id)
);

CREATE TABLE IF NOT EXISTS intelligence_interactions (
    interaction_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    action_type VARCHAR(50) NOT NULL, -- 'view', 'link_click', 'dismiss', 'bookmark'
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT, -- JSON for additional context
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (item_id) REFERENCES intelligence_items(item_id)
);

CREATE TABLE IF NOT EXISTS intelligence_categories (
    category_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) UNIQUE NOT NULL,
    color VARCHAR(7), -- Hex color
    icon VARCHAR(50),
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT 1
);
