import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Bất kỳ yêu cầu nào bắt đầu bằng '/api'
      '/api': {
        // Sẽ được chuyển tiếp đến backend Flask
        target: 'http://localhost:5000', 
        changeOrigin: true, // Cần thiết để backend chấp nhận yêu cầu
        secure: false,      // Chấp nhận nếu backend là http
      }
    }
  }
})