// ArticleDetail.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Image, StyleSheet, TouchableOpacity, ActivityIndicator, Linking, useColorScheme, Alert } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/StackNavigator';
import RenderHTML from 'react-native-render-html';
import { useWindowDimensions } from 'react-native';
import { Article, fetchArticleById, getBookmarkStatus, setBookmarkStatus } from '../services/articleService';
import { getUserSettings } from '../services/settingsService';
import { getRelativeTime } from '../services/utils';

// Dangerous HTML tags to strip from RSS content for security
const DANGEROUS_TAGS = ['script', 'iframe', 'form', 'embed', 'object', 'style', 'link', 'meta'];

// Standard HTML tags for filtering out custom/unknown tags from RSS content
const STANDARD_TAGS = new Set([
  'html', 'head', 'title', 'base', 'noscript', 'body', 'section', 'nav', 'article', 'aside', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'footer', 'address', 'main', 'p', 'hr', 'pre', 'blockquote', 'ol', 'ul', 'li', 'dl', 'dt', 'dd', 'figure', 'figcaption', 'div', 'a', 'em', 'strong', 'small', 's', 'cite', 'q', 'dfn', 'abbr', 'ruby', 'rt', 'rp', 'data', 'time', 'code', 'var', 'samp', 'kbd', 'sub', 'sup', 'i', 'b', 'u', 'mark', 'bdi', 'bdo', 'span', 'br', 'wbr', 'ins', 'del', 'picture', 'source', 'img', 'param', 'video', 'audio', 'track', 'map', 'area', 'table', 'caption', 'colgroup', 'col', 'tbody', 'thead', 'tfoot', 'tr', 'td', 'th', 'label', 'input', 'button', 'select', 'datalist', 'optgroup', 'option', 'textarea', 'output', 'progress', 'meter', 'fieldset', 'legend', 'details', 'summary', 'dialog', 'template', 'canvas'
]);

const extractCustomTags = (html: string): string[] => {
  const regex = /<\/?([a-zA-Z0-9]+)[^>]*>/g;
  const customTags = new Set<string>();
  let match;
  while ((match = regex.exec(html)) !== null) {
    const tagName = match[1].toLowerCase();
    if (!STANDARD_TAGS.has(tagName)) {
      customTags.add(tagName);
    }
  }
  return Array.from(customTags);
};

// Define the types for the ArticleDetail component
type ArticleDetailRouteProp = RouteProp<RootStackParamList, 'ArticleDetail'>;
type ArticleDetailNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ArticleDetail'>;

type Props = {
  route: ArticleDetailRouteProp;
  navigation: ArticleDetailNavigationProp;
};

// ArticleDetail component
const ArticleDetail: React.FC<Props> = ({ route, navigation }) => {
  const { articleId, userId } = route.params;
  const { width } = useWindowDimensions();
  const [article, setArticle] = useState<Article | null>(null);
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false);
  const systemTheme = useColorScheme();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    auto_theme: true,
    dark_mode: false,
    font_size: 16,
    line_spacing: 1.5,
  });

  // Fetch article, bookmark status, and user settings
  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        const [fetchedArticle, bookmarked, userSettings] = await Promise.all([
          fetchArticleById(articleId, userId),
          getBookmarkStatus(articleId, userId),
          getUserSettings(userId),
        ]);

        if (cancelled) return;

        setArticle(fetchedArticle);
        setIsBookmarked(bookmarked);

        if (userSettings) {
          setSettings({
            auto_theme: userSettings.auto_theme ?? true,
            dark_mode: userSettings.dark_mode ?? false,
            font_size: userSettings.font_size ?? 16,
            line_spacing: userSettings.line_spacing ?? 1.5,
          });
        }
      } catch (error) {
        console.error('Error loading article detail data:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadData();
    return () => { cancelled = true; };
  }, [articleId, userId]);

  // Toggle the bookmark status of the article
  const toggleBookmark = async () => {
    if (!article?.id) return;

    const newStatus = !isBookmarked;
    setIsBookmarked(newStatus); // Update UI immediately

    try {
        await setBookmarkStatus(article.id, userId, newStatus);
    } catch (error) {
        console.error('Error toggling bookmark:', error);
        setIsBookmarked(!newStatus); // Revert on failure
    }
  };

  // Determine if dark mode should be enabled based on user settings and system theme
  const effectiveDarkMode = settings.auto_theme ? systemTheme === "dark" : settings.dark_mode;

  // Memoize custom tag extraction + dangerous tags so it only runs when the summary changes
  const ignoredTags = useMemo(() => {
    if (!article?.summary) return DANGEROUS_TAGS;
    const custom = extractCustomTags(article.summary);
    return [...new Set([...custom, ...DANGEROUS_TAGS])];
  }, [article?.summary]);

  // Derive feed title from the article object
  const feedTitle = article?.feed_title ?? article?.feeds?.title ?? 'Unknown Feed';

  if (loading || !article) {
    return (
      <View style={[styles.container, effectiveDarkMode && styles.darkMode]}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={[styles.container, effectiveDarkMode && styles.darkMode]}>
      <ScrollView>
        <Text style={[styles.feedTitle, { color: effectiveDarkMode ? '#ccc' : '#666' }]}>
          {feedTitle}
        </Text>
        <Text style={[styles.title, { fontSize: settings.font_size + 4, color: effectiveDarkMode ? '#fff' : '#000' }]}>
          {article.title}
        </Text>
        {article.image && <Image source={{ uri: article.image }} style={styles.image} />}
        <Text style={styles.articleMeta}>
          {article.author || 'Unknown'} | {getRelativeTime(article.published)}
        </Text>
        <RenderHTML
          contentWidth={width}
          source={{ html: article.summary }}
          ignoredDomTags={ignoredTags}
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
              if (/^https?:\/\//i.test(article.link)) {
                Linking.openURL(article.link);
              } else {
                Alert.alert('Invalid Link', 'This article link appears to be invalid.');
              }
            } else {
              Alert.alert('No Link', 'This article does not have a link.');
            }
          }}
        >
          <Text style={styles.buttonText}>Read More</Text>
        </TouchableOpacity>
      </ScrollView>
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
  articleMeta: {
    fontSize: 16,
    color: 'gray',
    marginTop: 10,
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
