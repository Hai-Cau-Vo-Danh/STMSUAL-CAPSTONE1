import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  
  // 🔥 KHỐI BUILD (Cần cho Vercel/Production)
  build: {
    outDir: 'dist', 
    rollupOptions: {
      external: [
        // THƯ VIỆN GÂY LỖI: Cần khai báo external để Rollup không cố gắng đóng gói nó.
        'i18next-browser-languagedetector', 
        'i18next-http-backend' 
      ],
    },
  },
  
  // 🔥 KHỐI SERVER (Giữ lại cho Local Development)
  server: {
    proxy: {
      // Proxy để chuyển tiếp yêu cầu API sang backend Flask khi chạy cục bộ
      '/api': {
        target: 'http://localhost:5000', 
        changeOrigin: true, 
        secure: false,
      }
    }
  }
});