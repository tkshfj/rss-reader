// FeedsList.test.tsx
import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import FeedsList from '../components/FeedsList';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/StackNavigator';

// Mock articleService
const mockFetchUserFeeds = jest.fn();
jest.mock('../services/articleService', () => ({
    fetchUserFeeds: (...args: any[]) => mockFetchUserFeeds(...args),
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
} as unknown as NativeStackNavigationProp<RootStackParamList, 'FeedsList'>;

describe('FeedsList Component', () => {
    const mockUserId = 'user-123';
    const mockFeeds = [
        { id: '1', user_id: mockUserId, title: 'Tech News', url: 'https://technews.com' },
        { id: '2', user_id: mockUserId, title: 'Sports Update', url: 'https://sportsupdate.com' },
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        mockFetchUserFeeds.mockResolvedValue([]);
    });

    test('renders loading indicator initially', async () => {
        mockFetchUserFeeds.mockReturnValue(new Promise(() => {}));
        const { getByTestId } = render(
            <NavigationContainer>
                <FeedsList navigation={mockNavigation} route={{ params: { userId: mockUserId } }} />
            </NavigationContainer>
        );
        expect(getByTestId('loading-indicator')).toBeTruthy();
    });

    test('renders feeds after fetching', async () => {
        mockFetchUserFeeds.mockResolvedValue(mockFeeds);

        const { getByText, queryByTestId } = render(
            <NavigationContainer>
                <FeedsList navigation={mockNavigation} route={{ params: { userId: mockUserId } }} />
            </NavigationContainer>
        );

        await waitFor(() => {
            expect(getByText('Tech News')).toBeTruthy();
            expect(getByText('Sports Update')).toBeTruthy();
        });

        expect(queryByTestId('loading-indicator')).toBeNull();
    });

    test('handles empty feeds list gracefully', async () => {
        mockFetchUserFeeds.mockResolvedValue([]);

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
        mockFetchUserFeeds.mockResolvedValue(mockFeeds);

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
});
