// articleService.ts — Business logic extracted from ArticleList component
import { supabase } from './supabase';
import Parser from 'react-native-rss-parser';

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
    feeds?: { title: string }[] | { title: string } | null;
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
        feed_title: Array.isArray(article.feeds)
            ? article.feeds.length > 0
                ? article.feeds[0].title
                : null
            : (article.feeds as { title: string })?.title || null,
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

export const fetchAndStoreRSS = async (feedId: string, feedUrl: string): Promise<void> => {
    const user = await supabase.auth.getUser();
    const userId = user.data?.user?.id || '';
    if (!userId) return;

    const response = await fetch(feedUrl);
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
        .filter(article => article !== null && !existingLinks.has(article!.link));

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
