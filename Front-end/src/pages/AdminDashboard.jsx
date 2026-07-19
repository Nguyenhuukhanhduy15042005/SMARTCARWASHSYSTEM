// Front-end/src/pages/AdminDashboard.jsx
import React, { useState, useEffect } from "react";
import "./AdminDashboard.css";
import axios from "axios";
import Sidebar from "../components/Sidebar";

const API_BASE = "http://127.0.0.1:5000/api/bookings/admin";

export default function AdminDashboard() {
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    active: 0,
    completed: 0,
    cancelled: 0,
    revenue: 0,
  });
  const [loading, setLoading] = useState(true);

  const [selectedBooking, setSelectedBooking] = useState(null);
  const [bookingHistory, setBookingHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [isEditingPlate, setIsEditingPlate] = useState(false);
  const [tempPlate, setTempPlate] = useState("");
  const [savingPlate, setSavingPlate] = useState(false);
  
  // --- FULL EDIT MODAL STATES ---
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFullName, setEditFullName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPlate, setEditPlate] = useState("");
  const [editVehicleType, setEditVehicleType] = useState("CAR");
  const [editServices, setEditServices] = useState([]);
  const [editSelectedMainService, setEditSelectedMainService] = useState(null);
  const [editSelectedAddons, setEditSelectedAddons] = useState([]);
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editMachines, setEditMachines] = useState([]);
  const [editSelectedMachineId, setEditSelectedMachineId] = useState("");
  const [editSlots, setEditSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem("LOGIN_USER");
    return saved ? JSON.parse(saved) : null;
  });

  // --- FILTER STATES ---
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [vehicleFilter, setVehicleFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("");

  // Debounce Keyword
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedKeyword(keyword);
    }, 500);
    return () => clearTimeout(timerId);
  }, [keyword]);

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
  }, []);

  // Fetch when filters change
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedKeyword, statusFilter, vehicleFilter, dateFilter]);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const fetchData = async () => {
    setLoading(true);
    const token = localStorage.getItem("token") || "mock-token";
    const headers = { Authorization: `Bearer ${token}` };

    try {
      // 1. Fetch Stats
      const statsRes = await axios.get(`${API_BASE}/dashboard/stats`, {
        headers,
      });

      // 2. Prepare params for bookings
      const params = {};
      if (debouncedKeyword) params.search = debouncedKeyword;
      if (statusFilter !== "All") params.status = statusFilter;
      if (vehicleFilter !== "All") params.vehicleType = vehicleFilter;
      if (dateFilter) {
        params.fromDate = `${dateFilter} 00:00:00`;
        params.toDate = `${dateFilter} 23:59:59`;
      }

      // 3. Fetch Bookings
      const bookingsRes = await axios.get(`${API_BASE}/all`, {
        headers,
        params,
      });

      const apiStats = statsRes.data;
      const apiBookings = bookingsRes.data;

      const list = Array.isArray(apiBookings)
        ? apiBookings
        : apiBookings.data || [];

      setBookings(list);
      setStats({
        total: apiStats.total || list.length,
        pending: apiStats.pending || list.filter((b) => b.status === 1).length,
        active: apiStats.active || list.filter((b) => b.status === 3).length,
        completed:
          apiStats.completed || list.filter((b) => b.status === 4).length,
        cancelled:
          apiStats.cancelled !== undefined
            ? apiStats.cancelled
            : list.filter((b) => b.status === 5).length,
        revenue:
          apiStats.revenue ||
          list.reduce(
            (acc, curr) => (curr.status === 4 ? acc + (curr.price || 0) : acc),
            0,
          ),
      });
    } catch (err) {
      console.error("Backend API connection failed:", err);
      showToast(`Lỗi tải dữ liệu. Vui lòng kiểm tra kết nối Server!`, "error");
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setKeyword("");
    setDebouncedKeyword("");
    setStatusFilter("All");
    setVehicleFilter("All");
    setDateFilter("");
  };

  const handleStatusUpdate = async (id, newStatus) => {
    const token = localStorage.getItem("token") || "mock-token";
    const headers = { Authorization: `Bearer ${token}` };

    if (Number(newStatus) === 4) {
      try {
        const freshRes = await axios.get(`${API_BASE}/${id}`, { headers });
        const freshBooking = freshRes.data;
        const paid = Number(
          freshBooking.paidAmount || freshBooking.PaidAmount || 0,
        );
        const price = Number(
          freshBooking.price ||
            freshBooking.FinalPrice ||
            freshBooking.TotalPrice ||
            0,
        );
        const remaining = price - paid;

        if (remaining > 0) {
          const confirmMsg = `ĐƠN HÀNG CHƯA THANH TOÁN ĐỦ!\n\n- CẦN THU THÊM TIỀN MẶT: ${remaining.toLocaleString("vi-VN")} đ\n\nXác nhận ĐÃ THU ĐỦ và HOÀN THÀNH đơn hàng này?`;
          if (!window.confirm(confirmMsg)) return;
        } else {
          if (
            !window.confirm(
              "Đơn hàng đã thanh toán đủ online. Xác nhận hoàn tất đơn hàng?",
            )
          )
            return;
        }
      } catch (fetchErr) {
        if (
          !window.confirm(
            "Không thể kiểm tra thông tin thanh toán. Vẫn muốn hoàn thành đơn hàng?",
          )
        )
          return;
      }
    }

    const statusMap = {
      1: "Chờ duyệt",
      2: "Đã xác nhận",
      3: "Đang làm dịch vụ",
      4: "Hoàn thành",
      5: "Đã hủy",
    };

    try {
      await axios.put(
        `${API_BASE}/${id}/status`,
        { status: newStatus },
        { headers },
      );
      showToast(
        `Cập nhật trạng thái thành [${statusMap[newStatus]}] thành công!`,
        "success",
      );
      if (selectedBooking && selectedBooking.id === id) {
        setSelectedBooking({ ...selectedBooking, status: newStatus });
      }
      fetchData();
    } catch (err) {
      showToast(
        `Lỗi cập nhật: ${err.response?.data?.message || err.message}`,
        "error",
      );
    }
  };

  const handleViewDetails = async (booking) => {
    setSelectedBooking(booking);
    setIsEditingPlate(false);
    setHistoryLoading(true);
    setBookingHistory([]);
    const token = localStorage.getItem("token") || "mock-token";
    try {
      const res = await axios.get(`http://127.0.0.1:5000/api/bookings/${booking.id}/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBookingHistory(res.data || []);
    } catch (err) {
      console.error("Lỗi khi tải lịch sử booking:", err);
      setBookingHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleDeleteBooking = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa vĩnh viễn lịch đặt xe này?"))
      return;
    const token = localStorage.getItem("token") || "mock-token";
    try {
      await axios.delete(`${API_BASE}/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showToast("Xóa lịch đặt xe thành công!", "success");
      if (selectedBooking && selectedBooking.id === id)
        setSelectedBooking(null);
      fetchData();
    } catch (err) {
      showToast(
        `Lỗi xóa: ${err.response?.data?.message || err.message}`,
        "error",
      );
    }
  };

  const handleSavePlate = async () => {
    if (!tempPlate || tempPlate.trim() === "") {
      showToast("Biển số xe không được để trống", "error");
      return;
    }
    setSavingPlate(true);
    const token = localStorage.getItem("token") || "mock-token";
    try {
      const res = await axios.put(
        `http://127.0.0.1:5000/api/bookings/${selectedBooking.id}/license-plate`,
        { licensePlate: tempPlate },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const updatedPlate = res.data.licensePlate || tempPlate.trim().toUpperCase();
      
      // Update bookings list
      setBookings(prev => prev.map(b => b.id === selectedBooking.id ? { ...b, licensePlate: updatedPlate } : b));
      
      // Update selectedBooking in modal
      setSelectedBooking(prev => ({ ...prev, licensePlate: updatedPlate }));
      
      showToast("Cập nhật biển số xe thành công!", "success");
      setIsEditingPlate(false);
      
      // Reload history log to show edit plate log
      if (selectedBooking) {
        const histRes = await axios.get(`http://127.0.0.1:5000/api/bookings/${selectedBooking.id}/history`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setBookingHistory(histRes.data || []);
      }
    } catch (err) {
      console.error("Lỗi khi cập nhật biển số:", err);
      showToast(err.response?.data?.message || "Không thể cập nhật biển số xe", "error");
    } finally {
      setSavingPlate(false);
    }
  };

  // Helpers
  const isCombo = (service) => {
    if (!service) return false;
    const name = String(service.serviceName || "").toLowerCase();
    const desc = String(service.description || "").toLowerCase();
    return name.includes("combo") || desc.includes("combo") || name.includes("+") || name.includes("trọn gói");
  };

  const isBaseWash = (service) => {
    if (!service) return false;
    const name = String(service.serviceName || "").toLowerCase();
    return (name.includes("rửa xe") || name.includes("rua xe")) && !isCombo(service);
  };

  const isAddon = (service) => {
    return !isCombo(service) && !isBaseWash(service);
  };

  // Open Edit Modal
  const handleOpenEditModal = async () => {
    if (!selectedBooking) return;
    setEditSaving(false);
    
    const token = localStorage.getItem("token") || "mock-token";
    try {
      const res = await axios.get(`http://127.0.0.1:5000/api/bookings/${selectedBooking.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const details = res.data;
      
      setEditFullName(details.CustomerName || selectedBooking.customerName);
      setEditPhone(details.Phone || selectedBooking.phone);
      setEditPlate(details.LicensePlate || selectedBooking.licensePlate);
      
      const vType = String(details.VehicleType || selectedBooking.vehicleType).toUpperCase().includes("XE MÁY") ||
                    String(details.VehicleType || selectedBooking.vehicleType).toUpperCase().includes("BIKE")
                    ? "BIKE" : "CAR";
      setEditVehicleType(vType);

      // Parse booking date and time
      const bDate = details.BookingDate ? details.BookingDate.split("T")[0] : selectedBooking.date;
      const bTime = details.BookingDate ? new Date(details.BookingDate).toLocaleTimeString("vi-VN", {hour: "2-digit", minute:"2-digit"}) : selectedBooking.time;
      setEditDate(bDate);
      setEditTime(bTime);
      
      // Fetch services list for this vehicle type
      const servicesRes = await axios.get(`http://127.0.0.1:5000/api/timeslots/services?vehicleType=${vType}`);
      const servList = Array.isArray(servicesRes.data) ? servicesRes.data : [];
      setEditServices(servList);
      
      // Pre-select service IDs
      const selectedIds = Array.isArray(details.ServiceIDs) ? details.ServiceIDs : [];
      const mainServ = servList.find(s => selectedIds.includes(s.serviceId) && (isCombo(s) || isBaseWash(s)));
      setEditSelectedMainService(mainServ || null);
      
      const addons = servList.filter(s => selectedIds.includes(s.serviceId) && isAddon(s));
      setEditSelectedAddons(addons);

      // Fetch machines for this vehicle type
      const machinesRes = await axios.get(`http://127.0.0.1:5000/api/timeslots/machines?type=${vType}`);
      const machList = Array.isArray(machinesRes.data) ? machinesRes.data : [];
      const activeMachines = machList.filter(m => m.status !== "Maintenance" && m.status !== "Under Maintenance");
      setEditMachines(activeMachines);
      
      const currentMachineId = details.MachineID || selectedBooking.machineId || (activeMachines.length > 0 ? activeMachines[0].machineId : "");
      setEditSelectedMachineId(currentMachineId);
      
      setShowEditModal(true);
    } catch (err) {
      console.error("Lỗi khi tải thông tin chi tiết để chỉnh sửa:", err);
      showToast("Không thể tải chi tiết lịch đặt", "error");
    }
  };

  // Fetch slots availability when date/machine changes
  useEffect(() => {
    if (!editDate || !editSelectedMachineId || !showEditModal) {
      setEditSlots([]);
      return;
    }
    const fetchEditSlots = async () => {
      setSlotsLoading(true);
      try {
        const res = await axios.get(`http://127.0.0.1:5000/api/timeslots?machineId=${editSelectedMachineId}&date=${editDate}`);
        const slots = Array.isArray(res.data?.slots) ? res.data.slots : [];
        setEditSlots(slots);
      } catch (err) {
        console.error("Lỗi khi tải slots:", err);
        setEditSlots([]);
      } finally {
        setSlotsLoading(false);
      }
    };
    fetchEditSlots();
  }, [editDate, editSelectedMachineId, showEditModal]);

  const handleEditVehicleTypeChange = async (newType) => {
    setEditVehicleType(newType);
    try {
      const servicesRes = await axios.get(`http://127.0.0.1:5000/api/timeslots/services?vehicleType=${newType}`);
      const servList = Array.isArray(servicesRes.data) ? servicesRes.data : [];
      setEditServices(servList);
      setEditSelectedMainService(null);
      setEditSelectedAddons([]);

      const machinesRes = await axios.get(`http://127.0.0.1:5000/api/timeslots/machines?type=${newType}`);
      const machList = Array.isArray(machinesRes.data) ? machinesRes.data : [];
      const activeMachines = machList.filter(m => m.status !== "Maintenance" && m.status !== "Under Maintenance");
      setEditMachines(activeMachines);
      setEditSelectedMachineId(activeMachines.length > 0 ? activeMachines[0].machineId : "");
    } catch (err) {
      console.error("Lỗi tải thông tin khi đổi loại xe:", err);
    }
  };

  const getEditPrices = () => {
    const mainPrice = editSelectedMainService ? editSelectedMainService.basePrice : 0;
    const addonPrice = editSelectedAddons.reduce((sum, item) => sum + item.basePrice, 0);
    const totalPrice = mainPrice + addonPrice;
    return { totalPrice, finalPrice: totalPrice };
  };

  const handleSaveEditBooking = async () => {
    if (!editFullName || editFullName.trim() === "") {
      showToast("Vui lòng nhập họ tên", "error");
      return;
    }
    if (!editPhone || editPhone.trim() === "") {
      showToast("Vui lòng nhập số điện thoại", "error");
      return;
    }
    if (!editPlate || editPlate.trim() === "") {
      showToast("Vui lòng nhập biển số xe", "error");
      return;
    }
    if (!editSelectedMainService) {
      showToast("Vui lòng chọn dịch vụ chính", "error");
      return;
    }
    if (!editDate) {
      showToast("Vui lòng chọn ngày", "error");
      return;
    }
    if (!editTime) {
      showToast("Vui lòng chọn khung giờ", "error");
      return;
    }
    if (!editSelectedMachineId) {
      showToast("Vui lòng chọn máy/sàn rửa xe", "error");
      return;
    }

    setEditSaving(true);
    const token = localStorage.getItem("token") || "mock-token";
    const { totalPrice, finalPrice } = getEditPrices();
    
    const serviceIds = [
      editSelectedMainService.serviceId,
      ...editSelectedAddons.map(a => a.serviceId)
    ];

    try {
      await axios.put(
        `http://127.0.0.1:5000/api/bookings/admin/${selectedBooking.id}`,
        {
          fullName: editFullName,
          phone: editPhone,
          licensePlate: editPlate,
          vehicleType: editVehicleType,
          serviceIds,
          bookingDate: editDate,
          bookingTime: editTime,
          machineId: editSelectedMachineId,
          totalPrice,
          finalPrice
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      showToast("Cập nhật đơn đặt lịch thành công!", "success");
      setShowEditModal(false);
      
      fetchData();
      
      const histRes = await axios.get(`http://127.0.0.1:5000/api/bookings/${selectedBooking.id}/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBookingHistory(histRes.data || []);
      
      const freshBookingRes = await axios.get(`http://127.0.0.1:5000/api/bookings/${selectedBooking.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const freshB = freshBookingRes.data;
      
      const dObj = new Date(freshB.BookingDate);
      const dStr = dObj.toLocaleDateString("en-CA");
      const tStr = dObj.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
      
      setSelectedBooking(prev => ({
        ...prev,
        customerName: freshB.CustomerName || editFullName,
        phone: freshB.Phone || editPhone,
        licensePlate: freshB.LicensePlate || editPlate,
        vehicleType: freshB.VehicleType === "BIKE" ? "Xe máy" : "Ô tô",
        date: dStr,
        time: tStr,
        price: Number(freshB.FinalPrice || freshB.TotalPrice),
        totalPrice: Number(freshB.TotalPrice),
        machineId: freshB.MachineID,
        machineName: editMachines.find(m => m.machineId === freshB.MachineID)?.name || prev.machineName,
        servicePackage: [editSelectedMainService.serviceName, ...editSelectedAddons.map(a => a.serviceName)].join(", ")
      }));
    } catch (err) {
      console.error("Lỗi khi cập nhật đơn hàng:", err);
      showToast(err.response?.data?.message || "Không thể cập nhật đơn đặt lịch", "error");
    } finally {
      setEditSaving(false);
    }
  };

  const getStatusPill = (status) => {
    switch (status) {
      case 1:
        return (
          <span className="status-pill status-pending">
            <i className="fa-regular fa-clock"></i> Chờ duyệt
          </span>
        );
      case 2:
        return (
          <span className="status-pill status-confirmed">
            <i className="fa-solid fa-check"></i> Đã xác nhận
          </span>
        );
      case 3:
        return (
          <span className="status-pill status-inservice">
            <i className="fa-solid fa-arrows-spin fa-spin"></i> Đang rửa
          </span>
        );
      case 4:
        return (
          <span className="status-pill status-completed">
            <i className="fa-regular fa-circle-check"></i> Hoàn thành
          </span>
        );
      case 5:
        return (
          <span className="status-pill status-cancelled">
            <i className="fa-regular fa-circle-xmark"></i> Đã hủy
          </span>
        );
      default:
        return <span className="status-pill">{status}</span>;
    }
  };

  const getVehicleIcon = (type) => {
    switch (type?.toLowerCase()) {
      case "xe máy":
      case "motorcycle":
      case "bike":
        return <i className="fa-solid fa-motorcycle"></i>;
      default:
        return <i className="fa-solid fa-car"></i>;
    }
  };

  return (
    <div className="admin-dashboard-container portal-layout-container">
      <Sidebar />
      <main className="admin-main-content portal-main-content">
        <header className="admin-header">
          <div className="admin-header-title">
            <h1>Tổng Quan Quản Trị</h1>
            <p>Hệ thống Smart Car Wash System điều phối thời gian thực</p>
          </div>
          <div className="admin-header-actions">
            <div
              className="admin-user-profile"
              style={{ cursor: "pointer" }}
              onClick={() => (window.location.href = "/profile")}
            >
              <div className="admin-avatar">
                {currentUser?.fullName
                  ? currentUser.fullName.substring(0, 2).toUpperCase()
                  : "AD"}
              </div>
              <div className="admin-user-info">
                <span>{currentUser?.fullName || "Quản trị viên"}</span>
                <small>Role: Admin</small>
              </div>
            </div>
          </div>
        </header>

        <section className="admin-metrics-grid">
          <div className="admin-metric-card metric-total">
            <div className="admin-metric-info">
              <h3>Tổng số lượng</h3>
              <p className="admin-metric-value">{stats.total}</p>
            </div>
            <div className="admin-metric-icon">
              <i className="fa-solid fa-list-check"></i>
            </div>
          </div>
          <div className="admin-metric-card metric-active">
            <div className="admin-metric-info">
              <h3>Đang làm dịch vụ</h3>
              <p className="admin-metric-value">{stats.active}</p>
            </div>
            <div className="admin-metric-icon">
              <i className="fa-solid fa-arrows-spin"></i>
            </div>
          </div>
          <div className="admin-metric-card metric-completed">
            <div className="admin-metric-info">
              <h3>Hoàn thành</h3>
              <p className="admin-metric-value">{stats.completed}</p>
            </div>
            <div className="admin-metric-icon">
              <i className="fa-regular fa-circle-check"></i>
            </div>
          </div>
          <div className="admin-metric-card metric-cancelled">
            <div className="admin-metric-info">
              <h3>Đã hủy</h3>
              <p className="admin-metric-value">{stats.cancelled}</p>
            </div>
            <div className="admin-metric-icon">
              <i className="fa-regular fa-circle-xmark"></i>
            </div>
          </div>
        </section>

        {/* BỘ LỌC TÌM KIẾM DÀNH CHO ADMIN */}
        <section
          className="admin-filter-toolbar"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "12px",
            background: "var(--bg-card)",
            padding: "16px",
            borderRadius: "16px",
            border: "1px solid var(--border)",
            marginBottom: "24px",
          }}
        >
          <div
            className="filter-item"
            style={{ flex: 2, minWidth: "220px", position: "relative" }}
          >
            <i
              className="fa-solid fa-magnifying-glass"
              style={{
                position: "absolute",
                left: "14px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-secondary)",
              }}
            ></i>
            <input
              type="text"
              placeholder="Tìm tên khách, SĐT, biển số..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              style={{
                width: "100%",
                height: "42px",
                paddingLeft: "40px",
                borderRadius: "10px",
                border: "1px solid var(--border)",
                background: "var(--bg-primary)",
                color: "var(--text-primary)",
                outline: "none",
              }}
            />
          </div>
          <div className="filter-item" style={{ flex: 1, minWidth: "150px" }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                width: "100%",
                height: "42px",
                padding: "0 16px",
                borderRadius: "10px",
                border: "1px solid var(--border)",
                background: "var(--bg-primary)",
                color: "var(--text-primary)",
                outline: "none",
              }}
            >
              <option value="All">Trạng thái: Tất cả</option>
              <option value="2">Đã xác nhận</option>
              <option value="3">Đang làm dịch vụ</option>
              <option value="4">Hoàn thành</option>
              <option value="5">Đã hủy</option>
            </select>
          </div>
          <div className="filter-item" style={{ flex: 1, minWidth: "150px" }}>
            <select
              value={vehicleFilter}
              onChange={(e) => setVehicleFilter(e.target.value)}
              style={{
                width: "100%",
                height: "42px",
                padding: "0 16px",
                borderRadius: "10px",
                border: "1px solid var(--border)",
                background: "var(--bg-primary)",
                color: "var(--text-primary)",
                outline: "none",
              }}
            >
              <option value="All">Loại xe: Tất cả</option>
              <option value="CAR">Ô tô</option>
              <option value="BIKE">Xe máy</option>
            </select>
          </div>
          <div className="filter-item" style={{ flex: 1, minWidth: "150px" }}>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              style={{
                width: "100%",
                height: "42px",
                padding: "0 16px",
                borderRadius: "10px",
                border: "1px solid var(--border)",
                background: "var(--bg-primary)",
                color: "var(--text-primary)",
                outline: "none",
              }}
            />
          </div>
          <button
            onClick={handleResetFilters}
            style={{
              height: "42px",
              padding: "0 20px",
              borderRadius: "10px",
              background: "var(--bg-primary)",
              color: "var(--text-primary)",
              border: "1px solid var(--border)",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            <i className="fa-solid fa-rotate-left"></i> Đặt lại
          </button>
        </section>

        <section className="admin-table-card">
          <div className="admin-table-header">
            <h2>Danh Sách Lịch Đặt Xe</h2>
            <button className="refresh-btn" title="Làm mới" onClick={fetchData}>
              <i className="fa-solid fa-rotate-right"></i>
            </button>
          </div>

          {loading ? (
            <div className="admin-loading-spinner">
              <div className="spinner"></div>
              <span>Đang tải danh sách đặt lịch...</span>
            </div>
          ) : bookings.length === 0 ? (
            <div className="admin-empty-state">
              <i className="fa-regular fa-folder-open"></i>
              <p>Không tìm thấy bản ghi đặt lịch nào khớp với bộ lọc.</p>
            </div>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Khách Hàng</th>
                    <th>Phương Tiện</th>
                    <th>Dịch Vụ</th>
                    <th>Thời Gian</th>
                    <th>Giá Cả</th>
                    <th>Trạng Thái</th>
                    <th>Hành Động</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b.id}>
                      <td>
                        <div className="customer-cell-info">
                          <span className="customer-name">
                            {b.customerName}
                          </span>
                          <span className="customer-phone">{b.phone}</span>
                        </div>
                      </td>
                      <td>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <span
                            style={{
                              color: "var(--color-accent)",
                              fontSize: "16px",
                            }}
                          >
                            {getVehicleIcon(b.vehicleType)}
                          </span>
                          <div>
                            <span className="vehicle-badge">
                              {b.licensePlate}
                            </span>
                            <span className="vehicle-type-label">
                              {b.vehicleType}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div>{b.servicePackage}</div>
                        <div
                          style={{
                            marginTop: 4,
                            fontSize: 11,
                            color: "var(--text-secondary)",
                          }}
                        >
                          <i className="fa-solid fa-gears"></i>{" "}
                          {b.machineName || "Chưa gán máy/sàn"}
                        </div>
                      </td>
                      <td>
                        <div
                          style={{ display: "flex", flexDirection: "column" }}
                        >
                          <span style={{ fontWeight: 600 }}>{b.time}</span>
                          <span
                            style={{
                              fontSize: "12px",
                              color: "var(--text-secondary)",
                            }}
                          >
                            {b.date}
                          </span>
                        </div>
                      </td>
                      <td style={{ fontWeight: 700, color: "#fff" }}>
                        <div>{b.price?.toLocaleString("vi-VN")} đ</div>
                        {(() => {
                          const paid =
                            b.paidAmount !== undefined
                              ? b.paidAmount
                              : b.PaidAmount || 0;
                          const price = b.price || 0;
                          if (Number(b.status) === 4)
                            return (
                              <div
                                style={{
                                  fontSize: "11px",
                                  color: "#10b981",
                                  marginTop: "4px",
                                  fontWeight: "normal",
                                }}
                              >
                                <i className="fa-solid fa-circle-check"></i> Đã
                                thu đủ
                              </div>
                            );
                          if (Number(b.status) === 5) return null;
                          if (paid > 0) {
                            if (paid >= price)
                              return (
                                <div
                                  style={{
                                    fontSize: "11px",
                                    color: "#10b981",
                                    marginTop: "4px",
                                    fontWeight: "normal",
                                  }}
                                >
                                  <i className="fa-solid fa-credit-card"></i> Đã
                                  trả đủ (Online)
                                </div>
                              );
                            return (
                              <div
                                style={{
                                  fontSize: "11px",
                                  color: "#f59e0b",
                                  marginTop: "4px",
                                  fontWeight: "normal",
                                  lineHeight: "1.3",
                                }}
                              >
                                <span
                                  style={{
                                    display: "block",
                                    fontSize: "10px",
                                    color: "#9ca3af",
                                  }}
                                >
                                  Đã cọc: {paid.toLocaleString("vi-VN")}đ
                                </span>
                                <span
                                  style={{
                                    display: "block",
                                    fontWeight: "bold",
                                  }}
                                >
                                  Còn lại:{" "}
                                  {(price - paid).toLocaleString("vi-VN")}đ
                                </span>
                              </div>
                            );
                          }
                          return (
                            <div
                              style={{
                                fontSize: "11px",
                                color: "#9ca3af",
                                marginTop: "4px",
                                fontWeight: "normal",
                              }}
                            >
                              Thu sau tại quầy
                            </div>
                          );
                        })()}
                      </td>
                      <td>{getStatusPill(b.status)}</td>
                      <td>
                        <div className="table-actions">
                          {b.status === 2 && (
                            <>
                              <button
                                className="action-icon-btn btn-wash"
                                title="Bắt đầu rửa"
                                onClick={() => handleStatusUpdate(b.id, 3)}
                              >
                                <i className="fa-solid fa-soap"></i>
                              </button>
                              <button
                                className="action-icon-btn btn-cancel"
                                title="Hủy bỏ"
                                onClick={() => handleStatusUpdate(b.id, 5)}
                              >
                                <i className="fa-solid fa-xmark"></i>
                              </button>
                            </>
                          )}
                          {b.status === 3 && (
                            <button
                              className="action-icon-btn btn-complete"
                              title="Hoàn thành rửa"
                              onClick={() => handleStatusUpdate(b.id, 4)}
                            >
                              <i className="fa-solid fa-circle-check"></i>
                            </button>
                          )}
                          {(b.status === 4 || b.status === 5) && (
                            <button
                              className="action-icon-btn btn-cancel"
                              title="Xóa lịch đặt"
                              onClick={() => handleDeleteBooking(b.id)}
                            >
                              <i className="fa-regular fa-trash-can"></i>
                            </button>
                          )}
                          <button
                            className="action-icon-btn btn-details"
                            title="Chi tiết"
                            onClick={() => handleViewDetails(b)}
                          >
                            <i className="fa-solid fa-circle-info"></i>
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
      </main>

      {selectedBooking && (
        <div
          className="admin-modal-overlay"
          onClick={() => setSelectedBooking(null)}
        >
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3>Chi Tiết Lịch Đặt Xe #{selectedBooking.id}</h3>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <button
                  onClick={handleOpenEditModal}
                  style={{
                    background: "#3b82f6",
                    border: "none",
                    color: "#fff",
                    padding: "6px 12px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "13px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    fontWeight: "600"
                  }}
                >
                  <i className="fa-solid fa-pen-to-square"></i>
                  Sửa Đơn
                </button>
                <button
                  className="close-modal-btn"
                  onClick={() => setSelectedBooking(null)}
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>
            </div>
            <div className="admin-modal-body">
              {/* Modal Body Content (Omitted unchanged HTML structure for brevity, keeps existing design) */}
              <div className="modal-timeline">
                <div
                  className={`timeline-step ${selectedBooking.status >= 2 ? (selectedBooking.status === 5 ? "" : "completed") : ""} ${selectedBooking.status === 2 ? "active" : ""}`}
                >
                  <div className="timeline-node">1</div>
                  <div className="timeline-label">Xác nhận</div>
                </div>
                <div
                  className={`timeline-step ${selectedBooking.status >= 3 ? (selectedBooking.status === 5 ? "" : "completed") : ""} ${selectedBooking.status === 3 ? "active" : ""}`}
                >
                  <div className="timeline-node">2</div>
                  <div className="timeline-label">Đang rửa</div>
                </div>
                <div
                  className={`timeline-step ${selectedBooking.status === 4 ? "completed active" : ""} ${selectedBooking.status === 5 ? "active" : ""}`}
                >
                  <div
                    className="timeline-node"
                    style={{
                      backgroundColor:
                        selectedBooking.status === 5
                          ? "var(--color-danger)"
                          : "",
                    }}
                  >
                    {selectedBooking.status === 5 ? (
                      <i className="fa-solid fa-xmark"></i>
                    ) : (
                      "3"
                    )}
                  </div>
                  <div className="timeline-label">
                    {selectedBooking.status === 5 ? "Đã hủy" : "Hoàn thành"}
                  </div>
                </div>
              </div>
              <hr
                style={{
                  border: "none",
                  borderTop: "1px solid var(--border-color)",
                  margin: "24px 0",
                }}
              />
              <div className="modal-section">
                <h4 className="modal-section-title">Thông tin khách hàng</h4>
                <div className="modal-grid">
                  <div className="modal-field">
                    <label>Họ và tên</label>
                    <span>{selectedBooking.customerName}</span>
                  </div>
                  <div className="modal-field">
                    <label>Số điện thoại</label>
                    <span>{selectedBooking.phone}</span>
                  </div>
                </div>
              </div>
              <div className="modal-section">
                <h4 className="modal-section-title">Thông tin dịch vụ</h4>
                <div className="modal-grid">
                  <div className="modal-field">
                    <label>Biển số xe</label>
                    {isEditingPlate ? (
                      <div style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "4px" }}>
                        <input
                          type="text"
                          value={tempPlate}
                          onChange={(e) => setTempPlate(e.target.value.toUpperCase())}
                          style={{
                            padding: "4px 8px",
                            borderRadius: "4px",
                            border: "1px solid var(--border)",
                            background: "var(--bg-secondary)",
                            color: "var(--text-primary)",
                            width: "110px",
                            fontWeight: "700",
                            fontSize: "13px"
                          }}
                        />
                        <button
                          onClick={handleSavePlate}
                          disabled={savingPlate}
                          style={{
                            padding: "4px 8px",
                            borderRadius: "4px",
                            border: "none",
                            background: "#22c55e",
                            color: "#fff",
                            cursor: "pointer",
                            fontSize: "12px"
                          }}
                          title="Lưu"
                        >
                          {savingPlate ? "..." : <i className="fa-solid fa-check"></i>}
                        </button>
                        <button
                          onClick={() => setIsEditingPlate(false)}
                          style={{
                            padding: "4px 8px",
                            borderRadius: "4px",
                            border: "none",
                            background: "#ef4444",
                            color: "#fff",
                            cursor: "pointer",
                            fontSize: "12px"
                          }}
                          title="Hủy"
                        >
                          <i className="fa-solid fa-xmark"></i>
                        </button>
                      </div>
                    ) : (
                      <span className="vehicle-badge" style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                        {selectedBooking.licensePlate}
                        <button
                          onClick={() => {
                            setTempPlate(selectedBooking.licensePlate);
                            setIsEditingPlate(true);
                          }}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "#3b82f6",
                            cursor: "pointer",
                            fontSize: "12px",
                            padding: "0",
                            display: "inline-flex",
                            alignItems: "center"
                          }}
                          title="Sửa biển số"
                        >
                          <i className="fa-solid fa-pen" style={{ fontSize: "11px" }}></i>
                        </button>
                      </span>
                    )}
                  </div>
                  <div className="modal-field">
                    <label>Loại xe</label>
                    <span>{selectedBooking.vehicleType}</span>
                  </div>
                  <div className="modal-field" style={{ gridColumn: "span 2" }}>
                    <label>Gói dịch vụ rửa xe</label>
                    <span>{selectedBooking.servicePackage}</span>
                  </div>
                  <div className="modal-field" style={{ gridColumn: "span 2" }}>
                    <label>Máy / sàn đã chọn</label>
                    <span>
                      <i className="fa-solid fa-gears"></i>{" "}
                      {selectedBooking.machineName || "Chưa gán máy/sàn"}
                    </span>
                  </div>
                  <div className="modal-field">
                    <label>Thời gian đặt lịch</label>
                    <span>
                      {selectedBooking.time} ({selectedBooking.date})
                    </span>
                  </div>
                  <div className="modal-field">
                    <label>Giá dịch vụ gốc</label>
                    <span>
                      {(
                        selectedBooking.totalPrice ||
                        selectedBooking.price ||
                        0
                      ).toLocaleString("vi-VN")}{" "}
                      đ
                    </span>
                  </div>
                  <div className="modal-field">
                    <label>Tổng thanh toán</label>
                    <span
                      style={{
                        color: "var(--color-success)",
                        fontWeight: "bold",
                      }}
                    >
                      {selectedBooking.price?.toLocaleString("vi-VN")} đ
                    </span>
                  </div>
                </div>
              </div>

              <div className="modal-section" style={{ marginTop: "24px", borderTop: "1px dashed rgba(255,255,255,0.1)", paddingTop: "20px" }}>
                <h4 className="modal-section-title" style={{ marginBottom: "16px" }}>
                  <i className="fa-solid fa-clock-rotate-left"></i> Lịch sử hoạt động đơn
                </h4>
                {historyLoading ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-secondary)", fontSize: "13px" }}>
                    <i className="fa-solid fa-circle-notch fa-spin"></i> Đang tải lịch sử...
                  </div>
                ) : bookingHistory.length === 0 ? (
                  <p style={{ color: "var(--text-secondary)", fontSize: "13px", margin: "4px 0 0 0" }}>Chưa ghi nhận lịch sử nào.</p>
                ) : (
                  <div className="booking-timeline">
                    {bookingHistory.map((item, idx) => (
                      <div key={item.HistoryID} className="timeline-step">
                        <div className="timeline-marker">
                          <div className="timeline-circle"></div>
                          {idx < bookingHistory.length - 1 && <div className="timeline-line"></div>}
                        </div>
                        <div className="timeline-info">
                          <div className="timeline-time">
                            {new Date(item.CreatedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}{' - '}
                            {new Date(item.CreatedAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </div>
                          <div className="timeline-desc">{item.Description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div
          className="admin-modal-overlay"
          style={{ zIndex: 1050, display: "flex", justifyContent: "center", alignItems: "center", position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)" }}
          onClick={() => setShowEditModal(false)}
        >
          <div
            className="admin-modal"
            style={{ maxWidth: "600px", width: "90%", background: "var(--bg-primary)", borderRadius: "12px", border: "1px solid var(--border)", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.3)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-modal-header" style={{ borderBottom: "1px solid var(--border)", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700" }}>Chỉnh Sửa Lịch Đặt #{selectedBooking.id}</h3>
              <button
                className="close-modal-btn"
                onClick={() => setShowEditModal(false)}
                style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: "16px" }}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="admin-modal-body" style={{ maxHeight: "75vh", overflowY: "auto", padding: "20px" }}>
              <div className="modal-section" style={{ marginBottom: "20px" }}>
                <h4 className="modal-section-title" style={{ fontSize: "14px", fontWeight: "600", color: "#3b82f6", borderBottom: "1px dashed var(--border)", paddingBottom: "6px", marginBottom: "12px" }}>Thông tin khách hàng</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div className="modal-field">
                    <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>Họ và tên</label>
                    <input
                      type="text"
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: "6px",
                        border: "1px solid var(--border)",
                        background: "var(--bg-secondary)",
                        color: "var(--text-primary)",
                        fontSize: "14px"
                      }}
                    />
                  </div>
                  <div className="modal-field">
                    <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>Số điện thoại</label>
                    <input
                      type="text"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: "6px",
                        border: "1px solid var(--border)",
                        background: "var(--bg-secondary)",
                        color: "var(--text-primary)",
                        fontSize: "14px"
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-section" style={{ marginBottom: "20px" }}>
                <h4 className="modal-section-title" style={{ fontSize: "14px", fontWeight: "600", color: "#3b82f6", borderBottom: "1px dashed var(--border)", paddingBottom: "6px", marginBottom: "12px" }}>Thông tin xe</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div className="modal-field">
                    <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>Biển số xe</label>
                    <input
                      type="text"
                      value={editPlate}
                      onChange={(e) => setEditPlate(e.target.value.toUpperCase())}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: "6px",
                        border: "1px solid var(--border)",
                        background: "var(--bg-secondary)",
                        color: "var(--text-primary)",
                        fontSize: "14px",
                        fontWeight: "700"
                      }}
                    />
                  </div>
                  <div className="modal-field">
                    <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>Loại xe</label>
                    <select
                      value={editVehicleType}
                      onChange={(e) => handleEditVehicleTypeChange(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: "6px",
                        border: "1px solid var(--border)",
                        background: "var(--bg-secondary)",
                        color: "var(--text-primary)",
                        fontSize: "14px"
                      }}
                    >
                      <option value="CAR">Ô tô</option>
                      <option value="BIKE">Xe máy</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-section" style={{ marginBottom: "20px" }}>
                <h4 className="modal-section-title" style={{ fontSize: "14px", fontWeight: "600", color: "#3b82f6", borderBottom: "1px dashed var(--border)", paddingBottom: "6px", marginBottom: "12px" }}>Dịch vụ</h4>
                <div className="modal-field" style={{ marginBottom: "12px" }}>
                  <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>Gói dịch vụ chính (Rửa hoặc Combo)</label>
                  <select
                    value={editSelectedMainService ? editSelectedMainService.serviceId : ""}
                    onChange={(e) => {
                      const selected = editServices.find(s => s.serviceId === Number(e.target.value));
                      setEditSelectedMainService(selected || null);
                      if (!selected) {
                        setEditSelectedAddons([]);
                      }
                    }}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid var(--border)",
                      background: "var(--bg-secondary)",
                      color: "var(--text-primary)",
                      fontSize: "14px"
                    }}
                  >
                    <option value="">-- Chọn dịch vụ --</option>
                    {editServices.filter(s => isCombo(s) || isBaseWash(s)).map(s => (
                      <option key={s.serviceId} value={s.serviceId}>
                        {s.serviceName} ({s.basePrice.toLocaleString("vi-VN")} đ)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="modal-field" style={{ marginBottom: "16px", opacity: editSelectedMainService ? 1 : 0.5 }}>
                  <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>
                    Dịch vụ chọn thêm (Add-ons) {!editSelectedMainService && "(Vui lòng chọn dịch vụ chính trước)"}
                  </label>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "10px",
                    marginTop: "6px",
                    background: "rgba(255,255,255,0.03)",
                    padding: "12px",
                    borderRadius: "6px",
                    border: "1px solid var(--border)",
                    pointerEvents: editSelectedMainService ? "auto" : "none"
                  }}>
                    {editServices.filter(s => isAddon(s)).map(s => {
                      const isChecked = editSelectedAddons.some(a => a.serviceId === s.serviceId);
                      return (
                        <label key={s.serviceId} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px" }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={!editSelectedMainService}
                            onChange={() => {
                              if (isChecked) {
                                setEditSelectedAddons(prev => prev.filter(a => a.serviceId !== s.serviceId));
                              } else {
                                setEditSelectedAddons(prev => [...prev, s]);
                              }
                            }}
                          />
                          <span>{s.serviceName} (+{s.basePrice.toLocaleString("vi-VN")}đ)</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="modal-section" style={{ marginBottom: "20px" }}>
                <h4 className="modal-section-title" style={{ fontSize: "14px", fontWeight: "600", color: "#3b82f6", borderBottom: "1px dashed var(--border)", paddingBottom: "6px", marginBottom: "12px" }}>Thời gian & Máy rửa</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                  <div className="modal-field">
                    <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>Ngày hẹn</label>
                    <input
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: "6px",
                        border: "1px solid var(--border)",
                        background: "var(--bg-secondary)",
                        color: "var(--text-primary)",
                        fontSize: "14px"
                      }}
                    />
                  </div>
                  <div className="modal-field">
                    <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>Máy / Sàn rửa xe</label>
                    <select
                      value={editSelectedMachineId}
                      onChange={(e) => setEditSelectedMachineId(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: "6px",
                        border: "1px solid var(--border)",
                        background: "var(--bg-secondary)",
                        color: "var(--text-primary)",
                        fontSize: "14px"
                      }}
                    >
                      {editMachines.map(m => (
                        <option key={m.machineId} value={m.machineId}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="modal-field">
                  <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>Chọn khung giờ</label>
                  {slotsLoading ? (
                    <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "6px" }}>
                      <i className="fa-solid fa-spinner fa-spin"></i> Đang kiểm tra khung giờ trống...
                    </div>
                  ) : (
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(4, 1fr)",
                      gap: "8px",
                      marginTop: "6px",
                      background: "rgba(255,255,255,0.03)",
                      padding: "12px",
                      borderRadius: "6px",
                      border: "1px solid var(--border)"
                    }}>
                      {[
                        "08:00", "08:30", "09:00", "09:30",
                        "10:00", "10:30", "11:00", "11:30",
                        "13:00", "13:30", "14:00", "14:30",
                        "15:00", "15:30", "16:00", "16:30",
                        "17:00"
                      ].map(t => {
                        const isOccupied = editSlots.includes(t);
                        const isCurrentSlot = t === editTime;
                        const isSelectable = !isOccupied || isCurrentSlot;
                        
                        return (
                          <button
                            key={t}
                            onClick={() => setEditTime(t)}
                            disabled={!isSelectable}
                            style={{
                              padding: "6px 4px",
                              borderRadius: "4px",
                              border: "1px solid",
                              borderColor: t === editTime ? "#3b82f6" : (isSelectable ? "rgba(255,255,255,0.15)" : "transparent"),
                              background: t === editTime ? "rgba(59, 130, 246, 0.2)" : (isSelectable ? "transparent" : "rgba(255,255,255,0.03)"),
                              color: t === editTime ? "#3b82f6" : (isSelectable ? "var(--text-primary)" : "rgba(255,255,255,0.2)"),
                              cursor: isSelectable ? "pointer" : "not-allowed",
                              fontSize: "12px",
                              fontWeight: t === editTime ? "700" : "normal"
                            }}
                          >
                            {t} {!isSelectable && "(Đầy)"}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-section" style={{
                background: "rgba(34, 197, 94, 0.05)",
                border: "1px solid rgba(34, 197, 94, 0.2)",
                padding: "12px",
                borderRadius: "6px",
                marginTop: "20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
                <span style={{ fontSize: "14px", fontWeight: "600" }}>Tổng tiền thanh toán tính lại:</span>
                <span style={{ fontSize: "18px", fontWeight: "700", color: "#22c55e" }}>
                  {getEditPrices().totalPrice.toLocaleString("vi-VN")} đ
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px", borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
                <button
                  onClick={() => setShowEditModal(false)}
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    border: "none",
                    color: "var(--text-primary)",
                    padding: "8px 16px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "14px"
                  }}
                >
                  Hủy
                </button>
                <button
                  onClick={handleSaveEditBooking}
                  disabled={editSaving}
                  style={{
                    background: "#22c55e",
                    border: "none",
                    color: "#fff",
                    padding: "8px 16px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "600",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px"
                  }}
                >
                  {editSaving ? "Đang lưu..." : "Lưu Thay Đổi"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          className={`admin-toast ${toast.type === "error" ? "toast-error" : "toast-success"}`}
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
    </div>
  );
}
