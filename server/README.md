# WARD-3 API (MongoDB Atlas)

## Purpose

API server that serves voter records with server-side filters and pagination.

## Endpoints

- `GET /health`
- `GET /api/meta?vibhag=all`
- `GET /api/voters?page=1&pageSize=60&search=&vibhag=all&place=all`

## Commands

- `npm install`
- `npm run seed`
- `npm run dev`

## Notes

- Set `MONGODB_URI` before running `seed` or `dev`.
- `npm run seed` reads `../client/public/data.json` and loads it into Atlas.
- Run seed again whenever source data changes.

## Deploy On Render

1. Push this repository to GitHub.
2. Create a new Render Web Service.
3. Set Root Directory to `server`.
4. Build Command: `npm install`
5. Start Command: `npm run start`
6. Add environment variables:
	- `MONGODB_URI`: MongoDB Atlas connection string
	- `CORS_ORIGIN`: frontend URL (for example your Vercel domain)
7. First deploy completes the API startup.
8. Run seed once in Render shell:
	- `npm run seed`
