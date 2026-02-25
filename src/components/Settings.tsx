// Settings.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Button, Alert } from 'react-native';
import Slider from '@react-native-community/slider';
import { StackScreenProps } from '@react-navigation/stack';
import { deleteOldArticles } from '../services/utils';
import { RootStackParamList } from '../navigation/StackNavigator';
import { signOut } from "../services/auth";
import { getUserSettings, updateUserSettings, DEFAULT_SETTINGS } from '../services/settingsService';

// Define the types for the Settings component
type Props = StackScreenProps<RootStackParamList, 'Settings'>;

// Settings component to display and update user settings
const Settings: React.FC<Props> = ({ route }) => {
    const userId = route.params?.userId ?? '';
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);

    // Fetch user settings when the component mounts
    useEffect(() => {
        const fetchSettings = async () => {
            if (!userId) return;
            try {
                const data = await getUserSettings(userId);
                if (data) setSettings(data);
            } catch (error) {
                Alert.alert("Error", "Failed to load user settings.");
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, [userId]);

    // Update a specific setting
    const updateSetting = (key: keyof typeof settings, value: boolean | number) => {
        setSettings((prev) => ({ ...prev, [key]: value }));
    };

    // Save settings to the database
    const saveSettings = useCallback(async () => {
        try {
            await updateUserSettings(userId, settings);
            Alert.alert("Settings Saved", "Your preferences have been updated.");
        } catch (error) {
            Alert.alert("Error", "Failed to update settings.");
        }
    }, [userId, settings]);

    // Handle manual cleanup of old articles
    const handleManualCleanup = useCallback(async () => {
        try {
            await deleteOldArticles(userId);
            Alert.alert("Cleanup Completed", "Old unbookmarked articles have been deleted.");
        } catch (error) {
            Alert.alert("Error", "Failed to delete old articles.");
        }
    }, [userId]);

    return (
        <View style={{ flex: 1, padding: 20 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold' }}>User Settings</Text>

            <SettingsItem label={`Max Articles per Feed: ${settings.max_articles_per_feed}`}>
                <Slider
                    minimumValue={10}
                    maximumValue={200}
                    step={10}
                    value={settings.max_articles_per_feed}
                    onValueChange={(val) => updateSetting('max_articles_per_feed', val)}
                />
            </SettingsItem>

            <SettingsItem label={`Delete Articles Older Than: ${settings.retention_days} Days`}>
                <Slider
                    minimumValue={0}
                    maximumValue={90}
                    step={5}
                    value={settings.retention_days}
                    onValueChange={(val) => updateSetting('retention_days', val)}
                />
            </SettingsItem>

            <Button title="Save Settings" onPress={saveSettings} />

            <View style={{ marginTop: 20 }}>
                <Button title="Delete Old Articles Now" color="red" onPress={handleManualCleanup} />
            </View>
            <View style={{ marginTop: 20 }}>
                <Button title="Sign Out" onPress={signOut} />
            </View>
        </View>
    );
};

// Component for rendering a settings item
const SettingsItem: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <View style={{ marginVertical: 15 }}>
        <Text>{label}</Text>
        {children}
    </View>
);

export default Settings;
