// src/i18n.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// 🔥 CHUYỂN LOGIC KHỞI TẠO VÀ IMPORT PLUGIN VÀO TRONG MỘT HÀM ASYNC
const initI18n = async () => {
    try {
        // Sử dụng Dynamic Import để đảm bảo Module được tải an toàn trong production
        const LanguageDetector = (await import('i18next-browser-languagedetector')).default;
        const HttpApi = (await import('i18next-http-backend')).default;

        i18n
          .use(HttpApi)
          .use(LanguageDetector)
          .use(initReactI18next)
          .init({
            // Cấu hình cơ bản
            debug: false, 
            supportedLngs: ['en', 'vi'],
            fallbackLng: 'vi', 
            detection: {
              order: ['localStorage', 'cookie', 'htmlTag', 'path', 'subdomain'],
              caches: ['localStorage', 'cookie'],
            },
            backend: {
              loadPath: '/locales/{{lng}}/translation.json', 
            },
            react: {
              useSuspense: true, 
            },
            ns: ['translation'],
            defaultNS: 'translation',
          });
    } catch (e) {
        console.error("Lỗi khởi tạo i18n/Dynamic Import:", e);
    }
};

initI18n(); 

export default i18n;
