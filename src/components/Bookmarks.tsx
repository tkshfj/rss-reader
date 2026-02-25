// Bookmarks.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, FlatList, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/StackNavigator';
import { supabase } from '../services/supabase';
import { Article } from '../services/articleService';

// Define the props for the Bookmarks component
type BookmarksProps = {
    navigation: StackNavigationProp<RootStackParamList, 'Bookmarks'>;
    route: { params: { userId: string } };
};

// Fetch bookmarked articles from Supabase
export const fetchBookmarks = async (userId: string | undefined): Promise<{ data: Article[]; error?: string }> => {
    if (!userId) {
        return { data: [], error: "User ID is undefined." };
    }

    const { data, error } = await supabase
        .from('articles')
        .select(`
            id, user_id, feed_id, title, link, summary, content, content_html, image, media_image,
            author, published, identifier_type, bookmarked, fetched_at
        `)
        .eq('user_id', userId)
        .eq('bookmarked', true)
        .order('fetched_at', { ascending: false });

    if (error) {
        return { data: [], error: error.message };
    }
    return { data: data || [] };
};

// Bookmarks component to display the list of bookmarked articles
const Bookmarks: React.FC<BookmarksProps> = ({ navigation, route }) => {
    const userId = route?.params?.userId;
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch bookmarks when the component mounts or userId changes
    useEffect(() => {
        if (!userId) {
            setError("User ID is missing. Unable to fetch bookmarks.");
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            setLoading(true);
            setError(null);
            const { data, error } = await fetchBookmarks(userId);
            if (error) {
                setError(error);
            }
            setArticles(data);
            setLoading(false);
        };

        fetchData();
    }, [userId]);

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
                            onPress={() => navigation.navigate('ArticleDetail', { article: item, userId })}
                            style={styles.articleItem}
                        >
                            {item.image && <Image source={{ uri: item.image }} style={styles.articleImage} />}
                            <View style={styles.articleContent}>
                                <Text style={styles.articleTitle}>{item.title}</Text>
                                {item.summary && <Text style={styles.articleSummary}>{item.summary}</Text>}
                                {item.author && <Text style={styles.articleAuthor}>By {item.author}</Text>}
                                <Text style={styles.articleDate}>{new Date(item.fetched_at).toLocaleString()}</Text>
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
