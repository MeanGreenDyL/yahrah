import type { LogsLab } from '@/content/schemas'

/**
 * SIEM-style log triage. The player sorts and filters rows and marks the
 * ones that together evidence an attack.
 *
 * All rows come from a content file. There is no log source, no query
 * language and no network.
 */

export type LogsState = {
  /** Row ids the player has flagged. */
  flagged: string[]
  filter: string
  sortBy: string | null
  sortAsc: boolean
  submitted: boolean
}

export function startLogs(lab: LogsLab): LogsState {
  return { flagged: [], filter: '', sortBy: lab.columns[0] ?? null, sortAsc: true, submitted: false }
}

export function toggleFlag(state: LogsState, rowId: string): LogsState {
  const flagged = state.flagged.includes(rowId)
    ? state.flagged.filter((id) => id !== rowId)
    : [...state.flagged, rowId]
  return { ...state, flagged }
}

export function setFilter(state: LogsState, filter: string): LogsState {
  return { ...state, filter }
}

export function setSort(state: LogsState, column: string): LogsState {
  if (state.sortBy === column) return { ...state, sortAsc: !state.sortAsc }
  return { ...state, sortBy: column, sortAsc: true }
}

/** Rows after the current filter and sort. Case-insensitive substring match. */
export function visibleRows(lab: LogsLab, state: LogsState): LogsLab['rows'] {
  const needle = state.filter.trim().toLowerCase()
  const filtered = needle
    ? lab.rows.filter((row) =>
        Object.values(row.cells).some((v) => v.toLowerCase().includes(needle)),
      )
    : [...lab.rows]

  if (!state.sortBy) return filtered
  const column = state.sortBy
  return filtered.sort((a, b) => {
    const av = a.cells[column] ?? ''
    const bv = b.cells[column] ?? ''
    const cmp = av.localeCompare(bv, undefined, { numeric: true })
    return state.sortAsc ? cmp : -cmp
  })
}

export type LogsScore = {
  /** Malicious rows correctly flagged. */
  hits: number
  /** Benign rows wrongly flagged. */
  falsePositives: number
  /** Malicious rows missed. */
  misses: number
  total: number
  /** True only when every malicious row is flagged and nothing else is. */
  perfect: boolean
}

export function scoreLogs(lab: LogsLab, state: LogsState): LogsScore {
  const malicious = new Set(lab.rows.filter((r) => r.malicious).map((r) => r.id))
  const flagged = new Set(state.flagged)

  let hits = 0
  let falsePositives = 0
  for (const id of flagged) {
    if (malicious.has(id)) hits++
    else falsePositives++
  }
  const misses = malicious.size - hits

  return {
    hits,
    falsePositives,
    misses,
    total: malicious.size,
    perfect: hits === malicious.size && falsePositives === 0,
  }
}
