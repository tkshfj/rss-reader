-- Users Table (For multi-user support)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,         
    email TEXT UNIQUE NOT NULL,  
    name TEXT,                   
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Settings Table
CREATE TABLE IF NOT EXISTS user_settings (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    dark_mode BOOLEAN DEFAULT FALSE,            
    auto_theme BOOLEAN DEFAULT TRUE,            
    font_size INTEGER DEFAULT 16,               
    line_spacing REAL DEFAULT 1.5,              
    notifications BOOLEAN DEFAULT TRUE,         
    article_retention_days INTEGER DEFAULT 30,  
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Feeds Table (RSS Feed Metadata)
CREATE TABLE IF NOT EXISTS feeds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE, 
    title TEXT NOT NULL,         
    url TEXT UNIQUE NOT NULL,    
    description TEXT,            
    image TEXT,                  
    link TEXT,                   
    language TEXT,               
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Articles Table (RSS Articles)
CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE, 
    feed_id INTEGER REFERENCES feeds(id) ON DELETE CASCADE,
    title TEXT NOT NULL,         
    link TEXT UNIQUE NOT NULL,   
    content TEXT,                
    summary TEXT,                
    image TEXT,                  
    author TEXT,                 
    published TIMESTAMP,         
    guid TEXT UNIQUE NOT NULL,   
    bookmarked BOOLEAN DEFAULT FALSE, 
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Read Status Table (Read/Starred Tracking)
CREATE TABLE IF NOT EXISTS read_status (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE, 
    article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
    read BOOLEAN DEFAULT FALSE,  
    starred BOOLEAN DEFAULT FALSE, 
    last_interacted TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- OPML Imports Table (Tracks OPML Imports)
CREATE TABLE IF NOT EXISTS opml_imports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE, 
    feed_url TEXT UNIQUE NOT NULL, 
    imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Migrations Table (Tracks Schema Changes)
CREATE TABLE IF NOT EXISTS migrations (
    version INTEGER PRIMARY KEY 
);
