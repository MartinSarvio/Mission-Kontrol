import { ReactNode, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Icon from './Icon'

export interface Column<T> {
  key: string
  header: string
  render: (item: T) => ReactNode
  className?: string
  sortable?: boolean
  sortKey?: (item: T) => string | number | Date | null | undefined
  exportValue?: (item: T) => string | number | null | undefined
}

interface TableProps<T> {
  data: T[]
  columns: Column<T>[]
  onRowClick?: (item: T) => void
  searchable?: boolean
  searchKeys?: string[]
  filterFn?: (item: T, query: string) => boolean
  pageSize?: number
  exportable?: boolean
  exportFilename?: string
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

/** Escape a single CSV field value */
function escapeCSVField(value: string): string {
  const s = String(value)
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

/** Generate page number array with ellipsis markers (-1) */
function buildPageRange(current: number, total: number): number[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i)
  const pages: number[] = []
  // Always show first and last
  const delta = 2
  const left = current - delta
  const right = current + delta

  for (let i = 0; i < total; i++) {
    if (i === 0 || i === total - 1 || (i >= left && i <= right)) {
      pages.push(i)
    } else if (pages[pages.length - 1] !== -1) {
      pages.push(-1) // ellipsis
    }
  }
  return pages
}

function Table<T extends { id: string }>({
  data,
  columns,
  onRowClick,
  searchable,
  searchKeys,
  filterFn,
  pageSize = 20,
  exportable,
  exportFilename,
}: TableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDirection | null>(null)
  const [activeRowIndex, setActiveRowIndex] = useState<number | null>(null)
  const [currentPage, setCurrentPage] = useState(0)

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

  // Reset to first page when search or sort changes
  useEffect(() => {
    setCurrentPage(0)
    setActiveRowIndex(null)
  }, [query, sortKey, sortDir])

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

  // Pagination
  const totalItems = sortedData.length
  const totalPages = Math.ceil(totalItems / pageSize)
  const showPagination = totalItems > pageSize

  // Clamp currentPage if data shrinks
  const safePage = Math.min(currentPage, Math.max(0, totalPages - 1))

  const startIdx = safePage * pageSize
  const endIdx = Math.min(startIdx + pageSize, totalItems)
  const paginatedData = sortedData.slice(startIdx, endIdx)

  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(0, Math.min(page, totalPages - 1)))
    setActiveRowIndex(null)
  }, [totalPages])

  const handleTableKeyDown = useCallback((e: React.KeyboardEvent<HTMLTableElement>) => {
    const rowCount = paginatedData.length

    // PageDown / PageUp — pagination
    if (e.key === 'PageDown') {
      e.preventDefault()
      setCurrentPage(prev => Math.min(prev + 1, totalPages - 1))
      setActiveRowIndex(null)
      return
    }
    if (e.key === 'PageUp') {
      e.preventDefault()
      setCurrentPage(prev => Math.max(prev - 1, 0))
      setActiveRowIndex(null)
      return
    }

    if (rowCount === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveRowIndex(prev => prev === null ? 0 : Math.min(prev + 1, rowCount - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveRowIndex(prev => prev === null ? 0 : Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && activeRowIndex !== null && onRowClick) {
      e.preventDefault()
      onRowClick(paginatedData[activeRowIndex])
    } else if (e.key === 'Escape') {
      setActiveRowIndex(null)
      tableRef.current?.blur()
    }
  }, [paginatedData, activeRowIndex, onRowClick, totalPages])

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
  const pageRange = buildPageRange(safePage, totalPages)

  const handleExportCsv = useCallback(() => {
    const headerRow = columns.map(col => escapeCSVField(col.header)).join(',')
    const dataRows = sortedData.map(item =>
      columns.map(col => {
        let val: string
        if (col.exportValue) {
          val = String(col.exportValue(item) ?? '')
        } else if (col.sortKey) {
          const v = col.sortKey(item)
          val = v != null ? String(v) : ''
        } else {
          const raw = (item as Record<string, unknown>)?.[col.key]
          val = raw != null ? String(raw) : ''
        }
        return escapeCSVField(val)
      }).join(',')
    ).join('\n')

    const csv = '\uFEFF' + headerRow + '\n' + dataRows
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${exportFilename ?? 'eksport'}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [columns, sortedData, exportFilename])

  const paginationBtnBase: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '32px',
    height: '32px',
    padding: '0 6px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.04)',
    color: 'rgba(255,255,255,0.65)',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'background 0.13s, border-color 0.13s, color 0.13s',
    userSelect: 'none',
  }

  const paginationBtnActive: React.CSSProperties = {
    ...paginationBtnBase,
    background: 'rgba(99,102,241,0.18)',
    borderColor: 'rgba(99,102,241,0.4)',
    color: 'rgba(255,255,255,0.95)',
    fontWeight: 600,
  }

  const paginationBtnDisabled: React.CSSProperties = {
    ...paginationBtnBase,
    opacity: 0.3,
    cursor: 'not-allowed',
  }

  return (
    <div>
      {(searchable || exportable) && (
        <div style={{ padding: '12px 16px 6px' }}>
          {/* Search + Export row */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* Search input */}
            {searchable && (
              <div style={{ flex: 1, position: 'relative' }}>
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
            )}

            {/* CSV Export button */}
            {exportable && (
              <button
                type="button"
                onClick={handleExportCsv}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 12px',
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: '13px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'background 0.15s, border-color 0.15s, color 0.15s',
                  flexShrink: 0,
                }}
                onMouseOver={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'
                  e.currentTarget.style.color = 'rgba(255,255,255,0.85)'
                }}
                onMouseOut={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                  e.currentTarget.style.color = 'rgba(255,255,255,0.6)'
                }}
              >
                <Icon name="download" size={14} />
                Eksportér CSV
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

      <div
        className="overflow-x-auto"
        style={{
          WebkitOverflowScrolling: 'touch',
          overscrollBehaviorX: 'contain',
        }}
      >
        <table
          className="w-full"
          ref={tableRef}
          tabIndex={0}
          onKeyDown={handleTableKeyDown}
          style={{ outline: 'none', minWidth: '520px' }}
        >
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
            {paginatedData.map((item, idx) => {
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

      {/* Pagination footer */}
      {showPagination && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 16px 12px',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          {/* "Viser X-Y af Z" */}
          <span
            style={{
              fontSize: '12px',
              color: 'rgba(255,255,255,0.35)',
              whiteSpace: 'nowrap',
            }}
          >
            Viser {startIdx + 1}–{endIdx} af {totalItems}
          </span>

          {/* Page controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {/* Forrige */}
            <button
              type="button"
              aria-label="Forrige side"
              disabled={safePage === 0}
              onClick={() => goToPage(safePage - 1)}
              style={safePage === 0 ? paginationBtnDisabled : paginationBtnBase}
              onMouseOver={e => {
                if (safePage !== 0) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)'
                  ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.15)'
                }
              }}
              onMouseOut={e => {
                if (safePage !== 0) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'
                  ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.08)'
                }
              }}
            >
              <Icon name="chevron-left" size={14} />
              <span style={{ marginLeft: '2px', fontSize: '12px' }}>Forrige</span>
            </button>

            {/* Page numbers */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              {pageRange.map((page, i) =>
                page === -1 ? (
                  <span
                    key={`ellipsis-${i}`}
                    style={{ color: 'rgba(255,255,255,0.2)', fontSize: '13px', padding: '0 2px' }}
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={page}
                    type="button"
                    aria-label={`Side ${page + 1}`}
                    aria-current={page === safePage ? 'page' : undefined}
                    onClick={() => goToPage(page)}
                    style={page === safePage ? paginationBtnActive : paginationBtnBase}
                    onMouseOver={e => {
                      if (page !== safePage) {
                        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)'
                        ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.15)'
                      }
                    }}
                    onMouseOut={e => {
                      if (page !== safePage) {
                        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'
                        ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.08)'
                      }
                    }}
                  >
                    {page + 1}
                  </button>
                )
              )}
            </div>

            {/* Næste */}
            <button
              type="button"
              aria-label="Næste side"
              disabled={safePage >= totalPages - 1}
              onClick={() => goToPage(safePage + 1)}
              style={safePage >= totalPages - 1 ? paginationBtnDisabled : paginationBtnBase}
              onMouseOver={e => {
                if (safePage < totalPages - 1) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)'
                  ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.15)'
                }
              }}
              onMouseOut={e => {
                if (safePage < totalPages - 1) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'
                  ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.08)'
                }
              }}
            >
              <span style={{ marginRight: '2px', fontSize: '12px' }}>Næste</span>
              <Icon name="chevron-right" size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Wrap in memo — type-cast preserves the generic signature
export default memo(Table) as typeof Table
