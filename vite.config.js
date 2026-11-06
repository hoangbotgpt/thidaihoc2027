import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' để trang chạy được ở bất kỳ đường dẫn nào (GitHub Pages: https://<user>.github.io/<repo>/)
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { chunkSizeWarningLimit: 1500 }
});
