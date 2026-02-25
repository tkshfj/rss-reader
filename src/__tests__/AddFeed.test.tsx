// AddFeed.test.tsx
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import AddFeed from '../components/AddFeed';
import { supabase } from '../services/supabase';
import { getUserId } from "../services/auth";
import RSSParser from 'react-native-rss-parser';
import { Alert } from 'react-native';

// Shared chainable builder so assertions can check calls on the same object
const mockSupabaseBuilder: any = {};
mockSupabaseBuilder.select = jest.fn(() => mockSupabaseBuilder);
mockSupabaseBuilder.eq = jest.fn(() => mockSupabaseBuilder);
mockSupabaseBuilder.single = jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
mockSupabaseBuilder.insert = jest.fn(() => mockSupabaseBuilder);
// Make builder thenable for `await supabase.from('feeds').insert([...]).select()`
mockSupabaseBuilder.then = (resolve: any, reject?: any) =>
  Promise.resolve({ data: [{ id: 1 }], error: null }).then(resolve, reject);

// Mock Supabase
jest.mock('../services/supabase', () => ({
  supabase: {
    from: jest.fn(() => mockSupabaseBuilder),
  },
}));

// Mock User Authentication
jest.mock('../services/auth', () => ({
  getUserId: jest.fn(() => Promise.resolve('test-user-id')),
}));

// Mock RSS Parser
jest.mock('react-native-rss-parser', () => ({
  parse: jest.fn(() =>
    Promise.resolve({ title: 'Test Feed' })
  ),
}));

// Mock fetch API
global.fetch = jest.fn((url) => {
    return Promise.resolve(
        new Response('<rss><channel><title>Test Feed</title></channel></rss>', {
          status: 200,
          statusText: "OK",
          headers: { "Content-Type": "application/xml" },
        })
      );
});

// Mock Alerts
jest.spyOn(Alert, 'alert').mockImplementation((title, message) => {});

// Utility to wrap component in NavigationContainer
const renderWithNavigation = (component: JSX.Element) => {
  return render(<NavigationContainer>{component}</NavigationContainer>);
};

describe('AddFeed Component', () => {
  afterEach(() => {
    jest.clearAllMocks();
    // Restore default mock implementations after clearAllMocks resets them
    mockSupabaseBuilder.select.mockImplementation(() => mockSupabaseBuilder);
    mockSupabaseBuilder.eq.mockImplementation(() => mockSupabaseBuilder);
    mockSupabaseBuilder.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
    mockSupabaseBuilder.insert.mockImplementation(() => mockSupabaseBuilder);
  });

  test('renders AddFeedForm with input and button', () => {
    const { getByPlaceholderText, getByText } = renderWithNavigation(<AddFeed />);
    expect(getByPlaceholderText('Enter RSS Feed URL')).toBeTruthy();
    expect(getByText('Add Feed')).toBeTruthy();
  });

  test('calls fetch and RSS parser when adding a feed', async () => {
    const { getByText, getByPlaceholderText } = renderWithNavigation(<AddFeed />);
    const input = getByPlaceholderText('Enter RSS Feed URL');
    const button = getByText('Add Feed');

    await act(async () => {
      fireEvent.changeText(input, 'https://example.com/rss');
    });

    await act(async () => {
      fireEvent.press(button);
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith('https://example.com/rss');
      expect(RSSParser.parse).toHaveBeenCalled();
    });
  });

  test('adds feed to Supabase if it does not exist', async () => {
    const { getByText, getByPlaceholderText } = renderWithNavigation(<AddFeed />);
    const input = getByPlaceholderText('Enter RSS Feed URL');
    const button = getByText('Add Feed');

    await act(async () => {
      fireEvent.changeText(input, 'https://example.com/rss');
    });

    await act(async () => {
      fireEvent.press(button);
    });

    await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(global.fetch).toHaveBeenCalledWith('https://example.com/rss');
        expect(RSSParser.parse).toHaveBeenCalled();
        expect(supabase.from).toHaveBeenCalledWith('feeds');
        expect(mockSupabaseBuilder.insert).toHaveBeenCalled();
    });
  });

  test('shows an alert if feed already exists', async () => {
    // Mock single() to return an existing feed
    mockSupabaseBuilder.single.mockResolvedValueOnce({
      data: { id: 1 },
      error: null,
    });

    const { getByText, getByPlaceholderText } = renderWithNavigation(<AddFeed />);
    const input = getByPlaceholderText('Enter RSS Feed URL');
    const button = getByText('Add Feed');

    await act(async () => {
      fireEvent.changeText(input, 'https://example.com/rss');
    });

    await act(async () => {
      fireEvent.press(button);
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith("Error", "This feed is already added.");
    });
  });

  test('shows an alert if feed URL is empty', async () => {
    const { getByText } = renderWithNavigation(<AddFeed />);
    const button = getByText('Add Feed');

    await act(async () => {
      fireEvent.press(button);
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith("Error", "Please enter a valid RSS URL.");
    });
  });
});
