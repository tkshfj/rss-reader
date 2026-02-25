// articleService.test.ts
import {
    extractImageFromContent,
    extractMediaImage,
    truncateSummary,
    getMaxArticlesPerFeed,
    getArticleCount,
    fetchArticles,
    getBookmarkStatus,
    setBookmarkStatus,
    fetchBookmarkedArticles,
    fetchUserFeeds,
    checkFeedExists,
    addFeed,
    updateFeedTitle,
    deleteFeed,
} from '../services/articleService';

// Mock supabase with chainable query builder
const mockSingle = jest.fn();
const mockLimit = jest.fn().mockReturnThis();
const mockOrder = jest.fn().mockReturnThis();
const mockEq = jest.fn().mockReturnThis();
const mockSelect = jest.fn().mockReturnThis();
const mockInsert = jest.fn().mockReturnThis();
const mockUpdate = jest.fn().mockReturnThis();
const mockDelete = jest.fn().mockReturnThis();

const mockChain = {
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    eq: mockEq,
    order: mockOrder,
    limit: mockLimit,
    single: mockSingle,
};

jest.mock('../services/supabase', () => ({
    supabase: {
        from: jest.fn(() => mockChain),
    },
}));

import { supabase } from '../services/supabase';

beforeEach(() => {
    jest.clearAllMocks();
    // Reset chain returns
    mockSelect.mockReturnThis();
    mockInsert.mockReturnThis();
    mockUpdate.mockReturnThis();
    mockDelete.mockReturnThis();
    mockEq.mockReturnThis();
    mockOrder.mockReturnThis();
    mockLimit.mockReturnThis();
});

// --- Pure function tests (no mocking needed) ---

describe('extractImageFromContent', () => {
    it('extracts image URL from HTML content', () => {
        const html = '<p>Text</p><img src="https://example.com/img.jpg" alt="test">';
        expect(extractImageFromContent(html)).toBe('https://example.com/img.jpg');
    });

    it('returns null for content without images', () => {
        expect(extractImageFromContent('<p>No images here</p>')).toBeNull();
    });

    it('returns null for null/empty content', () => {
        expect(extractImageFromContent(null)).toBeNull();
        expect(extractImageFromContent('')).toBeNull();
    });

    it('extracts first image when multiple exist', () => {
        const html = '<img src="https://first.jpg"><img src="https://second.jpg">';
        expect(extractImageFromContent(html)).toBe('https://first.jpg');
    });

    it('rejects non-http image URLs', () => {
        expect(extractImageFromContent('<img src="data:image/png;base64,abc">')).toBeNull();
        expect(extractImageFromContent('<img src="javascript:alert(1)">')).toBeNull();
    });
});

describe('extractMediaImage', () => {
    it('extracts image URL from enclosures', () => {
        const enclosures = [
            { url: 'https://example.com/image.jpg', type: 'image/jpeg' },
        ];
        expect(extractMediaImage(enclosures)).toBe('https://example.com/image.jpg');
    });

    it('skips non-image enclosures', () => {
        const enclosures = [
            { url: 'https://example.com/audio.mp3', type: 'audio/mpeg' },
        ];
        expect(extractMediaImage(enclosures)).toBeNull();
    });

    it('returns null for empty array', () => {
        expect(extractMediaImage([])).toBeNull();
    });

    it('returns null for null/undefined', () => {
        expect(extractMediaImage(null as any)).toBeNull();
    });
});

describe('truncateSummary', () => {
    it('returns full text if under max length', () => {
        expect(truncateSummary('Short text', 100)).toBe('Short text');
    });

    it('truncates and adds ellipsis if over max length', () => {
        expect(truncateSummary('Hello World', 5)).toBe('Hello...');
    });

    it('returns exact text if equal to max length', () => {
        expect(truncateSummary('12345', 5)).toBe('12345');
    });
});

// --- Service function tests (with Supabase mock) ---

describe('getMaxArticlesPerFeed', () => {
    it('returns max_articles_per_feed from user settings', async () => {
        mockSingle.mockResolvedValue({ data: { max_articles_per_feed: 100 }, error: null });
        const result = await getMaxArticlesPerFeed('user-1');
        expect(result).toBe(100);
        expect(supabase.from).toHaveBeenCalledWith('users');
    });

    it('returns default 50 when value is missing', async () => {
        mockSingle.mockResolvedValue({ data: { max_articles_per_feed: null }, error: null });
        const result = await getMaxArticlesPerFeed('user-1');
        expect(result).toBe(50);
    });

    it('throws on error', async () => {
        mockSingle.mockResolvedValue({ data: null, error: { message: 'DB error' } });
        await expect(getMaxArticlesPerFeed('user-1')).rejects.toThrow('DB error');
    });
});

describe('getArticleCount', () => {
    it('returns count for a specific feed', async () => {
        // Two .eq() calls: first returns chain, second (terminal) resolves
        mockEq
            .mockReturnValueOnce(mockChain)
            .mockResolvedValueOnce({ count: 42, error: null });
        const result = await getArticleCount('user-1', 'feed-1');
        expect(result).toBe(42);
    });

    it('returns count for all feeds', async () => {
        mockEq.mockResolvedValueOnce({ count: 100, error: null });
        const result = await getArticleCount('user-1', 'all');
        expect(result).toBe(100);
    });

    it('returns 0 when count is null', async () => {
        mockEq.mockResolvedValueOnce({ count: null, error: null });
        const result = await getArticleCount('user-1', 'all');
        expect(result).toBe(0);
    });
});

