// src/components/MainNavbar.jsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import './MainNavbar.css';
import { useTranslation } from 'react-i18next'; // Đảm bảo import đúng

// --- (ĐÃ SỬA) GỘP CÁC DÒNG IMPORT BỊ TRÙNG ---
import { 
  BsClipboardCheck, BsJournalText, BsCalendarWeek, BsStopwatch, 
  BsColumnsGap, BsGear, 
  BsGrid1X2Fill, // Icon cho Dashboard
  BsStars,       // Icon cho AI Assistant
  BsBookHalf     // Icon cho Study Room
} from 'react-icons/bs';
// --- KẾT THÚC SỬA ---

const MainNavbar = () => {
  const { t } = useTranslation(); // Đảm bảo gọi hook ở đây

  // --- (ĐÃ SỬA) BỔ SUNG CÁC MỤC CÒN THIẾU ---
  const navItems = [
    { path: '/dashboard', labelKey: 'sidebar.dashboard', icon: <BsGrid1X2Fill /> }, 
    { path: '/tasks', labelKey: 'sidebar.tasks', icon: <BsClipboardCheck /> },
    { path: '/notes', labelKey: 'sidebar.notes', icon: <BsJournalText /> },
    { path: '/calendar', labelKey: 'sidebar.calendar', icon: <BsCalendarWeek /> },
    { path: '/pomodoro', labelKey: 'sidebar.pomodoro', icon: <BsStopwatch /> },
    { path: '/ai-assistant', labelKey: 'sidebar.aiAssistant', icon: <BsStars /> }, 
    { path: '/workspaces', labelKey: 'sidebar.workspaces', icon: <BsColumnsGap /> },
    { path: '/study-room', labelKey: 'sidebar.studyRoom', icon: <BsBookHalf /> },
    { path: '/settings', labelKey: 'sidebar.settings', icon: <BsGear /> },
  ];
  // --- KẾT THÚC SỬA ---

  return (
    <nav className="main-navbar">
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <span className="nav-icon">{item.icon}</span>
          {/* Đảm bảo dùng hàm t() với đúng key */}
          <span className="nav-label">{t(item.labelKey)}</span> 
        </NavLink>
      ))}
    </nav>
  );
};

export default MainNavbar;