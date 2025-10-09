import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  root: '.',
  resolve: {
    alias: {
      '@tonybfox/threejs-camera': resolve('../packages/camera/src/index.ts'),
      '@tonybfox/threejs-grid': resolve('../packages/grid/src/index.ts'),
      '@tonybfox/threejs-measurements': resolve(
        '../packages/measurements/src/index.ts'
      ),
      '@tonybfox/threejs-asset-loader': resolve(
        '../packages/asset-loader/src/index.ts'
      ),
      '@tonybfox/threejs-terrain': resolve('../packages/terrain/src/index.ts'),
      '@tonybfox/threejs-sunlight': resolve(
        '../packages/sunlight/src/index.ts'
      ),
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
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
})
