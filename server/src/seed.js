import fs from 'node:fs/promises'
import path from 'node:path'
import { connectDb, disconnectDb } from './db.js'
import { Voter } from './models/Voter.js'

const clientDir = path.resolve(process.cwd(), '..', 'client')
const mergedDataPath = path.join(clientDir, 'public', 'data.json')

async function loadMergedData() {
    const raw = await fs.readFile(mergedDataPath, 'utf8')
    const parsed = JSON.parse(raw)

    if (!Array.isArray(parsed)) {
        throw new Error('data.json is not an array.')
    }

    return parsed
}

async function seed() {
    const rows = await loadMergedData()

    await connectDb()

    const documents = []
    for (const row of rows) {
        const v = Number(row?.v)
        const i = Number(row?.i)
        const e = String(row?.e ?? '')
        const p = String(row?.p ?? '')

        if (!Number.isFinite(v) || !Number.isFinite(i)) {
            continue
        }

        documents.push({ v, i, e, p })
    }

    try {
        await Voter.deleteMany({})
        if (documents.length > 0) {
            await Voter.insertMany(documents, { ordered: false })
        }

        await Voter.syncIndexes()

        const total = await Voter.countDocuments({})
        console.log(`Seed complete: ${total} records loaded into MongoDB Atlas.`)
    } catch (error) {
        throw error
    } finally {
        await disconnectDb()
    }
}

seed().catch((error) => {
    console.error('Seed failed:', error.message)
    process.exitCode = 1
})
