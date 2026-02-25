// FeedsList.tsx
import React, { useState, useCallback } from 'react';
import { View, Text, ActivityIndicator, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/StackNavigator';
import { useFocusEffect } from '@react-navigation/native';
import { Feed, fetchUserFeeds } from '../services/articleService';

// Define the props for the FeedsList component
type FeedsListProps = {
    navigation: NativeStackNavigationProp<RootStackParamList, 'FeedsList'>;
    route: { params: { userId: string } };
};

// Memoized Feed List Item Component
const FeedItem = React.memo(({ feed, onPress }: { feed: Feed; onPress: (feed: Feed) => void }) => (
    <TouchableOpacity onPress={() => onPress(feed)} style={styles.feedItem}>
        <Text style={styles.feedTitle}>{feed.title}</Text>
        <Text style={styles.feedUrl}>{feed.url}</Text>
    </TouchableOpacity>
));
FeedItem.displayName = 'FeedItem';

const FeedsList: React.FC<FeedsListProps> = ({ navigation, route }) => {
    const userId = route.params.userId;
    const [feeds, setFeeds] = useState<Feed[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    // Handle feed item press
    const handlePress = useCallback((feed: Feed) => {
        navigation.navigate("ArticleList", {
            feedId: feed.id,
            feedTitle: feed.title,
            userId: feed.user_id
        });
    }, [navigation]);

    // Refresh feeds when the screen is focused
    useFocusEffect(
        useCallback(() => {
            let cancelled = false;
            const loadFeeds = async () => {
                setLoading(true);
                try {
                    const fetchedFeeds = await fetchUserFeeds(userId);
                    if (!cancelled) setFeeds(fetchedFeeds);
                } catch (error) {
                    console.error('Error fetching feeds:', error);
                } finally {
                    if (!cancelled) setLoading(false);
                }
            };
            loadFeeds();
            return () => { cancelled = true; };
        }, [userId])
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
