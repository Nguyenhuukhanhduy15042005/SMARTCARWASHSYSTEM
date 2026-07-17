// Front-end/src/pages/Booking.jsx

import React, { useState, useEffect } from "react";

import { Link, useNavigate } from "react-router-dom";

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
  11, 12, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28,

  29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45,

  46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62,

  63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79,

  80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 92, 93, 94, 95, 97, 98, 99,
]);

// ─── Regex biển số xe VN ──────────────────────────────────────────────────────

// Xe máy: 29K6-44743 | 29AB-12345 | 29A-1234

// Ô tô:   51A-123.45 | 29G1-1234  | 51H-12345

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

  const { user, isAdmin, isStaff, logout } = useAuth();

  const [showUserMenu, setShowUserMenu] = useState(false);

  const [vehicleType, setVehicleType] = useState("CAR");

  const [licensePlate, setLicensePlate] = useState("");

  const [plateError, setPlateError] = useState("");

  const [userVehicles, setUserVehicles] = useState([]);

  const [date, setDate] = useState("");

  const [time, setTime] = useState("");

  const [note, setNote] = useState("");

  const [slotsAvailability, setSlotsAvailability] = useState({});
  const [machines, setMachines] = useState([]);
  const [selectedMachineId, setSelectedMachineId] = useState("");
  const [machinesLoading, setMachinesLoading] = useState(false);

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

  const [forceDeposit, setForceDeposit] = useState(false);

  const [forceDepositWarning, setForceDepositWarning] = useState(null);

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

    fetchTier();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest("[data-user-menu]")) setShowUserMenu(false);
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    } catch (err) {
      console.error("Lỗi fetch profile:", err);
    }
  };

  // Tính toán ngày đặt trước tối đa dựa theo hạng thành viên (BR-05)
  const getMaxDate = () => {
    let maxDays = 7; // Mặc định Member (Bronze) là 7 ngày
    const tier = (profile.TierName || "Standard").toLowerCase();

    if (tier.includes("silver")) {
      maxDays = 10;
    } else if (tier.includes("gold")) {
      maxDays = 12;
    } else if (tier.includes("platinum")) {
      maxDays = 14;
    }
    const maxDateObj = new Date();
    maxDateObj.setDate(maxDateObj.getDate() + maxDays); // Cộng thêm số ngày giới hạn
    return maxDateObj.toLocaleDateString("en-CA"); // Trả về định dạng YYYY-MM-DD
  };

  const fetchTier = async () => {
    const token = localStorage.getItem("TOKEN") || localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await axios.get("http://127.0.0.1:5000/api/payments/tier", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setForceDeposit(!!res.data.forceDeposit);
      setForceDepositWarning(res.data.forceDepositWarning || null);
    } catch (err) {
      console.error("Lỗi fetch tier:", err);
    }
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

      if (Array.isArray(res.data)) {
        setUserVehicles(res.data);
      }
    } catch (err) {
      console.error("Lỗi fetch danh sách xe gợi ý:", err);
    }
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
        console.error("Lỗi tải dịch vụ:", err);

        showToast("Không thể tải danh sách dịch vụ!", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, [vehicleType]);

  useEffect(() => {
    const fetchMachines = async () => {
      setMachinesLoading(true);
      setSelectedMachineId("");
      setTime("");
      setSlotsAvailability({});
      setFetchError("");

      try {
        const typeParam = vehicleType === "BIKE" ? "BIKE" : "CAR";
        const res = await axios.get(
          `http://127.0.0.1:5000/api/timeslots/machines?type=${typeParam}`,
        );

        const list = Array.isArray(res.data) ? res.data : [];
        const usableMachines = list.filter(
          (machine) =>
            machine.status !== "Maintenance" &&
            machine.status !== "Under Maintenance",
        );

        setMachines(usableMachines);

        if (usableMachines.length === 0) {
          setFetchError(
            `Không tìm thấy máy/sàn đang hoạt động cho ${
              vehicleType === "BIKE" ? "xe máy" : "ô tô"
            }.`,
          );
        }
      } catch (err) {
        console.error("Lỗi tải danh sách máy:", err);
        setMachines([]);
        setFetchError("Không thể tải danh sách máy/sàn rửa xe.");
      } finally {
        setMachinesLoading(false);
      }
    };

    fetchMachines();
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
    if (!date || !selectedMachineId) {
      setSlotsAvailability({});
      setTime("");
      return;
    }

    const fetchSlotsAvailability = async () => {
      setSlotsLoading(true);
      setFetchError("");

      try {
        const res = await axios.get(
          `http://127.0.0.1:5000/api/timeslots?machineId=${selectedMachineId}&date=${date}`,
        );

        const slots = Array.isArray(res.data?.slots) ? res.data.slots : [];
        const availability = {};

        TIME_SLOTS.forEach((slotTime) => {
          const slot = slots.find((item) => item.time === slotTime);
          availability[slotTime] = slot?.status || "booked";
        });

        setSlotsAvailability(availability);

        if (
          time &&
          (availability[time] !== "free" || checkIfPast(time))
        ) {
          setTime("");
          showToast(
            "Khung giờ đang chọn không còn trống trên máy/sàn này.",
            "error",
          );
        }
      } catch (err) {
        console.error("Lỗi tải timeslot theo máy:", err);
        setSlotsAvailability({});
        setFetchError("Không thể đồng bộ lịch của máy/sàn đã chọn.");
      } finally {
        setSlotsLoading(false);
      }
    };

    fetchSlotsAvailability();
  }, [date, selectedMachineId]);

  const handleVehicleTypeChange = (type) => {
    setVehicleType(type);
    setLicensePlate("");
    setPlateError("");
    setSelectedMachineId("");
    setDate("");
    setTime("");
    setSlotsAvailability({});
  };

  // Validate biển số realtime khi user nhập + gợi ý và tự nhận diện loại xe

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

  const isHighTier = ["Gold", "Platinum"].includes(profile.TierName) && !forceDeposit;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSubmitting) return;

    if (!licensePlate.trim())
      return showToast("Vui lòng nhập biển số xe!", "error");

    // Validate biển số theo loại xe + tỉnh thành

    const plateResult = validatePlate(licensePlate, vehicleType);

    if (!plateResult.valid) return showToast(plateResult.message, "error");

    if (!selectedService)
      return showToast("Vui lòng chọn một gói dịch vụ!", "error");

    if (!selectedMachineId)
      return showToast("Vui lòng chọn máy/sàn rửa xe!", "error");

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

      MachineID: Number(selectedMachineId),

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
      window.dispatchEvent(new Event("noti:refresh"));
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
              MachineID: Number(selectedMachineId),
              MachineName:
                machines.find(
                  (machine) =>
                    String(machine.machineId || machine.id) ===
                    String(selectedMachineId),
                )?.name || "Chưa xác định",
            },
          },
        });
      }, 1500);
    } catch (err) {
      console.error("Lỗi đặt lịch:", err);

      showToast(
        `Không thể tạo lịch: ${err.response?.data?.message || err.message}`,
        "error",
      );

      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
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
        <div>
          <div style={{ marginBottom: 28, paddingTop: 40 }}>
            <div className="booking-badge">
              <i className="fa-regular fa-calendar-check"></i> Đặt lịch dịch vụ
            </div>

            <h1 className="booking-title">Đặt Lịch Dịch Vụ</h1>

            <p className="booking-subtitle">
              Trải nghiệm dịch vụ chăm sóc xe thông minh hàng đầu tại Moto Shine
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
                  <i className="fa-solid fa-car-side text-orange-500"></i> Thông
                  tin phương tiện
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

                    {/* Gợi ý biển số từ xe đã lưu */}

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

              {/* Chọn máy / sàn */}

              <div className="form-section-card">
                <h3 className="form-section-title">
                  <i className="fa-solid fa-gears text-orange-500"></i>{" "}
                  Chọn máy / sàn rửa xe
                </h3>

                {machinesLoading ? (
                  <div className="slots-loading">
                    <i
                      className="fa-solid fa-spinner fa-spin"
                      style={{ marginRight: "8px" }}
                    ></i>
                    Đang tải danh sách máy/sàn...
                  </div>
                ) : machines.length === 0 ? (
                  <div className="slots-error">
                    <i
                      className="fa-solid fa-triangle-exclamation"
                      style={{ marginRight: "8px" }}
                    ></i>
                    Không có máy/sàn phù hợp đang hoạt động.
                  </div>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: "12px",
                    }}
                  >
                    {machines.map((machine) => {
                      const machineId = String(
                        machine.machineId || machine.id,
                      );
                      const isSelected =
                        String(selectedMachineId) === machineId;

                      return (
                        <button
                          key={machineId}
                          type="button"
                          onClick={() => {
                            setSelectedMachineId(machineId);
                            setDate("");
                            setTime("");
                            setSlotsAvailability({});
                          }}
                          style={{
                            textAlign: "left",
                            padding: "14px 16px",
                            borderRadius: "12px",
                            border: isSelected
                              ? "1px solid #f97316"
                              : "1px solid var(--border)",
                            background: isSelected
                              ? "rgba(249,115,22,0.10)"
                              : "var(--bg-primary)",
                            color: "var(--text-primary)",
                            cursor: "pointer",
                          }}
                        >
                          <div
                            style={{
                              fontWeight: 700,
                              marginBottom: 5,
                            }}
                          >
                            {machine.name}
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              color: "var(--text-secondary)",
                            }}
                          >
                            {vehicleType === "BIKE" ? "Xe máy" : "Ô tô"} ·{" "}
                            {machine.status || "Available"}
                          </div>
                        </button>
                      );
                    })}
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
                      disabled={!selectedMachineId}
                      className="form-input"
                      min={new Date().toLocaleDateString("en-CA")}
                      max={getMaxDate()}
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

                    {!selectedMachineId ? (
                      <div className="select-date-prompt">
                        <i
                          className="fa-solid fa-gears"
                          style={{ marginRight: "8px" }}
                        ></i>
                        Vui lòng chọn máy/sàn trước khi chọn ngày và giờ.
                      </div>
                    ) : !date ? (
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
                                    ? "Đã đặt"
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
                            <span>Đã đặt trên máy/sàn này</span>
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

                    <span style={{ color: plateError ? "#ef4444" : undefined }}>
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

                    <span style={{ color: "#818cf8" }}>{profile.TierName}</span>
                  </div>

                  <div className="summary-row">
                    <span>Máy / sàn đã chọn:</span>
                    <span>
                      {machines.find(
                        (machine) =>
                          String(machine.machineId || machine.id) ===
                          String(selectedMachineId),
                      )?.name || "..."}
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

                  {forceDeposit && forceDepositWarning && (
                    <div style={{
                      marginTop: 8, padding: "10px 12px", borderRadius: 8,
                      background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)",
                      fontSize: "12px", color: "#fca5a5", lineHeight: 1.5,
                    }}>
                      {forceDepositWarning}
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
      </main>
    </div>
  );
}