// src/i18n.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// 🔥 SỬ DỤNG CÚ PHÁP REQUIRE CHO CÁC MODULE BÊN NGOÀI BỊ LỖI PHÂN GIẢI
// @ts-ignore
const LanguageDetector = (await import('i18next-browser-languagedetector')).default;
// @ts-ignore
const HttpApi = (await import('i18next-http-backend')).default;
// 🔥 HOẶC DÙNG CÁCH NÀY NẾU CÁCH TRÊN VẪN LỖI: 
// const LanguageDetector = require('i18next-browser-languagedetector');
// const HttpApi = require('i18next-http-backend');

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
      loadPath: '/locales/{{lng}}/translation.json', // Đường dẫn file dịch
    },
    
    // Cấu hình React
    react: {
      useSuspense: true, 
    },
    
    // Định nghĩa namespace mặc định
    ns: ['translation'],
    defaultNS: 'translation',

  });

export default i18n; // Xuất instance để main.jsx dùng
