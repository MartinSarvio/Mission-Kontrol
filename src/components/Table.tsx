import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Icon from './Icon'

export interface Column<T> {
  key: string
  header: string
  render: (item: T) => ReactNode
  className?: string
  sortable?: boolean
  sortKey?: (item: T) => string | number | Date | null | undefined
}

interface TableProps<T> {
  data: T[]
  columns: Column<T>[]
  onRowClick?: (item: T) => void
  searchable?: boolean
  searchKeys?: string[]
  filterFn?: (item: T, query: string) => boolean
}

type SortDirection = 'asc' | 'desc'

function normalizeSortValue(v: unknown): string | number | null {
  if (v == null) return null
  if (v instanceof Date) return v.getTime()
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v === 'string') return v
  if (typeof v === 'boolean') return v ? 1 : 0
  return String(v)
}

function compareValues(aRaw: unknown, bRaw: unknown): number {
  const a = normalizeSortValue(aRaw)
  const b = normalizeSortValue(bRaw)

  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1

  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), 'da', { numeric: true, sensitivity: 'base' })
}

function SortArrow({ direction, active }: { direction: SortDirection | null; active: boolean }) {
  const d: SortDirection = direction ?? 'desc'
  const opacity = active ? 0.75 : 0.28
  const color = active ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.45)'
  const rotation = d === 'asc' ? 'rotate(180deg)' : 'rotate(0deg)'

  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 20 20"
      style={{ opacity, transform: rotation, transition: 'transform 0.12s ease, opacity 0.12s ease' }}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M10 13.5L4.5 8h11L10 13.5z" fill={color} />
    </svg>
  )
}

