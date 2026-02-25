// AuthScreen.tsx
import React, { useState } from "react";
import { View, Text, TextInput, Button, Alert } from "react-native";
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
    <View style={{ padding: 20 }}>
      <Text>Email:</Text>
      <TextInput value={email} onChangeText={setEmail} placeholder="Enter your email" style={{ borderWidth: 1, padding: 8, marginBottom: 10 }} />
      <Text>Password:</Text>
      <TextInput value={password} onChangeText={setPassword} placeholder="Enter your password" secureTextEntry style={{ borderWidth: 1, padding: 8, marginBottom: 10 }} />
      <Button title="Sign Up" onPress={handleAuth} />
    </View>
  );
}
