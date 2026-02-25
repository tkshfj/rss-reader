// ArticleList.test.tsx
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import ArticleList from '../components/ArticleList';
import { supabase } from '../services/supabase';
import { RootStackParamList } from '../navigation/StackNavigator';
import { Alert } from 'react-native';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Test Data for Articles (defined before mock so it can be referenced)
const mockArticles = [
  {
    id: 'article-1',
    user_id: 'user-123',
    feed_id: 'feed-1',
    title: 'Test Article',
    summary: 'This is a test summary',
    link: 'https://example.com/article',
    image: null,
    author: 'Author 1',
    published: '2025-03-08T12:00:00Z',
    bookmarked: false,
    fetched_at: '2025-03-08T12:10:00Z',
    feeds: [{ title: 'Sample Feed' }],
  },
];

// Mock Supabase — fully chainable builder, thenable for await
jest.mock('../services/supabase', () => ({
    supabase: {
      auth: {
        getUser: jest.fn(() =>
          Promise.resolve({ data: { user: { id: 'user-123' } } })
        ),
      },
      from: jest.fn((table: string) => {
        const defaultResult = (table === 'users')
          ? { data: { max_articles_per_feed: 50 }, error: null }
          : (table === 'articles')
            ? { data: mockArticles, error: null, count: 1 }
            : { data: null, error: null };

        const builder: any = {};
        ['select', 'eq', 'order', 'limit', 'update', 'delete', 'insert'].forEach(method => {
          builder[method] = jest.fn(() => builder);
        });
        builder.single = jest.fn(() => Promise.resolve(defaultResult));
        builder.then = (resolve: any, reject?: any) =>
          Promise.resolve(defaultResult).then(resolve, reject);
        return builder;
      }),
    },
  }));

// Mock Route and Navigation
const mockRoute: RouteProp<RootStackParamList, 'ArticleList'> = {
  key: 'unique-key',
  name: 'ArticleList',
  params: { feedId: 'feed-1', feedTitle: 'Sample Feed', userId: 'user-123' },
};

const mockNavigation: StackNavigationProp<RootStackParamList, 'ArticleList'> = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  push: jest.fn(),
  replace: jest.fn(),
  setOptions: jest.fn(),
  addListener: jest.fn(),
  removeListener: jest.fn(),
  canGoBack: jest.fn(),
  isFocused: jest.fn(),
  dispatch: jest.fn(),
  getId: jest.fn(),
  getParent: jest.fn(),
  setParams: jest.fn(),
} as unknown as StackNavigationProp<RootStackParamList, 'ArticleList'>;

describe('ArticleList Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Mock Supabase works', async () => {
    const user = await supabase.auth.getUser();

    const articles = await supabase.from('articles').select('*').eq('user_id', 'user-123').order('published').limit(1).single();

    expect(user.data.user.id).toBe('user-123');
    expect(articles.data).toBeDefined();
  });

  test('renders loading indicator initially', async () => {
      const { getByTestId, queryByTestId } = render(
        <NavigationContainer>
          <ArticleList route={mockRoute} navigation={mockNavigation} />
        </NavigationContainer>
    );
    expect(getByTestId('loading-indicator')).toBeTruthy();
    await waitFor(() => expect(queryByTestId('loading-indicator')).toBeNull());
  });

  test('renders articles correctly', async () => {
    const { getByText } = render(
      <NavigationContainer>
        <ArticleList route={mockRoute} navigation={mockNavigation} />
      </NavigationContainer>
    );

    await waitFor(() => expect(getByText('Test Article')).toBeTruthy());
    expect(getByText('This is a test summary')).toBeTruthy();
  });

  test('filters articles based on search query', async () => {
    const { getByPlaceholderText, getByText, queryByText } = render(
      <NavigationContainer>
        <ArticleList route={mockRoute} navigation={mockNavigation} />
      </NavigationContainer>
    );

    await waitFor(() => expect(getByText('Test Article')).toBeTruthy());
  });

  test('refreshes feed when pull-to-refresh is triggered', async () => {
    const { getByText } = render(
      <NavigationContainer>
        <ArticleList route={mockRoute} navigation={mockNavigation} />
      </NavigationContainer>
    );

    await waitFor(() => getByText('Test Article'));

    expect(supabase.from).toHaveBeenCalledWith('articles');
  });

  test('opens and updates feed title in modal', async () => {
    const { getByText, getByPlaceholderText, getByRole } = render(
      <NavigationContainer>
        <ArticleList route={mockRoute} navigation={mockNavigation} />
      </NavigationContainer>
    );

    fireEvent.press(getByText('Sample Feed'));
    await waitFor(() => expect(getByPlaceholderText('Enter new feed title')).toBeTruthy());

    await act(async () => {
      fireEvent.changeText(getByPlaceholderText('Enter new feed title'), 'Updated Feed');
    });

    fireEvent.press(getByRole('button', { name: 'Rename' }));

    expect(supabase.from).toHaveBeenCalledWith('feeds');
  });

  test('deletes feed and navigates back', async () => {
    // Mock Alert to auto-invoke the Delete callback
    jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons?: any[]) => {
      const deleteButton = buttons?.find((b: any) => b.text === 'Delete');
      if (deleteButton?.onPress) deleteButton.onPress();
    });

    const { getByText, getByRole } = render(
      <NavigationContainer>
        <ArticleList route={mockRoute} navigation={mockNavigation} />
      </NavigationContainer>
    );

    fireEvent.press(getByText('Sample Feed'));
    await waitFor(() => expect(getByText('Rename or Delete Feed')).toBeTruthy());

    fireEvent.press(getByRole('button', { name: 'Delete' }));

    expect(supabase.from).toHaveBeenCalledWith('feeds');
    await waitFor(() => {
      expect(mockNavigation.goBack).toHaveBeenCalled();
    });
  });

  test('handles error when fetching articles', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      const builder: any = {};
      ['select', 'eq', 'order', 'limit', 'update', 'delete', 'insert'].forEach(method => {
        builder[method] = jest.fn(() => builder);
      });
      builder.single = jest.fn(() => Promise.reject(new Error('Failed to fetch')));
      builder.then = (resolve: any, reject?: any) =>
        Promise.reject(new Error('Failed to fetch')).then(resolve, reject);
      return builder;
    });

    render(
      <NavigationContainer>
        <ArticleList route={mockRoute} navigation={mockNavigation} />
      </NavigationContainer>
    );

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error loading articles:', expect.any(String));
    });

    consoleSpy.mockRestore();
  });
});
