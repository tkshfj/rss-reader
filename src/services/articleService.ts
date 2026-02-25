// articleService.ts — Business logic for articles and feeds
import { supabase } from './supabase';
import Parser from 'react-native-rss-parser';

// Shared Feed type used across components
export type Feed = {
    id: string;
    user_id: string;
    title: string;
    url: string;
    last_updated?: string;
};

// Shared Article type used across components
export type Article = {
    id: string;
    user_id: string;
    feed_id: string;
    title: string;
    summary: string;
    content: string;
    content_html: string;
    link: string;
    image: string | null;
    media_image: string | null;
    author: string;
    published: string;
    identifier_type: string | null;
    bookmarked: boolean;
    fetched_at: string;
    feed_title?: string | null;
    feeds?: { title: string } | null;
};

export const extractImageFromContent = (content: string | null): string | null => {
    if (!content) return null;
    const match = content.match(/<img[^>]+src=["']([^"']+)["']/);
    return match ? match[1] : null;
};

export const extractMediaImage = (enclosures: { url?: string; type?: string }[]): string | null => {
    if (!enclosures || enclosures.length === 0) return null;
    const mediaImage = enclosures.find(item => item.type?.startsWith("image/"));
    return mediaImage ? mediaImage.url || null : null;
};

export const truncateSummary = (summary: string, maxLength: number): string => {
    if (summary.length <= maxLength) return summary;
    return summary.substring(0, maxLength) + '...';
};

const formatTimestamp = (dateString: string | null): string | null => {
    if (!dateString) return null;
    const parsedDate = new Date(dateString);
    return isNaN(parsedDate.getTime()) ? null : parsedDate.toISOString();
};

export const getMaxArticlesPerFeed = async (userId: string): Promise<number> => {
    const { data, error } = await supabase
        .from('users')
        .select('max_articles_per_feed')
        .eq('id', userId)
        .single();

    if (error) throw new Error(error.message);
    return data?.max_articles_per_feed || 50;
};

export const getArticleCount = async (userId: string, feedId: string): Promise<number> => {
    let countQuery = supabase
        .from('articles')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);

    if (feedId !== 'all') countQuery = countQuery.eq('feed_id', feedId);

    const { count, error } = await countQuery;
    if (error) throw new Error(error.message);
    return count || 0;
};

export const fetchArticles = async (
    userId: string,
    feedId: string,
    maxArticles: number,
): Promise<Article[]> => {
    let query = supabase
        .from('articles')
        .select(`
            id, user_id, feed_id, title, summary, content, content_html, link, image, media_image,
            author, published, identifier_type, bookmarked, fetched_at,
            feeds(title)
        `)
        .eq('user_id', userId)
        .order('published', { ascending: false })
        .limit(maxArticles);

    if (feedId !== 'all') query = query.eq('feed_id', feedId);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return (data || []).map(article => ({
        ...article,
        feed_title: article.feeds?.title ?? null,
    }));
};

export const getFeedUrls = async (feedId: string, userId: string): Promise<{ id: string; url: string }[]> => {
    if (feedId === 'all') {
        const { data, error } = await supabase.from('feeds').select('id, url').eq('user_id', userId);
        if (error) throw new Error(error.message);
        return data || [];
    }

    const { data, error } = await supabase.from('feeds').select('id, url').eq('id', feedId).eq('user_id', userId).single();
    if (error) throw new Error(error.message);
    return data ? [data] : [];
};

