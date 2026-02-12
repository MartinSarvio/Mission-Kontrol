import { ReactNode } from 'react'

interface Column<T> {
  key: string
  header: string
  render: (item: T) => ReactNode
  className?: string
}

interface TableProps<T> {
  data: T[]
  columns: Column<T>[]
  onRowClick?: (item: T) => void
}

export default function Table<T extends { id: string }>({ data, columns, onRowClick }: TableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
            {columns.map(col => (
              <th key={col.key} className={`table-header text-left px-4 py-3 ${col.className || ''}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map(item => (
            <tr
              key={item.id}
              onClick={() => onRowClick?.(item)}
              className={`glass-row ${onRowClick ? 'cursor-pointer' : ''}`}
            >
              {columns.map(col => (
                <td key={col.key} className={`px-4 py-3 text-sm ${col.className || ''}`}>
                  {col.render(item)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
