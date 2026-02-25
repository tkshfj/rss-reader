module.exports = {
  preset: "jest-expo",
  setupFiles: ["./jest.setup.js", "dotenv/config"],
  moduleNameMapper: {
    "^@supabase/supabase-js$": "<rootDir>/node_modules/@supabase/supabase-js/dist/module/index.js",
  },
};