export const fetchAndStoreRSS = async (feedId: string, feedUrl: string, userId: string): Promise<void> => {
    if (!userId) return;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    let response: Response;
    try {
        response = await fetch(feedUrl, { signal: controller.signal });
    } finally {
        clearTimeout(timeoutId);
    }
    if (!response.ok) return;

    const text = await response.text();
    const feed = await Parser.parse(text);

    const { data: existingArticles, error: fetchError } = await supabase
        .from('articles')
        .select('feed_id, link')
        .eq('feed_id', feedId)
        .eq('user_id', userId);

    if (fetchError) return;

    const existingLinks = new Set(existingArticles.map(article => article.link));

    const newArticles = feed.items
        .map(item => {
            const articleLink = item.links?.[0]?.url || '';
            if (!articleLink) return null;

            return {
                user_id: userId,
                feed_id: feedId,
                title: item.title || "Untitled",
                link: articleLink,
                summary: item.description || '',
                content: item.content || '',
                content_html: item.content || null,
                image: extractImageFromContent(item.content),
                media_image: extractMediaImage(item.enclosures || []),
                author: item.authors?.map(a => a.name).join(", ") || 'Unknown',
                published: formatTimestamp(item.published),
                bookmarked: false,
                fetched_at: new Date().toISOString(),
            };
        })
        .filter((article): article is NonNullable<typeof article> => article !== null && !existingLinks.has(article.link));

    if (newArticles.length === 0) return;

    const { error } = await supabase.from('articles').insert(newArticles);
    if (error) {
        console.error("Supabase insert error:", error.message);
    }
};

export const updateFeedTitle = async (feedId: string, newTitle: string, userId: string): Promise<boolean> => {
    const { error } = await supabase
        .from('feeds')
        .update({ title: newTitle })
        .eq('id', feedId)
        .eq('user_id', userId);

    if (error) {
        console.error('Error updating feed title:', error.message);
        return false;
    }
    return true;
};

export const deleteFeed = async (feedId: string, userId: string): Promise<boolean> => {
    const { error } = await supabase
        .from('feeds')
        .delete()
        .eq('id', feedId)
        .eq('user_id', userId);

    if (error) {
        console.error("Error deleting feed:", error.message);
        return false;
    }
    return true;
};

// Bookmark operations

export const getBookmarkStatus = async (articleId: string): Promise<boolean> => {
    const { data, error } = await supabase
        .from('articles')
        .select('bookmarked')
        .eq('id', articleId)
        .single();

    if (error) throw new Error(error.message);
    return data?.bookmarked ?? false;
};

export const setBookmarkStatus = async (articleId: string, bookmarked: boolean): Promise<void> => {
    const { error } = await supabase
        .from('articles')
        .update({ bookmarked })
        .eq('id', articleId);

    if (error) throw new Error(error.message);
};

// Fetch bookmarked articles for a user
export const fetchBookmarkedArticles = async (userId: string): Promise<Article[]> => {
    const { data, error } = await supabase
        .from('articles')
        .select(`
            id, user_id, feed_id, title, link, summary, content, content_html, image, media_image,
            author, published, identifier_type, bookmarked, fetched_at
        `)
        .eq('user_id', userId)
        .eq('bookmarked', true)
        .order('fetched_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
};

// Fetch all articles for a user (full fields, for Zustand store)
export const fetchAllArticles = async (userId: string): Promise<Article[]> => {
    const { data, error } = await supabase
        .from('articles')
        .select(`
            id, user_id, feed_id, title, link, summary, content, content_html, image, media_image,
            author, published, identifier_type, bookmarked, fetched_at
        `)
        .eq('user_id', userId)
        .order('published', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
};

// Fetch all feeds for a user (full details)
export const fetchUserFeeds = async (userId: string): Promise<Feed[]> => {
    const { data, error } = await supabase
        .from('feeds')
        .select('*')
        .eq('user_id', userId);

    if (error) throw new Error(error.message);
    return data || [];
};

// Check if a feed URL already exists for a user
export const checkFeedExists = async (userId: string, url: string): Promise<boolean> => {
    const { data, error } = await supabase
        .from('feeds')
        .select('id')
        .eq('user_id', userId)
        .eq('url', url)
        .single();

    if (error && error.code !== 'PGRST116') throw new Error(error.message);
    return !!data;
};

// Add a new feed for a user
export const addFeed = async (
    userId: string,
    title: string,
    url: string,
): Promise<{ success: boolean; data?: any; message?: string }> => {
    try {
        const exists = await checkFeedExists(userId, url);
        if (exists) return { success: false, message: "This feed is already added." };

        const { data, error } = await supabase
            .from('feeds')
            .insert([{ user_id: userId, title, url }])
            .select();

        if (error) throw new Error(error.message);
        return { success: true, data: data?.[0] };
    } catch (err) {
        console.error("Error adding feed:", err);
        return { success: false, message: err instanceof Error ? err.message : "An unknown error occurred" };
    }
};
