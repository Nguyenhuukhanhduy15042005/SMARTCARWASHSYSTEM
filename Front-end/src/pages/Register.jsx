import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function Register() {
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
<<<<<<< HEAD
  const [loading, setLoading] = useState(false);

=======
>>>>>>> Thắng---feature/login-logout
  const navigate = useNavigate();

  const isValidVietnamesePhone = (phoneNumber) => {
    return /^(0)(3[2-9]|5[2689]|7[06-9]|8[1-689]|9[0-46-9])[0-9]{7}$/.test(
      phoneNumber,
    );
  };

  const handleRegisterStep1 = async (e) => {
    if (e) e.preventDefault();
    if (loading) return;
    setErrorMsg("");
    setSuccessMsg("");

    if (!isValidVietnamesePhone(phone))
      return setErrorMsg("Số điện thoại không hợp lệ!");
    if (password !== confirmPassword)
      return setErrorMsg("Mật khẩu xác nhận không khớp!");

    setLoading(true);
    try {
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
        setStep(2);
      } else {
        setErrorMsg(data.message || "Lỗi khi gửi mã xác thực!");
      }
    } catch (err) {
      setErrorMsg("Không thể kết nối đến Server Backend!");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (loading) return;
    setErrorMsg("");
    setSuccessMsg("");
<<<<<<< HEAD

    setLoading(true);
=======
>>>>>>> Thắng---feature/login-logout
    try {
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
        setTimeout(() => navigate("/login"), 2000);
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
    <div className="min-h-screen bg-[#FDF8F0] flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-md bg-white p-8 sm:p-10 rounded-[2rem] shadow-xl relative transition-all duration-300">
        {/* Nút Quay Lại */}
        <div className="mb-6 flex justify-start">
          <button
            onClick={() => (step === 2 ? setStep(1) : navigate("/"))}
            className="inline-flex items-center gap-2 text-gray-500 hover:text-[#F58607] font-semibold text-sm transition-all duration-300"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Quay lại {step === 2 ? "thông tin" : ""}
          </button>
        </div>

        <h2 className="text-3xl font-extrabold text-[#2C387E] mb-6 text-center">
          {step === 1 ? "Đăng Ký Tài Khoản" : "Xác Thực Email"}
        </h2>

        {errorMsg && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-medium border border-red-100">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="bg-green-50 text-green-600 p-4 rounded-xl mb-6 text-sm font-medium border border-green-100">
            {successMsg}
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handleRegisterStep1} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Họ và tên
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nhập họ và tên"
                required
                className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-orange-500/20 focus:border-[#F58607] transition-all outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Số điện thoại
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  if (/^[0-9\b]*$/.test(e.target.value))
                    setPhone(e.target.value);
                }}
                placeholder="VD: 0912345678"
                maxLength="10"
                required
                className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-orange-500/20 focus:border-[#F58607] transition-all outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Nhập địa chỉ email"
                required
                className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-orange-500/20 focus:border-[#F58607] transition-all outline-none"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Mật khẩu
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  minLength="6"
                  required
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-orange-500/20 focus:border-[#F58607] transition-all outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Xác nhận MK
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu"
                  required
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-orange-500/20 focus:border-[#F58607] transition-all outline-none"
                />
              </div>
            </div>
            <button
              type="submit"
<<<<<<< HEAD
              className="btn btn-primary"
              disabled={loading}
              style={{
                width: "100%",
                marginTop: "15px",
                backgroundColor: loading ? "#cbd5e1" : "#F58607",
                cursor: loading ? "not-allowed" : "pointer",
              }}
=======
              className="w-full py-4 bg-[#F58607] hover:bg-orange-600 text-white font-bold rounded-xl shadow-md transition-all duration-300 mt-4"
>>>>>>> Thắng---feature/login-logout
            >
              {loading ? "Đang gửi OTP..." : "Đăng ký nhận mã OTP"}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleVerifyOTP} className="space-y-6">
            <p className="text-sm text-gray-600 text-center">
              Vui lòng nhập mã 6 chữ số vừa được gửi đến <b>{email}</b>.
            </p>
            <div>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="------"
                maxLength="6"
                required
                className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-orange-500/20 focus:border-[#F58607] transition-all outline-none text-center text-3xl font-bold tracking-[0.5em]"
              />
            </div>
            <button
              type="submit"
<<<<<<< HEAD
              className="btn btn-primary"
              disabled={loading}
              style={{
                width: "100%",
                marginTop: "10px",
                backgroundColor: loading ? "#cbd5e1" : "#F58607",
                cursor: loading ? "not-allowed" : "pointer",
              }}
=======
              className="w-full py-4 bg-[#F58607] hover:bg-orange-600 text-white font-bold rounded-xl shadow-md transition-all duration-300"
>>>>>>> Thắng---feature/login-logout
            >
              {loading ? "Đang xác thực..." : "Xác nhận OTP"}
            </button>
            <button
              type="button"
              onClick={handleRegisterStep1}
<<<<<<< HEAD
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
=======
              className="w-full py-4 bg-white hover:bg-gray-50 text-gray-700 font-bold border border-gray-300 rounded-xl transition-all duration-300"
>>>>>>> Thắng---feature/login-logout
            >
              Gửi lại mã
            </button>
          </form>
        )}

        {step === 1 && (
          <p className="text-center mt-6 text-sm text-gray-600">
            Đã có tài khoản?{" "}
            <Link
              to="/login"
              className="text-[#F58607] font-bold hover:underline"
            >
              Đăng nhập ngay
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
