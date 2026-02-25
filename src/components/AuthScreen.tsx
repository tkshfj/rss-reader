// AuthScreen.tsx
import React, { useState } from "react";
import { View, Text, TextInput, Button, Alert, StyleSheet } from "react-native";
import { signUp, signIn, checkUserExists } from "../services/auth";

export default function AuthScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Function to handle user authentication
  const handleAuth = async () => {
    try {
      // Check if the email is already registered in the users table
      const userExists = await checkUserExists(email);

      if (userExists) {
        // Sign in the user if they exist
        const user = await signIn(email, password);
        if (user) {
          Alert.alert("Success", "Signed in!");
        }
      } else {
        // Sign up the user if they don't exist
        const newUser = await signUp(email, password);
        if (newUser) {
          Alert.alert("Success", "Check your email for verification");
        }
      }
    } catch (error) {
      Alert.alert("Error", (error as any).message || "An unknown error occurred");
    }
  };

  return (
    <View style={styles.container}>
      <Text>Email:</Text>
      <TextInput value={email} onChangeText={setEmail} placeholder="Enter your email" style={styles.input} />
      <Text>Password:</Text>
      <TextInput value={password} onChangeText={setPassword} placeholder="Enter your password" secureTextEntry style={styles.input} />
      <Button title="Sign Up" onPress={handleAuth} />
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
