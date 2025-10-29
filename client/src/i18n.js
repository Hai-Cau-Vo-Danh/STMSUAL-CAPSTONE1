// src/i18n.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
// 🔥 SỬA: Đảm bảo không có lỗi ở các dòng import plugin
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpApi from 'i18next-http-backend';

// Cấu hình i18next
i18n
  .use(HttpApi)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    // Cấu hình cơ bản
    debug: false, 
    supportedLngs: ['en', 'vi'],
    fallbackLng: 'vi', 
    
    // Cấu hình phát hiện ngôn ngữ
    detection: {
      order: ['localStorage', 'cookie', 'htmlTag', 'path', 'subdomain'],
      caches: ['localStorage', 'cookie'],
    },
    
    // Cấu hình Backend (Load translations)
    backend: {
      // Đảm bảo đường dẫn này là chính xác trên Vercel (nó phải nằm trong thư mục 'public')
      loadPath: '/locales/{{lng}}/translation.json', 
    },
    
    // Cấu hình React
    react: {
      useSuspense: true, 
    },
    
    // Định nghĩa namespace mặc định
    ns: ['translation'],
    defaultNS: 'translation',

  });

export default i18n;
