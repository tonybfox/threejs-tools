import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: './index.html',
        camera: './camera/index.html',
        grid: './grid/index.html',
        measurements: './measurements/index.html',
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});
