# Watashiwomite - MyAnimeList to Sonarr Integration

> [!WARNING] 
> This application is currently in beta. Expect bugs and incomplete features. Use at your own risk.

## What is This?

**Watashiwomite** automatically syncs your MyAnimeList (MAL) "Watching" list with Sonarr, making anime library management seamless. 

### How It Works

1. **Fetches** your currently watching anime from MyAnimeList
2. **Searches** The TVDB for matching series that are tagged as Anime/Animation
3. **Correlates** TVDB IDs with MAL IDs for accurate tracking
4. **Adds** missing shows to Sonarr automatically

The key innovation is creating a correlation between MAL and Sonarr using TVDB as the bridge, allowing you to manage your anime library using the MAL interface you already love.

### What is MAL/Sonarr/TVDB?
- **[MyAnimeList (MAL)](https://myanimelist.org/)** - Popular anime tracking and discovery platform
- **[Sonarr](https://sonarr.tv/)** - Automated TV show download and organization tool
- **[TVDB](https://thetvdb.com/)** - Community-driven TV show metadata database

---

## Screenshots

### First-Time Setup Flow
![Setup Step 1](assets/screenshot-setup-mal.png)
*Initial setup wizard - Configure your MAL OAUTH application*

![Setup Step 2](assets/screenshot-setup-sonarr.png)
*Step 2 - Add your Sonarr API key and URL with validation*

![Setup Step 3](assets/screenshot-setup-tvdb.png)
*Step 3 - Configure TVDB API keys with validation*

### Landing Page
![Landing Page](assets/screenshot-landing.png)
*Clean, modern landing page with hero section and OAuth login*

### Dashboard Hero Stats
![Dashboard Hero](assets/screenshot-hero-stats.png)
*At-a-glance statistics: Total Anime, Synced, Need Sync, and Errors*

### Dashboard - Your List
![Dashboard - Your List](assets/screenshot-dashboard.png)
*Visual overview of your anime collection with sync status indicators*

### Sync Page
![Sync Configuration](assets/screenshot-sync.png)
*Configure which MAL lists to sync (Watching, Completed, Plan to Watch, etc.)*

### Settings Page
![Settings](assets/screenshot-settings.png)
*User profile and account management*

### Mobile View
![Mobile Responsive](assets/screenshot-mobile.png)
*Fully responsive design with mobile navigation drawer*

---

## Features

### Navigation & UI
- Modern navbar navigation with dedicated pages (Dashboard, Sync, Settings)
- Fully responsive mobile design with hamburger menu
- Glassmorphic design with smooth animations
- Immersive hero section with profile background
- Active page indication and smooth transitions
- **First-time setup wizard** - Guided configuration with API key validation

### Sync System
- Automatic sync between MAL and Sonarr
- Fuzzy title matching using Levenshtein distance
- Customizable list selection (Watching, Completed, Plan to Watch, etc.)
- 4-stat overview: Total Anime, Synced, Need Sync, **Errors**
- **Error tracking** - Separate display for failed syncs
- Selective anime removal from Sonarr
- Sync preview mode
- Sync history with audit trail

### Advanced Features
- Smart duplicate detection
- Batch actions (metadata refresh, episode search)
- Conflict resolution strategies
- Score-based auto-monitoring
- Intelligent episode filtering (skip OVAs, specials, movies)
- User preferences with 20+ configurable options

### Developer Features
- OAuth 2.0 authentication with MyAnimeList
- Swagger API documentation
- PostgreSQL with Prisma ORM
- Rate limiting and caching
- Health check endpoints
- **Comprehensive test suite** - 489 tests with 24.68% coverage (backend utilities at 96%+)
- **Modular architecture** - Clean separation of MAL, TVDB, and Sonarr utilities  

---

## Prerequisites

### Required Accounts & API Keys

| Service | What You Need | How to Get It |
|---------|---------------|---------------|
| **PostgreSQL** | Database instance | [Install locally](https://www.postgresql.org/download/) or use hosted service |
| **MyAnimeList API** | Client ID & Secret | [MAL Developer Portal](https://myanimelist.net/apiconfig) - Register your app |
| **TVDB API** | API Key | [TVDB API Info](https://thetvdb.com/api-information) - Fill out form |
| **Sonarr** | API Key & URL | Settings → General in your Sonarr installation |

### System Requirements
- **Node.js** >= 21.0.0
- **PostgreSQL** (any recent version)
- **npm** or **pnpm**

---

## Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd Watashiwomite
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables

> **Note:** You can now configure MAL, Sonarr, and TVDB settings through the **first-time setup wizard** in the UI! The wizard validates API keys before you proceed.

Create a `.env` file:
```bash
cp .env.example .env
```

**Required for startup:**
```env
POSTGRES_PRISMA_URL="postgresql://user:pass@localhost:5432/watashiwomite"
POSTGRES_URL_NON_POOLING="postgresql://user:pass@localhost:5432/watashiwomite"
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
```

**Optional (can be configured via setup wizard):**

| Variable | Description | Example |
|----------|-------------|---------|
| `POSTGRES_PRISMA_URL` | PostgreSQL connection URL for Prisma | `postgresql://user:pass@localhost:5432/watashiwomite` |
| `POSTGRES_URL_NON_POOLING` | Non-pooling PostgreSQL URL | Same as above |
| `NEXT_PUBLIC_BASE_URL` | Your app's base URL | `http://localhost:3000` (dev) |
| `MAL_CLIENT_ID` | MyAnimeList OAuth Client ID (optional) | From MAL Developer Portal |
| `MAL_CLIENT_SECRET` | MyAnimeList OAuth Client Secret (optional) | From MAL Developer Portal |
| `MAL_REDIRECT_URI` | OAuth redirect URI (optional) | `http://localhost:3000/api/oauth/step2` (dev) |
| `SONARR_API_KEY` | Your Sonarr API Key (optional) | From Sonarr Settings → General |
| `SONARR_URL` | Your Sonarr instance URL (optional) | `http://localhost:8989` |
| `TVDBID_API_KEY` | TVDB API Key (optional) | From TVDB API Portal |

> **Important:** 
> - Database settings (POSTGRES_*) must be in `.env` before starting the app
> - MAL, Sonarr, and TVDB can be configured through the setup wizard on first launch
> - The setup wizard validates your API keys before allowing you to proceed
> - For OAuth, the redirect URI **must exactly match** in both `.env` and MAL Developer Portal

### 4. Set Up the Database
```bash
npx prisma migrate dev
```

This creates all necessary tables in your PostgreSQL database.

### 5. Start the Development Server
```bash
npm run dev
```

Open your browser to **http://localhost:3000**

> **Note:** For local development, HTTP is sufficient. For production deployment, use HTTPS.

---

## Usage

### First Time Setup

When you first launch the app, you'll be guided through a **3-step setup wizard**:

#### Step 1: Database Configuration
Already configured via your `.env` file - this step just verifies the connection.

#### Step 2: MyAnimeList API Setup
1. Enter your MAL Client ID and Client Secret
2. Configure your OAuth redirect URI
3. The wizard validates your settings before proceeding

#### Step 3: Sonarr & TVDB Setup  
1. Enter your Sonarr URL and API Key
2. Enter your TVDB API Key
3. **API keys are validated** - you can't proceed with invalid credentials
4. This prevents wasting TVDB credits and saves debugging time

After setup completes:
1. **Click "Login with MyAnimeList"** on the home page
2. **Authorize the application** on MyAnimeList
3. **Wait for initial sync** - Your anime list will be fetched automatically
4. **You'll be redirected to the Dashboard** when ready

> **Note:** The OAuth callback now waits for your anime list to be fetched before redirecting you to the dashboard. This prevents the confusing empty dashboard on first login!

### Navigation

The app has three main sections accessible via the navbar:

#### Your List (`/dashboard`)
View your anime collection with:
- **Hero Stats** - Total, Synced, Need Sync, and Errors count
- **Anime Grid** - Visual cards with sync status
- **Color Coding:**
  - Green border = Successfully synced
  - Red border = Not synced / Needs attention
  - Error badge = Failed to sync

#### Sync (`/sync`)
Configure sync settings:
- **List Selection** - Choose which MAL lists to sync
  - Watching
  - Completed
  - On Hold
  - Dropped
  - Plan to Watch
- **Sync Button** - Execute sync with unsync warning
- **Anime Count** - See how many anime in each list

#### Settings (`/settings`)
- Configure MAL, Sonarr, and TVDB API settings
- Test connections to verify your configuration
- View your MAL profile information
- Account management
- Logout

### Understanding Sync Status

The dashboard hero shows 4 key metrics:

1. **Total Anime** - Number of anime from selected lists
2. **Synced** - Anime successfully added to Sonarr
3. **Need Sync** - Anime not yet synced (will be added on next sync)
4. **Errors** - Anime that failed to sync (e.g., not found on TVDB)

> **Key Difference:** "Errors" are anime that have been **attempted** and failed, while "Need Sync" are anime that haven't been synced yet. This prevents confusion about which anime can't be synced vs which just need syncing.

### Syncing Process

1. Navigate to **Sync** page (`/sync`)
2. Select which MAL lists to sync (default: Watching + Plan to Watch)
3. Click **"Sync Now"** button
4. If you deselect a previously synced list, you'll be warned about removing anime from Sonarr
5. Check the Dashboard to see updated sync status

### Error Handling

If anime show up in the **Errors** count:
- They couldn't be found on TVDB (most common)
- Sonarr API error occurred
- Network/connectivity issues

These anime won't appear in "Need Sync" to avoid repeated failed attempts.

---

## API Documentation

Access interactive API documentation at: **http://localhost:3000/api-doc**

Swagger UI provides:
- All available endpoints
- Request/response schemas
- Try-it-out functionality

### Key Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/check` | GET | Check authentication status |
| `/api/mal` | GET | Fetch MAL anime list |
| `/api/sonarr/database` | GET | Fetch Sonarr series |
| `/api/sync/diff` | GET | Sync MAL with Sonarr |
| `/api/sync/errors` | GET | Fetch sync errors |
| `/api/sync/history` | GET | View sync history |
| `/api/sync/preview` | GET | Preview sync changes |
| `/api/preferences` | GET/POST | Manage user preferences |
| `/api/sonarr/remove` | POST | Remove anime from Sonarr |
| `/api/health` | GET | Health check |

---

## Troubleshooting

### OAuth Issues
- **Problem:** "Redirect URI mismatch" or "Safari Can't Open the Page"
  - **Solution:** Use the setup wizard to configure OAuth settings
  - Make sure your `MAL_REDIRECT_URI` **exactly matches** what you configured in MyAnimeList API
  - For local development, use: `http://localhost:3000/api/oauth/step2`
  - The setup wizard validates your configuration before proceeding

- **Problem:** Empty dashboard after first login
  - **Solution:** This has been fixed! The OAuth callback now waits for your anime list to be fetched before redirecting

### SSL/HTTPS Issues
- **Problem:** "SSL wrong version number" or fetch errors
  - **Solution:** For local development, use HTTP (`http://localhost:3000`) not HTTPS
  - Update your `.env` file: `NEXT_PUBLIC_BASE_URL="http://localhost:3000"`
  - Update your `.env` file: `MAL_REDIRECT_URI="http://localhost:3000/api/oauth/step2"`
  - Update your MAL API settings to match
  - **Solution:** Ensure `MAL_REDIRECT_URI` in `.env` matches exactly what you registered on MAL Developer Portal

### Database Connection Errors
- **Problem:** "Can't reach database server"
  - **Solution:** Check PostgreSQL is running and connection strings in `.env` are correct

### TVDB Authentication Fails
- **Problem:** "No TVDB token" or "401 Unauthorized"
  - **Solution:** Use the setup wizard to validate your TVDB API key
  - The wizard tests your key before allowing you to proceed
  - This prevents wasting API credits on invalid keys

### Shows Not Adding to Sonarr
- **Problem:** Console shows "Failed to add series"
  - **Solution:** Check Sonarr logs - common issues include:
    - Series already exists
    - Invalid quality profile
    - Root folder doesn't exist

### Sonarr Connection Issues
- **Problem:** "Failed to connect to Sonarr"
  - **Solution:** Use the setup wizard or settings page to test your Sonarr connection
  - The "Test Connection" button validates your API key and URL
  - Check that Sonarr is running and accessible from your app

### Sync Shows "Everything is synced" but Dashboard Shows Otherwise
- **Problem:** MAL ID correlation may be missing
  - **Solution:** Click "Sync" button again to re-correlate

---

## Development

### Project Structure
```
Watashiwomite/
├── app/
│   ├── api/              # Next.js API routes
│   │   ├── auth/         # Authentication endpoints
│   │   ├── mal/          # MyAnimeList integration
│   │   ├── sonarr/       # Sonarr integration
│   │   ├── sync/         # Sync orchestration
│   │   ├── preferences/  # User preferences
│   │   └── settings/     # Settings management
│   ├── components/       # React components
│   │   ├── dashboard/    # Dashboard-specific components
│   │   ├── mal/          # MAL display components
│   │   └── index/        # Landing page components
│   ├── context/          # React context providers
│   ├── hooks/            # Custom React hooks
│   ├── dashboard/        # Dashboard page
│   ├── sync/             # Sync page
│   ├── settings/         # Settings page
│   └── setup/            # First-time setup wizard
├── __tests__/            # Test suite (489 tests, 24.68% coverage)
│   ├── lib/              # Library tests
│   ├── utils/            # Utility tests
│   └── services/         # Service tests
├── lib/                  # Shared libraries
│   ├── prisma.ts         # Database client
│   ├── cache.ts          # Response caching (100% coverage)
│   ├── rate-limiter.ts   # API rate limiting (88% coverage)
│   ├── settings.ts       # Settings management (100% coverage)
│   └── swagger.ts        # API documentation (100% coverage)
├── prisma/               # Database schema & migrations
├── services/             # Business logic services (99% coverage)
│   ├── syncDiffService.ts
│   ├── preferencesService.ts
│   └── sonarrRemovalService.ts
├── types/                # TypeScript type definitions
└── utils/                # Utility functions (96% coverage)
    ├── mal.ts            # MAL API utilities (98% coverage)
    ├── tvdb.ts           # TVDB API utilities (99% coverage)
    ├── sonarr.ts         # Sonarr API utilities (100% coverage)
    ├── enhancedSync.ts   # Advanced sync features (83% coverage)
    ├── syncFeatures.ts   # Sync feature implementations (100% coverage)
    ├── syncHistory.ts    # History management (97% coverage)
    └── batchActions.ts   # Post-sync automation (100% coverage)
```

### Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Database:** PostgreSQL with Prisma ORM
- **UI:** Material-UI (MUI) v6
- **Auth:** OAuth 2.0 with MyAnimeList
- **API Docs:** Swagger/OpenAPI
- **Animation:** Framer Motion
- **Testing:** Jest with 489 tests (24.68% coverage, backend utilities 96%+)

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# View coverage report
open coverage/lcov-report/index.html
```

**Test Coverage Highlights:**
- **Utilities:** 96.25% (mal.ts, tvdb.ts, sonarr.ts, syncFeatures.ts)
- **Services:** 99.28% (syncDiff, preferences, removal)
- **Libraries:** 87.97% (cache, rate-limiter, settings, validation)
- **Total:** 489 passing tests


### Roadmap

**High Priority:**
- [ ] Containerize with Docker
- [ ] Increase test coverage to 50%+
- [x] ~~Better error messages and user feedback~~
- [x] ~~Setup wizard for first-time configuration~~

**Medium Priority:**
- [ ] Batch sync scheduling
- [ ] Webhook support
- [ ] Statistics and analytics

**Low Priority:**
- [ ] Support for AniList
- [ ] Custom title mapping overrides

---

## License

This project is released into the public domain under the [Unlicense](https://unlicense.org/).

See [UNLICENSE](UNLICENSE) for details.

---

## Credits

Built with:
- [Next.js](https://nextjs.org/) - React framework
- [Prisma](https://www.prisma.io/) - Database ORM
- [Material-UI](https://mui.com/) - React component library
- [MyAnimeList API](https://myanimelist.net/apiconfig)
- [TVDB API](https://thetvdb.com/)
- [Sonarr API](https://sonarr.tv/)

---

## Support

Found a bug? Have a feature request?

- Open an issue on GitHub
- Check existing issues first to avoid duplicates
- Provide as much detail as possible

