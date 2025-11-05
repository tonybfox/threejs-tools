import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  root: '.',
  resolve: {
    alias: {
      '@tonybfox/threejs-tools': resolve('../src/index.ts'),
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: './index.html',
        camera: './camera/index.html',
        grid: './grid/index.html',
        measurements: './measurements/index.html',
        assetLoader: './asset-loader/index.html',
        terrain: './terrain/index.html',
        sunlight: './sunlight/index.html',
        compass: './compass/index.html',
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
})
