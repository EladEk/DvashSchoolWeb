import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import imagekitAuth from './vite-plugin-imagekit-auth.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    imagekitAuth()
  ],
})
