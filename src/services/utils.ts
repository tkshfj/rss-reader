// utils.ts
import { supabase } from './supabase';
import { formatDistanceToNow, parseISO } from 'date-fns';

// Function to delete old non-bookmarked articles based on user settings
export const deleteOldArticles = async (userId: string) => {
    try {
        if (!userId) {
            console.error("User ID is required.");
            return;
        }

        // Fetch the user's article retention setting
        const { data: settings, error: settingsError } = await supabase
            .from('users')
            .select('retention_days')
            .eq('id', userId)
            .single();

        if (settingsError) {
            console.error("Error fetching user settings:", settingsError.message);
            return;
        }

        if (!settings || settings.retention_days === 0) {
            console.log(`No retention policy set or retention is disabled for user ${userId}.`);
            return;
        }

        const retentionDays = settings.retention_days;

        // Calculate cutoff date
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
        const cutoffISO = cutoffDate.toISOString();

        // Delete old, unbookmarked articles
        const { data, error: deleteError } = await supabase
            .from('articles')
            .delete()
            .eq('user_id', userId)
            .lt('published', cutoffISO)
            .eq('bookmarked', false)
            .select('*');

        if (deleteError) {
            console.error("Error deleting old articles:", deleteError.message);
        } else {
            if (data) {
                console.log(`Deleted ${data.length} old unbookmarked articles for user ${userId}`);
            } else {
                console.log(`No old unbookmarked articles were deleted for user ${userId}`);
            }
        }
    } catch (error) {
        console.error("Unexpected error deleting old articles:", error);
    }
};

// Function to fetch feeds for a specific user
export const fetchFeeds = async (userId: string) => {
  if (!userId) {
    console.error('Error: User ID is required to fetch feeds.');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('feeds')
      .select('id, title')
      .eq('user_id', userId) // feeds are user-specific
      .order('last_updated', { ascending: false }); // Sort by most recent updates

    if (error) {
      console.error('Error fetching feeds:', error);
      return [];
    }

    return data || []; // Return empty array if no data
  } catch (err) {
    console.error('Unexpected error fetching feeds:', err);
    return [];
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
