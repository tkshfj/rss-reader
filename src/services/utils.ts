// utils.ts
import { supabase } from './supabase';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { getUserSettings } from './settingsService';

// Function to delete old non-bookmarked articles based on user settings
export const deleteOldArticles = async (userId: string) => {
    try {
        if (!userId) {
            console.error("User ID is required.");
            return;
        }

        const settings = await getUserSettings(userId);

        if (!settings || settings.retention_days === 0) {
            console.log(`No retention policy set or retention is disabled for user ${userId}.`);
            return;
        }

        // Calculate cutoff date
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - settings.retention_days);
        const cutoffISO = cutoffDate.toISOString();

        // Delete old, unbookmarked articles
        const { count, error: deleteError } = await supabase
            .from('articles')
            .delete({ count: 'exact' })
            .eq('user_id', userId)
            .lt('published', cutoffISO)
            .eq('bookmarked', false);

        if (deleteError) {
            console.error("Error deleting old articles:", deleteError.message);
        } else {
            console.log(`Deleted ${count ?? 0} old unbookmarked articles for user ${userId}`);
        }
    } catch (error) {
        console.error("Unexpected error deleting old articles:", error);
    }
};

// Function to get relative time from a date string
export const getRelativeTime = (dateString: string | null) => {
    if (!dateString) return "Unknown";
    try {
        return formatDistanceToNow(parseISO(dateString), { addSuffix: true });
    } catch (error) {
        console.error("Date parsing error:", error);
        return "Unknown";
    }
};
