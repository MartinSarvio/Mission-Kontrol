import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import './mocks'
import Table, { Column } from '../components/Table'

interface TestItem {
  id: string
  name: string
  score: number
  status: string
}

const testData: TestItem[] = [
  { id: '1', name: 'Alfa', score: 90, status: 'aktiv' },
  { id: '2', name: 'Beta', score: 45, status: 'inaktiv' },
  { id: '3', name: 'Gamma', score: 72, status: 'aktiv' },
  { id: '4', name: 'Delta', score: 10, status: 'inaktiv' },
  { id: '5', name: 'Epsilon', score: 55, status: 'aktiv' },
]

const columns: Column<TestItem>[] = [
  {
    key: 'name',
    header: 'Navn',
    render: item => item.name,
    sortable: true,
    sortKey: item => item.name,
    exportValue: item => item.name,
  },
  {
    key: 'score',
    header: 'Score',
    render: item => item.score,
    sortable: true,
    sortKey: item => item.score,
    exportValue: item => item.score,
  },
  {
    key: 'status',
    header: 'Status',
    render: item => item.status,
  },
]

// Generer 25 elementer til paginerings-tests
function makeMany(n: number): TestItem[] {
  return Array.from({ length: n }, (_, i) => ({
    id: String(i + 1),
    name: `Item ${i + 1}`,
    score: i * 4,
    status: i % 2 === 0 ? 'aktiv' : 'inaktiv',
  }))
}

