import express from 'express'
import cors from 'cors'
import { openDb } from './db.js'

const PORT = Number(process.env.PORT ?? 4000)
const app = express()

app.use(cors({ origin: process.env.CORS_ORIGIN ?? true }))
app.use(express.json())

function parsePage(value, fallback) {
    const number = Number(value)
    if (!Number.isFinite(number) || number < 1) {
        return fallback
    }
    return Math.floor(number)
}

function buildFilters({ search, vibhag, place }) {
    const clauses = []
    const params = []

    if (vibhag && vibhag !== 'all') {
        clauses.push('v = ?')
        params.push(Number(vibhag))
    }

    if (place && place !== 'all') {
        clauses.push('p = ?')
        params.push(place)
    }

    if (search) {
        const query = `%${search}%`
        clauses.push('(e LIKE ? OR p LIKE ? OR CAST(v AS TEXT) LIKE ? OR CAST(i AS TEXT) LIKE ?)')
        params.push(query, query, query, query)
    }

    const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''
    return { whereSql, params }
}

app.get('/health', (_req, res) => {
    res.json({ ok: true })
})

app.get('/api/meta', async (req, res) => {
    let db
    try {
        db = await openDb()

        const vibhag = String(req.query.vibhag ?? 'all')
        const totalResult = await db.get('SELECT COUNT(*) AS total FROM voters')
        const vibhagCountResult = await db.get('SELECT COUNT(DISTINCT v) AS total FROM voters')
        const vibhags = await db.all('SELECT DISTINCT v FROM voters ORDER BY v ASC')

        const placeRows =
            vibhag === 'all'
                ? await db.all('SELECT DISTINCT p FROM voters ORDER BY p COLLATE NOCASE ASC')
                : await db.all('SELECT DISTINCT p FROM voters WHERE v = ? ORDER BY p COLLATE NOCASE ASC', Number(vibhag))

        res.json({
            totalRecords: totalResult?.total ?? 0,
            vibhagCount: vibhagCountResult?.total ?? 0,
            vibhagOptions: vibhags.map((row) => row.v),
            placeOptions: placeRows.map((row) => row.p),
        })
    } catch (error) {
        res.status(500).json({
            message: error instanceof Error ? error.message : 'Failed to fetch meta data',
        })
    } finally {
        await db?.close()
    }
})

app.get('/api/voters', async (req, res) => {
    let db
    try {
        db = await openDb()

        const page = parsePage(req.query.page, 1)
        const pageSize = Math.min(parsePage(req.query.pageSize, 60), 100)
        const search = String(req.query.search ?? '').trim()
        const vibhag = String(req.query.vibhag ?? 'all')
        const place = String(req.query.place ?? 'all')

        const { whereSql, params } = buildFilters({ search, vibhag, place })
        const countRow = await db.get(`SELECT COUNT(*) AS total FROM voters ${whereSql}`, params)
        const totalMatching = countRow?.total ?? 0
        const totalPages = Math.max(1, Math.ceil(totalMatching / pageSize))
        const safePage = Math.min(page, totalPages)
        const offset = (safePage - 1) * pageSize

        const rows = await db.all(
            `
      SELECT v, i, e, p
      FROM voters
      ${whereSql}
      ORDER BY v ASC, i ASC
      LIMIT ? OFFSET ?
      `,
            ...params,
            pageSize,
            offset,
        )

        res.json({
            page: safePage,
            pageSize,
            totalMatching,
            totalPages,
            rows,
        })
    } catch (error) {
        res.status(500).json({
            message: error instanceof Error ? error.message : 'Failed to fetch voters',
        })
    } finally {
        await db?.close()
    }
})

app.listen(PORT, () => {
    console.log(`WARD-3 API running on http://localhost:${PORT}`)
})
