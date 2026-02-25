// ArticleList.tsx
import React, { useCallback, useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, TextInput, RefreshControl, TouchableOpacity, Image, ActivityIndicator, StyleSheet, Modal, Button, Alert } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/StackNavigator';
import { getRelativeTime } from '../services/utils';
import {
    Article,
    fetchArticles,
    getArticleCount,
    getMaxArticlesPerFeed,
    fetchAndStoreRSS,
    getFeedUrls,
    updateFeedTitle,
    deleteFeed,
    truncateSummary,
} from '../services/articleService';

// Define the types for the ArticleList component
type ArticleListScreenRouteProp = RouteProp<RootStackParamList, 'ArticleList'>;
type ArticleListScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ArticleList'>;
type Props = {
    route: ArticleListScreenRouteProp;
    navigation: ArticleListScreenNavigationProp;
};

// Define the ArticleList component
const ArticleList: React.FC<Props> = ({ route, navigation }) => {
    const { feedId, feedTitle, userId } = route.params || {};
    const [articles, setArticles] = useState<Article[]>([]);
    const [filteredArticles, setFilteredArticles] = useState<Article[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [modalVisible, setModalVisible] = useState<boolean>(false);
    const [newTitle, setNewTitle] = useState<string>(feedTitle);
    const [updatedTitle, setUpdatedTitle] = useState<string>(feedTitle);
    const rssFetchAttempted = useRef(false);

    // Load articles from the database
    const loadArticles = useCallback(async () => {
        setLoading(true);
        try {
            if (!userId) throw new Error('User not authenticated');

            const maxArticles = await getMaxArticlesPerFeed(userId);
            const formattedArticles = await fetchArticles(userId, feedId, maxArticles);
            setArticles(formattedArticles);
            setFilteredArticles(formattedArticles);
        } catch (error: any) {
            console.error('Error loading articles:', error.message);
        } finally {
            setLoading(false);
        }
    }, [feedId, userId]);

    // Refresh Feed — fetch RSS from source URLs and reload articles
    const refreshFeed = useCallback(async () => {
        setRefreshing(true);
        try {
            const feedUrls = await getFeedUrls(feedId, userId);
            if (feedUrls.length === 0) return;

            await Promise.allSettled(feedUrls.map(feed => fetchAndStoreRSS(feed.id, feed.url, userId)));
            await loadArticles();
        } catch (error) {
            console.error('Feed Refresh Error:', error);
        } finally {
            setRefreshing(false);
        }
    }, [feedId, userId, loadArticles]);

    // Initial load: fetch articles, and if empty, trigger a refresh
    useEffect(() => {
        const init = async () => {
            if (!userId) return;
            try {
                const count = await getArticleCount(userId, feedId);

                if (count === 0 && !rssFetchAttempted.current) {
                    rssFetchAttempted.current = true;
                    await refreshFeed();
                } else {
                    await loadArticles();
                }
            } catch (error: any) {
                console.error('Error loading articles:', error.message);
                setLoading(false);
            }
        };
        init();
    }, [feedId, userId]);

    // Filter articles by search query
    const filterArticles = useCallback((query: string) => {
        setSearchQuery(query);
        if (!query.trim()) {
            setFilteredArticles(articles);
        } else {
            const lowerQuery = query.toLowerCase();
            setFilteredArticles(articles.filter(article =>
                article.title.toLowerCase().includes(lowerQuery) ||
                (article.summary || '').toLowerCase().includes(lowerQuery)
            ));
        }
    }, [articles]);

    const handleRenameFeed = async () => {
        if (!newTitle.trim()) return;
        const success = await updateFeedTitle(feedId, newTitle.trim(), userId);
        if (success) {
            Alert.alert("Success", "Feed title updated successfully.");
            setUpdatedTitle(newTitle.trim());
            setModalVisible(false);
        } else {
            Alert.alert("Error", "Failed to update feed title.");
        }
    };

    const getItemLayout = (_: any, index: number) => ({
        length: 100,
        offset: 100 * index,
        index,
    });

    const confirmDeleteFeed = () => {
        Alert.alert(
            "Delete Feed",
            "Are you sure you want to delete this feed? This will also remove all associated articles.",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", onPress: handleDeleteFeed, style: "destructive" }
            ]
        );
    };

    const handleDeleteFeed = async () => {
        const success = await deleteFeed(feedId, userId);
        if (success) {
            Alert.alert("Success", "Feed deleted successfully.");
            setModalVisible(false);
            navigation.goBack();
        } else {
            Alert.alert("Error", "Failed to delete the feed.");
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => {
                        if (feedId !== 'all') {
                            setModalVisible(true);
                        }
                    }}
                    disabled={feedId === 'all'}
                >
                    <Text style={[styles.feedTitle, feedId === 'all' && styles.disabledTitle]}>
                        {updatedTitle}
                    </Text>
                </TouchableOpacity>
            </View>
            <TextInput
                style={styles.searchInput}
                placeholder="Search articles..."
                value={searchQuery}
                onChangeText={filterArticles}
            />
            {loading ? (
                <ActivityIndicator size="large" color="#007AFF" testID="loading-indicator" />
            ) : (
                <FlatList
                    data={filteredArticles}
                    keyExtractor={(item) => item.id}
                    refreshControl={<RefreshControl testID="refresh-control" refreshing={refreshing} onRefresh={refreshFeed} />}
                    getItemLayout={getItemLayout}
                    initialNumToRender={10}
                    windowSize={5}
                    renderItem={({ item }) => (
                        <TouchableOpacity onPress={() => navigation.navigate('ArticleDetail', { article: item, userId: item.user_id })}>
                            <View style={styles.articleItem}>
                                {item.image && <Image source={{ uri: item.image }} style={styles.articleImage} />}
                                <View style={styles.articleTextContainer}>
                                    {feedId === 'all' && item.feed_title && (
                                        <Text style={[styles.feedTitle, { color: '#666' }]}>{item.feed_title}</Text>
                                    )}
                                    <Text style={styles.articleTitle}>{item.title}</Text>
                                    <Text style={styles.articleSummary}>{truncateSummary(item.summary, 200)}</Text>
                                    <Text style={styles.articleTime}>{getRelativeTime(item.published)}</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    )}
                />
            )}
            <Modal
                animationType="slide"
                transparent
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Rename or Delete Feed</Text>
                        <TextInput
                            style={styles.input}
                            value={newTitle}
                            onChangeText={setNewTitle}
                            placeholder="Enter new feed title"
                        />
                        <View style={styles.modalButtons}>
                            <Button title="Delete" onPress={confirmDeleteFeed} color="red" />
                            <Button title="Rename" onPress={handleRenameFeed} />
                            <Button title="Cancel" onPress={() => setModalVisible(false)} color="gray" />
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 10, backgroundColor: '#fff' },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
    },
    searchInput: {
        height: 40,
        borderColor: 'gray',
        borderWidth: 1,
        borderRadius: 5,
        paddingLeft: 10,
        marginBottom: 10,
    },
    articleItem: {
        flexDirection: 'row',
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
    },
    articleImage: {
        width: 80,
        height: 80,
        marginRight: 10,
        borderRadius: 5,
    },
    articleTextContainer: { flex: 1 },
    feedTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    articleTitle: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    articleSummary: {
        color: 'gray',
        fontSize: 12,
    },
    articleTime: {
        color: 'gray',
        fontSize: 12,
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        width: '80%',
        padding: 20,
        backgroundColor: 'white',
        borderRadius: 10,
        alignItems: 'center',
    },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
    input: {
        width: '100%',
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
        marginBottom: 20,
        paddingVertical: 5,
    },
    modalButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
    disabledTitle: {
        color: 'gray',
        textDecorationLine: 'none',
    },
});

export default ArticleList;
