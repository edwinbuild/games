/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

// HTML pages are generated into site/ by scripts/pages.ts:
// site/index.html (home), site/<slug>/index.html (one per game) and site/c/<kind>/index.html (categories).
const here = import.meta.dirname
const siteDir = resolve(here, 'site')
const input: Record<string, string> = {}
// site/ only exists after `npm run pages`; vitest loads this config without it.
for (const entry of existsSync(siteDir) ? readdirSync(siteDir) : []) {
  const full = resolve(siteDir, entry)
  if (entry === 'index.html') input.home = full
  else if (entry.endsWith('.html')) input[entry.replace(/\.html$/, '')] = full
  else if (statSync(full).isDirectory()) {
    // A page folder (site/<slug>/index.html) or a folder of them (site/c/<kind>/index.html).
    if (existsSync(resolve(full, 'index.html'))) input[entry] = resolve(full, 'index.html')
    else for (const sub of readdirSync(full)) input[`${entry}-${sub}`] = resolve(full, sub, 'index.html')
  }
}

const CORE = [
  /node_modules\/(react|react-dom|scheduler)\//,
  /\/src\/ui\/(components|index)\.tsx?$/,
  /\/src\/games\/registry\.ts$/,
  /\/src\/site\.ts$/,
  /\/src\/shell\/(api|auth|storage|stats|daily|SiteFooter|AccountKey|errors|sw-register|mount|live|config|SiteNotice)\.tsx?$/,
]

export default defineConfig({
  root: siteDir,
  publicDir: resolve(here, 'public'),
  plugins: [react()],
  build: {
    outDir: resolve(here, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input,
      // React and the code every page runs stay in one file: split into several small files they
      // compress worse, and every page loads them anyway.
      output: { manualChunks: (id) => (CORE.some((r) => r.test(id)) ? 'core' : undefined) },
    },
  },
  test: { root: here, include: ['src/**/*.test.ts'] },
})
