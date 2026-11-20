import { defineConfig } from 'vite'
import { resolve } from 'node:path'

const here = import.meta.dirname
export default defineConfig({
  resolve: {
    alias: [
      { find: /^react\/jsx-runtime$/, replacement: resolve(here, 'shims/jsx-runtime.js') },
      { find: /^react\/jsx-dev-runtime$/, replacement: resolve(here, 'shims/jsx-runtime.js') },
      { find: /^react$/, replacement: resolve(here, 'shims/react.js') },
    ],
  },
  define: { 'process.env.NODE_ENV': '"production"' },
  publicDir: false,
  build: {
    outDir: resolve(here, 'out/bundle'),
    emptyOutDir: true,
    minify: true,
    lib: {
      entry: resolve(here, 'entry.ts'),
      name: 'QuickGames',
      formats: ['iife'],
      fileName: () => 'bundle.js',
    },
  },
})
