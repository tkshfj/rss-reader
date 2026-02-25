// HomeScreen.test.tsx
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import HomeScreen from '../components/HomeScreen';
import { NavigationContainer } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { fetchFeeds } from '../services/utils';

// Mock Navigation — useFocusEffect defers callback via useEffect (like the real implementation)
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  const React = require('react');
  return {
    ...actualNav,
    useFocusEffect: jest.fn((callback) => {
      React.useEffect(() => { const cleanup = callback(); return cleanup; }, [callback]);
    }),
  };
});

// Mock fetchFeeds API
jest.mock('../services/utils', () => ({
  fetchFeeds: jest.fn(),
}));

// Mock navigation and route props
const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: jest.fn(),
  dispatch: jest.fn(),
  reset: jest.fn(),
  isFocused: jest.fn(),
  canGoBack: jest.fn(),
  getId: jest.fn(),
  getState: jest.fn(),
  setParams: jest.fn(),
  getParent: jest.fn(),
  addListener: jest.fn(),
  removeListener: jest.fn(),
} as any;

const mockRoute = {
  key: 'Home-key',
  name: 'Home' as const,
  params: { userId: 'user123' },
};

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default fetchFeeds to resolve with empty array
    (fetchFeeds as jest.Mock).mockResolvedValue([]);
  });

  const renderHomeScreen = async () => {
    const result = render(
      <NavigationContainer>
        <HomeScreen navigation={mockNavigation} route={mockRoute} />
      </NavigationContainer>
    );
    await act(async () => {});
    return result;
  };

  it('renders correctly with default sections', async () => {
    const { getAllByText, getByText } = await renderHomeScreen();
    // Ensure at least one "Home" label exists
    expect(getAllByText('Home').length).toBeGreaterThanOrEqual(1);
    // Check other sections normally
    expect(getByText('Saved')).toBeTruthy();
    expect(getByText('Feeds')).toBeTruthy();
  });

  it('displays loading indicator while fetching feeds', async () => {
    (fetchFeeds as jest.Mock).mockReturnValue(new Promise(() => {}));
    const { getByTestId } = await renderHomeScreen();
    expect(getByTestId('loading-indicator')).toBeTruthy();
  });

  it('navigates to AddFeed screen on button press', async () => {
    const { getByText } = await renderHomeScreen();
    await act(async () => {
      fireEvent.press(getByText('+'));
    });
    expect(mockNavigate).toHaveBeenCalledWith('AddFeed', { userId: 'user123' });
  });

  it('navigates to ArticleList when "All Feeds" is tapped', async () => {
    const { getByText } = await renderHomeScreen();
    await waitFor(() => expect(getByText('All Feeds')).toBeTruthy());
    await act(async () => {
      fireEvent.press(getByText('All Feeds'));
    });
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('ArticleList', {
        feedId: 'all',
        feedTitle: 'All Feeds',
        userId: 'user123',
      }),
      { timeout: 3000 }
    );
  });

  it('navigates to Bookmarks screen on tap', async () => {
    const { getByText } = await renderHomeScreen();

    await waitFor(() => expect(getByText('Bookmarks')).toBeTruthy());
    await act(async () => {
      fireEvent.press(getByText('Bookmarks'));
    });
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('Bookmarks', { userId: 'user123' }),
    { timeout: 3000 }
    );
  });
});
