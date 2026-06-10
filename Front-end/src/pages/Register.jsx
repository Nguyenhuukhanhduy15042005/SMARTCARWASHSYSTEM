import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function Register() {
  // Trạng thái điều hướng: step 1 (Form điền info), step 2 (Form nhập OTP)
  const [step, setStep] = useState(1);

  // State lưu thông tin form
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // State lưu mã OTP do user nhập
  const [otp, setOtp] = useState("");

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const isValidVietnamesePhone = (phoneNumber) => {
    const phoneRegex =
      /^(0)(3[2-9]|5[2689]|7[06-9]|8[1-689]|9[0-46-9])[0-9]{7}$/;
    return phoneRegex.test(phoneNumber);
  };

  // ==========================================
  // BƯỚC 1: GỬI THÔNG TIN VÀ NHẬN OTP
  // ==========================================
  const handleRegisterStep1 = async (e) => {
    if (e) e.preventDefault();
    if (loading) return;
    setErrorMsg("");
    setSuccessMsg("");

    if (!isValidVietnamesePhone(phone)) {
      setErrorMsg(
        "Số điện thoại không hợp lệ! Vui lòng nhập SĐT Việt Nam gồm 10 số.",
      );
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Mật khẩu xác nhận không khớp!");
      return;
    }

    setLoading(true);
    try {
      // Gọi API gửi OTP (Backend của bạn cần tạo endpoint này)
      const response = await fetch(
        "http://localhost:5000/api/auth/register-step1",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, phone, fullName }),
        },
      );

      const data = await response.json();

      if (response.ok) {
        setSuccessMsg("Mã xác thực OTP đã được gửi đến Email của bạn!");
        setStep(2); // Chuyển sang màn hình nhập OTP
      } else {
        setErrorMsg(data.message || "Lỗi khi gửi mã xác thực!");
      }
    } catch (err) {
      setErrorMsg("Không thể kết nối đến Server Backend!");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // BƯỚC 2: XÁC THỰC OTP VÀ HOÀN TẤT ĐĂNG KÝ
  // ==========================================
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (loading) return;
    setErrorMsg("");
    setSuccessMsg("");

    setLoading(true);
    try {
      // Gọi API xác thực OTP và lưu Database
      const response = await fetch(
        "http://localhost:5000/api/auth/register-step2",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fullName, phone, email, password, otp }),
        },
      );

      const data = await response.json();

      if (response.ok) {
        setSuccessMsg("Xác thực thành công! Đang chuyển hướng...");
        setTimeout(() => {
          navigate("/login");
        }, 2000);
      } else {
        setErrorMsg(data.message || "Mã OTP không chính xác hoặc đã hết hạn!");
      }
    } catch (err) {
      setErrorMsg("Lỗi kết nối khi xác thực OTP!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container"> {/* Trọng thêm: Khôi phục CSS cũ */}
      <div className="auth-card" style={{ position: "relative" }}> {/* Trọng thêm: Khôi phục CSS cũ */}
        {/* NÚT QUAY LẠI */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-start",
            marginBottom: "15px",
          }}
        >
          <button
            onClick={() => (step === 2 ? setStep(1) : navigate("/"))}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "none",
              border: "none",
              color: "#475569",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
              padding: 0,
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Quay lại {step === 2 ? "thông tin" : ""}
          </button>
        </div>

        <h2 style={{ color: "#2C387E", marginBottom: "20px" }}>
          {step === 1 ? "Đăng Ký Tài Khoản" : "Xác Thực Email"}
        </h2>

        {errorMsg && (
          <div
            className="error-msg"
            style={{
              backgroundColor: "#fef2f2",
              color: "#dc2626",
              padding: "12px",
              borderRadius: "10px",
              marginBottom: "20px",
              fontSize: "14px",
            }}
          >
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div
            className="success-msg"
            style={{
              backgroundColor: "#f0fdf4",
              color: "#16a34a",
              padding: "12px",
              borderRadius: "10px",
              marginBottom: "20px",
              fontSize: "14px",
            }}
          >
            {successMsg}
          </div>
        )}

        {/* ================= FORM BƯỚC 1: ĐIỀN THÔNG TIN ================= */}
        {step === 1 && (
          <form onSubmit={handleRegisterStep1}>
            <div className="input-group"> {/* Trọng thêm: Khôi phục CSS cũ */}
              <label>Họ và tên</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nhập họ và tên"
                required
              />
            </div>

            <div className="input-group"> {/* Trọng thêm: Khôi phục CSS cũ */}
              <label>Số điện thoại</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  const re = /^[0-9\b]+$/;
                  if (e.target.value === "" || re.test(e.target.value))
                    setPhone(e.target.value);
                }}
                placeholder="VD: 0912345678"
                maxLength="10"
                required
              />
            </div>

            <div className="input-group"> {/* Trọng thêm: Khôi phục CSS cũ */}
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Nhập địa chỉ email"
                required
              />
            </div>

            <div className="input-group"> {/* Trọng thêm: Khôi phục CSS cũ */}
              <label>Mật khẩu</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu"
                minLength="6"
                required
              />
            </div>

            <div className="input-group"> {/* Trọng thêm: Khôi phục CSS cũ */}
              <label>Xác nhận mật khẩu</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu"
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{
                width: "100%",
                marginTop: "15px",
                backgroundColor: loading ? "#cbd5e1" : "#F58607",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Đang gửi OTP..." : "Đăng ký nhận mã OTP"}
            </button>
          </form>
        )}

        {/* ================= FORM BƯỚC 2: NHẬP OTP ================= */}
        {step === 2 && (
          <form onSubmit={handleVerifyOTP}>
            <p
              style={{
                fontSize: "14px",
                color: "#64748b",
                marginBottom: "20px",
              }}
            >
              Vui lòng nhập mã gồm 6 chữ số vừa được gửi đến email{" "}
              <b>{email}</b> của bạn.
            </p>

            <div className="input-group"> {/* Trọng thêm: Khôi phục CSS cũ */}
              <label>Mã xác thực OTP</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Nhập mã OTP..."
                maxLength="6"
                required
                style={{
                  textAlign: "center",
                  fontSize: "20px",
                  letterSpacing: "4px",
                  fontWeight: "bold",
                }}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{
                width: "100%",
                marginTop: "10px",
                backgroundColor: loading ? "#cbd5e1" : "#F58607",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Đang xác thực..." : "Xác nhận OTP"}
            </button>

            <button
              type="button"
              onClick={handleRegisterStep1}
              disabled={loading}
              style={{
                width: "100%",
                marginTop: "10px",
                padding: "12px",
                background: "none",
                border: "1px solid #cbd5e1",
                borderRadius: "10px",
                color: loading ? "#94a3b8" : "#475569",
                cursor: loading ? "not-allowed" : "pointer",
                fontWeight: "bold",
              }}
            >
              Gửi lại mã
            </button>
          </form>
        )}

        {step === 1 && (
          <p
            style={{
              marginTop: "25px",
              fontSize: "14px",
              textAlign: "center",
              color: "#475569",
            }}
          >
            Chưa có tài khoản?{" "}
            <Link
              to="/login"
              style={{
                color: "#F58607",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Đăng nhập ngay
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
