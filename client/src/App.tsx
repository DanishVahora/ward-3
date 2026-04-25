import { useEffect, useMemo, useState } from 'react'
import './App.css'

type VoterRecord = {
    v: number   // vibhagNo
    i: number   // index
    e: string   // epicNo
    p: string   // place
}

type MetaResponse = {
    totalRecords: number
    vibhagCount: number
    vibhagOptions: number[]
    placeOptions: string[]
}

type VotersResponse = {
    page: number
    pageSize: number
    totalMatching: number
    totalPages: number
    rows: VoterRecord[]
}

const apiBase = import.meta.env.VITE_API_BASE ?? '/api'
const pageSize = 60

async function fetchJson<T>(url: string): Promise<T> {
    const response = await fetch(url)
    if (!response.ok) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`)
    }
    return response.json() as Promise<T>
}

function App() {
    const [records, setRecords] = useState<VoterRecord[]>([])
    const [searchInput, setSearchInput] = useState('')
    const [search, setSearch] = useState('')
    const [selectedVibhag, setSelectedVibhag] = useState('all')
    const [selectedPlace, setSelectedPlace] = useState('all')
    const [vibhagOptions, setVibhagOptions] = useState<number[]>([])
    const [placeOptions, setPlaceOptions] = useState<string[]>([])
    const [totalRecords, setTotalRecords] = useState(0)
    const [totalMatching, setTotalMatching] = useState(0)
    const [vibhagCount, setVibhagCount] = useState(0)
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            setSearch(searchInput.trim())
        }, 250)

        return () => {
            window.clearTimeout(timeoutId)
        }
    }, [searchInput])

    useEffect(() => {
        setPage(1)
    }, [search, selectedVibhag, selectedPlace])

    useEffect(() => {
        let active = true

        const loadMeta = async () => {
            try {
                const params = new URLSearchParams()
                params.set('vibhag', selectedVibhag)

                const meta = await fetchJson<MetaResponse>(`${apiBase}/meta?${params.toString()}`)
                if (!active) {
                    return
                }

                setTotalRecords(meta.totalRecords)
                setVibhagCount(meta.vibhagCount)
                setVibhagOptions(meta.vibhagOptions)
                setPlaceOptions(meta.placeOptions)
            } catch (err) {
                if (active) {
                    setError(err instanceof Error ? err.message : 'Failed to load filters')
                }
            }
        }

        loadMeta()

        return () => {
            active = false
        }
    }, [selectedVibhag])

    useEffect(() => {
        if (selectedPlace !== 'all' && !placeOptions.includes(selectedPlace)) {
            setSelectedPlace('all')
        }
    }, [placeOptions, selectedPlace])

    useEffect(() => {
        let active = true

        const loadPage = async () => {
            setLoading(true)
            setError('')

            try {
                const params = new URLSearchParams()
                params.set('page', String(page))
                params.set('pageSize', String(pageSize))
                params.set('search', search)
                params.set('vibhag', selectedVibhag)
                params.set('place', selectedPlace)

                const data = await fetchJson<VotersResponse>(`${apiBase}/voters?${params.toString()}`)
                if (!active) {
                    return
                }

                setRecords(data.rows)
                setTotalMatching(data.totalMatching)
                setTotalPages(data.totalPages)
                setPage(data.page)
            } catch (err) {
                if (active) {
                    setError(
                        err instanceof Error
                            ? `${err.message}. Start backend API with: cd ../server && npm run dev`
                            : 'Failed to load voters',
                    )
                }
            } finally {
                if (active) {
                    setLoading(false)
                }
            }
        }

        loadPage()

        return () => {
            active = false
        }
    }, [page, search, selectedVibhag, selectedPlace])

    const startRow = useMemo(() => {
        if (totalMatching === 0) {
            return 0
        }
        return (page - 1) * pageSize + 1
    }, [page, totalMatching])

    const endRow = useMemo(() => {
        if (totalMatching === 0) {
            return 0
        }
        return Math.min(page * pageSize, totalMatching)
    }, [page, totalMatching])

    const canGoPrev = page > 1
    const canGoNext = page < totalPages

    const onPrev = () => {
        if (canGoPrev) {
            setPage((current) => current - 1)
        }
    }

    const onNext = () => {
        if (canGoNext) {
            setPage((current) => current + 1)
        }
    }

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
                        <strong>{totalRecords.toLocaleString()}</strong>
                    </article>
                    <article>
                        <span>Filtered Records</span>
                        <strong>{totalMatching.toLocaleString()}</strong>
                    </article>
                    <article>
                        <span>Vibhag Count</span>
                        <strong>{vibhagCount.toLocaleString()}</strong>
                    </article>
                </div>
            </section>

            <section className="controls-card">
                <label>
                    Search
                    <input
                        type="text"
                        placeholder="EPIC, Vibhag, index, place..."
                        value={searchInput}
                        onChange={(event) => setSearchInput(event.target.value)}
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
                    <div className="table-meta">
                        <p>
                            Showing {startRow.toLocaleString()}-{endRow.toLocaleString()} of{' '}
                            {totalMatching.toLocaleString()} matching records.
                        </p>
                        <div className="pagination">
                            <button type="button" onClick={onPrev} disabled={!canGoPrev}>
                                Previous
                            </button>
                            <span>
                                Page {page.toLocaleString()} / {totalPages.toLocaleString()}
                            </span>
                            <button type="button" onClick={onNext} disabled={!canGoNext}>
                                Next
                            </button>
                        </div>
                    </div>
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
                                {records.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="empty-cell">
                                            No records matched your filters.
                                        </td>
                                    </tr>
                                ) : (
                                    records.map((record) => (
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
