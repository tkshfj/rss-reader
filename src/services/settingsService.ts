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

        const { error } = await supabase
            .from('users')
            .update({
                dark_mode: newSettings.dark_mode,
                auto_theme: newSettings.auto_theme,
                font_size: newSettings.font_size,
                line_spacing: newSettings.line_spacing,
                notifications: newSettings.notifications,
                max_articles_per_feed: newSettings.max_articles_per_feed,
                retention_days: newSettings.retention_days,
                updated_at: new Date().toISOString(),
            })
            .eq('id', userId);

        if (error) {
            console.error("Error updating user settings:", error.message);
        }
    } catch (error) {
        console.error("Unexpected error updating user settings:", error);
    }
};