/** Recursively extract plain text from a ReactNode for search matching */
function extractText(node: ReactNode): string {
  if (node == null || node === false || node === true) return ''
  if (typeof node === 'string') return node
  if (typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(extractText).join(' ')
  if (typeof node === 'object' && 'props' in (node as object)) {
    const el = node as { props: { children?: ReactNode } }
    return extractText(el.props.children)
  }
  return ''
}

export default function Table<T extends { id: string }>({
  data,
  columns,
  onRowClick,
  searchable,
  searchKeys,
  filterFn,
}: TableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDirection | null>(null)
  const [activeRowIndex, setActiveRowIndex] = useState<number | null>(null)

  // Search state: rawQuery mirrors the input, query is debounced
  const [rawQuery, setRawQuery] = useState('')
  const [query, setQuery] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tableRef = useRef<HTMLTableElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setRawQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setQuery(val), 200)
  }, [])

  const clearSearch = useCallback(() => {
    setRawQuery('')
    setQuery('')
    if (debounceRef.current) clearTimeout(debounceRef.current)
  }, [])

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') clearSearch()
  }, [clearSearch])

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

  // Auto-focus search field on mount
  useEffect(() => {
    if (searchable && searchRef.current) searchRef.current.focus()
  }, [searchable])

  // Reset active row when data changes
  useEffect(() => {
    setActiveRowIndex(null)
  }, [data, query])

  // Columns to search in: searchKeys ▸ all columns
  const searchCols = useMemo(() => {
    if (searchKeys && searchKeys.length > 0) return columns.filter(c => searchKeys.includes(c.key))
    return columns
  }, [columns, searchKeys])

  // Filter
  const filteredData = useMemo(() => {
    if (!searchable || !query.trim()) return data
    const q = query.trim().toLowerCase()
    return data.filter(item => {
      if (filterFn) return filterFn(item, q)
      for (const col of searchCols) {
        const rendered = col.render(item)
        const text = extractText(rendered).toLowerCase()
        if (text.includes(q)) return true
      }
      return false
    })
  }, [data, searchable, query, searchCols, filterFn])

  // Sort
  const sortedData = useMemo(() => {
    if (!sortKey || !sortDir) return filteredData
    const col = columns.find(c => c.key === sortKey)
    if (!col || !col.sortable) return filteredData

    const getValue = (item: T) => {
      if (col.sortKey) return col.sortKey(item)
      return (item as Record<string, unknown>)?.[col.key]
    }

    const next = [...filteredData]
    next.sort((a, b) => {
      const cmp = compareValues(getValue(a), getValue(b))
      return sortDir === 'asc' ? cmp : -cmp
    })
    return next
  }, [filteredData, columns, sortKey, sortDir])

  const handleTableKeyDown = useCallback((e: React.KeyboardEvent<HTMLTableElement>) => {
    const rowCount = sortedData.length
    if (rowCount === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveRowIndex(prev => prev === null ? 0 : Math.min(prev + 1, rowCount - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveRowIndex(prev => prev === null ? 0 : Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && activeRowIndex !== null && onRowClick) {
      e.preventDefault()
      onRowClick(sortedData[activeRowIndex])
    } else if (e.key === 'Escape') {
      setActiveRowIndex(null)
      tableRef.current?.blur()
    }
  }, [sortedData, activeRowIndex, onRowClick])

  const toggleSort = (col: Column<T>) => {
    if (!col.sortable) return
    if (sortKey !== col.key) {
      setSortKey(col.key)
      setSortDir('asc')
      return
    }
    if (sortDir === null) {
      setSortDir('asc')
    } else if (sortDir === 'asc') {
      setSortDir('desc')
    } else {
      setSortKey(null)
      setSortDir(null)
    }
  }

  const isFiltering = searchable && query.trim().length > 0

  return (
    <div>
      {searchable && (
        <div style={{ padding: '12px 16px 6px' }}>
          {/* Search input */}
          <div style={{ position: 'relative' }}>
            <span
              style={{
                position: 'absolute',
                left: '11px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'rgba(255,255,255,0.28)',
                display: 'inline-flex',
                alignItems: 'center',
                pointerEvents: 'none',
              }}
            >
              <Icon name="magnifying-glass" size={14} />
            </span>
            <input
              ref={searchRef}
              type="text"
              value={rawQuery}
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown}
              placeholder="Søg..."
              className="w-full placeholder-white/20"
              style={{
                paddingLeft: '34px',
                paddingRight: rawQuery ? '32px' : '12px',
                paddingTop: '7px',
                paddingBottom: '7px',
                borderRadius: '10px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                outline: 'none',
                color: '#fff',
                fontSize: '13px',
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
              onFocus={e => {
                e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)'
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.10)'
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            />
            {/* Clear button */}
            {rawQuery && (
              <button
                type="button"
                onClick={clearSearch}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(255,255,255,0.08)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '18px',
                  height: '18px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'rgba(255,255,255,0.5)',
                  padding: 0,
                }}
              >
                <Icon name="xmark" size={10} />
              </button>
            )}
          </div>

          {/* Result count — only shown while actively filtering */}
          {isFiltering && (
            <p
              style={{
                marginTop: '5px',
                fontSize: '11px',
                color: 'rgba(255,255,255,0.32)',
                paddingLeft: '2px',
              }}
            >
              {filteredData.length} af {data.length}
            </p>
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full" ref={tableRef} tabIndex={0} onKeyDown={handleTableKeyDown} style={{ outline: 'none' }}>
          <thead>
            <tr
              style={{
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(255,255,255,0.04)',
              }}
            >
              {columns.map(col => {
                const isActive = sortKey === col.key && sortDir !== null
                const isSortable = !!col.sortable
                return (
                  <th
                    key={col.key}
                    className={`text-left px-4 py-3 ${col.className || ''} ${isSortable ? 'select-none' : ''}`}
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: isActive ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.4)',
                      background: 'transparent',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(col)}
                      disabled={!isSortable}
                      className={isSortable ? 'inline-flex items-center gap-2 cursor-pointer' : 'inline-flex items-center gap-2'}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        padding: 0,
                        margin: 0,
                        color: 'inherit',
                        font: 'inherit',
                        textAlign: 'left',
                        opacity: isSortable ? 1 : 0.95,
                      }}
                    >
                      <span>{col.header}</span>
                      {isSortable && (
                        <SortArrow direction={sortKey === col.key ? sortDir : null} active={isActive} />
                      )}
                    </button>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((item, idx) => {
              const isActive = activeRowIndex === idx
              const baseBg = isActive ? 'rgba(255,255,255,0.04)' : 'transparent'
              return (
              <tr
                key={item.id}
                onClick={() => onRowClick?.(item)}
                className={onRowClick ? 'cursor-pointer' : ''}
                style={{
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  background: baseBg,
                  transition: 'background 0.15s',
                }}
                onMouseOver={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                onMouseOut={e => (e.currentTarget.style.background = baseBg)}
              >
                {columns.map(col => (
                  <td key={col.key} className={`px-4 py-3 text-sm ${col.className || ''}`}>
                    {col.render(item)}
                  </td>
                ))}
              </tr>
              )
            })}
            {isFiltering && filteredData.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length}
                  style={{
                    padding: '24px 16px',
                    textAlign: 'center',
                    color: 'rgba(255,255,255,0.28)',
                    fontSize: '13px',
                  }}
                >
                  Ingen resultater for &ldquo;{query}&rdquo;
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
