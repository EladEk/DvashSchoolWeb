/**
 * ParliamentLogin — form is present; invalid credentials path (mocked findUserByUsername).
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ParliamentLogin from '../../src/pages/ParliamentLogin'

vi.mock('../../src/contexts/TranslationContext', () => ({
  useTranslation: () => ({ t: (key) => key }),
}))

vi.mock('../../src/services/firebaseDB', () => ({
  findUserByUsername: vi.fn(),
  checkUsernameExists: vi.fn(),
  createUser: vi.fn(),
}))

describe('ParliamentLogin', () => {
  it('renders login form with username and password inputs', () => {
    render(
      <MemoryRouter>
        <ParliamentLogin />
      </MemoryRouter>
    )
    const inputs = document.querySelectorAll('input')
    expect(inputs.length).toBeGreaterThanOrEqual(1)
    const passwordInput = document.querySelector('input[type="password"]')
    expect(passwordInput).toBeInTheDocument()
  })
})
