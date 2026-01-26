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

### Landing Page
![Landing Page](assets/screenshot-landing.png)
*Clean, modern landing page with hero section and OAuth login*

### Dashboard - Your List
![Dashboard - Your List](assets/screenshot-dashboard.png)
*Visual overview of your anime collection with sync status indicators*

### Dashboard Hero Stats
![Dashboard Hero](assets/screenshot-hero-stats.png)
*At-a-glance statistics: Total Anime, Synced, Need Sync, and Errors*

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
- 🎨 Modern navbar navigation with dedicated pages (Dashboard, Sync, Settings)
- 📱 Fully responsive mobile design with hamburger menu
- 🎭 Glassmorphic design with smooth animations
- 🌊 Immersive hero section with profile background
- ⚡ Active page indication and smooth transitions

### Sync System
- 🔄 Automatic sync between MAL and Sonarr
- 🎯 Fuzzy title matching using Levenshtein distance
- ⚙️ Customizable list selection (Watching, Completed, Plan to Watch, etc.)
- 📊 4-stat overview: Total Anime, Synced, Need Sync, **Errors**
- ❌ **Error tracking** - Separate display for failed syncs
- 🗑️ Selective anime removal from Sonarr
- 🔍 Sync preview mode
- 📜 Sync history with audit trail

### Advanced Features
- 🤖 Smart duplicate detection
- 🎬 Batch actions (metadata refresh, episode search)
- ⚖️ Conflict resolution strategies
- ⭐ Score-based auto-monitoring
- 🎯 Intelligent episode filtering (skip OVAs, specials, movies)
- 💾 User preferences with 20+ configurable options

### Developer Features
- 🔐 OAuth 2.0 authentication with MyAnimeList
- 📚 Swagger API documentation
- 🗄️ PostgreSQL with Prisma ORM
- 🔒 Rate limiting and caching
- 🏥 Health check endpoints  

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
```bash
cp .env.example .env
```

Edit `.env` with your API keys and database connection:

| Variable | Description | Example |
|----------|-------------|---------|
| `POSTGRES_PRISMA_URL` | PostgreSQL connection URL for Prisma | `postgresql://user:pass@localhost:5432/watashiwomite` |
| `POSTGRES_URL_NON_POOLING` | Non-pooling PostgreSQL URL | Same as above |
| `MAL_CLIENT_ID` | MyAnimeList OAuth Client ID | From MAL Developer Portal |
| `MAL_CLIENT_SECRET` | MyAnimeList OAuth Client Secret | From MAL Developer Portal |
| `MAL_REDIRECT_URI` | OAuth redirect URI (must match MAL app config) | `http://localhost:3000/api/oauth/step2` (dev) |
| `SONARR_API_KEY` | Your Sonarr API Key | From Sonarr Settings → General |
| `SONARR_URL` | Your Sonarr instance URL | `http://localhost:8989` |
| `TVDBID_API_KEY` | TVDB API Key | From TVDB API Portal |
| `NEXT_PUBLIC_BASE_URL` | Your app's base URL | `http://localhost:3000` (dev) |

> **Important:** For local development, use `http://localhost:3000`. The OAuth redirect URI in your `.env` file **must exactly match** what you configured in your MyAnimeList API settings.

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

1. **Click "Login with MyAnimeList"** on the home page
2. **Authorize the application** on MyAnimeList
3. **You'll be redirected to the Dashboard** automatically

The app will initially display your anime list. Use the navigation to configure sync settings.

### Navigation

The app has three main sections accessible via the navbar:

#### 📚 Your List (`/dashboard`)
View your anime collection with:
- **Hero Stats** - Total, Synced, Need Sync, and Errors count
- **Anime Grid** - Visual cards with sync status
- **Color Coding:**
  - 🟢 Green border = Successfully synced
  - 🔴 Red border = Not synced / Needs attention
  - ❌ Error badge = Failed to sync

#### 🔄 Sync (`/sync`)
Configure sync settings:
- **List Selection** - Choose which MAL lists to sync
  - Watching
  - Completed
  - On Hold
  - Dropped
  - Plan to Watch
- **Sync Button** - Execute sync with unsync warning
- **Anime Count** - See how many anime in each list

#### ⚙️ Settings (`/settings`)
- View your MAL profile information
- Account management
- Logout

### Understanding Sync Status

The dashboard hero shows 4 key metrics:

1. **Total Anime** - Number of anime from selected lists
2. **Synced** ✅ - Anime successfully added to Sonarr
3. **Need Sync** ⏳ - Anime not yet synced (will be added on next sync)
4. **Errors** ❌ - Anime that failed to sync (e.g., not found on TVDB)

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
  - **Solution:** Make sure your `MAL_REDIRECT_URI` in `.env` **exactly matches** what you configured in your MyAnimeList API application settings
  - For local development, use: `http://localhost:3000/api/oauth/step2`
  - In your MAL Developer Portal, set the redirect URI to: `http://localhost:3000/api/oauth/step2`

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
- **Problem:** "No TVDB token"
  - **Solution:** Verify `TVDBID_API_KEY` is valid and active

### Shows Not Adding to Sonarr
- **Problem:** Console shows "Failed to add series"
  - **Solution:** Check Sonarr logs - common issues include:
    - Series already exists
    - Invalid quality profile
    - Root folder doesn't exist

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
│   │   └── preferences/  # User preferences
│   ├── components/       # React components
│   │   ├── dashboard/    # Dashboard-specific components
│   │   ├── mal/          # MAL display components
│   │   └── index/        # Landing page components
│   ├── context/          # React context providers
│   ├── hooks/            # Custom React hooks
│   ├── dashboard/        # Dashboard page
│   ├── sync/             # Sync page
│   └── settings/         # Settings page
├── lib/                  # Shared libraries
│   ├── prisma.ts         # Database client
│   ├── cache.ts          # Response caching
│   ├── rate-limiter.ts   # API rate limiting
│   └── swagger.ts        # API documentation
├── prisma/               # Database schema & migrations
├── services/             # Business logic services
│   ├── syncDiffService.ts
│   ├── preferencesService.ts
│   └── sonarrRemovalService.ts
├── types/                # TypeScript type definitions
└── utils/                # Utility functions
    ├── enhancedSync.ts   # Advanced sync features
    ├── syncHistory.ts    # History management
    └── batchActions.ts   # Post-sync automation
```

### Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Database:** PostgreSQL with Prisma ORM
- **UI:** Material-UI (MUI) v6
- **Auth:** OAuth 2.0 with MyAnimeList
- **API Docs:** Swagger/OpenAPI
- **Animation:** Framer Motion


### Roadmap

**High Priority:**
- [ ] Containerize with Docker
- [ ] Better error messages and user feedback
- [ ] Admin panel for configuration

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

