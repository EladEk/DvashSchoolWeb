import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    environmentMatchGlobs: [
      ['**/tests/components/**', 'jsdom'],
      ['**/src/**/*.test.*', 'jsdom'],
    ],
    setupFiles: ['tests/setup.js'],
    include: ['tests/**/*.test.{js,jsx}', 'src/**/*.test.{js,jsx}'],
    outputFile: {
      json: 'test-results/vitest-results.json',
    },
    reporters: ['default', 'json'],
    testTimeout: 10000,
  },
})
