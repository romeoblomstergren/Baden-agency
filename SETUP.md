# Baden Agency — Setup Guide

## 1. Get your Supabase credentials

1. Go to your Supabase project → Settings → API
2. Copy:
   - **Project URL** (looks like: https://xxxx.supabase.co)
   - **anon/public key** (the long string under "Project API keys")

## 2. Set up environment variables

Create a file called `.env` in the project root (same folder as package.json):

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## 3. Install and run locally

Make sure you have Node.js installed (https://nodejs.org), then:

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## 4. Create your first user (login)

In Supabase:
1. Go to Authentication → Users → Add user
2. Add email + password for each team member
3. They can now log in at your app URL

## 5. Deploy to Vercel (free hosting)

1. Create a free account at https://vercel.com
2. Install Vercel CLI: `npm install -g vercel`
3. In the project folder: `vercel`
4. Follow the prompts — when asked for environment variables, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Done — your app is live at a `.vercel.app` URL

OR: push to GitHub and connect the repo in Vercel dashboard — it auto-deploys on every push.

## 6. Add to phone home screen (PWA-style)

**iPhone/iPad:** Open Safari → share button → "Add to Home Screen"
**Android:** Chrome menu → "Add to Home Screen"

The app will open full-screen like a native app.

## File structure

```
src/
  lib/
    supabase.js      ← Supabase client (uses your .env)
    constants.js     ← Op types, colors, formatters
  hooks/
    useAuth.js       ← Login/logout/session
    useOperations.js ← All operation data + CRUD
    useClients.js    ← Clients, tally, stats
  components/
    Layout.jsx       ← Nav bar (desktop) + bottom tabs (mobile)
    StatusBadge.jsx  ← Vessel/entry status pills
  pages/
    Login.jsx        ← Sign in page
    Operational.jsx  ← Live vessel tracker
    Register.jsx     ← Full searchable register
    NewEntry.jsx     ← New operation form
    Tally.jsx        ← Client appointment counts
    Stats.jsx        ← Monthly statistics heatmap
```

## Notes

- All dates stored and displayed as DD/MM/YYYY — no locale issues
- Ref numbers generated server-side — impossible to duplicate
- Real-time: Operational page updates automatically when any team member changes a vessel status
- The app works offline to view cached data; needs connection to submit new entries
