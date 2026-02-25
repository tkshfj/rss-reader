# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RSS reader mobile app built with React Native and Expo (TypeScript). All code lives in the `src/` directory.

## Common Commands

All commands run from `src/`:

```bash
# Development
npx expo start --go -c        # Start dev server with cache clear
npx expo start                 # Start dev server

# Testing
npm test                       # Run all tests
npm test -- AuthScreen         # Run a single test file by name
npm test -- --watch            # Watch mode
npm test -- --coverage         # Coverage report

# Build (EAS)
eas build --platform ios       # iOS build
eas build --platform android   # Android build
```

## Architecture

### Tech Stack
- **Framework:** React Native 0.76 + Expo 52 (TypeScript)
- **Backend:** Supabase (PostgreSQL + Auth, supabase-js 2.49)
- **State:** Zustand 5 for cross-component state, React hooks for local state
- **Navigation:** React Navigation 7 (native stack)
- **Testing:** Jest 29 + jest-expo + @testing-library/react-native

### Data Flow
```
App.tsx → auth check (AsyncStorage + Supabase listener) → StackNavigator
  ├── AuthScreen (unauthenticated)
  └── Authenticated stack:
      HomeScreen → ArticleList → ArticleDetail
                → AddFeed
                → Bookmarks
                → FeedsList (uses useFeedStore Zustand store for shared article state)
                → Settings
```

### Key Directories (src/)
- `components/` — All screen components (HomeScreen, ArticleList, etc.)
- `services/` — `auth.ts` (auth + session), `supabase.ts` (client init), `articleService.ts` (article/feed CRUD), `feedStore.ts` (Zustand store), `settingsService.ts` (user settings CRUD), `utils.ts` (feed fetching, cleanup)
- `navigation/` — `StackNavigator.tsx` with typed `RootStackParamList`
- `database/` — SQL schema files (schema.sql for SQLite reference, schema-supabase.sql for production)
- `__tests__/` — Jest tests mirroring component names
- `__mocks__/` — Supabase mock with chainable query builder

### Database (Supabase PostgreSQL)
Three main tables: `users` (settings + preferences, includes `max_articles_per_feed`), `feeds` (subscriptions per user), `articles` (with guid uniqueness, bookmarking, retention). Foreign keys use `ON DELETE CASCADE`: `feeds.user_id` → `users(id)`, `articles.feed_id` → `feeds(id)`, `articles.user_id` → `users(id)`.

### Environment Variables
Expo `EXPO_PUBLIC_` prefix required for app-accessible vars. Copy `.env.example` to `.env`:
- `EXPO_PUBLIC_SUPABASE_URL` — Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` — Supabase anonymous key
- `SUPABASE_TEST_EMAIL` / `SUPABASE_TEST_PASSWORD` — for integration tests only

### Testing Patterns
- Supabase is mocked globally via `jest.setup.js` → `__mocks__/supabase.ts`
- Navigation hooks (`useNavigation`, `useFocusEffect`) are mocked per test
- Use `act()` + `waitFor()` for async state updates in component tests
- Note: `jset.config.ts` (filename typo, kept for compatibility) uses `dotenv/config` in setupFiles for env-dependent tests
