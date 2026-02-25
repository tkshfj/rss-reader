// Bookmarks.tsx
import React, { useState, useCallback } from 'react';
import { View, Text, ActivityIndicator, FlatList, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/StackNavigator';
import { Article, fetchBookmarkedArticles } from '../services/articleService';
import { getRelativeTime } from '../services/utils';

// Define the props for the Bookmarks component
type BookmarksProps = {
    navigation: NativeStackNavigationProp<RootStackParamList, 'Bookmarks'>;
    route: { params: { userId: string } };
};

// Bookmarks component to display the list of bookmarked articles
const Bookmarks: React.FC<BookmarksProps> = ({ navigation, route }) => {
    const userId = route?.params?.userId;
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Refresh bookmarks when the screen is focused (e.g. navigating back from ArticleDetail)
    useFocusEffect(
        useCallback(() => {
            if (!userId) {
                setError("User ID is missing. Unable to fetch bookmarks.");
                setLoading(false);
                return;
            }

            let cancelled = false;
            const fetchData = async () => {
                setLoading(true);
                setError(null);
                try {
                    const data = await fetchBookmarkedArticles(userId);
                    if (!cancelled) {
                        setArticles(data);
                    }
                } catch (err) {
                    if (!cancelled) {
                        setError(err instanceof Error ? err.message : "Failed to fetch bookmarks.");
                    }
                } finally {
                    if (!cancelled) setLoading(false);
                }
            };

            fetchData();
            return () => { cancelled = true; };
        }, [userId])
    );

    return (
        <View style={styles.container}>
            {loading ? (
                <ActivityIndicator size="large" color="#007AFF" />
            ) : error ? (
                <Text style={styles.errorMessage}>{error}</Text>
            ) : articles.length === 0 ? (
                <Text style={styles.emptyMessage}>No bookmarked articles found.</Text>
            ) : (
                <FlatList
                    data={articles}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            onPress={() => navigation.navigate('ArticleDetail', { articleId: item.id, userId })}
                            style={styles.articleItem}
                        >
                            {item.image && <Image source={{ uri: item.image }} style={styles.articleImage} />}
                            <View style={styles.articleContent}>
                                <Text style={styles.articleTitle}>{item.title}</Text>
                                {item.summary && <Text style={styles.articleSummary}>{item.summary}</Text>}
                                {item.author && <Text style={styles.articleAuthor}>By {item.author}</Text>}
                                <Text style={styles.articleDate}>{getRelativeTime(item.fetched_at)}</Text>
                            </View>
                        </TouchableOpacity>
                    )}
                />
            )}
        </View>
    );
};

// Styles for the Bookmarks component
const styles = StyleSheet.create({
    container: { flex: 1, padding: 10, backgroundColor: '#fff' },
    emptyMessage: { textAlign: "center", marginTop: 20, fontSize: 16, color: "gray" },
    errorMessage: { textAlign: "center", marginTop: 20, fontSize: 16, color: "red" },
    articleItem: { flexDirection: 'row', padding: 15, borderBottomWidth: 1, borderBottomColor: '#ddd' },
    articleImage: { width: 60, height: 60, borderRadius: 8, marginRight: 10 },
    articleContent: { flex: 1 },
    articleTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
    articleSummary: { fontSize: 14, color: 'gray', marginBottom: 4 },
    articleAuthor: { fontSize: 12, fontStyle: 'italic', color: 'gray' },
    articleDate: { fontSize: 12, color: 'gray' },
});

export default Bookmarks;
