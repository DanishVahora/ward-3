# WARD-3 Client

Frontend app for searchable voter records.

## Why Database Mode

For mobile performance, the app now uses server-side filtering and pagination.
The browser no longer downloads all records at once.

## Architecture

- `client`: React + Vite frontend
- `server`: Express + SQLite API

Frontend API calls:

- `GET /api/meta`
- `GET /api/voters?page=1&pageSize=60&search=&vibhag=all&place=all`

## Setup (Local)

1. Build merged dataset (from CSV files)
	- In `client`: `npm run generate:data`
2. Create SQLite database
	- In `server`: `npm install`
	- In `server`: `npm run seed`
3. Start API server
	- In `server`: `npm run dev`
4. Start frontend
	- In `client`: `npm install`
	- In `client`: `npm run dev`

The Vite dev server proxies `/api` to `http://localhost:4000`.

## Client Scripts

- `npm run dev`: Start local Vite dev server
- `npm run generate:data`: Rebuild `public/data.json` from CSV files
- `npm run build`: Type-check and build production bundle
- `npm run preview`: Preview production build locally