describe('Table', () => {
  describe('Grundlæggende rendering', () => {
    it('viser tabel-headers', () => {
      render(<Table data={testData} columns={columns} />)
      expect(screen.getByText('Navn')).toBeInTheDocument()
      expect(screen.getByText('Score')).toBeInTheDocument()
      expect(screen.getByText('Status')).toBeInTheDocument()
    })

    it('renderer alle rækker', () => {
      render(<Table data={testData} columns={columns} />)
      expect(screen.getByText('Alfa')).toBeInTheDocument()
      expect(screen.getByText('Beta')).toBeInTheDocument()
      expect(screen.getByText('Gamma')).toBeInTheDocument()
    })

    it('viser tom tabel uden fejl', () => {
      render(<Table data={[]} columns={columns} />)
      const tbody = document.querySelector('tbody')
      expect(tbody).toBeInTheDocument()
      expect(tbody?.querySelectorAll('tr').length).toBe(0)
    })
  })

  describe('Sortering', () => {
    it('sorterer stigende ved første klik', () => {
      render(<Table data={testData} columns={columns} />)
      const navnHeader = screen.getByRole('button', { name: /navn/i })
      fireEvent.click(navnHeader)

      const rows = document.querySelectorAll('tbody tr')
      const firstCell = rows[0].querySelector('td')
      expect(firstCell?.textContent).toBe('Alfa')
    })

    it('sorterer faldende ved andet klik', () => {
      render(<Table data={testData} columns={columns} />)
      const navnHeader = screen.getByRole('button', { name: /navn/i })
      fireEvent.click(navnHeader)
      fireEvent.click(navnHeader)

      const rows = document.querySelectorAll('tbody tr')
      const firstCell = rows[0].querySelector('td')
      expect(firstCell?.textContent).toBe('Gamma')
    })

    it('nulstiller sortering ved tredje klik', () => {
      render(<Table data={testData} columns={columns} />)
      const navnHeader = screen.getByRole('button', { name: /navn/i })
      fireEvent.click(navnHeader) // asc
      fireEvent.click(navnHeader) // desc
      fireEvent.click(navnHeader) // ingen sortering

      // Første element skal igen være det originale
      const rows = document.querySelectorAll('tbody tr')
      const firstCell = rows[0].querySelector('td')
      expect(firstCell?.textContent).toBe('Alfa')
    })

    it('sorterer numerisk korrekt', () => {
      render(<Table data={testData} columns={columns} />)
      const scoreHeader = screen.getByRole('button', { name: /score/i })
      fireEvent.click(scoreHeader) // asc → laveste score først

      const rows = document.querySelectorAll('tbody tr')
      const cells = Array.from(rows).map(r => r.querySelectorAll('td')[1]?.textContent)
      expect(cells[0]).toBe('10')
      expect(cells[cells.length - 1]).toBe('90')
    })

    it('ikke-sorterbare kolonner ignorerer klik', () => {
      render(<Table data={testData} columns={columns} />)
      const statusHeader = screen.getByRole('button', { name: /status/i })
      expect(statusHeader).toBeDisabled()
    })
  })

  describe('Søgning', () => {
    it('filtrerer rækker ved søgning', async () => {
      render(<Table data={testData} columns={columns} searchable />)
      const input = screen.getByPlaceholderText('Søg...')
      fireEvent.change(input, { target: { value: 'Beta' } })

      await waitFor(() => {
        expect(screen.getByText('Beta')).toBeInTheDocument()
        expect(screen.queryByText('Alfa')).not.toBeInTheDocument()
      }, { timeout: 500 })
    })

    it('viser "ingen resultater" ved ingen match', async () => {
      render(<Table data={testData} columns={columns} searchable />)
      const input = screen.getByPlaceholderText('Søg...')
      fireEvent.change(input, { target: { value: 'XXXXXXXXXX' } })

      await waitFor(() => {
        expect(screen.getByText(/ingen resultater/i)).toBeInTheDocument()
      }, { timeout: 500 })
    })

    it('viser resultat-tæller ved aktiv søgning', async () => {
      render(<Table data={testData} columns={columns} searchable />)
      const input = screen.getByPlaceholderText('Søg...')
      fireEvent.change(input, { target: { value: 'a' } })

      await waitFor(() => {
        const counter = screen.getByText(/af 5/i)
        expect(counter).toBeInTheDocument()
      }, { timeout: 500 })
    })

    it('nulstiller søgning ved Escape', async () => {
      render(<Table data={testData} columns={columns} searchable />)
      const input = screen.getByPlaceholderText('Søg...')
      fireEvent.change(input, { target: { value: 'Beta' } })
      fireEvent.keyDown(input, { key: 'Escape' })
      expect(input).toHaveValue('')
    })
  })

  describe('Pagination', () => {
    it('viser ikke pagination med færre end pageSize elementer', () => {
      render(<Table data={testData} columns={columns} pageSize={20} />)
      expect(screen.queryByRole('button', { name: /næste side/i })).not.toBeInTheDocument()
    })

    it('viser pagination med flere end pageSize elementer', () => {
      const bigData = makeMany(25)
      render(<Table data={bigData} columns={columns} pageSize={10} />)
      expect(screen.getByRole('button', { name: /næste side/i })).toBeInTheDocument()
    })

    it('viser "Viser X–Y af Z" tekst', () => {
      const bigData = makeMany(25)
      render(<Table data={bigData} columns={columns} pageSize={10} />)
      expect(screen.getByText('Viser 1–10 af 25')).toBeInTheDocument()
    })

    it('navigerer til næste side', () => {
      const bigData = makeMany(25)
      render(<Table data={bigData} columns={columns} pageSize={10} />)
      fireEvent.click(screen.getByRole('button', { name: /næste side/i }))
      expect(screen.getByText('Viser 11–20 af 25')).toBeInTheDocument()
    })

    it('forrige-knap er disabled på første side', () => {
      const bigData = makeMany(25)
      render(<Table data={bigData} columns={columns} pageSize={10} />)
      expect(screen.getByRole('button', { name: /forrige side/i })).toBeDisabled()
    })

    it('næste-knap er disabled på sidste side', () => {
      const bigData = makeMany(25)
      render(<Table data={bigData} columns={columns} pageSize={10} />)
      // Naviger til side 3
      fireEvent.click(screen.getByRole('button', { name: /næste side/i }))
      fireEvent.click(screen.getByRole('button', { name: /næste side/i }))
      expect(screen.getByRole('button', { name: /næste side/i })).toBeDisabled()
    })
  })

  describe('CSV Eksport', () => {
    it('viser eksport-knap når exportable=true', () => {
      render(<Table data={testData} columns={columns} exportable />)
      expect(screen.getByText(/eksportér csv/i)).toBeInTheDocument()
    })

    it('skjuler eksport-knap som standard', () => {
      render(<Table data={testData} columns={columns} />)
      expect(screen.queryByText(/eksportér csv/i)).not.toBeInTheDocument()
    })

    it('trigger CSV download ved klik', () => {
      // Mock URL og createElement
      const createObjectURLMock = vi.fn(() => 'blob:mock')
      const revokeObjectURLMock = vi.fn()
      const appendChildMock = vi.fn()
      const removeChildMock = vi.fn()
      const clickMock = vi.fn()

      Object.defineProperty(globalThis, 'URL', {
        value: { createObjectURL: createObjectURLMock, revokeObjectURL: revokeObjectURLMock },
        writable: true,
      })

      const origCreate = document.createElement.bind(document)
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'a') {
          const el = origCreate(tag)
          Object.defineProperty(el, 'click', { value: clickMock })
          return el
        }
        return origCreate(tag)
      })
      vi.spyOn(document.body, 'appendChild').mockImplementation(appendChildMock)
      vi.spyOn(document.body, 'removeChild').mockImplementation(removeChildMock)

      render(<Table data={testData} columns={columns} exportable exportFilename="test-eksport" />)
      fireEvent.click(screen.getByText(/eksportér csv/i))

      expect(createObjectURLMock).toHaveBeenCalled()
      expect(clickMock).toHaveBeenCalled()
      expect(revokeObjectURLMock).toHaveBeenCalled()

      vi.restoreAllMocks()
    })
  })

  describe('Rækkeinteraktion', () => {
    it('kalder onRowClick ved klik på række', () => {
      const onRowClick = vi.fn()
      render(<Table data={testData} columns={columns} onRowClick={onRowClick} />)
      fireEvent.click(screen.getAllByRole('row')[1]) // første dataræekke
      expect(onRowClick).toHaveBeenCalledWith(testData[0])
    })
  })
})
