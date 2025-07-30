import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          charts: ['react-chartjs-2', 'chart.js'],
          utils: ['date-fns']
        }
      }
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-chartjs-2', 'chart.js', 'date-fns']
  }
}); 