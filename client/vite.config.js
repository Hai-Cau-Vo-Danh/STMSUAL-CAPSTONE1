import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  
  // 🔥 KHỐI BUILD (Cần cho Vercel/Production)
  build: {
    outDir: 'dist', // Thư mục output cho Vercel
    rollupOptions: {
      external: [
        // Khắc phục lỗi Rollup không phân giải các thư viện i18next
        'i18next-browser-languagedetector', 
        'i18next-http-backend' 
      ],
    },
  },
  
  // 🔥 KHỐI SERVER (Cần cho Local Development với Proxy)
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