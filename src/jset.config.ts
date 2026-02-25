module.exports = {
  preset: "react-native",
  setupFiles: ["./jest.setup.js", "dotenv/config"],
  testEnvironment: "node",  // Use Node environment for Supabase
  transformIgnorePatterns: [
    "node_modules/(?!(react-native|@react-native|@react-native-community|@react-navigation|@supabase)/)",
  ],
  moduleNameMapper: {
    "^@supabase/supabase-js$": "<rootDir>/node_modules/@supabase/supabase-js/dist/module/index.js",
  },
};
