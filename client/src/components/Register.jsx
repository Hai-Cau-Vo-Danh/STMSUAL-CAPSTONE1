import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./auth.css";
import loginArt from "../assets/DangNhap/login-art.png";

// 🔥 THÊM HẰNG SỐ BASE URL
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!formData.name || !formData.email || !formData.password) {
      setError("Vui lòng nhập đầy đủ thông tin!");
      setLoading(false);
      return;
    }

    try {
      // 🔥 SỬA URL ĐĂNG KÝ
      const res = await fetch(`${API_BASE_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert("🎉 Đăng ký thành công! Vui lòng đăng nhập.");
        navigate("/login");
      } else {
        setError(`❌ Lỗi: ${data.message}`);
      }
    } catch (err) {
      console.error("Lỗi:", err);
      setError("Không thể kết nối đến máy chủ!");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <div className="auth-left">
          <img src={loginArt} alt="Register Illustration" className="auth-img" />
        </div>
        <div className="auth-right">
          <form onSubmit={handleSubmit}>
            <h2>Đăng ký tài khoản</h2>
            <input
              type="text"
              name="name"
              placeholder="Họ và tên"
              value={formData.name}
              onChange={handleChange}
              required
            />
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              required
            />
            <input
              type="password"
              name="password"
              placeholder="Mật khẩu"
              value={formData.password}
              onChange={handleChange}
              required
            />
            
            {error && <p className="error">{error}</p>}
            
            <button type="submit" disabled={loading}>
                {loading ? "Đang xử lý..." : "Đăng ký"}
            </button>
            <p>
              Đã có tài khoản?{" "}
              <a href="/login" className="auth-link">
                Đăng nhập
              </a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;
