import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const chunkNameByPackage = (id: string): string | undefined => {
  if (id.includes('@ant-design/icons')) {
    return 'antd-icons'
  }

  if (id.includes('/node_modules/antd/')) {
    const antdComponentMatch = id.match(/\/node_modules\/antd\/(es|lib)\/([^/]+)/)
    if (antdComponentMatch?.[2]) {
      return `antd-${antdComponentMatch[2]}`
    }

    return 'antd-components'
  }

  if (id.includes('/node_modules/@ant-design/')) {
    return 'antd-utils'
  }

  if (id.includes('/node_modules/rc-')) {
    return 'antd-rc'
  }

  if (id.includes('@tanstack/react-query')) {
    return 'react-query'
  }

  if (id.includes('react-router-dom') || id.includes('@remix-run/router')) {
    return 'router'
  }

  if (id.includes('/node_modules/react/') || id.includes('/node_modules/react-dom/')) {
    return 'react-core'
  }

  return undefined
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: ['auctionhub.test'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined;
          }

          return chunkNameByPackage(id) ?? 'vendor';
        },
      },
    },
  },
})
