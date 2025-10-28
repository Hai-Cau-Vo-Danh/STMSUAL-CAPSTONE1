import React, { useState, useEffect } from "react";
import "./Header.css";
import { BsBellFill, BsSearch } from "react-icons/bs";
import { IoMdArrowDropdown } from "react-icons/io";
import { useNavigate, Link } from "react-router-dom";
import defaultAvatar from "../assets/Trangchu/avt.png";
import logoImage from "../assets/logo-stmsual.png"; // ⚠️ Đảm bảo đường dẫn này đúng

// --- (CODE MỚI) IMPORT ---
import { useTranslation } from 'react-i18next';
// --- KẾT THÚC CODE MỚI ---

function Header({ onLogout }) {
  // --- (CODE MỚI) GỌI HOOK ---
  const { t } = useTranslation();
  // --- KẾT THÚC CODE MỚI ---
// Đặt tên biến cho id search
  const [searchId, setSearchId] = useState("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

 
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false); // Thêm lại state này
  const [notificationCount, setNotificationCount] = useState(3); // Thêm lại state này
  const navigate = useNavigate();
  const [username, setUsername] = useState("User");
  const [avatar, setAvatar] = useState(defaultAvatar);

  // Danh sách gợi ý tìm kiếm
  const searchSuggestionList = [
    { title: "Dashboard", keywords: ["dashboard", "trang chủ", "bảng điều khiển"], route: "/dashboard", icon: "📊" },
    { title: "Tasks", keywords: ["task", "nhiệm vụ", "công việc"], route: "/tasks", icon: "✅" },
    { title: "Notes", keywords: ["note", "ghi chú", "ghi nhớ"], route: "/notes", icon: "📝" },
    { title: "Calendar", keywords: ["calendar", "lịch", "lich"], route: "/calendar", icon: "📅" },
    { title: "Pomodoro", keywords: ["pomodoro", "hẹn giờ", "đồng hồ"], route: "/pomodoro", icon: "⏰" },
    { title: "AI Assistant", keywords: ["ai", "assistant", "trợ lý", "chatbot"], route: "/ai-assistant", icon: "🤖" },
    { title: "Workspaces", keywords: ["workspace", "không gian làm việc", "nhóm"], route: "/workspaces", icon: "🏢" },
    { title: "Study Room", keywords: ["study", "học", "phòng học", "room"], route: "/study-room", icon: "📚" },
    { title: "Settings", keywords: ["setting", "cài đặt", "thiết lập"], route: "/settings", icon: "⚙️" },
    { title: "Profile", keywords: ["profile", "hồ sơ", "tài khoản", "account"], route: "/profile", icon: "👤" },
  ];

  useEffect(() => {
    try {
      const userString = localStorage.getItem("user");
      if (userString) {
        const userData = JSON.parse(userString);
        setUsername(userData.username || "User");
        setAvatar(userData.avatar_url || defaultAvatar);
      }
    } catch (e) { console.error("Lỗi localStorage:", e); }
  }, []);

  // Xử lý thay đổi input tìm kiếm
  const handleSearchInput = (event) => {
    const value = event.target.value;
    setSearchQuery(value);

    if (value.trim().length > 0) {
      // Lọc gợi ý dựa trên từ khóa
      const filtered = searchSuggestionList.filter(item =>
        item.keywords.some(keyword => keyword.includes(value.toLowerCase())) ||
        item.title.toLowerCase().includes(value.toLowerCase())
      );
      setSuggestions(filtered.slice(0, 5)); // Giới hạn 5 gợi ý
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
      setSuggestions([]);
    }
  };

  // Xử lý click vào gợi ý
  const handleSuggestionClick = (route) => {
    navigate(route);
    setSearchQuery("");
    setShowSuggestions(false);
  };

  // Xử lý sự kiện tìm kiếm
  const handleSearch = (event) => {
    if (event.key === 'Enter') {
      const query = event.target.value.trim();
      if (!query) return;

      console.log("🔍 Từ khóa tìm kiếm:", query);

      // Tìm route phù hợp
      const match = searchSuggestionList.find(item =>
        item.keywords.some(keyword => query.toLowerCase().includes(keyword))
      );

      if (match) {
        navigate(match.route);
      } else {
        // Default → trang kết quả tìm kiếm tổng hợp
        navigate(`/search?query=${encodeURIComponent(query)}`);
      }
      
      // Xóa nội dung sau khi tìm kiếm
      setSearchQuery("");
      setShowSuggestions(false);
    }
  };


  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showUserMenu && !event.target.closest('.header-user-profile')) {
        setShowUserMenu(false);
      }
      // Thêm: Đóng notification khi click ra ngoài
      if (showNotifications && !event.target.closest('.notification-wrapper')) {
        setShowNotifications(false);
      }
      // Đóng suggestions khi click ra ngoài
      if (showSuggestions && !event.target.closest('.header-search')) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => { document.removeEventListener('mousedown', handleClickOutside); };
  }, [showUserMenu, showNotifications, showSuggestions]); // Thêm showSuggestions vào dependency

  // Thông báo mẫu (Giữ lại từ file cũ của bạn)
  const notifications = [
{ id: 1, message: "Bạn có 3 tasks cần hoàn thành hôm nay", time: "5 phút trước", unread: true },
    { id: 2, message: "Pomodoro session đã hoàn thành", time: "15 phút trước", unread: true },
    { id: 3, message: "Deadline: Hoàn thành bài tập React", time: "1 giờ trước", unread: false },
  ];

  return (
    <header className="header">
      <Link to="/dashboard" className="header-logo">
        <img src={logoImage} alt="STMSUAL Logo" />
      </Link>

      {/* Search */}
      <div className="header-center">
        <div className="header-search">
          <BsSearch className="search-icon" />
          {/* --- (ĐÃ SỬA) DÙNG t() --- */}
          <input 
            id={searchId} 
            value={searchQuery}
            onChange={handleSearchInput}
            onKeyDown={handleSearch} 
            type="text" 
            placeholder={t('header.searchPlaceholder')} 
            className="search-input" 
          />
          
          {/* Gợi ý tìm kiếm */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="search-suggestions">
              {suggestions.map((item, index) => (
                <div
                  key={index}
                  className="suggestion-item"
                  onClick={() => handleSuggestionClick(item.route)}
                >
                  <span className="suggestion-icon">{item.icon}</span>
                  <span className="suggestion-title">{item.title}</span>
                  <span className="suggestion-keywords">
                    {item.keywords.slice(0, 2).join(", ")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* User & Notifications */}
      <div className="header-right">
        {/* --- (ĐÃ SỬA) CẬP NHẬT LẠI LOGIC THÔNG BÁO --- */}
        <div className="notification-wrapper">
          <button
            className="icon-btn notification-btn"
            aria-label={t('header.notifications')}
            onClick={() => setShowNotifications(!showNotifications)} // Sửa: Dùng state
          >
            <BsBellFill />
            {notificationCount > 0 && ( // Sửa: Dùng state
              <span className="notification-badge">{notificationCount}</span>
            )}
          </button>

          {showNotifications && (
            <div className="notification-dropdown">
              <div className="notification-header">
                <h3>{t('header.notifications')}</h3>
                <button
                  className="clear-btn"
                  onClick={() => setNotificationCount(0)}
                >
                  {t('header.clearAll')}
                </button>
              </div>
              <div className="notification-list">
                {notifications.map((notif) => (
                  <div key={notif.id} className={`notification-item ${notif.unread ? "unread" : ""}`}>
                    <div className="notification-content">
                      <p className="notification-message">{notif.message}</p>
                      <span className="notification-time">{notif.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        {/* --- KẾT THÚC SỬA --- */}


        <div className="header-user-profile">
          <div
            className="user-profile-toggle"
            onClick={() => setShowUserMenu(!showUserMenu)}
            aria-expanded={showUserMenu}
            aria-haspopup="true"
          >
            <img src={avatar} alt="Avatar" className="user-avatar" />
            <span className="user-name">{username}</span>
            <IoMdArrowDropdown className={`dropdown-icon ${showUserMenu ? 'active' : ''}`} />
          </div>
{showUserMenu && (
            <div className="user-dropdown">
              {/* --- (ĐÃ SỬA) DÙNG t() --- */}
              <div role="button" tabIndex={0} className="dropdown-item" onClick={() => { navigate("/profile"); setShowUserMenu(false); }}>
                👤 {t('header.profile')}
              </div>
              <div role="button" tabIndex={0} className="dropdown-item" onClick={(e) => { e.stopPropagation(); navigate("/settings"); setShowUserMenu(false); }}>
                ⚙️ {t('header.settings')}
              </div>
              <div className="dropdown-divider"></div>
              <div role="button" tabIndex={0} className="dropdown-item logout" onClick={() => { if (onLogout) { onLogout(); } navigate("/login"); setShowUserMenu(false); }}>
                🚪 {t('header.logout')}
              </div>
              {/* --- KẾT THÚC SỬA --- */}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;