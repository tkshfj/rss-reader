// AddFeed.tsx
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Keyboard, TextInput, Button, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import RSSParser from 'react-native-rss-parser';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/StackNavigator';
import { supabase } from '../services/supabase';
import { getUserId } from "../services/auth";

// Component for the form to add a new RSS feed
const AddFeedForm = ({ feedUrl, setFeedUrl, addingFeed, handleAddFeed, textInputRef }: any) => (
    <View style={{ padding: 10, backgroundColor: '#fff' }}>
        <Text style={{ fontSize: 20, fontWeight: "bold", marginTop: 15 }}>Add a New Feed</Text>
        <TextInput
            ref={textInputRef}
            autoCorrect={false}
            autoCapitalize="none"
            keyboardType="url"
            returnKeyType="done"
            style={{
                height: 40,
                borderColor: "gray",
                borderWidth: 1,
                borderRadius: 5,
                paddingLeft: 10,
                marginTop: 10,
            }}
            placeholder="Enter RSS Feed URL"
            value={feedUrl}
            onChangeText={setFeedUrl}
        />
        {addingFeed ? (
            <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 10 }} />
        ) : (
            <Button title="Add Feed" onPress={handleAddFeed} testID="add-feed-button" />
        )}
    </View>
);

// Main component for adding a new RSS feed
const AddFeed = () => {
    const navigation = useNavigation<StackNavigationProp<RootStackParamList, 'AddFeed'>>();
    const [userId, setUserId] = useState<string | null>(null);
    const [feedUrl, setFeedUrl] = useState("");
    const [addingFeed, setAddingFeed] = useState(false);
    const textInputRef = useRef<TextInput>(null);

    // Fetch the user ID when the component mounts
    useEffect(() => {
        getUserId().then(setUserId);
    }, []);

    // Function to parse the RSS feed from the given URL
    const parseRssFeed = async (url: string) => {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const text = await response.text();
            return await RSSParser.parse(text);
        } catch (error) {
            console.error("Error parsing RSS feed:", error);
            return null;
        }
    };

    // Function to add the parsed feed to Supabase
    const addFeedToSupabase = async (title: string, url: string) => {
        if (!userId) {
            return { success: false, message: "User ID is missing. Cannot add feed." };
        }

        try {
            // Check if feed already exists for the user
            const { data: existingFeed, error: checkError } = await supabase
                .from('feeds')
                .select('id')
                .eq('user_id', userId)
                .eq('url', url)
                .single();

            if (checkError && checkError.code !== 'PGRST116') {
                throw new Error(checkError.message);
            }

            if (existingFeed) {
                return { success: false, message: "This feed is already added." };
            }

            // Insert new feed
            const { data, error } = await supabase
                .from('feeds')
                .insert([{ user_id: userId, title, url }])
                .select();

            if (error) throw new Error(error.message);

            return { success: true, data: data?.[0] };
        } catch (err) {
            console.error("Error adding feed:", err);
            return { success: false, message: err.message };
        }
    };

    // Handler for adding a new feed
    const handleAddFeed = async () => {
        if (!feedUrl.trim()) {
            Alert.alert("Error", "Please enter a valid RSS URL.");
            return;
        }
        if (!feedUrl.startsWith('http://') && !feedUrl.startsWith('https://')) {
            Alert.alert("Error", "URL must start with http:// or https://.");
            return;
        }
        Keyboard.dismiss();
        setAddingFeed(true);

        try {
            const parsedFeed = await parseRssFeed(feedUrl);
            if (!parsedFeed?.title) {
                Alert.alert("Error", "Invalid RSS feed. Please check the URL.");
                return;
            }

            const result = await addFeedToSupabase(parsedFeed.title, feedUrl);
            if (result.success) {
                textInputRef.current?.clear();
                setFeedUrl("");
                Alert.alert("Success", "Feed added successfully!");
            } else {
                Alert.alert("Error", result.message);
            }
        } catch (error) {
            Alert.alert("Error", "Failed to add the feed.");
        } finally {
            setAddingFeed(false);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
            <AddFeedForm feedUrl={feedUrl} setFeedUrl={setFeedUrl} addingFeed={addingFeed} handleAddFeed={handleAddFeed} textInputRef={textInputRef} />
        </View>
    );
};

export default AddFeed;
