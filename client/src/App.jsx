import React, { useState, useEffect } from "react"; // Thêm useEffect nếu cần load theme ban đầu
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";

// Import các trang/component
import Login from "./components/Login";
import Register from "./components/Register";
import LandingPage from "./components/LandingPage";
import Dashboard from "./components/Dashboard";
import DashboardAdmin from "./components/DashboardAdmin";
import TaskBoard from "./components/TaskBoard";
import Notes from "./components/Notes";
import Calendar from "./components/Calendar";
import Pomodoro from "./components/Pomodoro";
import AIAssistant from "./components/AIAssistant";
import Workspaces from "./components/Workspaces";
import WorkspaceDetail from "./components/WorkspaceDetail";
import StudyRoom from "./components/StudyRoom";
import Header from "./components/Header";
import Profile from "./components/Profile";
import ForgotPassword from "./components/ForgotPassword";
import ResetPassword from "./components/ResetPassword";
import Settings from "./components/Settings";
import MainNavbar from "./components/MainNavbar"; // Navbar ngang mới

import "./App.css"; // CSS chung

// Layout chính mới (Header + Navbar + Content)
const AppLayout = ({ onLogout }) => (
  // Không cần class app-layout bọc ngoài nữa, thẻ body xử lý nền
  <div className="main-content"> {/* Chỉ cần main-content */}
      <Header onLogout={onLogout} />
      <MainNavbar /> {/* Navbar ngang */}
      <div className="content-area"> {/* Khu vực nội dung */}
        <Outlet context={{ onLogout }} /> {/* Truyền context */}
      </div>
  </div>
);

// Layout cho các trang Auth (Login, Register...)
const AuthLayout = ({ children }) => <div className="auth-layout">{children}</div>;

function App() {
  // State đăng nhập, kiểm tra từ localStorage
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("user"));

  // State theme, đọc từ localStorage khi app load
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.className = savedTheme; // Áp dụng theme ban đầu cho body
  }, []); // Chạy 1 lần khi App mount


  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
    // Tải lại theme khi login thành công (phòng trường hợp localStorage bị clear)
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.className = savedTheme;
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem("role");
    localStorage.removeItem("user");
    // Có thể xóa cả theme khi logout nếu muốn
    // localStorage.removeItem("theme");
    // document.body.className = 'light'; // Reset về light mode
  };

  const userRole = localStorage.getItem("role");

  return (
    <Router>
      <Routes>
        {/* === CÁC TRANG CÔNG KHAI (KHÔNG CẦN LOGIN) === */}
        <Route
          path="/"
          element={
            // Sửa logic: Nếu CHƯA login -> LandingPage
            !isLoggedIn ? (
              <AuthLayout>
                <LandingPage />
              </AuthLayout>
            ) : // Nếu ĐÃ login, chuyển hướng dựa trên role
            userRole === "admin" ? (
              <Navigate to="/dashboard-admin" replace /> // Dùng replace
            ) : (
              <Navigate to="/dashboard" replace /> // Dùng replace
            )
          }
        />
        <Route
          path="/login"
          element={
            // Sửa logic: Nếu CHƯA login -> Login Page
            !isLoggedIn ? (
              <AuthLayout>
                <Login onLoginSuccess={handleLoginSuccess} />
              </AuthLayout>
            ) : // Nếu ĐÃ login, chuyển hướng
            userRole === "admin" ? (
              <Navigate to="/dashboard-admin" replace />
            ) : (
              <Navigate to="/dashboard" replace />
            )
          }
        />
        <Route
          path="/register"
          element={
            !isLoggedIn ? (
              <AuthLayout>
                <Register />
              </AuthLayout>
            ) : (
              <Navigate to="/dashboard" replace />
            )
          }
        />
        <Route
          path="/forgot-password"
          element={
            !isLoggedIn ? (
              <AuthLayout>
                <ForgotPassword />
              </AuthLayout>
            ) : (
              <Navigate to="/dashboard" replace />
            )
          }
        />
        <Route
          path="/reset-password/:token"
          element={
             !isLoggedIn ? (
              <AuthLayout>
                <ResetPassword />
              </AuthLayout>
            ) : (
              <Navigate to="/dashboard" replace />
            )
          }
        />

        {/* === TRANG ADMIN (YÊU CẦU LOGIN & ROLE ADMIN) === */}
        <Route
          path="/dashboard-admin"
          element={
            isLoggedIn && userRole === "admin" ? (
              <DashboardAdmin /> // Giả sử Admin có layout riêng hoàn toàn
            ) : (
              <Navigate to="/login" replace /> // Chuyển về login nếu ko đúng
            )
          }
        />

        {/* === LAYOUT CHÍNH CHO USER (YÊU CẦU LOGIN & ROLE USER) === */}
        <Route
          path="/" // Route cha này sẽ chứa các trang con
          element={
            isLoggedIn && userRole === "user" ? (
              <AppLayout onLogout={handleLogout} /> // Dùng Layout mới
            ) : (
              // Nếu chưa login hoặc sai role, về login
              <Navigate to="/login" replace />
            )
          }
        >
          {/* Các trang con bên trong AppLayout */}
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="tasks" element={<TaskBoard />} />
          <Route path="notes" element={<Notes />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="pomodoro" element={<Pomodoro />} />
          <Route path="ai-assistant" element={<AIAssistant />} />
          <Route path="profile" element={<Profile />} />
          <Route path="settings" element={<Settings />} /> {/* Đã có */}

          {/* Placeholder routes */}
          <Route path="workspace/:id" element={<WorkspaceDetail />} />
          <Route path="workspaces" element={<Workspaces />} />
          <Route path="study-room" element={<StudyRoom />} />

          {/* Trang mặc định cho layout này (sau khi login) là dashboard */}
          <Route index element={<Navigate to="/dashboard" replace />} />

        </Route> {/* Kết thúc Route Layout User */}

        {/* Trang không tìm thấy -> Chuyển về trang chính */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
