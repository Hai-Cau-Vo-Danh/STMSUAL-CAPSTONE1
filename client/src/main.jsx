// src/main.jsx
import React, { Suspense } from 'react'; // 👈 THÊM Suspense VÀO IMPORT
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* --- (CODE MỚI) BỌC APP BẰNG SUSPENSE --- */}
    <Suspense fallback={<div>Loading translations...</div>}> 
      <I18nextProvider i18n={i18n}>
        <App />
      </I18nextProvider>
    </Suspense>
    {/* --- KẾT THÚC CODE MỚI --- */}
  </React.StrictMode>
);