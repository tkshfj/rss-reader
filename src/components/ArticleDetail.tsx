// ArticleDetail.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, Image, StyleSheet, TouchableOpacity, ActivityIndicator, Linking, useColorScheme, Alert } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/StackNavigator';
import RenderHTML from 'react-native-render-html';
import { useWindowDimensions } from 'react-native';
import { supabase } from '../services/supabase';
import { getRelativeTime } from '../services/utils';

// Define the types for the ArticleDetail component
type ArticleDetailRouteProp = RouteProp<RootStackParamList, 'ArticleDetail'>;
type ArticleDetailNavigationProp = StackNavigationProp<RootStackParamList, 'ArticleDetail'>;

type Props = {
  route: ArticleDetailRouteProp;
  navigation: ArticleDetailNavigationProp;
};

// ArticleDetail component
const ArticleDetail: React.FC<Props> = ({ route, navigation }) => {
  const { article, userId } = route.params;
  const { width } = useWindowDimensions();
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false);
  const [feedTitle, setFeedTitle] = useState<string | null>(null);
  const systemTheme = useColorScheme();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    auto_theme: true,
    dark_mode: false,
    font_size: 16,
    line_spacing: 1.5,
  });

  // Fetch feed title from the database based on the article's feed_id
  const fetchFeedTitle = useCallback(async () => {
    if (!article?.feed_id) return;

    try {
      const { data, error } = await supabase
        .from('feeds')
        .select('title')
        .eq('id', article.feed_id)
        .single();

      if (error) throw new Error(error.message);

      setFeedTitle(data?.title || 'Unknown Feed');
    } catch (error) {
      console.error('Error fetching feed title:', error);
    }
  }, [article?.feed_id]);

  // Check if the article is bookmarked by the user
  const checkIfBookmarked = useCallback(async () => {
    if (!article?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('articles')
        .select('bookmarked')
        .eq('id', article.id)
        .single();

      if (error) throw new Error(error.message);

      setIsBookmarked(data?.bookmarked ?? false);
    } catch (error) {
      console.error('Error checking bookmark status:', error);
    } finally {
      setLoading(false);
    }
  }, [article?.id]);

  // Fetch user settings from Supabase
  const fetchUserSettings = useCallback(async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('users')
        .select('auto_theme, dark_mode, font_size, line_spacing')
        .eq('id', userId)
        .single();

      if (error) throw new Error(error.message);

      if (data) {
        setSettings({
          auto_theme: data.auto_theme ?? true,
          dark_mode: data.dark_mode ?? false,
          font_size: data.font_size ?? 16,
          line_spacing: data.line_spacing ?? 1.5,
        });
      }
    } catch (error) {
      console.error('Error fetching user settings:', error);
    }
  }, [userId]);

  // Fetch feed title, bookmark status, and user settings when the article changes
  useEffect(() => {
    if (article) {
      fetchFeedTitle();
      checkIfBookmarked();
      fetchUserSettings();
    }
  }, [article, fetchFeedTitle, checkIfBookmarked, fetchUserSettings]);

  // Toggle the bookmark status of the article
  const toggleBookmark = async () => {
    if (!article?.id) {
        console.error('Error: article is undefined', article);
        return;
    }

    const newStatus = !isBookmarked;
    setIsBookmarked(newStatus); // Update UI immediately

    try {
        const { error } = await supabase
            .from('articles')
            .update({ bookmarked: newStatus })
            .eq('id', article.id);

        if (error) {
            console.error('Error toggling bookmark:', error);
            setIsBookmarked(!newStatus); // Revert if update fails
        }
    } catch (error) {
        console.error('Error toggling bookmark:', error);
        setIsBookmarked(!newStatus); // Revert if there's an error
    }
  };

  // Determine if dark mode should be enabled based on user settings and system theme
  // Note: Dark mode is not implemented this time
  const effectiveDarkMode = settings.auto_theme ? systemTheme === "dark" : settings.dark_mode;

  // Function to extract custom tags from HTML content
  const extractCustomTags = (html: string) => {
    const regex = /<\/?([a-zA-Z0-9]+)[^>]*>/g;
    const standardTags = new Set([
      'html', 'head', 'title', 'base', 'link', 'meta', 'style', 'script', 'noscript', 'body', 'section', 'nav', 'article', 'aside', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'footer', 'address', 'main', 'p', 'hr', 'pre', 'blockquote', 'ol', 'ul', 'li', 'dl', 'dt', 'dd', 'figure', 'figcaption', 'div', 'a', 'em', 'strong', 'small', 's', 'cite', 'q', 'dfn', 'abbr', 'ruby', 'rt', 'rp', 'data', 'time', 'code', 'var', 'samp', 'kbd', 'sub', 'sup', 'i', 'b', 'u', 'mark', 'bdi', 'bdo', 'span', 'br', 'wbr', 'ins', 'del', 'picture', 'source', 'img', 'iframe', 'embed', 'object', 'param', 'video', 'audio', 'track', 'map', 'area', 'table', 'caption', 'colgroup', 'col', 'tbody', 'thead', 'tfoot', 'tr', 'td', 'th', 'form', 'label', 'input', 'button', 'select', 'datalist', 'optgroup', 'option', 'textarea', 'output', 'progress', 'meter', 'fieldset', 'legend', 'details', 'summary', 'dialog', 'script', 'noscript', 'template', 'canvas'
    ]);
    const customTags = new Set<string>();

    let match;
    while ((match = regex.exec(html)) !== null) {
      const tagName = match[1].toLowerCase();
      if (!standardTags.has(tagName)) {
        customTags.add(tagName);
      }
    }

    return Array.from(customTags);
  };

  // Extract custom tags from article summary
  const customTags = extractCustomTags(article.summary);

  return (
    <View style={[styles.container, effectiveDarkMode && styles.darkMode]}>
      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" />
      ) : (
        <ScrollView>
          <Text style={[styles.feedTitle, { color: effectiveDarkMode ? '#ccc' : '#666' }]}>
            {feedTitle}
          </Text>
          <Text style={[styles.title, { fontSize: settings.font_size + 4, color: effectiveDarkMode ? '#fff' : '#000' }]}>
            {article.title}
          </Text>
          {article.image && <Image source={{ uri: article.image }} style={styles.image} />}
          <Text style={{ fontSize: 16, color: 'gray', marginTop: 10 }}>
          {article.author || 'Unknown'} | {getRelativeTime(article.published)}
          </Text>
          <RenderHTML
            contentWidth={width}
            source={{ html: article.summary }}
            ignoredDomTags={customTags}
          />
          {/* Bookmark Button */}
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: isBookmarked ? 'red' : '#007AFF' }]}
            onPress={toggleBookmark}
          >
            <Text style={styles.buttonText}>
              {isBookmarked ? 'Remove Bookmark' : 'Bookmark This'}
            </Text>
          </TouchableOpacity>

          {/* Read More Button */}
          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              if (article.link) {
                Linking.openURL(article.link);
              } else {
                Alert.alert('No Link', 'This article does not have a link.');
              }
            }}
          >
            <Text style={styles.buttonText}>Read More</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
};

// Define styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  darkMode: {
    backgroundColor: '#222',
  },
  feedTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
    textAlign: 'left',
  },
  title: {
    fontWeight: 'bold',
  },
  image: {
    width: '100%',
    height: 200,
    marginVertical: 10,
  },
  button: {
    marginTop: 20,
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    backgroundColor: '#007AFF',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
});

export default ArticleDetail;
