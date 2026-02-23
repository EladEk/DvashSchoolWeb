import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import imagekitAuth from './vite-plugin-imagekit-auth.js'
import apiSaveJsonLocal from './vite-plugin-api-save-json-local.js'

export default defineConfig({
  plugins: [
    react(),
    imagekitAuth(),
    apiSaveJsonLocal()
  ],
  build: {
    sourcemap: true
  }
})
