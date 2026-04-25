import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const dataDirectory = path.join(projectRoot, 'public', 'data')
const outputFile = path.join(projectRoot, 'public', 'data.json')

function parseCsvLine(line) {
    const cells = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i += 1) {
        const char = line[i]

        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"'
                i += 1
            } else {
                inQuotes = !inQuotes
            }
            continue
        }

        if (char === ',' && !inQuotes) {
            cells.push(current)
            current = ''
            continue
        }

        current += char
    }

    cells.push(current)
    return cells.map((cell) => cell.trim())
}

function parseCsv(content) {
    const lines = content
        .replace(/^\uFEFF/, '')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0)

    if (lines.length <= 1) {
        return []
    }

    return lines.slice(1).map((line) => parseCsvLine(line))
}

async function loadPlaceMap() {
    const vibhagFile = path.join(dataDirectory, 'vibhagName.csv')
    const csv = await fs.readFile(vibhagFile, 'utf8')
    const rows = parseCsv(csv)
    const map = new Map()

    for (const [vibhagText, place] of rows) {
        const vibhagNo = Number(vibhagText)
        if (Number.isFinite(vibhagNo)) {
            map.set(vibhagNo, place ?? '')
        }
    }

    return map
}

function voterFileSort(a, b) {
    const aNo = Number(a.replace(/^v/i, '').replace(/\.csv$/i, ''))
    const bNo = Number(b.replace(/^v/i, '').replace(/\.csv$/i, ''))
    return aNo - bNo
}

async function buildDataset() {
    const entries = await fs.readdir(dataDirectory, { withFileTypes: true })
    const voterFiles = entries
        .filter((entry) => entry.isFile())
        .map((entry) => entry.name)
        .filter((name) => /^v\d+\.csv$/i.test(name))
        .sort(voterFileSort)

    if (voterFiles.length === 0) {
        throw new Error('No voter CSV files found in public/data')
    }

    const placeMap = await loadPlaceMap()
    const records = []

    for (const voterFile of voterFiles) {
        const voterPath = path.join(dataDirectory, voterFile)
        const csv = await fs.readFile(voterPath, 'utf8')
        const rows = parseCsv(csv)

        for (const [vibhagText, indexText, epic] of rows) {
            const vibhagNo = Number(vibhagText)
            const serialIndex = Number(indexText)

            if (!Number.isFinite(vibhagNo) || !Number.isFinite(serialIndex)) {
                continue
            }

            records.push({
                v: vibhagNo,
                i: serialIndex,
                e: epic ?? '',
                p: placeMap.get(vibhagNo) ?? '',
            })
        }
    }

    return records
}

async function main() {
    const records = await buildDataset()
    await fs.writeFile(outputFile, JSON.stringify(records), 'utf8')

    console.log(`Generated ${records.length.toLocaleString()} records -> ${path.relative(projectRoot, outputFile)}`)
}

main().catch((error) => {
    console.error('Failed to generate data.json')
    console.error(error)
    process.exitCode = 1
})
