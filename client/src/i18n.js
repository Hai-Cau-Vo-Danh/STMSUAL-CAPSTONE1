// src/i18n.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// 🔥 KHAI BÁO CÁC BIẾN CHỨA PLUGIN TẠM THỜI (chỉ khai báo)
let LanguageDetector;
let HttpApi;

// 🔥 HÀM INIT ASYNC CHÍNH
const initI18n = async () => {
    try {
        // Sử dụng Dynamic Import để Module được tải an toàn (Phương pháp mạnh mẽ nhất)
        LanguageDetector = (await import('i18next-browser-languagedetector')).default;
        HttpApi = (await import('i18next-http-backend')).default;
        
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
        // Console log lỗi để debug
        console.error("Lỗi khởi tạo i18n/Dynamic Import:", e);
        // Ngăn màn hình trắng bằng cách khởi tạo i18n với cấu hình cơ bản
        i18n.init({ debug: false, fallbackLng: 'vi' }); 
    }
};

initI18n(); 

export default i18n;
