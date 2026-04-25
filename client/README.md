# Voter Lookup Client

Frontend app for EPIC search and polling place lookup.

## Data Pipeline

Source files:

- `public/data/v1.csv` ... `public/data/v20.csv`
- `public/data/vibhagName.csv`

Generated artifact:

- `public/data.json`

`data.json` is generated automatically before each build via `scripts/generate-data.mjs`.

## Scripts

- `npm run dev`: Start local Vite dev server
- `npm run generate:data`: Rebuild `public/data.json` from CSV files
- `npm run build`: Generate data, type-check, and build production bundle
- `npm run preview`: Preview production build locally

## Production Data Loading

The app loads `data.json` first (single request, fastest path).

If `data.json` is missing or fails to load, it falls back to loading legacy CSV files from `public/data` so production does not hard-fail.

## Deploy (Static Hosting)

This app is static-host friendly (Vercel / Netlify / Cloudflare Pages).

### Vercel (Recommended)

Use these project settings:

- Root Directory: `client`
- Build Command: `npm run build`
- Output Directory: `dist`

`vercel.json` in this folder also applies cache headers:

- `index.html`: no-cache
- `data.json` and `/data/*.csv`: cache with revalidation window

### Netlify / Cloudflare Pages

Use equivalent settings:

- Base directory: `client`
- Build command: `npm run build`
- Publish directory: `dist`
