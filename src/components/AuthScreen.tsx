// AuthScreen.tsx
import React, { useState } from "react";
import { View, Text, TextInput, Button, Alert, StyleSheet } from "react-native";
import { signUp, signIn, checkUserExists } from "../services/auth";

export default function AuthScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Function to handle user authentication
  const handleAuth = async () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !/\S+@\S+\.\S+/.test(trimmedEmail)) {
      Alert.alert("Error", "Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters.");
      return;
    }

    try {
      const userExists = await checkUserExists(trimmedEmail);

      if (userExists) {
        const user = await signIn(trimmedEmail, password);
        if (user) {
          Alert.alert("Success", "Signed in!");
        }
      } else {
        const newUser = await signUp(trimmedEmail, password);
        if (newUser) {
          Alert.alert("Success", "Check your email for verification");
        }
      }
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "An unknown error occurred");
    }
  };

  return (
    <View style={styles.container}>
      <Text>Email:</Text>
      <TextInput value={email} onChangeText={setEmail} placeholder="Enter your email" style={styles.input} />
      <Text>Password:</Text>
      <TextInput value={password} onChangeText={setPassword} placeholder="Enter your password" secureTextEntry style={styles.input} />
      <Button title="Continue" onPress={handleAuth} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  input: {
    borderWidth: 1,
    padding: 8,
    marginBottom: 10,
  },
});
