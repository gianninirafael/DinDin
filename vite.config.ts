import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// Relative base so the built assets load correctly on GitHub Pages
// (served from a /<repo>/ sub-path) without hard-coding the repo name.
// The app has no client-side routing, so relative URLs resolve fine.
export default defineConfig({
  base: './',
  plugins: [react()],
})
