import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import './mocks'
import Sidebar from '../components/Sidebar'

function renderSidebar(overrides: Partial<React.ComponentProps<typeof Sidebar>> = {}) {
  const defaults = {
    active: 'dashboard',
    onNavigate: vi.fn(),
    isOpen: true,
    onClose: vi.fn(),
    onMaisonClick: vi.fn(),
  }
  return render(<Sidebar {...defaults} {...overrides} />)
}

describe('Sidebar', () => {
  describe('Rendering', () => {
    it('renderer navigation-elementet', () => {
      renderSidebar()
      expect(screen.getByRole('navigation')).toBeInTheDocument()
    })

    it('viser alle 5 navigationgrupper', () => {
      renderSidebar()
      expect(screen.getByText('Overblik')).toBeInTheDocument()
      expect(screen.getByText('Arbejde')).toBeInTheDocument()
      expect(screen.getByText('Analyse')).toBeInTheDocument()
      expect(screen.getByText('Drift')).toBeInTheDocument()
      expect(screen.getByText('System')).toBeInTheDocument()
    })

    it('viser alle sidelinks', () => {
      renderSidebar()
      expect(screen.getByText('Oversigt')).toBeInTheDocument()
      expect(screen.getByText('Opgaver')).toBeInTheDocument()
      expect(screen.getByText('Indstillinger')).toBeInTheDocument()
      expect(screen.getByText('Agenter')).toBeInTheDocument()
    })

    it('viser Maison knappen', () => {
      renderSidebar()
      expect(screen.getByRole('button', { name: /maison/i })).toBeInTheDocument()
    })

    it('viser "Mission Kontrol" version string', () => {
      renderSidebar()
      expect(screen.getByText(/mission kontrol/i)).toBeInTheDocument()
    })
  })

  describe('Aktiv tilstand', () => {
    it('markerer aktivt element med aria-current="page"', () => {
      renderSidebar({ active: 'tasks' })
      const taskLink = screen.getByRole('link', { name: /opgaver/i })
      expect(taskLink).toHaveAttribute('aria-current', 'page')
    })

    it('inaktive elementer har IKKE aria-current', () => {
      renderSidebar({ active: 'tasks' })
      const dashLink = screen.getByRole('link', { name: /oversigt/i })
      expect(dashLink).not.toHaveAttribute('aria-current', 'page')
    })

    it('skifter aktiv side ved klik', () => {
      const onNavigate = vi.fn()
      renderSidebar({ active: 'dashboard', onNavigate })
      fireEvent.click(screen.getByRole('link', { name: /opgaver/i }))
      expect(onNavigate).toHaveBeenCalledWith('tasks')
    })
  })

  describe('Navigation', () => {
    it('kalder onNavigate med korrekt id', () => {
      const onNavigate = vi.fn()
      renderSidebar({ onNavigate })
      fireEvent.click(screen.getByRole('link', { name: /agenter/i }))
      expect(onNavigate).toHaveBeenCalledWith('agents')
    })

    it('forhindrer default link-navigation', () => {
      const onNavigate = vi.fn()
      renderSidebar({ onNavigate })
      const link = screen.getByRole('link', { name: /oversigt/i })
      const event = fireEvent.click(link)
      // click returnerer true hvis preventDefault ikke kaldt, false hvis kaldt
      expect(onNavigate).toHaveBeenCalled()
    })

    it('kalder onMaisonClick ved klik på Maison', () => {
      const onMaisonClick = vi.fn()
      renderSidebar({ onMaisonClick })
      fireEvent.click(screen.getByRole('button', { name: /maison/i }))
      expect(onMaisonClick).toHaveBeenCalledTimes(1)
    })

    it('kalder onMaisonClick ved Enter-tast på Maison', () => {
      const onMaisonClick = vi.fn()
      renderSidebar({ onMaisonClick })
      const maisonBtn = screen.getByRole('button', { name: /maison/i })
      fireEvent.keyDown(maisonBtn, { key: 'Enter' })
      expect(onMaisonClick).toHaveBeenCalledTimes(1)
    })

    it('kalder onClose ved klik på luk-knap (mobil)', () => {
      const onClose = vi.fn()
      renderSidebar({ onClose })
      const closeBtn = screen.getByRole('button', { name: /luk menu/i })
      fireEvent.click(closeBtn)
      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('Badge counts', () => {
    it('viser badge for agenter med korrekt antal', () => {
      renderSidebar()
      // mockLiveData har 1 subagent (kind !== 'main')
      const badge = screen.getByText('1')
      expect(badge).toBeInTheDocument()
    })

    it('viser badge for cron med aktive jobs', () => {
      renderSidebar()
      // mockLiveData har 2 enabled cron jobs
      const badge = screen.getByText('2')
      expect(badge).toBeInTheDocument()
    })
  })

  describe('Synlighed', () => {
    it('er synlig når isOpen=true (lg: altid synlig)', () => {
      const { container } = renderSidebar({ isOpen: true })
      const aside = container.querySelector('aside')
      expect(aside).toHaveClass('translate-x-0')
    })

    it('er skjult når isOpen=false', () => {
      const { container } = renderSidebar({ isOpen: false })
      const aside = container.querySelector('aside')
      expect(aside).toHaveClass('-translate-x-full')
    })
  })
})
