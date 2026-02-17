import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import './mocks'
import { ToastProvider } from '../components/Toast'
import CommandPalette from '../components/CommandPalette'

function renderPalette(overrides: Partial<React.ComponentProps<typeof CommandPalette>> = {}) {
  const defaults = {
    open: true,
    onClose: vi.fn(),
    onNavigate: vi.fn(),
  }
  return render(
    <ToastProvider>
      <CommandPalette {...defaults} {...overrides} />
    </ToastProvider>
  )
}

describe('CommandPalette', () => {
  describe('Rendering', () => {
    it('renderer ikke når open=false', () => {
      renderPalette({ open: false })
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('renderer dialog når open=true', () => {
      renderPalette()
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('har søgefelt', () => {
      renderPalette()
      expect(screen.getByPlaceholderText('Søg...')).toBeInTheDocument()
    })

    it('viser "Sider" sektionsheader', () => {
      renderPalette()
      expect(screen.getByText('Sider')).toBeInTheDocument()
    })

    it('viser "Handlinger" sektionsheader', () => {
      renderPalette()
      expect(screen.getByText('Handlinger')).toBeInTheDocument()
    })

    it('viser alle nav-sider som standard', () => {
      renderPalette()
      expect(screen.getByText('Oversigt')).toBeInTheDocument()
      expect(screen.getByText('Opgaver')).toBeInTheDocument()
      expect(screen.getByText('Indstillinger')).toBeInTheDocument()
    })

    it('viser keyboard hints i footer', () => {
      renderPalette()
      expect(screen.getByText('naviger')).toBeInTheDocument()
      expect(screen.getByText('vælg')).toBeInTheDocument()
      expect(screen.getByText('luk')).toBeInTheDocument()
    })
  })

  describe('Søgning', () => {
    it('filtrerer nav-sider ved søgning', async () => {
      renderPalette()
      const input = screen.getByPlaceholderText('Søg...')
      fireEvent.change(input, { target: { value: 'opg' } })

      await waitFor(() => {
        expect(screen.getByText('Opgaver')).toBeInTheDocument()
        expect(screen.queryByText('Oversigt')).not.toBeInTheDocument()
      })
    })

    it('filtrerer handlinger ved søgning', async () => {
      renderPalette()
      const input = screen.getByPlaceholderText('Søg...')
      fireEvent.change(input, { target: { value: 'github' } })

      await waitFor(() => {
        expect(screen.getByText('Åbn GitHub')).toBeInTheDocument()
        expect(screen.queryByText('Oversigt')).not.toBeInTheDocument()
      })
    })

    it('viser "Ingen resultater" ved ingen match', async () => {
      renderPalette()
      const input = screen.getByPlaceholderText('Søg...')
      fireEvent.change(input, { target: { value: 'XXXXXXXXXX' } })

      await waitFor(() => {
        expect(screen.getByText('Ingen resultater')).toBeInTheDocument()
      })
    })

    it('fuzzy-matcher sider', async () => {
      renderPalette()
      const input = screen.getByPlaceholderText('Søg...')
      fireEvent.change(input, { target: { value: 'vrsgt' } }) // fuzzy for "Oversigt"

      await waitFor(() => {
        expect(screen.getByText('Oversigt')).toBeInTheDocument()
      })
    })
  })

  describe('Keyboard navigation', () => {
    it('lukker ved Escape via backdrop-klik ikon', () => {
      const onClose = vi.fn()
      const { container } = renderPalette({ onClose })
      const backdrop = container.firstChild as HTMLElement
      fireEvent.click(backdrop)
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('navigerer ned med ArrowDown', () => {
      renderPalette()
      const input = screen.getByPlaceholderText('Søg...')
      fireEvent.keyDown(input, { key: 'ArrowDown' })

      const options = screen.getAllByRole('option')
      // Andet element er nu selected (index 1)
      expect(options[1]).toHaveAttribute('aria-selected', 'true')
    })

    it('navigerer op med ArrowUp fra position 1', () => {
      renderPalette()
      const input = screen.getByPlaceholderText('Søg...')
      fireEvent.keyDown(input, { key: 'ArrowDown' }) // → index 1
      fireEvent.keyDown(input, { key: 'ArrowUp' })   // → index 0

      const options = screen.getAllByRole('option')
      expect(options[0]).toHaveAttribute('aria-selected', 'true')
    })

    it('navigerer ikke under index 0 med ArrowUp', () => {
      renderPalette()
      const input = screen.getByPlaceholderText('Søg...')
      fireEvent.keyDown(input, { key: 'ArrowUp' }) // allerede på 0

      const options = screen.getAllByRole('option')
      expect(options[0]).toHaveAttribute('aria-selected', 'true')
    })

    it('vælger nuværende element med Enter', () => {
      const onNavigate = vi.fn()
      renderPalette({ onNavigate })
      const input = screen.getByPlaceholderText('Søg...')
      // Første element er 'dashboard'
      fireEvent.keyDown(input, { key: 'Enter' })
      expect(onNavigate).toHaveBeenCalledWith('dashboard')
    })

    it('nulstiller søgning når dialog åbner', () => {
      const { rerender } = renderPalette({ open: false })
      rerender(
        <ToastProvider>
          <CommandPalette open={true} onClose={vi.fn()} onNavigate={vi.fn()} />
        </ToastProvider>
      )
      const input = screen.getByPlaceholderText('Søg...')
      expect(input).toHaveValue('')
    })
  })

  describe('Navigation og handlinger', () => {
    it('kalder onNavigate og onClose ved klik på side', () => {
      const onNavigate = vi.fn()
      const onClose = vi.fn()
      renderPalette({ onNavigate, onClose })

      fireEvent.click(screen.getByText('Opgaver'))
      expect(onNavigate).toHaveBeenCalledWith('tasks')
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('selected ændres ved hover', () => {
      renderPalette()
      const options = screen.getAllByRole('option')
      fireEvent.mouseEnter(options[2])
      expect(options[2]).toHaveAttribute('aria-selected', 'true')
    })

    it('lukker ikke ved klik inde i dialog', () => {
      const onClose = vi.fn()
      renderPalette({ onClose })
      fireEvent.click(screen.getByRole('dialog'))
      expect(onClose).not.toHaveBeenCalled()
    })
  })
})
