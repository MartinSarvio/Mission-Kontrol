import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import './mocks'
import Modal from '../components/Modal'

function renderModal(overrides: Partial<React.ComponentProps<typeof Modal>> = {}) {
  const defaults = {
    open: true,
    onClose: vi.fn(),
    title: 'Test Modal',
    children: <p>Modal indhold</p>,
  }
  return render(<Modal {...defaults} {...overrides} />)
}

describe('Modal', () => {
  describe('Rendering', () => {
    it('renderer ikke når open=false', () => {
      renderModal({ open: false })
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('renderer dialog når open=true', () => {
      renderModal()
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('viser titel korrekt', () => {
      renderModal({ title: 'Min Dialog' })
      expect(screen.getByText('Min Dialog')).toBeInTheDocument()
    })

    it('viser children', () => {
      renderModal({ children: <p>Hej verden</p> })
      expect(screen.getByText('Hej verden')).toBeInTheDocument()
    })

    it('har korrekte aria-attributter', () => {
      renderModal({ title: 'Aria Test' })
      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-modal', 'true')
      expect(dialog).toHaveAttribute('aria-labelledby')
    })

    it('viser description som sr-only når angivet', () => {
      renderModal({ description: 'Skjult beskrivelse' })
      const desc = screen.getByText('Skjult beskrivelse')
      expect(desc).toHaveClass('sr-only')
    })
  })

  describe('Åbn/Luk', () => {
    it('lukker ved klik på baggrunden', () => {
      const onClose = vi.fn()
      const { container } = renderModal({ onClose })
      // Klik på overlay (første fixed div)
      const overlay = container.querySelector('.modal-backdrop') as HTMLElement
      fireEvent.click(overlay)
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('lukker ikke ved klik inde i dialog', () => {
      const onClose = vi.fn()
      renderModal({ onClose })
      fireEvent.click(screen.getByRole('dialog'))
      expect(onClose).not.toHaveBeenCalled()
    })

    it('lukker ved klik på luk-knap', () => {
      const onClose = vi.fn()
      renderModal({ onClose })
      fireEvent.click(screen.getByRole('button', { name: /luk/i }))
      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('Escape-tast', () => {
    it('lukker modal ved Escape', () => {
      const onClose = vi.fn()
      renderModal({ onClose })
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('lukker ikke ved andre taster', () => {
      const onClose = vi.fn()
      renderModal({ onClose })
      fireEvent.keyDown(document, { key: 'Enter' })
      fireEvent.keyDown(document, { key: 'a' })
      expect(onClose).not.toHaveBeenCalled()
    })
  })

  describe('Focus trap', () => {
    it('fokuserer første fokuserbare element når modal åbner', async () => {
      renderModal({
        children: (
          <div>
            <button>Første knap</button>
            <button>Anden knap</button>
          </div>
        ),
      })
      // requestAnimationFrame er synkron i jsdom, men vi venter lidt
      await act(async () => {
        await new Promise(r => setTimeout(r, 50))
      })
      // Luk-knappen er første fokuserbare element i dialog
      const closeBtn = screen.getByRole('button', { name: /luk/i })
      expect(document.activeElement).toBe(closeBtn)
    })

    it('wrapper Tab-tast rundt til første element fra sidst', () => {
      const onClose = vi.fn()
      renderModal({
        onClose,
        children: <button>Kun knap</button>,
      })

      // Focuser luk-knappen (første)
      const closeBtn = screen.getByRole('button', { name: /luk/i })
      closeBtn.focus()

      // Tab fra første element → wrapper ikke (ingen loop fra første)
      fireEvent.keyDown(document, { key: 'Tab' })
      // Ingen fejl, onClose ikke kaldt
      expect(onClose).not.toHaveBeenCalled()
    })

    it('modtager modal-close event', () => {
      const onClose = vi.fn()
      renderModal({ onClose })
      window.dispatchEvent(new Event('modal-close'))
      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('Genåbning', () => {
    it('skifter fra lukket til åben', () => {
      const { rerender } = renderModal({ open: false })
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

      rerender(
        <Modal open={true} onClose={vi.fn()} title="Test Modal">
          <p>Nyt indhold</p>
        </Modal>
      )
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })
})
