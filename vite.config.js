import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { cpSync } from 'node:fs'
import { resolve } from 'node:path'

export default defineConfig({
  base: '/DatB/',
  plugins: [
    react(),
    {
      name: 'copy-datb-assets',
      closeBundle() {
        cpSync(resolve('assets'), resolve('dist/assets'), { recursive: true })
      }
    }
  ],
  server: { port: 5173, strictPort: true },
  build: { target: 'es2022', sourcemap: true }
})
