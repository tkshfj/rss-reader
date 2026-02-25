// FeedsList.test.tsx
import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import FeedsList from '../components/FeedsList';
import { supabase } from '../services/supabase';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/StackNavigator';
import { useFeedStore } from '../services/feedStore';
import { act } from '@testing-library/react-native';

// Mock Supabase calls
jest.mock('../services/supabase', () => ({
    supabase: {
        from: jest.fn(() => ({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            then: jest.fn(),
        })),
    },
}));

// Mock Navigation Prop
const mockNavigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
    replace: jest.fn(),
    reset: jest.fn(),
    setParams: jest.fn(),
    dispatch: jest.fn(),
    isFocused: jest.fn(),
    canGoBack: jest.fn(),
    getState: jest.fn(),
    setState: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
} as unknown as StackNavigationProp<RootStackParamList, 'FeedsList'>;

// Mock Zustand store
jest.mock('../services/feedStore', () => {
    const originalModule = jest.requireActual('../services/feedStore');
    return {
        ...originalModule,
        useFeedStore: jest.fn(),
        __esModule: true, // Ensure the module is treated as an ES module
    };
});

beforeEach(() => {
    act(() => {
        (useFeedStore as unknown as jest.Mock).mockReturnValue({
            articles: [],
            lastFetchTime: null,
            setArticles: jest.fn(),
            updateLastFetchTime: jest.fn(),
        });
    });
});

describe('FeedsList Component', () => {
    const mockUserId = 'user-123';
    const mockFeeds = [
        { id: '1', user_id: mockUserId, title: 'Tech News', url: 'https://technews.com' },
        { id: '2', user_id: mockUserId, title: 'Sports Update', url: 'https://sportsupdate.com' },
    ];

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('renders loading indicator initially', async () => {
        const { getByTestId } = render(
            <NavigationContainer>
                <FeedsList navigation={mockNavigation} route={{ params: { userId: mockUserId } }} />
            </NavigationContainer>
        );
        expect(getByTestId('loading-indicator')).toBeTruthy();
    });

    test('renders feeds after fetching from Supabase', async () => {
        (supabase.from as jest.Mock).mockReturnValueOnce({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            then: jest.fn((callback) => callback({ data: mockFeeds, error: null })),
        });

        const { getByText, queryByTestId } = render(
            <NavigationContainer>
                <FeedsList navigation={mockNavigation} route={{ params: { userId: mockUserId } }} />
            </NavigationContainer>
        );

        // Wait for async state update
        await waitFor(() => {
            expect(getByText('Tech News')).toBeTruthy();
            expect(getByText('Sports Update')).toBeTruthy();
        });

        // Ensure loading indicator disappears
        expect(queryByTestId('loading-indicator')).toBeNull();
    });

    test('handles empty feeds list gracefully', async () => {
        (supabase.from as jest.Mock).mockReturnValueOnce({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            then: jest.fn((callback) => callback({ data: [], error: null })),
        });

        const { getByText, queryByTestId } = render(
            <NavigationContainer>
                <FeedsList navigation={mockNavigation} route={{ params: { userId: mockUserId } }} />
            </NavigationContainer>
        );

        await waitFor(() => {
            expect(getByText('No feeds added yet.')).toBeTruthy();
        });

        expect(queryByTestId('loading-indicator')).toBeNull();
    });

    test('navigates to ArticleList when a feed is selected', async () => {
        (supabase.from as jest.Mock).mockReturnValueOnce({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            then: jest.fn((callback) => callback({ data: mockFeeds, error: null })),
        });

        const { getByText } = render(
            <NavigationContainer>
                <FeedsList navigation={mockNavigation} route={{ params: { userId: mockUserId } }} />
            </NavigationContainer>
        );

        await waitFor(() => expect(getByText('Tech News')).toBeTruthy());

        fireEvent.press(getByText('Tech News'));

        expect(mockNavigation.navigate).toHaveBeenCalledWith('ArticleList', {
            feedId: '1',
            feedTitle: 'Tech News',
            userId: mockUserId,
        });
    });

    test('prevents unnecessary article fetches if within 10 minutes', async () => {
        const setArticlesMock = jest.fn();
        const updateLastFetchTimeMock = jest.fn();
    
        (useFeedStore as unknown as jest.Mock).mockReturnValue({
            articles: [],
            lastFetchTime: Date.now(),
            setArticles: setArticlesMock,
            updateLastFetchTime: updateLastFetchTimeMock,
        });
    
        (supabase.from as jest.Mock).mockReturnValueOnce({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            then: jest.fn((callback) => callback({ data: [], error: null })),
        });
    
        const { getByText, queryByTestId } = render(
            <NavigationContainer>
                <FeedsList navigation={mockNavigation} route={{ params: { userId: mockUserId } }} />
            </NavigationContainer>
        );
    
        await waitFor(() => expect(getByText('No feeds added yet.')).toBeTruthy());
    
        expect(queryByTestId('loading-indicator')).toBeNull();
        expect(updateLastFetchTimeMock).not.toHaveBeenCalled();
        expect(setArticlesMock).not.toHaveBeenCalled();
    });

    test('fetches and stores new articles in Zustand', async () => {
        // Access the real Zustand store and delegate mock to it so the
        // component interacts with real state (previously the component
        // captured the real store via closure when it lived in the same file).
        const realModule = jest.requireActual('../services/feedStore') as any;
        const realStore = realModule.useFeedStore;

        // Reset real store state before test
        realStore.setState({ articles: [], lastFetchTime: null });

        // Delegate the mock to the real store hook so the component
        // subscribes to and mutates real Zustand state
        (useFeedStore as unknown as jest.Mock).mockImplementation(
            (...args: any[]) => realStore(...args)
        );

        const mockArticles = [
            { id: 'a1', feed_id: '1', title: 'AI Breakthrough', link: 'https://tech.com/ai', published: '2025-03-09' },
            { id: 'a2', feed_id: '2', title: 'Olympics 2025', link: 'https://sports.com/olympics', published: '2025-03-08' },
        ];

        // Provide mocks for all supabase.from() calls (order may vary between
        // useFocusEffect and useEffect). Each mock supports all chain methods.
        const makeArticlesMock = () => ({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            then: jest.fn((callback: any) => callback({ data: mockArticles, error: null })),
        });
        (supabase.from as jest.Mock)
            .mockReturnValueOnce(makeArticlesMock())
            .mockReturnValueOnce(makeArticlesMock())
            .mockReturnValueOnce(makeArticlesMock());

        render(
            <NavigationContainer>
                <FeedsList navigation={mockNavigation} route={{ params: { userId: mockUserId } }} />
            </NavigationContainer>
        );

        await waitFor(() => {
            const state = realStore.getState();
            expect(state.articles.length).toBeGreaterThan(0);
            expect(state.lastFetchTime).not.toBeNull();
        });
    });
});
