// Front-end/src/pages/Booking.jsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import "./Booking.css";
import { useAuth } from "../context/AuthContext";
import Sidebar from "../components/Sidebar";

const TIME_SLOTS = [
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
];

// ─── Mã tỉnh/thành hợp lệ theo Thông tư 58/2020/TT-BCA ──────────────────────
const VALID_PROVINCE_CODES = new Set([
  11, 12, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
  31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49,
  50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68,
  69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87,
  88, 89, 90, 92, 93, 94, 95, 97, 98, 99,
]);

// ─── Regex biển số xe VN ──────────────────────────────────────────────────────
const PLATE_REGEX_MOTORBIKE = /^(\d{2})([A-Z][0-9]|[A-Z]{2}|[A-Z])-(\d{4,5})$/;
const PLATE_REGEX_CAR =
  /^(\d{2})([A-Z][0-9]|[A-Z]{2}|[A-Z])-(\d{3,5}|\d{3}\.\d{2})$/;

const validatePlate = (plate, vehicleType) => {
  const clean = plate.trim().toUpperCase().replace(/\s/g, "");
  const regex =
    vehicleType === "BIKE" ? PLATE_REGEX_MOTORBIKE : PLATE_REGEX_CAR;

  if (!regex.test(clean)) {
    return {
      valid: false,
      message:
        vehicleType === "BIKE"
          ? "Biển số xe máy không hợp lệ! VD: 29K6-44743 hoặc 29AB-12345"
          : "Biển số ô tô không hợp lệ! VD: 51A-123.45 hoặc 29G1-1234",
    };
  }

  const provinceCode = parseInt(clean.substring(0, 2), 10);
  if (!VALID_PROVINCE_CODES.has(provinceCode)) {
    return {
      valid: false,
      message: `Mã tỉnh "${clean.substring(0, 2)}" không hợp lệ! Vui lòng kiểm tra lại biển số xe.`,
    };
  }

  return { valid: true, clean };
};

