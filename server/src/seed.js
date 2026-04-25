import fs from 'node:fs/promises'
import path from 'node:path'
import { openDb } from './db.js'

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
    const db = await openDb()

    await db.exec('PRAGMA journal_mode = WAL;')
    await db.exec('DROP TABLE IF EXISTS voters;')
    await db.exec(`
    CREATE TABLE voters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      v INTEGER NOT NULL,
      i INTEGER NOT NULL,
      e TEXT NOT NULL,
      p TEXT NOT NULL
    );
  `)

    await db.exec('BEGIN TRANSACTION;')
    try {
        const stmt = await db.prepare('INSERT INTO voters (v, i, e, p) VALUES (?, ?, ?, ?)')

        for (const row of rows) {
            const v = Number(row?.v)
            const i = Number(row?.i)
            const e = String(row?.e ?? '')
            const p = String(row?.p ?? '')

            if (!Number.isFinite(v) || !Number.isFinite(i)) {
                continue
            }

            await stmt.run(v, i, e, p)
        }

        await stmt.finalize()
        await db.exec('COMMIT;')
    } catch (error) {
        await db.exec('ROLLBACK;')
        throw error
    }

    await db.exec('CREATE INDEX idx_voters_v ON voters(v);')
    await db.exec('CREATE INDEX idx_voters_p ON voters(p);')
    await db.exec('CREATE INDEX idx_voters_e ON voters(e);')
    await db.exec('CREATE INDEX idx_voters_vi ON voters(v, i);')

    const total = await db.get('SELECT COUNT(*) AS total FROM voters')
    console.log(`Seed complete: ${total?.total ?? 0} records loaded into SQLite.`)

    await db.close()
}

seed().catch((error) => {
    console.error('Seed failed:', error.message)
    process.exitCode = 1
})
