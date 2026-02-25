// __mocks__/supabase.ts
// Jest Mock for Supabase
export const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
  })),
};

export const supabase = {
  auth: {
    signInWithPassword: jest.fn().mockResolvedValue({ data: { user: { id: '123' } }, error: null }),
    signOut: jest.fn().mockResolvedValue({ error: null }),
    getSession: jest.fn().mockResolvedValue({ data: { session: { user: { id: '123' } } }, error: null }),
  },
  from: () => mockSupabaseClient.from(),
};
