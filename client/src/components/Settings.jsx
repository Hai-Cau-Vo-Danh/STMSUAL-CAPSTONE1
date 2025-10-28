import React, { useState, useEffect } from 'react';
import './Settings.css';
import { BsMoonStarsFill, BsSunFill, BsBellFill, BsBellSlashFill, BsGlobe } from 'react-icons/bs';
import { useTranslation } from 'react-i18next';

const Settings = () => {
  const { t, i18n } = useTranslation();

  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    JSON.parse(localStorage.getItem('notificationsEnabled') || 'true')
  );

  useEffect(() => {
    document.body.className = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleLanguageChange = (newLang) => {
    i18n.changeLanguage(newLang);
  };

  const toggleNotifications = () => {
    setNotificationsEnabled(prev => {
      const newState = !prev;
      localStorage.setItem('notificationsEnabled', JSON.stringify(newState));
      return newState;
    });
  };
  
  const currentLang = i18n.language.startsWith('vi') ? 'vi' : 'en';

  return (
    <div className="settings-container">
      <h1>{t('settings.title')}</h1>

      {/* --- Cài đặt Giao diện --- */}
      <div className="setting-section">
        <h2>{t('settings.theme')}</h2>
        <div className="theme-toggle">
          <button
            onClick={() => setTheme('light')}
            className={`theme-btn theme-light ${theme === 'light' ? 'active' : ''}`}
            aria-label={t('settings.light')}
          >
            <BsSunFill /> {t('settings.light')}
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={`theme-btn theme-dark ${theme === 'dark' ? 'active' : ''}`}
            aria-label={t('settings.dark')}
          >
            <BsMoonStarsFill /> {t('settings.dark')}
          </button>
        </div>
      </div>

      {/* --- Cài đặt Ngôn ngữ (SỬ DỤNG CHUẨN) --- */}
      <div className="setting-section">
        <h2>{t('settings.language')} <BsGlobe /></h2>
        <div className="language-toggle">
          <button
            onClick={() => handleLanguageChange('vi')}
            className={`lang-btn lang-vi ${currentLang === 'vi' ? 'active' : ''}`}
          >
            Tiếng Việt
          </button>
          <button
            onClick={() => handleLanguageChange('en')}
            className={`lang-btn lang-en ${currentLang === 'en' ? 'active' : ''}`}
          >
            English
          </button>
        </div>
      </div>

      {/* --- Cài đặt Thông báo (MÀU CHUẨN) --- */}
      <div className="setting-section">
        <h2>{t('settings.notifications')}</h2>
        <button
          onClick={toggleNotifications}
          className={`toggle-btn notifications ${notificationsEnabled ? 'active-green' : 'active-dark'}`}
        >
          {notificationsEnabled ? <BsBellFill /> : <BsBellSlashFill />}
          {notificationsEnabled ? t('settings.enabled') : t('settings.disabled')}
        </button>
      </div>

    </div>
  );
};

export default Settings;