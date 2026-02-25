// HomeScreen.test.tsx
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import HomeScreen from '../components/HomeScreen';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { fetchFeeds } from '../services/utils';
import { supabase } from '../services/supabase';

// Mock Navigation — useFocusEffect defers callback via useEffect (like the real implementation)
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  const React = require('react');
  return {
    ...actualNav,
    useNavigation: jest.fn(() => ({
        navigate: jest.fn(),
      })),
    useFocusEffect: jest.fn((callback) => {
      React.useEffect(() => { callback(); }, [callback]);
    }),
  };
});

// Mock Supabase Auth
jest.mock('../services/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
  },
}));

// Mock fetchFeeds API
jest.mock('../services/utils', () => ({
  fetchFeeds: jest.fn(),
}));

const Stack = createStackNavigator();

describe('HomeScreen', () => {
  let navigationMock: any;

  beforeEach(() => {
    navigationMock = {
      dispatch: jest.fn(),
      navigate: jest.fn(),
      reset: jest.fn(),
      goBack: jest.fn(),
      isFocused: jest.fn(),
      canGoBack: jest.fn(),
      getId: jest.fn(),
      getState: jest.fn(),
      setParams: jest.fn(),
      getParent: jest.fn(),
      addListener: jest.fn((event, callback) => {
        if (event === 'focus') {
          callback();
        }
      }),
    };
    // Mock useNavigation hook to return mock navigation
    (useNavigation as jest.Mock).mockReturnValue(navigationMock);
    // Ensure Supabase mock resolves with the correct user data
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user123' } },
        });
    // Default fetchFeeds to resolve with empty array
    (fetchFeeds as jest.Mock).mockResolvedValue([]);
  });

  // Render outside act(), then flush async effects
  const renderWithNavigation = async () => {
    const result = render(
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="Home" component={HomeScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
    await act(async () => {});
    return result;
  };


  it('renders correctly with default sections', async () => {
    const { getAllByText, getByText } = await renderWithNavigation();
    // Ensure at least one "Home" label exists
    expect(getAllByText('Home').length).toBeGreaterThanOrEqual(1);
    // Check other sections normally
    expect(getByText('Saved')).toBeTruthy();
    expect(getByText('Feeds')).toBeTruthy();
  });

  it('displays loading indicator while fetching feeds', async () => {
    (fetchFeeds as jest.Mock).mockReturnValue(new Promise(() => {}));
    const { getByTestId } = await renderWithNavigation();
    expect(getByTestId('loading-indicator')).toBeTruthy();
  });

  it('navigates to AddFeed screen on button press', async () => {
    const { getByText } = await renderWithNavigation();
    await act(async () => {
      fireEvent.press(getByText('+'));
    });
    expect(navigationMock.navigate).toHaveBeenCalledWith('AddFeed', { userId: 'user123' });
  });

  it('navigates to ArticleList when "All Feeds" is tapped', async () => {
    const { getByText } = await renderWithNavigation();
    await waitFor(() => expect(getByText('All Feeds')).toBeTruthy());
    await act(async () => {
      fireEvent.press(getByText('All Feeds'));
    });
    await waitFor(() =>
      expect(navigationMock.navigate).toHaveBeenCalledWith('ArticleList', {
        feedId: 'all',
        feedTitle: 'All Feeds',
        userId: 'user123',
      }),
      { timeout: 3000 }
    );
  });

  it('navigates to Bookmarks screen on tap', async () => {
    const { getByText } = await renderWithNavigation();

    await waitFor(() => expect(getByText('Bookmarks')).toBeTruthy());
    await act(async () => {
      fireEvent.press(getByText('Bookmarks'));
    });
    await waitFor(() =>
      expect(navigationMock.navigate).toHaveBeenCalledWith('Bookmarks', { userId: 'user123' }),
    { timeout: 3000 }
    );
  });
});
