import { defineConfig } from 'tsup'

const entry = {
  index: 'src/index.ts',
  'asset-loader/index': 'packages/asset-loader/src/index.ts',
  'camera/index': 'packages/camera/src/index.ts',
  'compass/index': 'packages/compass/src/index.ts',
  'grid/index': 'packages/grid/src/index.ts',
  'measurements/index': 'packages/measurements/src/index.ts',
  'sunlight/index': 'packages/sunlight/src/index.ts',
  'terrain/index': 'packages/terrain/src/index.ts',
  'transform-controls/index': 'packages/transform-controls/src/index.ts',
  'view-helper/index': 'packages/view-helper/src/index.ts',
} as const

export default defineConfig({
  entry,
  target: 'es2020',
  sourcemap: true,
  clean: true,
  dts: true,
  format: ['esm', 'cjs'],
  outDir: 'dist',
  outExtension({ format }) {
    return {
      js: format === 'esm' ? '.mjs' : '.cjs',
    }
  },
  external: ['three', 'camera-controls', 'three/examples/jsm/*'],
})
