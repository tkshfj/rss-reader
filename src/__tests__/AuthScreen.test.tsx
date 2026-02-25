// src/screens/__tests__/AuthScreen.test.tsx
import React from "react";
import { Alert } from "react-native";
import { render, fireEvent, waitFor, screen } from "@testing-library/react-native";
import AuthScreen from "../components/AuthScreen";
import { signUp, signIn, checkUserExists } from "../services/auth";
import { supabase } from "../services/supabase"; // Import mock

jest.mock("../services/auth"); // Mock the authentication service
jest.mock("../services/supabase");  // Mock Supabase globally

describe("AuthScreen Authentication Flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("signs in an existing user", async () => {
    (checkUserExists as jest.Mock).mockResolvedValue(true);
    (signIn as jest.Mock).mockResolvedValue({ id: "123", email: "user@example.com" });
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: { user: { id: "123" } } }, error: null });

    render(<AuthScreen />);

    fireEvent.changeText(screen.getByPlaceholderText("Enter your email"), "user@example.com");
    fireEvent.changeText(screen.getByPlaceholderText("Enter your password"), "password123");
    fireEvent.press(screen.getByText("Sign Up"));

    await waitFor(() => {
      expect(checkUserExists).toHaveBeenCalledWith("user@example.com");
      expect(signIn).toHaveBeenCalledWith("user@example.com", "password123");
    });
  });

  test("signs up a new user when email does not exist", async () => {
    (checkUserExists as jest.Mock).mockResolvedValue(false);
    (signUp as jest.Mock).mockResolvedValue({ id: "456", email: "newuser@example.com" });
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: { user: { id: "456" } } }, error: null });

    render(<AuthScreen />);

    fireEvent.changeText(screen.getByPlaceholderText("Enter your email"), "newuser@example.com");
    fireEvent.changeText(screen.getByPlaceholderText("Enter your password"), "securepass");
    fireEvent.press(screen.getByText("Sign Up"));

    await waitFor(() => {
      expect(checkUserExists).toHaveBeenCalledWith("newuser@example.com");
      expect(signUp).toHaveBeenCalledWith("newuser@example.com", "securepass");
    });
  });

  test("shows an alert on authentication error", async () => {
    (checkUserExists as jest.Mock).mockResolvedValue(true);
    (signIn as jest.Mock).mockRejectedValue(new Error("Invalid credentials"));
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: null, error: "Auth session missing!" });

    jest.spyOn(Alert, "alert");

    render(<AuthScreen />);

    fireEvent.changeText(screen.getByPlaceholderText("Enter your email"), "wrong@example.com");
    fireEvent.changeText(screen.getByPlaceholderText("Enter your password"), "wrongpass");
    fireEvent.press(screen.getByText("Sign Up"));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith("Error", "Invalid credentials");
    });
  });

  test("shows an alert when sign-up fails", async () => {
    (checkUserExists as jest.Mock).mockResolvedValue(false);
    (signUp as jest.Mock).mockRejectedValue(new Error("Email already in use"));
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: null, error: "Auth session missing!" });

    jest.spyOn(Alert, "alert");

    render(<AuthScreen />);

    fireEvent.changeText(screen.getByPlaceholderText("Enter your email"), "existing@example.com");
    fireEvent.changeText(screen.getByPlaceholderText("Enter your password"), "password123");
    fireEvent.press(screen.getByText("Sign Up"));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith("Error", "Email already in use");
    });
  });
});
