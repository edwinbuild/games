/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

// HTML pages are generated into site/ by scripts/pages.ts:
// site/index.html (home) and site/<slug>/index.html (one per game).
const here = import.meta.dirname
const siteDir = resolve(here, 'site')
const input: Record<string, string> = {}
// site/ only exists after `npm run pages`; vitest loads this config without it.
for (const entry of existsSync(siteDir) ? readdirSync(siteDir) : []) {
  const full = resolve(siteDir, entry)
  if (entry === 'index.html') input.home = full
  else if (entry.endsWith('.html')) input[entry.replace(/\.html$/, '')] = full
  else if (statSync(full).isDirectory()) input[entry] = resolve(full, 'index.html')
}

export default defineConfig({
  root: siteDir,
  publicDir: resolve(here, 'public'),
  plugins: [react()],
  build: { outDir: resolve(here, 'dist'), emptyOutDir: true, rollupOptions: { input } },
  test: { root: here, include: ['src/**/*.test.ts'] },
})
