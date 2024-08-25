# MyAnimeList Integration for Sonarr

This project integrates [MyAnimeList](https://myanimelist.org/) with [Sonarr](https://sonarr.tv/), sort of.

![Project Screenshot](assets/screenshot.png)

## Getting Started
Ensure you're using at least v21.0.0

1. Clone the repository
```bash
cd path/to/clone-directory
```
2. Install Dependencies
```bash
npm install
```
3. Set Up Environment Variables
- Copy the example environment file and update the values in .env:
```bash
cp .env.example .env
```
4. Run prisma migrations
```
npx prisma migrate dev
```
5. Start the development server
- Run the Next.js server with HTTPS enabled (experimental):
```
npm run dev-https
```
Open your browser to https://localhost:3000


TODO:
- cleanup routing
- Convert `utils.js` to TypeScript
- Write comprehensive instructions
- Beautify the README
- Clean up AuthContext
- Implement Swagger documentation
- Containerize the application
- Create an initialization page to input and store variables in the database
- Load variables from the database