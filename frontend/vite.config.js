import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

// SSL 证书路径
const sslKeyPath = resolve(__dirname, '../ssl/key.pem')
const sslCertPath = resolve(__dirname, '../ssl/cert.pem')

export default defineConfig(({ command }) => {
  // 只在开发模式下检查 SSL 证书
  const hasSSL = command === 'serve' && existsSync(sslKeyPath) && existsSync(sslCertPath)

  return {
    plugins: [vue()],
    server: {
      port: 3000,
      host: true,
      // 只有在开发模式且证书存在时才启用 HTTPS
      https: hasSSL ? {
        key: readFileSync(sslKeyPath),
        cert: readFileSync(sslCertPath)
      } : false
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets'
    }
  }
})
