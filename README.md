# Simple RSS Reader

RSS reader mobile app built with React Native and Expo, backed by Supabase.

## Features

- Subscribe to and manage RSS feeds (RSS 2.0 and Atom)
- Browse and read articles with full HTML rendering
- Bookmark articles for later reading
- Search and filter articles
- Configurable article retention and per-feed article limits
- Dark mode with auto-theme support
- Adjustable font size and line spacing
- EAS Update support for over-the-air updates

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native 0.76 + Expo 52 (TypeScript) |
| Backend | Supabase (PostgreSQL + Auth) |
| State | Zustand 5 (cross-component), React hooks (local) |
| Navigation | React Navigation 7 (native stack) |
| Testing | Jest 29 + jest-expo + @testing-library/react-native |

## Project Structure

All code lives in the `src/` directory.

```
src/
├── App.tsx                # Entry point — auth check + navigator
├── components/            # All screen components
│   ├── AuthScreen.tsx     # Login / sign-up
│   ├── HomeScreen.tsx     # Feed overview + refresh
│   ├── ArticleList.tsx    # Articles for a feed
│   ├── ArticleDetail.tsx  # Full article view (WebView)
│   ├── AddFeed.tsx        # Subscribe to a new feed
│   ├── Bookmarks.tsx      # Saved articles
│   ├── FeedsList.tsx      # Manage subscriptions
│   └── Settings.tsx       # User preferences
├── services/
│   ├── articleService.ts  # Article/feed CRUD + shared Article type
│   ├── auth.ts            # Auth helpers + session management
│   ├── feedStore.ts       # Zustand store for shared article state
│   ├── settingsService.ts # User settings CRUD
│   ├── supabase.ts        # Supabase client initialisation
│   └── utils.ts           # Feed fetching, parsing, cleanup
├── navigation/
│   └── StackNavigator.tsx # Typed RootStackParamList
├── database/
│   ├── schema.sql         # SQLite reference schema
│   └── schema-supabase.sql# Production Supabase schema
├── __tests__/             # Jest tests (mirrors component names)
├── __mocks__/             # Supabase mock with chainable query builder
├── assets/                # App icons and splash images
├── jest.setup.js          # Global test setup + mocks
└── jset.config.ts         # Alternate Jest config (dotenv/config setup)
```

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- A Supabase project (free tier works)

### Installation

```bash
cd src
npm install
```

### Environment Setup

Copy the example env file and fill in your Supabase credentials:

```bash
cp .env.example .env
```

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous (public) key |
| `SUPABASE_TEST_EMAIL` | Email for integration tests only |
| `SUPABASE_TEST_PASSWORD` | Password for integration tests only |

### Running the Dev Server

```bash
npx expo start            # Start dev server
npx expo start --go -c    # Start with cache clear
```

## Screens

| Screen | Description |
|--------|-------------|
| **AuthScreen** | Email/password login and sign-up with Supabase Auth |
| **HomeScreen** | Feed overview with pull-to-refresh and navigation to all other screens |
| **ArticleList** | Scrollable list of articles for a selected feed with search filtering |
| **ArticleDetail** | Full article view rendered in a WebView with bookmark toggle |
| **AddFeed** | Subscribe to a new RSS feed by URL |
| **Bookmarks** | View and manage bookmarked articles |
| **FeedsList** | Manage feed subscriptions with delete; uses Zustand store (`services/feedStore.ts`) for shared state |
| **Settings** | User preferences — dark mode, font size, line spacing, retention, max articles per feed |

## Database Schema

Three tables in Supabase PostgreSQL. All foreign keys use `ON DELETE CASCADE` — deleting a user removes their feeds and articles; deleting a feed removes its articles.

### `users`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `email` | TEXT | Unique, not null |
| `dark_mode` | BOOLEAN | Default `false` |
| `auto_theme` | BOOLEAN | Default `true` |
| `font_size` | INTEGER | Default `12` |
| `line_spacing` | REAL | Default `1.5` |
| `notifications` | BOOLEAN | Default `false` |
| `retention_days` | INTEGER | Default `30` |
| `updated_at` | TIMESTAMP | Auto-set |

### `feeds`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key (auto-generated) |
| `user_id` | UUID | FK → `users(id)` ON DELETE CASCADE |
| `title` | TEXT | Not null |
| `url` | TEXT | Not null |
| `last_updated` | TIMESTAMP | Auto-set |

### `articles`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key (auto-generated) |
| `user_id` | UUID | FK → `users(id)` ON DELETE CASCADE |
| `feed_id` | UUID | FK → `feeds(id)` ON DELETE CASCADE |
| `title` | TEXT | Not null |
| `link` | TEXT | Not null |
| `summary` | TEXT | Article excerpt |
| `content` | TEXT | Full text content |
| `content_html` | TEXT | HTML from `<content:encoded>` |
| `image` | TEXT | Extracted image URL |
| `media_image` | TEXT | From `<media:content>` |
| `author` | TEXT | Comma-separated |
| `published` | TIMESTAMP | Publication date |
| `guid` | TEXT | Unique, not null |
| `identifier_type` | TEXT | e.g. "pmid", "doi" |
| `bookmarked` | BOOLEAN | Default `false` |
| `fetched_at` | TIMESTAMP | Auto-set |

## Testing

```bash
cd src

npm test                       # Run all tests
npm test -- AuthScreen         # Run a single test file
npm test -- --watch            # Watch mode
npm test -- --coverage         # Coverage report
```

### Test Patterns

- Supabase is mocked globally via `jest.setup.js` → `__mocks__/supabase.ts` (chainable query builder)
- Navigation hooks (`useNavigation`, `useFocusEffect`) are mocked per test
- Use `act()` + `waitFor()` for async state updates in component tests
- The alternate config `jset.config.ts` adds `dotenv/config` to setup files for env-dependent tests

## Building

Builds use [EAS Build](https://docs.expo.dev/build/introduction/) with three profiles defined in `eas.json`:

| Profile | Distribution | Notes |
|---------|-------------|-------|
| `development` | Internal | Development client enabled |
| `preview` | Internal | For testing before production |
| `production` | Store | Auto-increments build number |

```bash
eas build --platform ios       # iOS build
eas build --platform android   # Android build
eas build --profile preview    # Preview build
```