describe('getBookmarkStatus', () => {
    it('returns true when bookmarked', async () => {
        mockSingle.mockResolvedValue({ data: { bookmarked: true }, error: null });
        expect(await getBookmarkStatus('article-1', 'user-1')).toBe(true);
    });

    it('returns false when not bookmarked', async () => {
        mockSingle.mockResolvedValue({ data: { bookmarked: false }, error: null });
        expect(await getBookmarkStatus('article-1', 'user-1')).toBe(false);
    });

    it('throws on error', async () => {
        mockSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } });
        await expect(getBookmarkStatus('bad-id', 'user-1')).rejects.toThrow('Not found');
    });
});

describe('setBookmarkStatus', () => {
    it('updates bookmark status without error', async () => {
        mockEq
            .mockReturnValueOnce(mockChain)
            .mockResolvedValueOnce({ error: null });
        await expect(setBookmarkStatus('article-1', 'user-1', true)).resolves.toBeUndefined();
        expect(supabase.from).toHaveBeenCalledWith('articles');
    });

    it('throws on error', async () => {
        mockEq
            .mockReturnValueOnce(mockChain)
            .mockResolvedValueOnce({ error: { message: 'Update failed' } });
        await expect(setBookmarkStatus('article-1', 'user-1', true)).rejects.toThrow('Update failed');
    });
});

describe('fetchBookmarkedArticles', () => {
    it('returns bookmarked articles', async () => {
        const articles = [{ id: '1', title: 'Bookmarked Article' }];
        mockLimit.mockResolvedValueOnce({ data: articles, error: null });
        const result = await fetchBookmarkedArticles('user-1');
        expect(result).toEqual([{ id: '1', title: 'Bookmarked Article', feed_title: null }]);
    });

    it('returns empty array when no bookmarks', async () => {
        mockLimit.mockResolvedValueOnce({ data: [], error: null });
        const result = await fetchBookmarkedArticles('user-1');
        expect(result).toEqual([]);
    });

    it('throws on error', async () => {
        mockLimit.mockResolvedValueOnce({ data: null, error: { message: 'Query failed' } });
        await expect(fetchBookmarkedArticles('user-1')).rejects.toThrow('Query failed');
    });
});

describe('fetchUserFeeds', () => {
    it('returns feeds for user', async () => {
        const feeds = [{ id: '1', title: 'Feed 1', url: 'http://feed.com' }];
        mockEq.mockResolvedValueOnce({ data: feeds, error: null });
        const result = await fetchUserFeeds('user-1');
        expect(result).toEqual(feeds);
    });

    it('returns empty array when no feeds', async () => {
        mockEq.mockResolvedValueOnce({ data: null, error: null });
        const result = await fetchUserFeeds('user-1');
        expect(result).toEqual([]);
    });
});

describe('checkFeedExists', () => {
    it('returns true when feed exists', async () => {
        mockSingle.mockResolvedValue({ data: { id: '1' }, error: null });
        expect(await checkFeedExists('user-1', 'http://feed.com')).toBe(true);
    });

    it('returns false when feed does not exist', async () => {
        mockSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'No rows' } });
        expect(await checkFeedExists('user-1', 'http://feed.com')).toBe(false);
    });

    it('throws on unexpected error', async () => {
        mockSingle.mockResolvedValue({ data: null, error: { code: '42000', message: 'DB error' } });
        await expect(checkFeedExists('user-1', 'http://feed.com')).rejects.toThrow('DB error');
    });
});

describe('addFeed', () => {
    it('returns success when feed is added', async () => {
        // checkFeedExists: .select('id').eq().eq().single() — single is terminal
        mockSingle.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116', message: 'No rows' } });
        // First .select() (in checkFeedExists) returns chain, second .select() (after insert) resolves
        mockSelect
            .mockReturnValueOnce(mockChain)
            .mockResolvedValueOnce({ data: [{ id: 'new-1', title: 'New Feed' }], error: null });

        const result = await addFeed('user-1', 'New Feed', 'http://new-feed.com');
        expect(result.success).toBe(true);
        expect(result.data).toEqual({ id: 'new-1', title: 'New Feed' });
    });

    it('returns failure when feed already exists', async () => {
        mockSingle.mockResolvedValueOnce({ data: { id: '1' }, error: null });

        const result = await addFeed('user-1', 'Existing Feed', 'http://existing.com');
        expect(result.success).toBe(false);
        expect(result.message).toBe("This feed is already added.");
    });
});

describe('updateFeedTitle', () => {
    it('returns true on success', async () => {
        // .update().eq(id).eq(user_id) — two eq calls, second is terminal
        mockEq
            .mockReturnValueOnce(mockChain)
            .mockResolvedValueOnce({ error: null });
        expect(await updateFeedTitle('feed-1', 'New Title', 'user-1')).toBe(true);
    });

    it('returns false on error', async () => {
        mockEq
            .mockReturnValueOnce(mockChain)
            .mockResolvedValueOnce({ error: { message: 'Update failed' } });
        expect(await updateFeedTitle('feed-1', 'New Title', 'user-1')).toBe(false);
    });
});

describe('deleteFeed', () => {
    it('returns true on success', async () => {
        // .delete().eq(id).eq(user_id) — two eq calls, second is terminal
        mockEq
            .mockReturnValueOnce(mockChain)
            .mockResolvedValueOnce({ error: null });
        expect(await deleteFeed('feed-1', 'user-1')).toBe(true);
    });

    it('returns false on error', async () => {
        mockEq
            .mockReturnValueOnce(mockChain)
            .mockResolvedValueOnce({ error: { message: 'Delete failed' } });
        expect(await deleteFeed('feed-1', 'user-1')).toBe(false);
    });
});
