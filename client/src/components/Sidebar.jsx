import React from 'react';
import './Sidebar.css';
import dashboardIcon from '../assets/TaskManagement-icon/dashboard.svg';
import taskIcon from '../assets/TaskManagement-icon/task-default.svg';
import notesIcon from '../assets/TaskManagement-icon/task-default.svg';
import calendarIcon from '../assets/TaskManagement-icon/calendar.svg';
import pomodoroIcon from '../assets/TaskManagement-icon/pomodoro.svg';
import studyRoomIcon from '../assets/TaskManagement-icon/study-room.svg';
import workspacesIcon from '../assets/TaskManagement-icon/dashboard.svg';
import aiIcon from '../assets/TaskManagement-icon/search.svg';

// 1. Import thêm 'Link' và 'useLocation' từ React Router
import { Link, useLocation } from 'react-router-dom';

// --- (CODE MỚI) IMPORT ICON CHO SETTINGS ---
import { BsGearFill } from 'react-icons/bs';
// --- KẾT THÚC CODE MỚI ---

// Bỏ props onLogout vì nó không còn được dùng ở đây
const Sidebar = () => {
  // Lấy URL hiện tại từ router
  const location = useLocation();

  // Thêm thuộc tính 'path' và icon Settings
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: dashboardIcon, path: '/dashboard', isSvg: true },
    { id: 'tasks', label: 'Tasks', icon: taskIcon, path: '/tasks', isSvg: true },
    { id: 'notes', label: 'Notes', icon: notesIcon, path: '/notes', isSvg: true },
    { id: 'calendar', label: 'Calendar', icon: calendarIcon, path: '/calendar', isSvg: true },
    { id: 'pomodoro', label: 'Pomodoro', icon: pomodoroIcon, path: '/pomodoro', isSvg: true },
    { id: 'ai', label: 'AI Assistant', icon: aiIcon, path: '/ai-assistant', isSvg: true },
    { id: 'workspaces', label: 'Workspaces', icon: workspacesIcon, path: '/workspaces', isSvg: true },
    { id: 'study-room', label: 'Study Room', icon: studyRoomIcon, path: '/study-room', isSvg: true },
    // --- (CODE MỚI) THÊM MỤC SETTINGS ---
    // Sử dụng isSvg: false để biết đây là component icon
    { id: 'settings', label: 'Settings', icon: <BsGearFill />, path: '/settings', isSvg: false },
    // --- KẾT THÚC CODE MỚI ---
  ];

  return (
    <div className="sidebar">
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <Link
            key={item.id}
            to={item.path}
            // Tự động highlight tab active
            className={`sidebar-item ${location.pathname === item.path ? 'active' : ''}`}
          >
            {/* --- (ĐÃ SỬA) KIỂM TRA ĐỂ RENDER ICON ĐÚNG CÁCH --- */}
            {item.isSvg ? (
              <img src={item.icon} alt={item.label} className="sidebar-icon" />
            ) : (
              <span className="sidebar-icon">{item.icon}</span>
            )}
            {/* --- KẾT THÚC SỬA --- */}
            <span className="sidebar-label">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="sidebar-logo">
        <h2>STMSUAL</h2>
        <p className="version">Version: 1.0.0.11</p>
      </div>
    </div>
  );
};

export default Sidebar;