export default function Booking() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin, isStaff, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  // ==========================================
  // STATE ĐIỀU HƯỚNG TABS
  // ==========================================
  // Cho phép nhảy thẳng vào tab lịch sử nếu có tham số truyền qua state
  const [activeTab, setActiveTab] = useState(location.state?.tab || "create");

  // ==========================================
  // STATES CHO TAB ĐẶT LỊCH (CREATE)
  // ==========================================
  const [vehicleType, setVehicleType] = useState("CAR");
  const [licensePlate, setLicensePlate] = useState("");
  const [plateError, setPlateError] = useState("");
  const [userVehicles, setUserVehicles] = useState([]);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");

  const [slotsAvailability, setSlotsAvailability] = useState({});
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");

  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [profile, setProfile] = useState({
    UserID: 12,
    FullName: "Khách hàng",
    PhoneNumber: "",
    TierName: "Standard",
    DiscountRate: 0,
  });

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ==========================================
  // STATES CHO TAB QUẢN LÝ LỊCH SỬ (HISTORY)
  // ==========================================
  const [myBookings, setMyBookings] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");

  // Helpers
  const getCustomerId = () => {
    const token =
      localStorage.getItem("TOKEN") || localStorage.getItem("token");
    if (
      token &&
      token !== "mock-token" &&
      token !== "null" &&
      token !== "undefined"
    ) {
      try {
        const base64Url = token.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split("")
            .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
            .join(""),
        );
        const decoded = JSON.parse(jsonPayload);
        return decoded.userId || decoded.id || 12;
      } catch (err) {
        console.error("Lỗi decode token:", err);
      }
    }
    return 12;
  };

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Khởi tạo chung
  useEffect(() => {
    const linkFont = document.createElement("link");
    linkFont.href =
      "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap";
    linkFont.rel = "stylesheet";
    document.head.appendChild(linkFont);

    const linkIcons = document.createElement("link");
    linkIcons.href =
      "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css";
    linkIcons.rel = "stylesheet";
    document.head.appendChild(linkIcons);

    fetchUserProfile();
    fetchUserVehicles();
  }, []);

  // ----------------------------------------------------
  // LOGIC TAB 1: ĐẶT LỊCH DỊCH VỤ
  // ----------------------------------------------------
  const fetchUserProfile = async () => {
    const userId = getCustomerId();
    const token =
      localStorage.getItem("TOKEN") ||
      localStorage.getItem("token") ||
      "mock-token";
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const res = await axios.get(
        `http://127.0.0.1:5000/api/users/profile?userId=${userId}`,
        { headers },
      );
      if (res.data) {
        const phone =
          res.data.PhoneNumber && !res.data.PhoneNumber.startsWith("G-")
            ? res.data.PhoneNumber
            : "";
        setProfile({
          UserID: res.data.UserID || userId,
          FullName: res.data.FullName || "Khách hàng",
          PhoneNumber: phone,
          TierName: res.data.TierName || "Standard",
          DiscountRate:
            res.data.DiscountRate !== undefined ? res.data.DiscountRate : 0,
        });
      }
    } catch (err) {}
  };

  const fetchUserVehicles = async () => {
    const userId = getCustomerId();
    const token =
      localStorage.getItem("TOKEN") ||
      localStorage.getItem("token") ||
      "mock-token";
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const res = await axios.get(
        `http://127.0.0.1:5000/api/vehicles?userId=${userId}`,
        { headers },
      );
      if (Array.isArray(res.data)) setUserVehicles(res.data);
    } catch (err) {}
  };

  useEffect(() => {
    const fetchServices = async () => {
      setLoading(true);
      try {
        const res = await axios.get(
          `http://127.0.0.1:5000/api/timeslots/services?vehicleType=${vehicleType}`,
        );
        const list = Array.isArray(res.data) ? res.data : [];
        setServices(list);
        setSelectedService(list.length > 0 ? list[0] : null);
      } catch (err) {
        showToast("Không thể tải danh sách dịch vụ!", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchServices();
  }, [vehicleType]);

  const checkIfPast = (slotTime) => {
    if (!date) return false;
    const todayStr = new Date().toLocaleDateString("en-CA");
    if (date !== todayStr) return false;
    const now = new Date();
    const [slotHours, slotMinutes] = slotTime.split(":").map(Number);
    if (slotHours < now.getHours()) return true;
    if (slotHours === now.getHours() && slotMinutes <= now.getMinutes())
      return true;
    return false;
  };

  useEffect(() => {
    if (!date) {
      setSlotsAvailability({});
      return;
    }
    const fetchSlotsAvailability = async () => {
      setSlotsLoading(true);
      setFetchError("");
      try {
        const typeParam = vehicleType === "BIKE" ? "BIKE" : "CAR";
        const machinesRes = await axios.get(
          `http://127.0.0.1:5000/api/timeslots/machines?type=${typeParam}`,
        );
        const machines = Array.isArray(machinesRes.data)
          ? machinesRes.data
          : [];

        if (machines.length === 0) {
          const initialSlots = {};
          TIME_SLOTS.forEach((t) => {
            initialSlots[t] = "booked";
          });
          setSlotsAvailability(initialSlots);
          setFetchError(
            `Không tìm thấy máy rửa hoạt động cho ${vehicleType === "BIKE" ? "Xe máy" : "Ô tô"}!`,
          );
          return;
        }

        const promises = machines.map((m) =>
          axios
            .get(
              `http://127.0.0.1:5000/api/timeslots?machineId=${m.machineId}&date=${date}`,
            )
            .then((res) => res.data)
            .catch(() => null),
        );
        const results = await Promise.all(promises);
        const aggregated = {};
        TIME_SLOTS.forEach((slotTime) => {
          let hasFreeMachine = false;
          results.forEach((r) => {
            if (r && Array.isArray(r.slots)) {
              const found = r.slots.find((s) => s.time === slotTime);
              if (found && found.status === "free") hasFreeMachine = true;
            }
          });
          aggregated[slotTime] = hasFreeMachine ? "free" : "booked";
        });
        setSlotsAvailability(aggregated);

        if (time && (aggregated[time] === "booked" || checkIfPast(time))) {
          setTime("");
          showToast(
            "Khung giờ đang chọn không còn trống, vui lòng chọn lại!",
            "error",
          );
        }
      } catch (err) {
        setFetchError("Có lỗi xảy ra khi đồng bộ lịch từ hệ thống máy rửa.");
      } finally {
        setSlotsLoading(false);
      }
    };
    fetchSlotsAvailability();
  }, [date, vehicleType]);

  const handleVehicleTypeChange = (type) => {
    setVehicleType(type);
    setLicensePlate("");
    setPlateError("");
  };

  const handlePlateChange = (e) => {
    const val = e.target.value;
    setLicensePlate(val);
    const matched = userVehicles.find(
      (v) => v.plateNumber?.toUpperCase() === val.trim().toUpperCase(),
    );
    let currentVehicleType = vehicleType;
    if (matched) {
      const type = matched.vehicleType?.toLowerCase();
      const isBike =
        type === "xe máy" ||
        type === "motorcycle" ||
        type === "bike" ||
        type === "xe may" ||
        type === "motorbike";
      currentVehicleType = isBike ? "BIKE" : "CAR";
      setVehicleType(currentVehicleType);
    }
    if (val.trim().length >= 6) {
      const result = validatePlate(val, currentVehicleType);
      setPlateError(result.valid ? "" : result.message);
    } else {
      setPlateError("");
    }
  };

  const basePrice = selectedService ? selectedService.basePrice : 0;
  const discountRate =
    profile.DiscountRate > 1
      ? profile.DiscountRate / 100
      : profile.DiscountRate;
  const discountAmount = Math.round(basePrice * discountRate);
  const finalPrice = Math.max(0, basePrice - discountAmount);
  const isHighTier = ["Gold", "Platinum"].includes(profile.TierName);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!licensePlate.trim())
      return showToast("Vui lòng nhập biển số xe!", "error");
    const plateResult = validatePlate(licensePlate, vehicleType);
    if (!plateResult.valid) return showToast(plateResult.message, "error");
    if (!selectedService)
      return showToast("Vui lòng chọn một gói dịch vụ!", "error");
    if (!date || !time)
      return showToast("Vui lòng chọn ngày và giờ rửa xe!", "error");

    const userId = getCustomerId();
    const token =
      localStorage.getItem("TOKEN") ||
      localStorage.getItem("token") ||
      "mock-token";
    const headers = { Authorization: `Bearer ${token}` };

    const body = {
      CustomerID: userId,
      BookingDate: `${date}T${time}:00`,
      VehicleType: vehicleType === "BIKE" ? "Xe máy" : "Ô tô",
      LicensePlate: plateResult.clean,
      TotalPrice: basePrice,
      FinalPrice: finalPrice,
      Status: 1,
      ServiceIDs: [selectedService.serviceId],
    };

    setIsSubmitting(true);
    try {
      const res = await axios.post("http://127.0.0.1:5000/api/bookings", body, {
        headers,
      });
      const newBooking = res.data;
      showToast(
        "Đặt lịch thành công! Đang chuyển đến thanh toán...",
        "success",
      );
      setTimeout(() => {
        navigate("/payments", {
          state: {
            booking: {
              BookingID:
                newBooking.BookingID || newBooking.bookingId || newBooking.id,
              ServiceName:
                selectedService?.serviceName ||
                selectedService?.ServiceName ||
                "Dịch vụ rửa xe",
              Date: date,
              Time: time,
              TotalPrice: finalPrice || basePrice,
              LicensePlate: plateResult.clean,
            },
          },
        });
      }, 1500);
    } catch (err) {
      showToast(
        `Không thể tạo lịch: ${err.response?.data?.message || err.message}`,
        "error",
      );
      setIsSubmitting(false);
    }
  };

  // ----------------------------------------------------
  // LOGIC TAB 2: LỊCH SỬ & QUẢN LÝ ĐƠN HÀNG (HISTORY)
  // ----------------------------------------------------
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedKeyword(keyword);
    }, 500);
    return () => clearTimeout(timerId);
  }, [keyword]);

  useEffect(() => {
    if (activeTab === "history") {
      fetchMyBookings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, debouncedKeyword, statusFilter, dateFilter, paymentFilter]);

  const fetchMyBookings = async () => {
    setHistoryLoading(true);
    try {
      const token =
        localStorage.getItem("token") || localStorage.getItem("TOKEN");
      const headers = { Authorization: `Bearer ${token}` };

      const params = {};
      if (debouncedKeyword) params.keyword = debouncedKeyword;
      if (statusFilter) params.status = statusFilter;
      if (dateFilter) params.date = dateFilter;
      if (paymentFilter) params.paymentStatus = paymentFilter;

      // API backend tự động trích xuất CustomerID từ Token, khách hàng chỉ thấy đơn của mình
      const response = await axios.get("http://127.0.0.1:5000/api/bookings", {
        headers,
        params,
      });
      setMyBookings(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Lỗi khi tải lịch sử booking:", error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleResetFilters = () => {
    setKeyword("");
    setDebouncedKeyword("");
    setStatusFilter("");
    setDateFilter("");
    setPaymentFilter("");
  };

  const formatMoney = (amount) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount || 0);
  };

  const getStatusBadge = (statusId) => {
    switch (Number(statusId)) {
      case 1:
        return (
          <span className="bkm-badge bkm-badge-draft">
            <i className="fa-regular fa-clock"></i> Chờ xác nhận
          </span>
        );
      case 2:
        return (
          <span className="bkm-badge bkm-badge-confirmed">
            <i className="fa-solid fa-check"></i> Đã xác nhận
          </span>
        );
      case 3:
        return (
          <span className="bkm-badge bkm-badge-serving">
            <i className="fa-solid fa-hands-bubbles"></i> Đang rửa xe
          </span>
        );
      case 4:
        return (
          <span className="bkm-badge bkm-badge-completed">
            <i className="fa-solid fa-circle-check"></i> Hoàn thành
          </span>
        );
      case 5:
        return (
          <span className="bkm-badge bkm-badge-cancelled">
            <i className="fa-solid fa-ban"></i> Đã hủy
          </span>
        );
      default:
        return <span className="bkm-badge">Không xác định</span>;
    }
  };

  return (
    <div className="portal-layout-container">
      <Sidebar />
      <main
        className="portal-main-content"
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          padding: "32px 40px 60px",
          position: "relative",
          boxSizing: "border-box",
        }}
      >
        {/* THANH ĐIỀU HƯỚNG TABS */}
        <div className="booking-tabs-container">
          <button
            className={`booking-tab-btn ${activeTab === "create" ? "active" : ""}`}
            onClick={() => setActiveTab("create")}
          >
            <i className="fa-solid fa-plus-circle"></i> Đặt Lịch Dịch Vụ
          </button>
          <button
            className={`booking-tab-btn ${activeTab === "history" ? "active" : ""}`}
            onClick={() => setActiveTab("history")}
          >
            <i className="fa-solid fa-clock-rotate-left"></i> Lịch Sử Đặt Xe
          </button>
        </div>

        {/* ==================================================== */}
        {/* GIAO DIỆN TAB 1: FORM ĐẶT LỊCH                       */}
        {/* ==================================================== */}
        {activeTab === "create" && (
          <div className="tab-fade-in">
            <div style={{ marginBottom: 28, paddingTop: 10 }}>
              <div className="booking-badge">
                <i className="fa-regular fa-calendar-check"></i> Đặt lịch dịch
                vụ
              </div>
              <h1 className="booking-title">Đặt Lịch Dịch Vụ</h1>
              <p className="booking-subtitle">
                Trải nghiệm dịch vụ chăm sóc xe thông minh hàng đầu tại Moto
                Shine
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              {/* Cột trái */}
              <div className="lg:col-span-2 space-y-6">
                {/* Thông tin phương tiện */}
                <div className="form-section-card">
                  <h3 className="form-section-title">
                    <i className="fa-solid fa-car-side text-orange-500"></i>{" "}
                    Thông tin phương tiện
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="form-label">Loại xe *</label>
                      <div className="vehicle-type-grid">
                        <div
                          className={`vehicle-type-option ${vehicleType === "BIKE" ? "active" : ""}`}
                          onClick={() => handleVehicleTypeChange("BIKE")}
                        >
                          <i className="fa-solid fa-motorcycle"></i>
                          <span>Xe máy</span>
                        </div>
                        <div
                          className={`vehicle-type-option ${vehicleType === "CAR" ? "active" : ""}`}
                          onClick={() => handleVehicleTypeChange("CAR")}
                        >
                          <i className="fa-solid fa-car"></i>
                          <span>Ô tô</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="form-label" htmlFor="licensePlate">
                        Biển số xe *
                      </label>
                      <input
                        id="licensePlate"
                        type="text"
                        value={licensePlate}
                        onChange={handlePlateChange}
                        placeholder={
                          vehicleType === "BIKE"
                            ? "VD: 29K6-44743"
                            : "VD: 51A-123.45"
                        }
                        required
                        className="form-input"
                        style={{
                          height: "54px",
                          borderColor: plateError ? "#ef4444" : undefined,
                        }}
                        list="plate-suggestions"
                      />
                      <datalist id="plate-suggestions">
                        {userVehicles
                          .filter((v) => {
                            const type = v.vehicleType?.toLowerCase();
                            const isBike =
                              type === "xe máy" ||
                              type === "motorcycle" ||
                              type === "bike" ||
                              type === "xe may" ||
                              type === "motorbike";
                            return vehicleType === "BIKE" ? isBike : !isBike;
                          })
                          .map((v) => (
                            <option
                              key={v.vehicleId || v.id || v.plateNumber}
                              value={v.plateNumber}
                            >
                              {v.brand} {v.model}
                            </option>
                          ))}
                      </datalist>
                      {plateError ? (
                        <small
                          style={{
                            color: "#ef4444",
                            marginTop: "6px",
                            display: "block",
                          }}
                        >
                          <i
                            className="fa-solid fa-circle-exclamation"
                            style={{ marginRight: 4 }}
                          ></i>
                          {plateError}
                        </small>
                      ) : (
                        <small
                          style={{
                            color: "#64748b",
                            marginTop: "8px",
                            display: "block",
                          }}
                        >
                          {vehicleType === "BIKE"
                            ? "Xe máy: 29K6-44743 | 29AB-12345 | 79A-1234"
                            : "Ô tô: 51A-123.45 | 29G1-1234 | 51H-12345"}
                        </small>
                      )}
                    </div>
                  </div>
                </div>

                {/* Chọn gói dịch vụ */}
                <div className="form-section-card">
                  <h3 className="form-section-title">
                    <i className="fa-solid fa-hand-holding-hand text-orange-500"></i>{" "}
                    Chọn Gói dịch vụ
                  </h3>
                  {loading ? (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "30px",
                        color: "#94a3b8",
                      }}
                    >
                      <i
                        className="fa-solid fa-spinner fa-spin"
                        style={{ fontSize: "24px", marginBottom: "10px" }}
                      ></i>
                      <p>Đang tải danh sách dịch vụ...</p>
                    </div>
                  ) : services.length === 0 ? (
                    <p
                      style={{
                        color: "#94a3b8",
                        textAlign: "center",
                        padding: "20px",
                      }}
                    >
                      Không tìm thấy gói dịch vụ nào cho loại xe này.
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
                            <i
                              className={`fa-solid ${vehicleType === "BIKE" ? "fa-motorcycle" : "fa-car-burst"} text-orange-500`}
                            ></i>
                            <div>
                              <span>{s.serviceName}</span>
                              <span className="package-desc">
                                {s.serviceName.includes("VIP")
                                  ? "Vệ sinh toàn diện, phủ nano sơn và khử mùi nội thất cao cấp"
                                  : s.serviceName.includes("cơ bản") ||
                                      s.serviceName.includes("tiêu chuẩn")
                                    ? "Rửa bọt tuyết siêu sạch, xịt gầm và lau khô xe chuyên nghiệp"
                                    : "Rửa xe bọt tuyết nâng cao kết hợp phủ wax bóng láng bề mặt"}
                              </span>
                            </div>
                          </div>
                          <span className="package-price">
                            {s.basePrice.toLocaleString("vi-VN")}đ
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Ngày & Giờ */}
                <div className="form-section-card">
                  <h3 className="form-section-title">
                    <i className="fa-regular fa-calendar-check text-orange-500"></i>{" "}
                    Thời gian hẹn gặp
                  </h3>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "20px",
                    }}
                  >
                    <div>
                      <label className="form-label" htmlFor="date">
                        Ngày rửa xe *
                      </label>
                      <input
                        id="date"
                        type="date"
                        value={date}
                        onChange={(e) => {
                          setDate(e.target.value);
                          setTime("");
                        }}
                        required
                        className="form-input"
                        min={new Date().toLocaleDateString("en-CA")}
                      />
                    </div>
                    <div>
                      <label className="form-label">
                        Giờ rửa xe *{" "}
                        {time && (
                          <span
                            style={{ color: "#f97316", textTransform: "none" }}
                          >
                            (Đang chọn: {time})
                          </span>
                        )}
                      </label>
                      {!date ? (
                        <div className="select-date-prompt">
                          <i
                            className="fa-regular fa-calendar-days"
                            style={{ marginRight: "8px" }}
                          ></i>
                          Vui lòng chọn ngày rửa xe để xem các khung giờ trống.
                        </div>
                      ) : slotsLoading ? (
                        <div className="slots-loading">
                          <i
                            className="fa-solid fa-spinner fa-spin"
                            style={{ marginRight: "8px" }}
                          ></i>
                          Đang đồng bộ tình trạng máy rửa xe...
                        </div>
                      ) : fetchError ? (
                        <div className="slots-error">
                          <i
                            className="fa-solid fa-triangle-exclamation"
                            style={{ marginRight: "8px" }}
                          ></i>
                          {fetchError}
                        </div>
                      ) : (
                        <div className="slots-container">
                          <div className="slots-grid">
                            {TIME_SLOTS.map((slotTime) => {
                              const isBooked =
                                slotsAvailability[slotTime] === "booked";
                              const isPast = checkIfPast(slotTime);
                              const isAvailable = !isBooked && !isPast;
                              const isSelected = time === slotTime;
                              return (
                                <button
                                  key={slotTime}
                                  type="button"
                                  className={`slot-button ${isSelected ? "selected" : ""} ${isBooked ? "booked" : ""} ${isPast ? "past" : ""} ${isAvailable ? "available" : ""}`}
                                  disabled={!isAvailable}
                                  onClick={() => setTime(slotTime)}
                                >
                                  <span className="slot-time">{slotTime}</span>
                                  <span className="slot-status">
                                    {isBooked
                                      ? "Hết máy"
                                      : isPast
                                        ? "Đã qua"
                                        : isSelected
                                          ? "Đang chọn"
                                          : "Còn trống"}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                          <div className="slots-legend">
                            <div className="legend-item">
                              <span className="legend-dot legend-available"></span>
                              <span>Trống</span>
                            </div>
                            <div className="legend-item">
                              <span className="legend-dot legend-booked"></span>
                              <span>Hết máy</span>
                            </div>
                            <div className="legend-item">
                              <span className="legend-dot legend-past"></span>
                              <span>Đã qua</span>
                            </div>
                            <div className="legend-item">
                              <span className="legend-dot legend-selected"></span>
                              <span>Đang chọn</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-6">
                    <label className="form-label" htmlFor="note">
                      Ghi chú (Tùy chọn)
                    </label>
                    <textarea
                      id="note"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows="3"
                      placeholder="Những dặn dò đặc biệt cho nhân viên rửa xe..."
                      className="form-textarea"
                    ></textarea>
                  </div>
                </div>
              </div>

              {/* Cột phải: Tóm tắt */}
              <div className="lg:col-span-1">
                <div className="summary-card sticky top-10">
                  <h3
                    className="text-2xl font-bold mb-6 border-b pb-4"
                    style={{ borderColor: "var(--border)" }}
                  >
                    Tóm tắt lịch đặt
                  </h3>
                  <div className="space-y-4 mb-6">
                    <div className="summary-row">
                      <span>Loại phương tiện:</span>
                      <span>{vehicleType === "BIKE" ? "Xe máy" : "Ô tô"}</span>
                    </div>
                    <div className="summary-row">
                      <span>Biển số xe:</span>
                      <span
                        style={{ color: plateError ? "#ef4444" : undefined }}
                      >
                        {licensePlate.toUpperCase() || "..."}
                      </span>
                    </div>
                    <div className="summary-row">
                      <span>Gói dịch vụ:</span>
                      <span>
                        {selectedService ? selectedService.serviceName : "..."}
                      </span>
                    </div>
                    <div className="summary-row">
                      <span>Thời gian:</span>
                      <span>{date && time ? `${time} (${date})` : "..."}</span>
                    </div>
                  </div>
                  <div
                    className="space-y-3 pt-4 border-t"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <div className="summary-row">
                      <span>Giá niêm yết:</span>
                      <span>{basePrice.toLocaleString("vi-VN")} đ</span>
                    </div>
                    <div className="summary-row">
                      <span>Hạng thành viên:</span>
                      <span style={{ color: "#818cf8" }}>
                        {profile.TierName}
                      </span>
                    </div>
                    {discountRate > 0 && (
                      <div className="summary-row" style={{ color: "#10b981" }}>
                        <span>
                          Ưu đãi hạng {profile.TierName} (giảm{" "}
                          {Math.round(discountRate * 100)}%):
                        </span>
                        <span>-{discountAmount.toLocaleString("vi-VN")} đ</span>
                      </div>
                    )}
                    {isHighTier && (
                      <div
                        className="summary-row"
                        style={{ color: "#a78bfa", fontSize: "13px" }}
                      >
                        <span>🎖️ Miễn phí đặt chỗ</span>
                        <span>✓</span>
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
                  <button
                    type="submit"
                    className="btn-book-submit"
                    disabled={isSubmitting || !!plateError}
                    style={{
                      opacity: isSubmitting || plateError ? 0.7 : 1,
                      cursor:
                        isSubmitting || plateError ? "not-allowed" : "pointer",
                    }}
                  >
                    {isSubmitting ? "Đang xử lý..." : "Xác nhận đặt lịch"}
                  </button>
                  <p
                    className="text-center text-xs mt-4"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Bằng việc nhấn "Xác nhận đặt lịch", bạn đồng ý chịu trách
                    nhiệm với thời gian đã hẹn gặp.
                  </p>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* ==================================================== */}
        {/* GIAO DIỆN TAB 2: LỊCH SỬ & QUẢN LÝ ĐƠN HÀNG          */}
        {/* ==================================================== */}
        {activeTab === "history" && (
          <div className="tab-fade-in">
            <header className="bkm-header" style={{ paddingTop: 10 }}>
              <div className="bkm-title-section">
                <div className="bkm-icon-box">
                  <i className="fa-solid fa-rectangle-list"></i>
                </div>
                <div>
                  <h1
                    style={{
                      margin: 0,
                      fontSize: "24px",
                      color: "var(--text-primary)",
                      fontWeight: 700,
                    }}
                  >
                    Lịch Sử Đặt Xe Của Tôi
                  </h1>
                  <p
                    style={{
                      margin: "4px 0 0 0",
                      fontSize: "14px",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Tìm kiếm và theo dõi các đơn dịch vụ bạn đã đặt
                  </p>
                </div>
              </div>
            </header>

            {/* BỘ LỌC TÌM KIẾM (FILTER TOOLBAR) */}
            <section className="bkm-filter-toolbar">
              <div className="bkm-filter-item bkm-search-box">
                <i className="fa-solid fa-magnifying-glass"></i>
                <input
                  type="text"
                  placeholder="Tìm theo Biển số xe, Mã đơn..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                />
              </div>

              <div className="bkm-filter-item">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">Trạng thái đơn: Tất cả</option>
                  <option value="1">Chờ xác nhận (1)</option>
                  <option value="2">Đã xác nhận (2)</option>
                  <option value="3">Đang phục vụ (3)</option>
                  <option value="4">Hoàn thành (4)</option>
                  <option value="5">Đã hủy (5)</option>
                </select>
              </div>

              <div className="bkm-filter-item">
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  title="Lọc theo ngày đặt"
                />
              </div>

              <div className="bkm-filter-item">
                <select
                  value={paymentFilter}
                  onChange={(e) => setPaymentFilter(e.target.value)}
                >
                  <option value="">Thanh toán: Tất cả</option>
                  <option value="paid">Đã thanh toán</option>
                  <option value="unpaid">Chưa thanh toán</option>
                </select>
              </div>

              <button
                className="bkm-reset-btn"
                onClick={handleResetFilters}
                title="Xóa bộ lọc"
              >
                <i className="fa-solid fa-rotate-left"></i>
              </button>
            </section>

            {/* BẢNG DỮ LIỆU */}
            <section className="bkm-table-container">
              {historyLoading ? (
                <div className="bkm-loading">
                  <i className="fa-solid fa-spinner fa-spin"></i> Đang tải dữ
                  liệu lịch sử...
                </div>
              ) : myBookings.length === 0 ? (
                <div className="bkm-empty">
                  <i className="fa-regular fa-folder-open"></i>
                  <p>Bạn chưa có đơn đặt lịch nào khớp với điều kiện lọc.</p>
                </div>
              ) : (
                <div className="bkm-table-responsive">
                  <table className="bkm-table">
                    <thead>
                      <tr>
                        <th>Mã Đơn</th>
                        <th>Biển số xe</th>
                        <th>Gói Dịch vụ</th>
                        <th>Thời gian hẹn</th>
                        <th>Tổng tiền</th>
                        <th>Thanh toán</th>
                        <th>Trạng thái</th>
                        <th>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myBookings.map((b) => (
                        <tr key={b.BookingID}>
                          <td>
                            <strong>#{b.BookingID}</strong>
                          </td>
                          <td>
                            <span className="bkm-plate">{b.LicensePlate}</span>
                          </td>
                          <td>
                            <span className="bkm-service-name">
                              {b.servicePackage || "Dịch vụ rửa xe"}
                            </span>
                          </td>
                          <td>
                            <div className="bkm-datetime">
                              <strong>
                                {b.BookingDate
                                  ? new Date(b.BookingDate).toLocaleDateString(
                                      "vi-VN",
                                    )
                                  : "N/A"}
                              </strong>
                              <span>
                                {b.BookingDate
                                  ? new Date(b.BookingDate).toLocaleTimeString(
                                      "vi-VN",
                                      { hour: "2-digit", minute: "2-digit" },
                                    )
                                  : ""}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span className="bkm-price">
                              {formatMoney(b.FinalPrice || b.TotalPrice)}
                            </span>
                          </td>
                          <td>
                            {b.PaidAmount > 0 ? (
                              <span className="bkm-paid-status text-green-500">
                                <i className="fa-solid fa-check-double"></i> Đã
                                trả
                              </span>
                            ) : (
                              <span className="bkm-paid-status text-red-400">
                                <i className="fa-solid fa-xmark"></i> Chưa trả
                              </span>
                            )}
                          </td>
                          <td>{getStatusBadge(b.Status)}</td>
                          <td>
                            <div className="bkm-action-btns">
                              <button
                                className="bkm-btn bkm-btn-view"
                                title="Xem chi tiết đơn hàng"
                              >
                                <i className="fa-solid fa-eye"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}

        {/* ==================================================== */}
        {/* TOAST THÔNG BÁO VÀ STYLE NHÚNG                       */}
        {/* ==================================================== */}
        {toast && (
          <div
            className={`booking-toast ${toast.type === "error" ? "booking-toast-error" : "booking-toast-success"}`}
          >
            <i
              className={
                toast.type === "error"
                  ? "fa-solid fa-triangle-exclamation"
                  : "fa-regular fa-circle-check"
              }
            ></i>
            <span>{toast.message}</span>
          </div>
        )}

        <style
          dangerouslySetInnerHTML={{
            __html: `
          /* Tab Navigation Styling */
          .booking-tabs-container {
            display: flex;
            gap: 12px;
            margin-bottom: 24px;
            border-bottom: 1px solid var(--border);
            padding-bottom: 16px;
          }
          .booking-tab-btn {
            background: var(--bg-card);
            border: 1px solid var(--border);
            color: var(--text-secondary);
            padding: 10px 24px;
            border-radius: 99px;
            font-weight: 700;
            font-size: 15px;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .booking-tab-btn:hover {
            background: rgba(59, 130, 246, 0.1);
            color: #3b82f6;
          }
          .booking-tab-btn.active {
            background: #3b82f6;
            color: white;
            border-color: #3b82f6;
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
          }
          .tab-fade-in {
            animation: fadeIn 0.3s ease-in-out;
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }

          /* Tái sử dụng CSS Lọc & Bảng từ BookingManagement */
          .bkm-title-section { display: flex; align-items: center; gap: 16px; }
          .bkm-icon-box {
            width: 48px; height: 48px; border-radius: 12px;
            background: linear-gradient(135deg, #3b82f6, #2563eb); color: white;
            display: grid; place-items: center; font-size: 20px;
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
          }
          .bkm-filter-toolbar {
            display: flex; flex-wrap: wrap; gap: 12px;
            background: var(--bg-card); padding: 16px;
            border-radius: 16px; border: 1px solid var(--border); margin-bottom: 24px;
          }
          .bkm-filter-item { flex: 1; min-width: 150px; }
          .bkm-filter-item input, .bkm-filter-item select {
            width: 100%; height: 42px; padding: 0 16px;
            border-radius: 10px; border: 1px solid var(--border);
            background: var(--bg-primary); color: var(--text-primary);
            font-family: inherit; font-size: 14px; outline: none;
          }
          .bkm-filter-item input:focus, .bkm-filter-item select:focus { border-color: #3b82f6; }
          .bkm-search-box { position: relative; flex: 2; min-width: 220px; }
          .bkm-search-box i { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-secondary); }
          .bkm-search-box input { padding-left: 40px; }
          .bkm-reset-btn {
            height: 42px; width: 42px; display: grid; place-items: center;
            border-radius: 10px; background: var(--bg-primary); color: var(--text-primary);
            border: 1px solid var(--border); cursor: pointer; transition: 0.2s;
          }
          .bkm-reset-btn:hover { background: #ef4444; color: white; border-color: #ef4444; }

          .bkm-table-container { background: var(--bg-card); border-radius: 16px; border: 1px solid var(--border); overflow: hidden; }
          .bkm-table-responsive { width: 100%; overflow-x: auto; }
          .bkm-table { width: 100%; border-collapse: collapse; text-align: left; }
          .bkm-table th { background: rgba(0,0,0,0.02); padding: 16px; font-size: 12px; text-transform: uppercase; color: var(--text-secondary); border-bottom: 1px solid var(--border); white-space: nowrap; }
          .bkm-table td { padding: 16px; font-size: 14px; border-bottom: 1px solid var(--border); color: var(--text-primary); vertical-align: middle; }
          .bkm-table tr:hover { background: rgba(0,0,0,0.02); }

          .bkm-plate { background: rgba(59, 130, 246, 0.1); color: #3b82f6; padding: 4px 8px; border-radius: 6px; font-weight: 700; letter-spacing: 1px; }
          .bkm-service-name { font-weight: 600; color: var(--text-primary); }
          .bkm-datetime strong { display: block; font-size: 13px; }
          .bkm-datetime span { font-size: 12px; color: var(--text-secondary); }
          .bkm-price { font-weight: 700; color: #10b981; }
          .bkm-paid-status { font-size: 13px; font-weight: 600; }

          .bkm-badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 50px; font-size: 12px; font-weight: 700; }
          .bkm-badge-draft { background: rgba(100, 116, 139, 0.1); color: #94a3b8; }
          .bkm-badge-confirmed { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
          .bkm-badge-serving { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
          .bkm-badge-completed { background: rgba(16, 185, 129, 0.1); color: #10b981; }
          .bkm-badge-cancelled { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

          .bkm-action-btns { display: flex; gap: 8px; }
          .bkm-btn { width: 32px; height: 32px; border-radius: 8px; border: none; display: grid; place-items: center; cursor: pointer; transition: 0.2s; }
          .bkm-btn-view { background: var(--bg-primary); color: #3b82f6; border: 1px solid var(--border); }
          .bkm-btn-view:hover { background: #3b82f6; color: white; }

          .bkm-loading, .bkm-empty { text-align: center; padding: 60px 20px; color: var(--text-secondary); }
          .bkm-empty i { font-size: 48px; margin-bottom: 16px; opacity: 0.5; }
        `,
          }}
        />
      </main>
    </div>
  );
}
