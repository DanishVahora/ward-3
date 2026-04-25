# WARD-3 API (SQLite)

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

- `npm run seed` reads `../client/public/data.json` and loads it into `server/data/voters.db`.
- Run seed again whenever source data changes.
