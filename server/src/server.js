import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import { connectDb } from './db.js'
import { Voter } from './models/Voter.js'

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

function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function parseOptionalNumber(value) {
    const number = Number(value)
    return Number.isFinite(number) ? number : null
}

function buildFilters({ search, vibhag, place }) {
    const filters = []

    if (vibhag && vibhag !== 'all') {
        const vibhagNumber = parseOptionalNumber(vibhag)
        if (vibhagNumber !== null) {
            filters.push({ v: vibhagNumber })
        }
    }

    if (place && place !== 'all') {
        filters.push({ p: place })
    }

    if (search) {
        const escaped = escapeRegex(search)
        const queryRegex = new RegExp(escaped, 'i')
        const numberQuery = Number(search)
        const searchOr = [{ e: queryRegex }, { p: queryRegex }]

        if (Number.isFinite(numberQuery)) {
            searchOr.push({ v: numberQuery }, { i: numberQuery })
        }

        filters.push({ $or: searchOr })
    }

    if (filters.length === 0) {
        return {}
    }

    if (filters.length === 1) {
        return filters[0]
    }

    return { $and: filters }
}

app.get('/health', (_req, res) => {
    res.json({ ok: true, dbConnected: mongoose.connection.readyState === 1 })
})

app.get('/api/meta', async (req, res) => {
    try {
        await connectDb()

        const vibhag = String(req.query.vibhag ?? 'all')
        const [totalRecords, vibhagOptions] = await Promise.all([
            Voter.countDocuments({}),
            Voter.distinct('v'),
        ])

        const sortedVibhagOptions = vibhagOptions.sort((a, b) => a - b)
        const vibhagNumber = parseOptionalNumber(vibhag)
        const placeFilter = vibhag === 'all' || vibhagNumber === null ? {} : { v: vibhagNumber }
        const placeOptions = await Voter.distinct('p', placeFilter)

        placeOptions.sort((a, b) => a.localeCompare(b, 'gu'))

        res.json({
            totalRecords,
            vibhagCount: sortedVibhagOptions.length,
            vibhagOptions: sortedVibhagOptions,
            placeOptions,
        })
    } catch (error) {
        res.status(500).json({
            message: error instanceof Error ? error.message : 'Failed to fetch meta data',
        })
    }
})

app.get('/api/voters', async (req, res) => {
    try {
        await connectDb()

        const page = parsePage(req.query.page, 1)
        const pageSize = Math.min(parsePage(req.query.pageSize, 60), 100)
        const search = String(req.query.search ?? '').trim()
        const vibhag = String(req.query.vibhag ?? 'all')
        const place = String(req.query.place ?? 'all')

        const filters = buildFilters({ search, vibhag, place })
        const totalMatching = await Voter.countDocuments(filters)
        const totalPages = Math.max(1, Math.ceil(totalMatching / pageSize))
        const safePage = Math.min(page, totalPages)
        const offset = (safePage - 1) * pageSize

        const rows = await Voter.find(filters)
            .sort({ v: 1, i: 1 })
            .skip(offset)
            .limit(pageSize)
            .select({ _id: 0, v: 1, i: 1, e: 1, p: 1 })
            .lean()

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
    }
})

connectDb()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`WARD-3 API running on http://localhost:${PORT}`)
        })
    })
    .catch((error) => {
        console.error('Failed to start server:', error instanceof Error ? error.message : error)
        process.exitCode = 1
    })
