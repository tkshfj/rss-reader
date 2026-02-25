-- Database schema for Simple Reader using Supabase

-- Users table: Stores user account details and preferences
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,  -- Unique identifier for each user
    email TEXT UNIQUE NOT NULL,  -- User's email (must be unique)
    dark_mode BOOLEAN DEFAULT FALSE,  -- Preference for dark mode (default: off)
    auto_theme BOOLEAN DEFAULT TRUE,  -- Automatically adjust theme (default: on)
    font_size INTEGER DEFAULT 16,  -- Preferred font size (default: 16)
    line_spacing REAL DEFAULT 1.5,  -- Preferred line spacing (default: 1.5)
    notifications BOOLEAN DEFAULT FALSE,  -- Whether notifications are enabled
    max_articles_per_feed INTEGER DEFAULT 50,  -- Maximum articles to display per feed
    retention_days INTEGER DEFAULT 30,  -- Number of days to retain articles
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP  -- Timestamp of last update
);

-- Feeds table: Stores RSS feed subscriptions for users
CREATE TABLE IF NOT EXISTS feeds (
    id UUID PRIMARY KEY,  -- Unique identifier for each feed
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,  -- Foreign key linking to users
    title TEXT NOT NULL,  -- Title of the RSS feed
    url TEXT NOT NULL,  -- URL of the RSS feed
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP  -- Last time the feed was updated
);

-- Set default UUID generation for feeds.id to ensure unique IDs
ALTER TABLE feeds ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Articles table: Stores fetched articles from subscribed RSS feeds
CREATE TABLE IF NOT EXISTS articles (
    id UUID PRIMARY KEY,  -- Unique identifier for each article
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,  -- Foreign key linking to users
    feed_id UUID REFERENCES feeds(id) ON DELETE CASCADE,  -- Foreign key linking to feeds
    title TEXT NOT NULL,  -- Title of the article
    link TEXT NOT NULL,  -- URL of the article (must be unique per feed)
    summary TEXT,  -- Short summary or excerpt of the article
    content TEXT,  -- Full text content of the article (if available)
    content_html TEXT,  -- Stores full HTML content extracted from <content:encoded>
    image TEXT,  -- Image URL extracted from the article content
    media_image TEXT,  -- Image from <media:content> tag (if available)
    author TEXT,  -- Author(s) of the article, stored as a comma-separated string
    published TIMESTAMP,  -- Publication timestamp of the article
    guid TEXT UNIQUE,  -- Globally unique identifier for the article (nullable; app uses feed_id+link for dedup)
    identifier_type TEXT,  -- Identifier type (e.g., "pmid", "doi", etc.)
    bookmarked BOOLEAN DEFAULT FALSE,  -- Whether the article is bookmarked by the user
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP  -- Timestamp when the article was fetched
);

-- Set default UUID generation for articles.id to ensure unique IDs
ALTER TABLE articles ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Row-Level Security (RLS) policies
-- Users can only access their own data

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY users_own_data ON users
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

ALTER TABLE feeds ENABLE ROW LEVEL SECURITY;
CREATE POLICY feeds_own_data ON feeds
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY articles_own_data ON articles
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
