module.exports = {
  preset: "jest-expo",
  setupFiles: ["./jest.setup.js", "dotenv/config"],
  transformIgnorePatterns: [
    "node_modules/(?!(jest-)?react-native|@react-native|@react-native-community|expo(nent)?|@expo(nent)?/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|uuid)/",
  ],
  moduleNameMapper: {
    "^@supabase/supabase-js$": "<rootDir>/node_modules/@supabase/supabase-js/dist/module/index.js",
  },
};
