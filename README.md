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

![Project Screenshot](assets/screenshot.png)

## Features

### Core Functionality
- 🔐 OAuth 2.0 authentication with MyAnimeList  
- 🔄 Automatic sync between MAL and Sonarr  
- 🎯 Fuzzy title matching using Levenshtein distance  
- 📚 Swagger API documentation  
- 🎨 Modern, flowing dashboard with immersive hero section
- 📊 Real-time sync status visualization with animated progress
- ⚙️ Customizable list selection (watching, completed, plan to watch, etc.)
- 🗑️ Selective anime removal from Sonarr
- ⚡ Floating action buttons for quick access
- 🎭 Glass morphism UI with smooth animations
- 📱 Fully responsive mobile design  

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
3. **Wait for initial sync** to complete

The app will automatically:
- Fetch your "Watching" anime from MAL
- Look up TVDB IDs for each series
- Add them to Sonarr with MAL correlation

### Dashboard

After authentication, you'll see a modern, flowing interface featuring:

**Hero Section:**
- Your MAL profile with immersive background
- At-a-glance stats (Total Anime, Synced, Need Sync, Completion %)
- Animated progress indicators

**Anime Collection:**
- Visual grid of all your anime with hover effects
- Color-coded sync status for each show (Green = synced, Red = not synced)
- Advanced filtering and search
- Smooth animations and transitions

**Floating Actions:**
- Quick sync button always accessible
- Settings panel (collapsible to reduce clutter)
- Scroll to top button
- Mobile-friendly touch targets

### Syncing

- **Manual Sync:** Click the "Sync" button to trigger a new sync
- **Auto Sync:** The app syncs automatically on login

> **Important:** By default, Sonarr will **NOT** automatically search for episodes. This is intentional to prevent overwhelming your indexers. To enable automatic search, edit `utils/updatedUtils.ts` and change `searchForMissingEpisodes: false` to `true`.

---

## API Documentation

Access interactive API documentation at: **https://localhost:3000/api-doc**

Swagger UI provides:
- All available endpoints
- Request/response schemas
- Try-it-out functionality

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
│   ├── components/       # React components
│   ├── context/          # React context providers
│   └── hooks/            # Custom React hooks
├── lib/                  # Shared libraries (Prisma, Swagger)
├── prisma/               # Database schema & migrations
├── types/                # TypeScript type definitions
└── utils/                # Utility functions
```


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

