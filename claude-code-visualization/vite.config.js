import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import fs from 'fs'
import path from 'path'

// Plugin: serve source files from parent src/ via /__source__/src/...
function sourceViewerPlugin() {
  return {
    name: 'source-viewer',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url.startsWith('/__source__/')) return next()
        const relPath = decodeURIComponent(req.url.replace('/__source__/', ''))
        const absPath = path.resolve(__dirname, '..', relPath)
        // Security: only allow reading from parent src/
        if (!absPath.startsWith(path.resolve(__dirname, '..', 'src'))) {
          res.statusCode = 403
          res.end('Forbidden')
          return
        }
        // Try exact path, then with .tsx/.ts suffix swap
        const candidates = [absPath]
        if (absPath.endsWith('.ts') && !absPath.endsWith('.tsx')) {
          candidates.push(absPath + 'x')  // .ts → .tsx
        }
        if (absPath.endsWith('.tsx')) {
          candidates.push(absPath.slice(0, -1))  // .tsx → .ts
        }
        function tryRead(i) {
          if (i >= candidates.length) {
            res.statusCode = 404
            res.end(`File not found: ${relPath}`)
            return
          }
          fs.readFile(candidates[i], 'utf-8', (err, data) => {
            if (err) return tryRead(i + 1)
            res.setHeader('Content-Type', 'text/plain; charset=utf-8')
            res.end(data)
          })
        }
        tryRead(0)
      })
    },
  }
}

export default defineConfig({
  plugins: [vue(), sourceViewerPlugin()],
  server: {
    port: 5173,
    open: true,
  },
})
