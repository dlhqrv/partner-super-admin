import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Super-admin runs on 5174 by default so it can run next to the partner app (5173).
// Proxy forwards /admin → p-Back. If login fails with ECONNREFUSED, start the API
// (`cd p-Back && npm run dev`) or set VITE_API_PROXY_TARGET in super-admin/.env
// to match your p-Back PORT (see p-Back/.env).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve('.'), '')
  const apiTarget = env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:4000'

  return {
    plugins: [react()],
    server: {
      port: 5174,
      proxy: {
        '/admin': { target: apiTarget, changeOrigin: true },
      },
    },
  }
})
