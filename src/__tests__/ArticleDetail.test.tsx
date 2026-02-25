import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ArticleDetail from '../components/ArticleDetail';
import { Linking, ActivityIndicator } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/StackNavigator';
import { RouteProp } from '@react-navigation/native';

const mockFetchArticleById = jest.fn();
const mockGetBookmarkStatus = jest.fn();
const mockSetBookmarkStatus = jest.fn();

// Mock service functions used by ArticleDetail
jest.mock('../services/articleService', () => ({
  fetchArticleById: (...args: any[]) => mockFetchArticleById(...args),
  getBookmarkStatus: (...args: any[]) => mockGetBookmarkStatus(...args),
  setBookmarkStatus: (...args: any[]) => mockSetBookmarkStatus(...args),
}));

jest.mock('../services/settingsService', () => ({
  getUserSettings: jest.fn().mockResolvedValue({
    auto_theme: true,
    dark_mode: false,
    font_size: 16,
    line_spacing: 1.5,
  }),
}));

// Mock React Navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

const createMockNavigation = (): NativeStackNavigationProp<RootStackParamList, 'ArticleDetail'> =>
  ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    replace: jest.fn(),
    reset: jest.fn(),
    setOptions: jest.fn(),
    dispatch: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    push: jest.fn(),
    pop: jest.fn(),
    popToTop: jest.fn(),
    canGoBack: jest.fn().mockReturnValue(true),
    isFocused: jest.fn(),
    getId: jest.fn(),
    getState: jest.fn(),
    setParams: jest.fn(),
    navigateDeprecated: jest.fn(),
    preload: jest.fn(),
    setStateForNextRouteNamesChange: jest.fn(),
  } as unknown as NativeStackNavigationProp<RootStackParamList, 'ArticleDetail'>);

const mockRoute: RouteProp<RootStackParamList, 'ArticleDetail'> = {
  key: 'ArticleDetail-key',
  name: 'ArticleDetail',
  params: {
    articleId: '1',
    userId: 'test-user-123',
  },
};

const articleData = {
  id: '1',
  user_id: 'test-user-123',
  feed_id: '100',
  title: 'Sample Article',
  summary: '<p>This is a test summary.</p>',
  content: '',
  content_html: '',
  author: 'John Doe',
  image: 'https://example.com/image.jpg',
  media_image: null,
  published: '2025-03-09T12:00:00Z',
  identifier_type: null,
  link: 'https://example.com/full-article',
  bookmarked: false,
  fetched_at: '2025-03-09T12:00:00Z',
  feed_title: 'Test Feed',
};

describe('ArticleDetail Component', () => {
  let navigation: NativeStackNavigationProp<RootStackParamList, 'ArticleDetail'>;

  beforeEach(() => {
    jest.clearAllMocks();
    navigation = createMockNavigation();
    jest.spyOn(Linking, 'openURL').mockImplementation(jest.fn());
    mockFetchArticleById.mockResolvedValue(articleData);
    mockGetBookmarkStatus.mockResolvedValue(false);
    mockSetBookmarkStatus.mockResolvedValue(undefined);
  });

  test('renders article details correctly', async () => {
    const { getByText } = render(<ArticleDetail route={mockRoute} navigation={navigation} />);

    await waitFor(() => {
      expect(getByText('Sample Article')).toBeTruthy();
      expect(getByText(/John Doe/)).toBeTruthy();
      expect(getByText('Test Feed')).toBeTruthy();
      expect(getByText('Read More')).toBeTruthy();
    });
  });

  test('displays loading state initially', () => {
    const { UNSAFE_getByType } = render(<ArticleDetail route={mockRoute} navigation={navigation} />);
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  test('fetches and displays the correct feed title', async () => {
    const { getByText } = render(<ArticleDetail route={mockRoute} navigation={navigation} />);
    await waitFor(() => {
      expect(getByText('Test Feed')).toBeTruthy();
    });
  });

  test('toggles bookmark status on button press', async () => {
    const { getByText } = render(<ArticleDetail route={mockRoute} navigation={navigation} />);

    await waitFor(() => expect(getByText('Bookmark This')).toBeTruthy());

    fireEvent.press(getByText('Bookmark This'));

    await waitFor(() => {
      expect(getByText('Remove Bookmark')).toBeTruthy();
    });

    fireEvent.press(getByText('Remove Bookmark'));

    await waitFor(() => {
      expect(getByText('Bookmark This')).toBeTruthy();
    });
  });

  test('opens external link on "Read More" button press', async () => {
    const { getByText } = render(<ArticleDetail route={mockRoute} navigation={navigation} />);

    await waitFor(() => expect(getByText('Read More')).toBeTruthy());

    fireEvent.press(getByText('Read More'));
    expect(Linking.openURL).toHaveBeenCalledWith('https://example.com/full-article');
  });
});
