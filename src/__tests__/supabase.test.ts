// Verify Supabase Mocking
import { supabase } from '../services/supabase';

jest.mock('../services/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: { id: 'mock-article', title: 'Mock Article' },
              }),
            })),
          })),
        })),
      })),
    })),
  },
}));

describe('Supabase Mock Tests', () => {
  test('checks if mock Supabase is working', async () => {
    const response = await supabase
      .from('articles')
      .select('*')
      .eq('id', 'mock-article')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    expect(response).toEqual({ data: { id: 'mock-article', title: 'Mock Article' } });
    expect(supabase.from).toHaveBeenCalledWith('articles');
  });
});
