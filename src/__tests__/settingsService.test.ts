// settingsService.test.ts
import { getUserSettings, updateUserSettings, DEFAULT_SETTINGS } from '../services/settingsService';

// Mock supabase with chainable query builder
const mockSingle = jest.fn();
const mockEq = jest.fn().mockReturnThis();
const mockSelect = jest.fn().mockReturnThis();
const mockUpdate = jest.fn().mockReturnThis();

const mockChain = {
    select: mockSelect,
    update: mockUpdate,
    eq: mockEq,
    single: mockSingle,
};

jest.mock('../services/supabase', () => ({
    supabase: {
        from: jest.fn(() => mockChain),
    },
}));

import { supabase } from '../services/supabase';

beforeEach(() => {
    jest.clearAllMocks();
    mockSelect.mockReturnThis();
    mockUpdate.mockReturnThis();
    mockEq.mockReturnThis();
});

describe('DEFAULT_SETTINGS', () => {
    it('has expected defaults', () => {
        expect(DEFAULT_SETTINGS.font_size).toBe(16);
        expect(DEFAULT_SETTINGS.max_articles_per_feed).toBe(50);
        expect(DEFAULT_SETTINGS.retention_days).toBe(30);
        expect(DEFAULT_SETTINGS.dark_mode).toBe(false);
        expect(DEFAULT_SETTINGS.auto_theme).toBe(true);
    });
});

describe('getUserSettings', () => {
    it('returns user settings for valid UUID', async () => {
        const mockSettings = {
            id: '550e8400-e29b-41d4-a716-446655440000',
            dark_mode: true,
            auto_theme: false,
            font_size: 18,
            line_spacing: 2.0,
            notifications: true,
            max_articles_per_feed: 100,
            retention_days: 60,
            updated_at: '2025-01-01T00:00:00Z',
        };
        mockSingle.mockResolvedValue({ data: mockSettings, error: null });

        const result = await getUserSettings('550e8400-e29b-41d4-a716-446655440000');
        expect(result).toEqual(mockSettings);
        expect(supabase.from).toHaveBeenCalledWith('users');
    });

    it('returns null for invalid UUID', async () => {
        const result = await getUserSettings('not-a-uuid');
        expect(result).toBeNull();
        expect(supabase.from).not.toHaveBeenCalled();
    });

    it('returns null for empty userId', async () => {
        const result = await getUserSettings('');
        expect(result).toBeNull();
    });

    it('returns null on Supabase error', async () => {
        mockSingle.mockResolvedValue({ data: null, error: { message: 'DB error' } });
        const result = await getUserSettings('550e8400-e29b-41d4-a716-446655440000');
        expect(result).toBeNull();
    });
});

describe('updateUserSettings', () => {
    it('sends only defined fields to Supabase', async () => {
        mockEq.mockResolvedValueOnce({ error: null });

        await updateUserSettings('user-1', { font_size: 20 });

        expect(supabase.from).toHaveBeenCalledWith('users');
        expect(mockUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ font_size: 20, updated_at: expect.any(String) })
        );
        // Should NOT contain undefined fields
        const updateArg = mockUpdate.mock.calls[0][0];
        expect(updateArg).not.toHaveProperty('dark_mode');
        expect(updateArg).not.toHaveProperty('auto_theme');
        expect(updateArg).not.toHaveProperty('notifications');
    });

    it('sends all fields when all are provided', async () => {
        mockEq.mockResolvedValueOnce({ error: null });

        await updateUserSettings('user-1', {
            dark_mode: true,
            auto_theme: false,
            font_size: 20,
            line_spacing: 2.0,
            notifications: true,
            max_articles_per_feed: 100,
            retention_days: 60,
        });

        const updateArg = mockUpdate.mock.calls[0][0];
        expect(updateArg.dark_mode).toBe(true);
        expect(updateArg.auto_theme).toBe(false);
        expect(updateArg.font_size).toBe(20);
        expect(updateArg.line_spacing).toBe(2.0);
        expect(updateArg.notifications).toBe(true);
        expect(updateArg.max_articles_per_feed).toBe(100);
        expect(updateArg.retention_days).toBe(60);
    });

    it('does nothing for empty userId', async () => {
        await updateUserSettings('', { font_size: 20 });
        expect(supabase.from).not.toHaveBeenCalled();
    });

    it('logs error on Supabase failure', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        mockEq.mockResolvedValueOnce({ error: { message: 'Update failed' } });

        await updateUserSettings('user-1', { font_size: 20 });

        expect(consoleSpy).toHaveBeenCalledWith('Error updating user settings:', 'Update failed');
        consoleSpy.mockRestore();
    });
});
