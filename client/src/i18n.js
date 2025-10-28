// src/i18n.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpApi from 'i18next-http-backend';

i18n
  .use(HttpApi) // Tải file dịch từ /public/locales
  .use(LanguageDetector) // Tự phát hiện ngôn ngữ
  .use(initReactI18next) // Kết nối với React
  .init({
    debug: true, // 👈 Đặt debug ở cấp cao nhất
    supportedLngs: ['en', 'vi'], // Ngôn ngữ hỗ trợ
    fallbackLng: 'vi', // Ngôn ngữ mặc định
    detection: {
      order: ['localStorage', 'cookie', 'htmlTag', 'path', 'subdomain'],
      caches: ['localStorage', 'cookie'], // Lưu lựa chọn ngôn ngữ
      // Xóa debug: true khỏi đây
    },
    backend: {
      loadPath: '/locales/{{lng}}/translation.json', // Đường dẫn file dịch
    },
    // Chỉ cần một khối react
    react: {
      useSuspense: true, // Dùng Suspense để chờ tải
    },
    // Xóa khối react trùng lặp ở đây
  });

export default i18n; // Xuất instance để main.jsx dùng