import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ArticleDetail from '../components/ArticleDetail';
import { Linking, ActivityIndicator } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/StackNavigator';
import { RouteProp } from '@react-navigation/native';

// Mock React Navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

const createMockNavigation = (): StackNavigationProp<RootStackParamList, 'ArticleDetail'> =>
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
  } as unknown as StackNavigationProp<RootStackParamList, 'ArticleDetail'>);

const mockRoute: RouteProp<RootStackParamList, 'ArticleDetail'> = {
  key: 'ArticleDetail-key',
  name: 'ArticleDetail',
  params: {
    article: {
      id: 1,
      title: 'Sample Article',
      summary: '<p>This is a test summary.</p>',
      author: 'John Doe',
      image: 'https://example.com/image.jpg',
      published: '2025-03-09T12:00:00Z',
      link: 'https://example.com/full-article',
      feed_id: 100,
    },
    userId: 'test-user-123',
  },
};

// Mock Supabase API Calls
jest.mock('../services/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: { title: 'Test Feed' }, error: null }),
    update: jest.fn().mockReturnThis(),
  },
}));

describe('ArticleDetail Component', () => {
  let navigation: StackNavigationProp<RootStackParamList, 'ArticleDetail'>;

  beforeEach(() => {
    jest.clearAllMocks();
    navigation = createMockNavigation();
    jest.spyOn(Linking, 'openURL').mockImplementation(jest.fn());
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
