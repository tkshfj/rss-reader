// HomeScreen.tsx
import React, { useState, useCallback } from 'react';
import { SafeAreaView, ScrollView, View, Text, TouchableOpacity, Button, ActivityIndicator, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';
import { Cell, TableView } from "react-native-tableview-simple";
import { RootStackParamList } from '../navigation/StackNavigator';
import { fetchFeeds } from '../services/utils';
import { supabase } from '../services/supabase';

// Define the props for the HomeScreen component
type Props = StackNavigationProp<RootStackParamList, "Home">;

// HomeScreen component to display the list of feeds
const HomeScreen: React.FC<Props> = () => {
  const navigation = useNavigation<Props>();

  const [expandedSections, setExpandedSections] = useState({
    Home: true,
    Saved: true,
    Feeds: true,
  });

  const [feeds, setFeeds] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Fetch authenticated user ID and feeds
  const fetchUserAndFeeds = async () => {
    setLoading(true);
    try {
      // Get user from Supabase auth
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) throw new Error("User not found");
      const fetchedUserId = data.user.id;
      setUserId(fetchedUserId);

      // Fetch user feeds only after userId is obtained
      const fetchedFeeds = await fetchFeeds(fetchedUserId);
      setFeeds(fetchedFeeds);
    } catch (err) {
      console.error("Error fetching user or feeds:", err);
    } finally {
      setLoading(false);
    }
  };

  // Refresh HomeScreen when returning from other screens
  useFocusEffect(
    useCallback(() => {
      fetchUserAndFeeds(); // Ensures user and feeds are fetched together
    }, [])
  );

  // Toggle section visibility
  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Buttons */}
      <View style={styles.headerContainer}>
        <TouchableOpacity style={styles.tinyButton} onPress={() => userId && navigation.navigate('Settings', { userId })} disabled={!userId}>
          <Text style={styles.tinyButtonText}>Settings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tinyButton} onPress={() => userId && navigation.navigate('AddFeed', { userId })} disabled={!userId}>
          <Text style={styles.tinyButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <ScrollView keyboardShouldPersistTaps="handled">
        <TableView>
          {/* Collapsible Home Section */}
          <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection('Home')}>
            <Text style={styles.sectionHeaderText}>Home</Text>
          </TouchableOpacity>
          {expandedSections.Home && (
            <Cell 
              cellStyle="Basic" 
              title="All Feeds" 
              accessory="DisclosureIndicator" 
              onPress={() => userId && navigation.navigate('ArticleList', { feedId: 'all', feedTitle: 'All Feeds', userId })}
              contentContainerStyle={styles.listItem} 
            />
          )}

          {/* Collapsible Saved Section */}
          <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection('Saved')}>
            <Text style={styles.sectionHeaderText}>Saved</Text>
          </TouchableOpacity>
          {expandedSections.Saved && (
            <Cell 
              cellStyle="Basic" 
              title="Bookmarks" 
              accessory="DisclosureIndicator" 
              onPress={() => userId && navigation.navigate('Bookmarks', { userId })}
              contentContainerStyle={styles.listItem} 
            />
          )}

          {/* Collapsible Feeds Section */}
          <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection('Feeds')}>
            <Text style={styles.sectionHeaderText}>Feeds</Text>
          </TouchableOpacity>
          {expandedSections.Feeds && (
            loading ? (
              <ActivityIndicator testID={'loading-indicator'} size="small" color="#0000ff" style={{ marginVertical: 10 }} />
            ) : feeds.length === 0 ? (
              <Text style={{ padding: 10, textAlign: 'center' }}>No feeds available</Text>
            ) : (
              feeds.map((feed) => (
                <Cell 
                  key={feed.id} 
                  cellStyle="Basic" 
                  title={feed.title} 
                  accessory="DisclosureIndicator" 
                  onPress={() => userId && navigation.navigate('ArticleList', { feedId: feed.id, feedTitle: feed.title, userId })}
                  contentContainerStyle={styles.listItem} 
                />
              ))
            )
          )}
        </TableView>
      </ScrollView>
    </SafeAreaView>
  );
};

// Styles for the HomeScreen component
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  tinyButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  tinyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  listItem: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: '100%',
    alignSelf: 'stretch',
  },
  sectionHeader: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f4f4f4',
  },
  sectionHeaderText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default HomeScreen;
