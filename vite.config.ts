import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Tauriのデスクトップアプリと将来のWeb版の両方から利用する設定。
// Tauri固有の項目（clearScreen, server.strictPort等）は
// 将来Web版へ移植する際にこのファイルごと差し替えられるよう独立させている。
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,

    // ←これを追加
    watch: {
      ignored: [
        '**/src-tauri/**',
        '**/target/**',
        '**/node_modules/**'
      ]
    }
  },
  build: {
    outDir: 'dist',
  },
});
