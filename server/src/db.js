import path from 'node:path'
import { open } from 'sqlite'
import sqlite3 from 'sqlite3'

const defaultDbPath = path.resolve(process.cwd(), 'data', 'voters.db')

export async function openDb() {
    return open({
        filename: process.env.DB_PATH ?? defaultDbPath,
        driver: sqlite3.Database,
    })
}
