import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import './mocks'
import { ToastProvider, useToast, ToastType } from '../components/Toast'

// ── Helper komponent til at trigge toasts ──────────────────────────────────────
function ToastTrigger({ type, message }: { type: ToastType; message: string }) {
  const { showToast } = useToast()
  return (
    <button onClick={() => showToast(type, message)}>
      Vis toast
    </button>
  )
}

function renderWithProvider(type: ToastType = 'info', message = 'Test besked') {
  return render(
    <ToastProvider>
      <ToastTrigger type={type} message={message} />
    </ToastProvider>
  )
}

describe('Toast System', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  describe('Visning', () => {
    it('viser ikke toast som standard', () => {
      renderWithProvider()
      expect(screen.queryByText('Test besked')).not.toBeInTheDocument()
    })

    it('viser toast efter showToast kaldes', async () => {
      renderWithProvider('info', 'Hello toast')
      fireEvent.click(screen.getByText('Vis toast'))
      
      await act(async () => {
        await vi.runAllTimersAsync()
      })
      
      expect(screen.getByText('Hello toast')).toBeInTheDocument()
    })

    it('viser success toast', async () => {
      renderWithProvider('success', 'Det lykkedes!')
      fireEvent.click(screen.getByText('Vis toast'))
      
      await act(async () => {
        vi.advanceTimersByTime(50)
      })
      
      expect(screen.getByText('Det lykkedes!')).toBeInTheDocument()
    })

    it('viser error toast', async () => {
      renderWithProvider('error', 'Noget gik galt')
      fireEvent.click(screen.getByText('Vis toast'))
      
      await act(async () => {
        vi.advanceTimersByTime(50)
      })
      
      expect(screen.getByText('Noget gik galt')).toBeInTheDocument()
    })

    it('viser warning toast', async () => {
      renderWithProvider('warning', 'Advarsel!')
      fireEvent.click(screen.getByText('Vis toast'))
      
      await act(async () => {
        vi.advanceTimersByTime(50)
      })
      
      expect(screen.getByText('Advarsel!')).toBeInTheDocument()
    })

    it('viser multiple toasts', async () => {
      render(
        <ToastProvider>
          <ToastTrigger type="info" message="Toast 1" />
          <ToastTrigger type="success" message="Toast 2" />
        </ToastProvider>
      )

      const btns = screen.getAllByText('Vis toast')
      fireEvent.click(btns[0])
      fireEvent.click(btns[1])

      await act(async () => {
        vi.advanceTimersByTime(50)
      })

      expect(screen.getByText('Toast 1')).toBeInTheDocument()
      expect(screen.getByText('Toast 2')).toBeInTheDocument()
    })
  })

  describe('Manuel luk', () => {
    it('kan lukkes manuelt via luk-knap', async () => {
      renderWithProvider('info', 'Luk mig')
      fireEvent.click(screen.getByText('Vis toast'))

      await act(async () => {
        vi.advanceTimersByTime(50)
      })

      const closeBtn = screen.getByRole('button', { name: /luk notifikation/i })
      fireEvent.click(closeBtn)

      expect(screen.queryByText('Luk mig')).not.toBeInTheDocument()
    })
  })

  describe('Auto-dismiss', () => {
    it('forsvinder efter TOAST_DURATION (4000ms)', async () => {
      renderWithProvider('info', 'Auto-dismiss test')
      fireEvent.click(screen.getByText('Vis toast'))

      await act(async () => {
        vi.advanceTimersByTime(50)
      })

      expect(screen.getByText('Auto-dismiss test')).toBeInTheDocument()

      await act(async () => {
        vi.advanceTimersByTime(4100)
      })

      expect(screen.queryByText('Auto-dismiss test')).not.toBeInTheDocument()
    })

    it('forbliver synlig inden TOAST_DURATION udløber', async () => {
      renderWithProvider('success', 'Stadig synlig')
      fireEvent.click(screen.getByText('Vis toast'))

      await act(async () => {
        vi.advanceTimersByTime(50)
      })

      expect(screen.getByText('Stadig synlig')).toBeInTheDocument()

      await act(async () => {
        vi.advanceTimersByTime(2000)
      })

      expect(screen.getByText('Stadig synlig')).toBeInTheDocument()
    })
  })

  describe('Context fejl', () => {
    it('kaster fejl når useToast bruges uden provider', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

      function BadComponent() {
        useToast()
        return null
      }

      expect(() => render(<BadComponent />)).toThrow(
        'useToast skal bruges inden i ToastProvider'
      )

      spy.mockRestore()
    })
  })

  describe('Queue', () => {
    it('håndterer mere end 5 toasts via kø', async () => {
      function MultiTrigger() {
        const { showToast } = useToast()
        return (
          <button onClick={() => {
            for (let i = 1; i <= 7; i++) {
              showToast('info', `Toast ${i}`)
            }
          }}>
            Vis mange
          </button>
        )
      }

      render(
        <ToastProvider>
          <MultiTrigger />
        </ToastProvider>
      )

      fireEvent.click(screen.getByText('Vis mange'))

      await act(async () => {
        vi.advanceTimersByTime(50)
      })

      // MAX_VISIBLE = 5, så kun 5 synlige
      const toastTexts = Array.from(
        document.querySelectorAll('p')
      ).map(el => el.textContent).filter(t => t?.startsWith('Toast'))

      expect(toastTexts.length).toBeLessThanOrEqual(5)
    })
  })
})
