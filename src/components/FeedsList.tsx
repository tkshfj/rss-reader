// FeedsList.tsx
import React, { useState, useCallback, useRef } from 'react';
import { View, Text, ActivityIndicator, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/StackNavigator';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../services/supabase';
import { Article } from '../services/articleService';
import { useFeedStore } from '../services/feedStore';

// Define the Feed type
type Feed = {
    id: string;
    user_id: string;
    title: string;
    url: string;
};

// Define the props for the FeedsList component
type FeedsListProps = {
    navigation: StackNavigationProp<RootStackParamList, 'FeedsList'>;
    route: { params: { userId: string } };
};

// Fetch feeds from Supabase
const fetchFeedsFromSupabase = async (userId: string) => {
    const { data, error } = await supabase
        .from('feeds')
        .select('*')
        .eq('user_id', userId);

    if (error) {
        console.error('Error fetching feeds:', error.message);
        return [];
    }
    return data || [];
};

// Fetch articles from Supabase (select only fields needed for the feeds list)
const fetchArticlesFromSupabase = async (userId: string) => {
    const { data, error } = await supabase
        .from('articles')
        .select('id, user_id, feed_id, title, link, image, author, published, bookmarked, fetched_at')
        .eq('user_id', userId)
        .order('published', { ascending: false });

    if (error) {
        console.error('Error fetching articles:', error.message);
        return [];
    }
    return data || [];
};

// Memoized Feed List Item Component
const FeedItem = React.memo(({ feed, onPress }: { feed: Feed; onPress: (feed: Feed) => void }) => (
    <TouchableOpacity onPress={() => onPress(feed)} style={styles.feedItem}>
        <Text style={styles.feedTitle}>{feed.title}</Text>
        <Text style={styles.feedUrl}>{feed.url}</Text>
    </TouchableOpacity>
));

const FeedsList: React.FC<FeedsListProps> = ({ navigation, route }) => {
    const userId = route.params.userId;
    const [feeds, setFeeds] = useState<Feed[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const { setArticles } = useFeedStore();
    const lastFetchTimeRef = useRef<number | null>(null);

    // Fetch feeds only when userId changes
    const fetchFeeds = useCallback(async () => {
        setLoading(true);
        const fetchedFeeds = await fetchFeedsFromSupabase(userId);
        setFeeds(fetchedFeeds);
        setLoading(false);
    }, [userId]);

    // Handle feed item press
    const handlePress = useCallback((feed: Feed) => {
        navigation.navigate("ArticleList", {
            feedId: feed.id,
            feedTitle: feed.title,
            userId: feed.user_id
        });
    }, [navigation]);

    // Fetch articles, throttled to once per 10 minutes
    const fetchNewArticles = useCallback(async () => {
        const now = Date.now();

        // Prevent unnecessary fetches if called within 10 minutes
        if (lastFetchTimeRef.current && (now - lastFetchTimeRef.current < 10 * 60 * 1000)) {
            return;
        }

        lastFetchTimeRef.current = now;
        const newArticles = await fetchArticlesFromSupabase(userId);

        if (newArticles.length > 0) {
            setArticles((prevArticles) => {
                const uniqueArticles = new Map<string, Article>();
                [...newArticles, ...prevArticles].forEach(article => {
                    uniqueArticles.set(article.id, article);
                });
                return Array.from(uniqueArticles.values());
            });
        }
    }, [setArticles, userId]);

    // Refresh feeds and articles when the screen is focused
    useFocusEffect(
        useCallback(() => {
            fetchFeeds();
            fetchNewArticles();
        }, [fetchFeeds, fetchNewArticles])
    );

    return (
        <View style={styles.container}>
            {loading ? (
                <ActivityIndicator size="large" color="#007AFF" testID="loading-indicator" />
            ) : feeds.length === 0 ? (
                <Text style={styles.emptyMessage}>No feeds added yet.</Text>
            ) : (
                <FlatList
                    data={feeds}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => <FeedItem feed={item} onPress={handlePress} />}
                    getItemLayout={(data, index) => ({
                        length: 70, // Assuming each item is ~70px tall
                        offset: 70 * index,
                        index,
                    })}
                    initialNumToRender={10}
                    windowSize={5}
                />
            )}
        </View>
    );
};

// Styles for the FeedsList component
const styles = StyleSheet.create({
    container: { flex: 1, padding: 10, backgroundColor: '#fff' },
    emptyMessage: { textAlign: "center", marginTop: 20, fontSize: 16, color: "gray" },
    feedItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
    },
    feedTitle: { fontSize: 18, fontWeight: 'bold' },
    feedUrl: { color: 'gray' },
});

export default FeedsList;
