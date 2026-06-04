// Front-end/src/pages/Booking.jsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import "./Booking.css";
import { useAuth } from "../context/AuthContext";
import Sidebar from "../components/Sidebar";

export default function Booking() {
  const navigate = useNavigate();
  const { user, isAdmin, isStaff, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);


  // State quản lý dữ liệu form
  const [vehicleType, setVehicleType] = useState("CAR"); // CAR hoặc BIKE
  const [licensePlate, setLicensePlate] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");

  // State quản lý dịch vụ từ DB và thông tin khách hàng
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [profile, setProfile] = useState({
    UserID: 12,
    FullName: "Khách hàng",
    PhoneNumber: "",
    TierName: "Standard",
    DiscountRate: 0
  });

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Helper giải mã token an toàn để lấy userId
  const getCustomerId = () => {
    const token = localStorage.getItem("TOKEN") || localStorage.getItem("token");
    if (token && token !== "mock-token" && token !== "null" && token !== "undefined") {
      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        const decoded = JSON.parse(jsonPayload);
        return decoded.userId || decoded.id || 12;
      } catch (err) {
        console.error("Lỗi decode token:", err);
      }
    }
    return 12; // ID mặc định khi không tìm thấy token để test
  };

  // Show auto dismiss alerts
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Load Google Fonts & FontAwesome icons
  useEffect(() => {
    const linkFont = document.createElement("link");
    linkFont.href = "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap";
    linkFont.rel = "stylesheet";
    document.head.appendChild(linkFont);

    const linkIcons = document.createElement("link");
    linkIcons.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css";
    linkIcons.rel = "stylesheet";
    document.head.appendChild(linkIcons);

    fetchUserProfile();
  }, []);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest("[data-user-menu]")) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch thông tin ưu đãi và profile thành viên
  const fetchUserProfile = async () => {
    const userId = getCustomerId();
    const token = localStorage.getItem("TOKEN") || localStorage.getItem("token") || "mock-token";
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const res = await axios.get(`http://127.0.0.1:5000/api/users/profile?userId=${userId}`, { headers });
      if (res.data) {
        setProfile({
          UserID: res.data.UserID || userId,
          FullName: res.data.FullName || "Khách hàng",
          PhoneNumber: res.data.PhoneNumber || "",
          TierName: res.data.TierName || "Standard",
          DiscountRate: res.data.DiscountRate !== undefined ? res.data.DiscountRate : 0
        });
      }
    } catch (err) {
      console.error("Lỗi fetch profile người dùng:", err);
    }
  };

  // Fetch dịch vụ tương ứng với loại xe (CAR hoặc BIKE)
  useEffect(() => {
    const fetchServices = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`http://127.0.0.1:5000/api/timeslots/services?vehicleType=${vehicleType}`);
        const list = Array.isArray(res.data) ? res.data : [];
        setServices(list);
        if (list.length > 0) {
          setSelectedService(list[0]); // Mặc định chọn dịch vụ đầu tiên
        } else {
          setSelectedService(null);
        }
      } catch (err) {
        console.error("Lỗi tải gói dịch vụ:", err);
        showToast("Không thể tải danh sách dịch vụ từ Server CSDL!", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, [vehicleType]);

  // Tính toán chi phí
  const basePrice = selectedService ? selectedService.basePrice : 0;
  const discountRate = profile.DiscountRate > 1 ? profile.DiscountRate / 100 : profile.DiscountRate;
  const discountAmount = basePrice * discountRate;
  const finalPrice = Math.max(0, basePrice - discountAmount);

  // Xử lý gửi đặt lịch
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!licensePlate.trim()) return showToast("Vui lòng nhập biển số xe!", "error");
    if (!selectedService) return showToast("Vui lòng chọn một gói dịch vụ!", "error");
    if (!date || !time) return showToast("Vui lòng chọn ngày và giờ rửa xe!", "error");

    const userId = getCustomerId();
    const token = localStorage.getItem("TOKEN") || localStorage.getItem("token") || "mock-token";
    const headers = { Authorization: `Bearer ${token}` };

    const body = {
      CustomerID: userId,
      BookingDate: `${date}T${time}:00`,
      VehicleType: vehicleType === "BIKE" ? "Xe máy" : "Ô tô",
      LicensePlate: licensePlate.trim().toUpperCase(),
      TotalPrice: basePrice,
      FinalPrice: finalPrice,
      Status: 1, // Chờ duyệt
      ServiceIDs: [selectedService.serviceId]
    };

    try {
      await axios.post("http://127.0.0.1:5000/api/bookings", body, { headers });
      showToast("Đặt lịch rửa xe thành công! Đang chuyển đến Trang cá nhân...", "success");
      
      // Đợi 2s để người dùng xem thông báo rồi chuyển hướng
      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);
    } catch (err) {
      console.error("Lỗi khi gửi yêu cầu đặt lịch:", err);
      const errMsg = err.response?.data?.message || err.message;
      showToast(`Không thể tạo lịch: ${errMsg}`, "error");
    }
  };

  const getInitials = (name = "") =>
    name.split(" ").slice(-2).map((w) => w[0]).join("").toUpperCase();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="booking-page-container portal-layout-container">
      <Sidebar />
      <main className="portal-main-content" style={{ display: "flex", flexDirection: "column", flex: 1, padding: 0, position: "relative" }}>
        <div style={{ padding: "0 24px 60px", width: "100%", maxWidth: "1200px", margin: "0 auto", boxSizing: "border-box" }}>
        {/* Tiêu đề */}
        <div className="text-center mb-10" style={{ paddingTop: 40 }}>
          <h2 className="booking-title">ĐẶT LỊCH DỊCH VỤ</h2>
          <p className="booking-subtitle">Trải nghiệm dịch vụ chăm sóc xe thông minh hàng đầu tại Moto Shine</p>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Cột trái: Nội dung form (Chiếm 2 cột) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Mục 1: Loại xe & Biển số */}
            <div className="form-section-card">
              <h3 className="form-section-title">
                <i className="fa-solid fa-car-side text-orange-500"></i> Thông tin phương tiện
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="form-label">Loại xe *</label>
                  <div className="vehicle-type-grid">
                    <div 
                      className={`vehicle-type-option ${vehicleType === "BIKE" ? "active" : ""}`}
                      onClick={() => setVehicleType("BIKE")}
                    >
                      <i className="fa-solid fa-motorcycle"></i>
                      <span>Xe máy</span>
                    </div>
                    <div 
                      className={`vehicle-type-option ${vehicleType === "CAR" ? "active" : ""}`}
                      onClick={() => setVehicleType("CAR")}
                    >
                      <i className="fa-solid fa-car"></i>
                      <span>Ô tô</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="form-label" htmlFor="licensePlate">Biển số xe *</label>
                  <input
                    id="licensePlate"
                    type="text"
                    value={licensePlate}
                    onChange={(e) => setLicensePlate(e.target.value)}
                    placeholder="VD: 59A-123.45"
                    required
                    className="form-input"
                    style={{ height: "54px" }}
                  />
                  <small style={{ color: "#64748b", marginTop: "8px", display: "block" }}>
                    Nhập đúng biển số xe để nhân viên kiểm tra chính xác.
                  </small>
                </div>
              </div>
            </div>

            {/* Mục 2: Chọn Gói dịch vụ */}
            <div className="form-section-card">
              <h3 className="form-section-title">
                <i className="fa-solid fa-hand-holding-hand text-orange-500"></i> Chọn Gói dịch vụ
              </h3>

              {loading ? (
                <div style={{ textAlign: "center", padding: "30px", color: "#94a3b8" }}>
                  <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: "24px", marginBottom: "10px" }}></i>
                  <p>Đang tải danh sách dịch vụ...</p>
                </div>
              ) : services.length === 0 ? (
                <p style={{ color: "#94a3b8", textAlign: "center", padding: "20px" }}>
                  Không tìm thấy gói dịch vụ nào cho loại xe này trong DB.
                </p>
              ) : (
                <div className="space-y-3">
                  {services.map((s) => (
                    <div
                      key={s.serviceId}
                      className={`service-package-option ${selectedService?.serviceId === s.serviceId ? "active" : ""}`}
                      onClick={() => setSelectedService(s)}
                    >
                      <div className="package-name">
                        <i className={`fa-solid ${vehicleType === "BIKE" ? "fa-motorcycle" : "fa-car-burst"} text-orange-500`}></i>
                        <div>
                          <span>{s.serviceName}</span>
                          <span className="package-desc">
                            {s.serviceName.includes("VIP") 
                              ? "Vệ sinh toàn diện, phủ nano sơn và khử mùi nội thất cao cấp" 
                              : s.serviceName.includes("cơ bản") || s.serviceName.includes("tiêu chuẩn")
                              ? "Rửa bọt tuyết siêu sạch, xịt gầm và lau khô xe chuyên nghiệp"
                              : "Rửa xe bọt tuyết nâng cao kết hợp phủ wax bóng láng bề mặt"}
                          </span>
                        </div>
                      </div>
                      <span className="package-price">{s.basePrice.toLocaleString("vi-VN")}đ</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Mục 3: Ngày & Giờ */}
            <div className="form-section-card">
              <h3 className="form-section-title">
                <i className="fa-regular fa-calendar-check text-orange-500"></i> Thời gian hẹn gặp
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="form-label" htmlFor="date">Ngày rửa xe *</label>
                  <input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="form-input"
                  />
                </div>

                <div>
                  <label className="form-label" htmlFor="time">Giờ rửa xe *</label>
                  <input
                    id="time"
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    required
                    className="form-input"
                  />
                </div>
              </div>

              <div className="mt-6">
                <label className="form-label" htmlFor="note">Ghi chú (Tùy chọn)</label>
                <textarea
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows="3"
                  placeholder="Những dặn dò đặc biệt cho nhân viên rửa xe của chúng tôi..."
                  className="form-textarea"
                ></textarea>
              </div>
            </div>

          </div>

          {/* Cột phải: Tóm tắt đơn hàng (Sticky) */}
          <div className="lg:col-span-1">
            <div className="summary-card sticky top-10">
              <h3 className="text-2xl font-bold mb-6 border-b border-gray-700 pb-4">
                Tóm tắt lịch đặt
              </h3>

              <div className="space-y-4 mb-6">
                <div className="summary-row">
                  <span>Loại phương tiện:</span>
                  <span>{vehicleType === "BIKE" ? "Xe máy" : "Ô tô"}</span>
                </div>
                <div className="summary-row">
                  <span>Biển số xe:</span>
                  <span>{licensePlate.toUpperCase() || "..."}</span>
                </div>
                <div className="summary-row">
                  <span>Gói dịch vụ:</span>
                  <span>{selectedService ? selectedService.serviceName : "..."}</span>
                </div>
                <div className="summary-row">
                  <span>Thời gian:</span>
                  <span>{date && time ? `${time} (${date})` : "..."}</span>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-gray-800">
                <div className="summary-row">
                  <span>Giá niêm yết:</span>
                  <span>{basePrice.toLocaleString("vi-VN")} đ</span>
                </div>
                <div className="summary-row">
                  <span>Hạng thành viên:</span>
                  <span style={{ color: "#818cf8" }}>{profile.TierName}</span>
                </div>
                {discountRate > 0 && (
                  <div className="summary-row" style={{ color: "#10b981" }}>
                    <span>Ưu đãi giảm giá ({Math.round(discountRate * 100)}%):</span>
                    <span>-{discountAmount.toLocaleString("vi-VN")} đ</span>
                  </div>
                )}
              </div>

              <div className="summary-total-section">
                <div className="flex justify-between items-center">
                  <span className="text-lg">Tổng chi phí</span>
                  <span className="text-3xl font-extrabold text-orange-500">
                    {finalPrice.toLocaleString("vi-VN")} đ
                  </span>
                </div>
              </div>

              <button type="submit" className="btn-book-submit">
                Xác nhận đặt lịch
              </button>

              <p className="text-center text-xs text-gray-400 mt-4">
                Bằng việc nhấn "Xác nhận đặt lịch", bạn đồng ý chịu trách nhiệm với thời gian đã hẹn gặp.
              </p>
            </div>
          </div>

        </form>
      </div>

      {/* Alert Banner Toast */}
      {toast && (
        <div className={`booking-toast ${toast.type === "error" ? "booking-toast-error" : "booking-toast-success"}`}>
          <i className={toast.type === "error" ? "fa-solid fa-triangle-exclamation" : "fa-regular fa-circle-check"}></i>
          <span>{toast.message}</span>
        </div>
      )}
      </main>
    </div>
  );
}
