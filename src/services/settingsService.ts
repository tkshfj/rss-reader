// settingsService.ts — User settings DB functions
import { validate as isUuid } from 'uuid';
import { supabase } from './supabase';

export const DEFAULT_SETTINGS = {
    dark_mode: false,
    auto_theme: true,
    font_size: 16,
    line_spacing: 1.5,
    notifications: false,
    max_articles_per_feed: 50,
    retention_days: 30,
};

export interface UserSettings {
    id: string;
    dark_mode: boolean;
    auto_theme: boolean;
    font_size: number;
    line_spacing: number;
    notifications: boolean;
    max_articles_per_feed: number;
    retention_days: number;
    updated_at: string;
}

export const getUserSettings = async (userId: string): Promise<UserSettings | null> => {
    try {
        if (!userId || !isUuid(userId)) {
            console.error("User ID is required.");
            return null;
        }

        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
            console.error("Error fetching user settings:", error.message);
            return null;
        }

        return data;
    } catch (error) {
        console.error("Unexpected error fetching user settings:", error);
        return null;
    }
};

export const updateUserSettings = async (userId: string, newSettings: Partial<UserSettings>): Promise<void> => {
    try {
        if (!userId) {
            console.error("User ID is required.");
            return;
        }

        const allowedKeys = [
            'dark_mode', 'auto_theme', 'font_size', 'line_spacing',
            'notifications', 'max_articles_per_feed', 'retention_days',
        ] as const;

        const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
        for (const key of allowedKeys) {
            if (newSettings[key] !== undefined) {
                updates[key] = newSettings[key];
            }
        }

        // Validate numeric ranges
        if (typeof updates.font_size === 'number') {
            updates.font_size = Math.max(8, Math.min(48, updates.font_size));
        }
        if (typeof updates.max_articles_per_feed === 'number') {
            updates.max_articles_per_feed = Math.max(10, Math.min(200, updates.max_articles_per_feed));
        }
        if (typeof updates.retention_days === 'number') {
            updates.retention_days = Math.max(0, Math.min(365, updates.retention_days));
        }

        const { error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', userId);

        if (error) {
            console.error("Error updating user settings:", error.message);
        }
    } catch (error) {
        console.error("Unexpected error updating user settings:", error);
    }
};
