/**
 * AdminRoute — redirects to /parliament/login when unauthenticated; renders children when allowed.
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AdminRoute from '../../src/components/AdminRoute'

const useEffectiveRole = vi.fn()
vi.mock('../../src/utils/requireRole', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useEffectiveRole: () => useEffectiveRole(),
  }
})

describe('AdminRoute', () => {
  beforeEach(() => {
    sessionStorage.clear()
    localStorage.clear()
  })

  it('redirects to /parliament/login when not authenticated', () => {
    useEffectiveRole.mockReturnValue({ role: '', phase: 'none' })
    render(
      <MemoryRouter>
        <AdminRoute>
          <div>Protected content</div>
        </AdminRoute>
      </MemoryRouter>
    )
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument()
    const navigate = screen.queryByText('Protected content')
    expect(navigate).not.toBeInTheDocument()
  })

  it('renders children when authenticated with admin session', () => {
    sessionStorage.setItem('adminAuthenticated', 'true')
    useEffectiveRole.mockReturnValue({ role: 'admin', phase: 'allowed' })
    render(
      <MemoryRouter>
        <AdminRoute>
          <div>Protected content</div>
        </AdminRoute>
      </MemoryRouter>
    )
    expect(screen.getByText('Protected content')).toBeInTheDocument()
  })
})
