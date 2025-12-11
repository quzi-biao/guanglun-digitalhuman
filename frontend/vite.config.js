import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { readFileSync } from 'fs'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 3000,
    host: true,
    https:{
      key: readFileSync('../ssl/key.pem'),
      cert: readFileSync('../ssl/cert.pem')
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
})
