import { useEffect, useMemo, useState } from 'react'
import './App.css'

type VoterRecord = {
    v: number   // vibhagNo
    i: number   // index
    e: string   // epicNo
    p: string   // place
}

const dataJsonPath = `${import.meta.env.BASE_URL}data.json`
const legacyDataDirPath = `${import.meta.env.BASE_URL}data`

function parseCsvLine(line: string): string[] {
    const cells: string[] = []
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

function parseCsv(content: string): string[][] {
    const lines = content.replace(/^\uFEFF/, '').split(/\r?\n/)
    const rows = lines
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => parseCsvLine(line))

    return rows.length > 1 ? rows.slice(1) : []
}

async function loadMergedJson(): Promise<VoterRecord[]> {
    const response = await fetch(dataJsonPath)
    if (!response.ok) {
        throw new Error(`Failed to load data.json: ${response.statusText}`)
    }

    return response.json() as Promise<VoterRecord[]>
}

async function loadFromLegacyCsv(): Promise<VoterRecord[]> {
    const vibhagResponse = await fetch(`${legacyDataDirPath}/vibhagName.csv`)
    if (!vibhagResponse.ok) {
        throw new Error(`Failed to load vibhagName.csv: ${vibhagResponse.statusText}`)
    }

    const vibhagCsv = await vibhagResponse.text()
    const placeMap = new Map<number, string>()

    for (const [vibhagText, place] of parseCsv(vibhagCsv)) {
        const vibhagNo = Number(vibhagText)
        if (Number.isFinite(vibhagNo)) {
            placeMap.set(vibhagNo, place ?? '')
        }
    }

    const voterFiles = Array.from({ length: 20 }, (_, index) => `v${index + 1}.csv`)
    const voterResponses = await Promise.all(voterFiles.map((name) => fetch(`${legacyDataDirPath}/${name}`)))

    voterResponses.forEach((response, index) => {
        if (!response.ok) {
            throw new Error(`Failed to load ${voterFiles[index]}: ${response.statusText}`)
        }
    })

    const voterCsvFiles = await Promise.all(voterResponses.map((response) => response.text()))
    const records: VoterRecord[] = []

    for (const voterCsv of voterCsvFiles) {
        for (const [vibhagText, indexText, epic] of parseCsv(voterCsv)) {
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

function App() {
    const [records, setRecords] = useState<VoterRecord[]>([])
    const [search, setSearch] = useState('')
    const [selectedVibhag, setSelectedVibhag] = useState('all')
    const [selectedPlace, setSelectedPlace] = useState('all')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        let active = true

        const loadData = async () => {
            setLoading(true)
            setError('')

            try {
                let data: VoterRecord[]

                try {
                    data = await loadMergedJson()
                } catch (jsonError) {
                    data = await loadFromLegacyCsv()

                    console.warn(
                        'Falling back to legacy CSV loading because data.json is unavailable.',
                        jsonError,
                    )
                }

                if (active) {
                    setRecords(data)
                }
            } catch (err) {
                if (active) {
                    setError(err instanceof Error ? err.message : 'Failed to load data')
                }
            } finally {
                if (active) {
                    setLoading(false)
                }
            }
        }

        loadData()

        return () => {
            active = false
        }
    }, [])

    const vibhagOptions = useMemo(
        () => Array.from(new Set(records.map((record) => record.v))).sort((a, b) => a - b),
        [records],
    )

    const placeOptions = useMemo(
        () => {
            const scopedRecords =
                selectedVibhag === 'all'
                    ? records
                    : records.filter((record) => String(record.v) === selectedVibhag)

            return Array.from(new Set(scopedRecords.map((record) => record.p))).sort((a, b) =>
                a.localeCompare(b, 'gu'),
            )
        },
        [records, selectedVibhag],
    )

    useEffect(() => {
        if (selectedPlace !== 'all' && !placeOptions.includes(selectedPlace)) {
            setSelectedPlace('all')
        }
    }, [placeOptions, selectedPlace])

    const filteredRecords = useMemo(() => {
        const query = search.trim().toLowerCase()

        return records.filter((record) => {
            const matchesVibhag =
                selectedVibhag === 'all' || String(record.v) === selectedVibhag
            const matchesPlace = selectedPlace === 'all' || record.p === selectedPlace
            const matchesSearch =
                query.length === 0 ||
                record.e.toLowerCase().includes(query) ||
                record.p.toLowerCase().includes(query) ||
                String(record.v).includes(query) ||
                String(record.i).includes(query)

            return matchesVibhag && matchesPlace && matchesSearch
        })
    }, [records, search, selectedVibhag, selectedPlace])

    return (
        <main className="page">
            <section className="hero-card">
                <p className="eyebrow">WARD-3</p>
                <h1>WARD-3, voters lists</h1>
                <p className="subtext">
                    Search voter records by EPIC number, Vibhag, serial index, or place name. Built for fast
                    lookup on desktop and mobile.
                </p>
                <div className="stats">
                    <article>
                        <span>Total Records</span>
                        <strong>{records.length.toLocaleString()}</strong>
                    </article>
                    <article>
                        <span>Filtered Records</span>
                        <strong>{filteredRecords.length.toLocaleString()}</strong>
                    </article>
                    <article>
                        <span>Vibhag Count</span>
                        <strong>{vibhagOptions.length.toLocaleString()}</strong>
                    </article>
                </div>
            </section>

            <section className="controls-card">
                <label>
                    Search
                    <input
                        type="text"
                        placeholder="EPIC, Vibhag, index, place..."
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                    />
                </label>

                <label>
                    Vibhag
                    <select
                        value={selectedVibhag}
                        onChange={(event) => setSelectedVibhag(event.target.value)}
                    >
                        <option value="all">All Vibhag</option>
                        {vibhagOptions.map((option) => (
                            <option key={option} value={String(option)}>
                                {option}
                            </option>
                        ))}
                    </select>
                </label>

                <label>
                    Place
                    <select value={selectedPlace} onChange={(event) => setSelectedPlace(event.target.value)}>
                        <option value="all">All Places</option>
                        {placeOptions.map((option) => (
                            <option key={option} value={option}>
                                {option}
                            </option>
                        ))}
                    </select>
                </label>
            </section>

            {loading ? <p className="status">Loading dataset...</p> : null}
            {error ? <p className="status error">{error}</p> : null}

            {!loading && !error ? (
                <section className="table-card">
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Vibhag No</th>
                                    <th>Index</th>
                                    <th>EPIC No</th>
                                    <th>Place</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRecords.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="empty-cell">
                                            No records matched your filters.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRecords.map((record) => (
                                        <tr key={`${record.v}-${record.i}-${record.e}`}>
                                            <td>{record.v}</td>
                                            <td>{record.i}</td>
                                            <td className="epic">{record.e}</td>
                                            <td>{record.p}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            ) : null}
        </main>
    )
}

export default App
