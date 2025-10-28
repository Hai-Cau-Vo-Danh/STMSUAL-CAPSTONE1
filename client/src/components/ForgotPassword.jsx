import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './auth.css'; // Dùng chung CSS với Login
import loginArt from "../assets/DangNhap/login-art.png";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const res = await fetch("http://localhost:5000/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage(data.message);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("Không thể kết nối đến server!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <div className="auth-left">
          <img src={loginArt} alt="Forgot Password Illustration" className="auth-img" />
        </div>
        <div className="auth-right">
          <form onSubmit={handleSubmit}>
            <h2>Quên mật khẩu</h2>
            <p className="auth-subtitle">Nhập email của bạn, chúng tôi sẽ gửi link đặt lại mật khẩu.</p>
            
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            {message && <p className="success-message">{message}</p>}
            {error && <p className="error">{error}</p>}

            <button type="submit" disabled={loading}>
              {loading ? "Đang gửi..." : "Gửi link"}
            </button>
            <p>
              Nhớ mật khẩu?{" "}
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

export default ForgotPassword;