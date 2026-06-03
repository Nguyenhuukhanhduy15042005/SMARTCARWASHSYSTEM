// ============================================================
// 📁 VỊ TRÍ FILE:
//    Front-end/src/pages/timeslot/TimeslotValidation.jsx
//    (Tạo folder timeslot/ trong pages/ nếu chưa có)
//
// 📌 THÊM VÀO Front-end/src/App.jsx:
//    import TimeslotValidation from "./pages/timeslot/TimeslotValidation";
//    <Route path="/timeslots" element={
//      <ProtectedRoute><TimeslotValidation /></ProtectedRoute>
//    } />
//
// 📌 THÊM VÀO Back-end/server.js:
//    const { timeslotRouter } = require('./timeslotRouter');
//    app.use(timeslotRouter);
// ============================================================

import { useState, useEffect, useCallback } from "react";

const API_BASE = "http://localhost:5000";

const TIME_SLOTS = [
  "08:00","08:30","09:00","09:30","10:00","10:30",
  "11:00","11:30","12:00","12:30","13:00","13:30",
  "14:00","14:30","15:00","15:30","16:00","16:30","17:00",
];

const DURATIONS = [
  // Database hiện tại chưa có cột Duration trong SERVICE/BOOKING_DETAIL.
  // Để bám sát DB và tránh lưu sai, mỗi booking chiếm 1 slot 30 phút.
  { label: "30 phút", value: 30 },
];

const STATUS_COLORS = {
  Available:   { bg: "#1a3a2a", border: "#166534", color: "#4ade80", dot: "#4ade80" },
  Operating:   { bg: "#1a2d4a", border: "#1d4ed8", color: "#60a5fa", dot: "#60a5fa" },
  Maintenance: { bg: "#2a1f0a", border: "#92400e", color: "#fbbf24", dot: "#fbbf24" },
};

export default function TimeslotValidation() {
  const today = new Date().toISOString().split("T")[0];

  // ── State ──────────────────────────────────────────────────
  const [machines, setMachines]               = useState([]);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [selectedDate, setSelectedDate]       = useState(today);
  const [selectedDuration, setSelectedDuration] = useState(30);
  const [selectedTime, setSelectedTime]       = useState(null);
  const [slots, setSlots]                     = useState([]);
  const [overview, setOverview]               = useState([]);
  const [filterType, setFilterType]           = useState("ALL");
  const [loadingMachines, setLoadingMachines] = useState(false);
  const [loadingSlots, setLoadingSlots]       = useState(false);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [checkingSlot, setCheckingSlot]       = useState(null);
  const [hoveredSlot, setHoveredSlot]         = useState(null);
  const [toast, setToast]                     = useState(null);

  // Step 2: form điền thông tin sau khi chọn slot
  const [bookingStep, setBookingStep] = useState(null); // null | { machine, date, time, duration }
  const [bookingForm, setBookingForm] = useState({ customerName: "", customerPhone: "", vehicleType: "CAR", licensePlate: "", serviceId: "" });
  const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [successBooking, setSuccessBooking] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Fetch machines ─────────────────────────────────────────
  const fetchMachines = useCallback(async () => {
    setLoadingMachines(true);
    try {
      const typeParam = filterType !== "ALL" ? `?type=${filterType}` : "";
      const res  = await fetch(`${API_BASE}/api/timeslots/machines${typeParam}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMachines(data);
    } catch {
      showToast("Không thể tải danh sách máy!", "error");
    } finally {
      setLoadingMachines(false);
    }
  }, [filterType]);

  useEffect(() => {
    fetchMachines();
    setSelectedMachine(null);
    setSlots([]);
  }, [fetchMachines]);

  // ── Fetch services theo loại xe từ DB SERVICE ─────────────
  const fetchServices = useCallback(async (vehicleType) => {
    setLoadingServices(true);
    try {
      const res = await fetch(`${API_BASE}/api/timeslots/services?vehicleType=${vehicleType}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setServices(data);
      setBookingForm(prev => ({ ...prev, serviceId: data[0]?.serviceId ? String(data[0].serviceId) : "" }));
    } catch {
      setServices([]);
      setBookingForm(prev => ({ ...prev, serviceId: "" }));
      showToast("Không thể tải dịch vụ từ database!", "error");
    } finally {
      setLoadingServices(false);
    }
  }, []);

  useEffect(() => {
    fetchServices(bookingForm.vehicleType);
  }, [bookingForm.vehicleType, fetchServices]);

  // ── Fetch slots ────────────────────────────────────────────
  const fetchSlots = useCallback(async () => {
    if (!selectedMachine || !selectedDate) return;
    setLoadingSlots(true);
    setSelectedTime(null);
    try {
      const res  = await fetch(`${API_BASE}/api/timeslots?machineId=${selectedMachine.id}&date=${selectedDate}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSlots(data.slots || []);
    } catch {
      showToast("Không thể tải timeslot!", "error");
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, [selectedMachine, selectedDate]);

  useEffect(() => { fetchSlots(); }, [fetchSlots]);

  // ── Fetch overview ─────────────────────────────────────────
  const fetchOverview = useCallback(async () => {
    if (!selectedDate) return;
    setLoadingOverview(true);
    try {
      const typeParam = filterType !== "ALL" ? `&type=${filterType}` : "";
      const res  = await fetch(`${API_BASE}/api/timeslots/overview?date=${selectedDate}${typeParam}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setOverview(data.overview || []);
    } catch {
      setOverview([]);
    } finally {
      setLoadingOverview(false);
    }
  }, [selectedDate, filterType]);

  useEffect(() => { fetchOverview(); }, [fetchOverview]);

  // ── Click slot → check conflict → mở form booking ─────────
  const handleSlotClick = async (slotData) => {
    if (slotData.status === "booked") return;
    if (!selectedMachine) { showToast("Chọn máy trước!", "error"); return; }
    if (selectedMachine.status === "Maintenance") { showToast("Máy đang bảo trì!", "error"); return; }

    setCheckingSlot(slotData.time);
    try {
      const res = await fetch(`${API_BASE}/api/timeslots/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          machineId: selectedMachine.id,
          date:      selectedDate,
          time:      slotData.time,
          duration:  selectedDuration,
        }),
      });
      const data = await res.json();
      if (!data.available) {
        showToast(`Trùng lịch với booking lúc ${data.conflictSlot}!`, "error");
        return;
      }
      // Slot hợp lệ → mở form booking
      setSelectedTime(slotData.time);
      setBookingStep({ machine: selectedMachine, date: selectedDate, time: slotData.time, duration: selectedDuration });
      setBookingForm({ customerName: "", customerPhone: "", vehicleType: selectedMachine.type === "BIKE" ? "BIKE" : "CAR", licensePlate: "", serviceId: "" });
    } catch {
      showToast("Lỗi kiểm tra slot, thử lại!", "error");
    } finally {
      setCheckingSlot(null);
    }
  };

  // ── Confirm booking → POST /api/timeslots/book ─────────────
  const handleConfirmBooking = async () => {
    const { customerName, customerPhone, vehicleType, licensePlate, serviceId } = bookingForm;
    if (!customerName || !customerPhone || !vehicleType || !serviceId) {
      showToast("Vui lòng điền đầy đủ thông tin!", "error");
      return;
    }


    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/timeslots/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          customerPhone,
          vehicleType,
          serviceId: parseInt(serviceId),
          date: bookingStep.date,
          time: bookingStep.time,
          duration: bookingStep.duration,
          licensePlate,
          machineId: parseInt(bookingStep.machine.id),
        }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.message || "Lỗi tạo booking!", "error"); return; }

      setSuccessBooking(data);
      setBookingStep(null);
      setSelectedTime(null);
      fetchSlots();
      fetchOverview();
    } catch {
      showToast("Lỗi kết nối server!", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const bookedCount = slots.filter(s => s.status === "booked").length;
  const freeCount   = slots.filter(s => s.status === "free").length;

  return (
    <div style={s.root}>
      <div style={s.bg} /><div style={s.bgGrid} />

      {/* Toast */}
      {toast && (
        <div style={{ ...s.toast, background: toast.type === "error" ? "#ef4444" : "#10b981" }}>
          {toast.msg}
        </div>
      )}

      {/* Success Modal */}
      {successBooking && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={{ fontSize: 48, textAlign: "center", marginBottom: 12 }}>🎉</div>
            <h3 style={s.modalTitle}>Đặt lịch thành công!</h3>
            <div style={s.modalInfo}>
              {[
                ["Mã booking",    successBooking.id],
                ["Khách hàng",    successBooking.customerName],
                ["SĐT",           successBooking.customerPhone],
                ["Loại xe",       successBooking.vehicleType],
                ["Dịch vụ",       successBooking.servicePackage],
                ["Giá",           `${successBooking.price?.toLocaleString("vi-VN")}đ`],
                ["Giờ hẹn",       new Date(successBooking.scheduledTime).toLocaleString("vi-VN")],
                ["Trạng thái",    successBooking.status],
              ].map(([k, v]) => (
                <div key={k} style={s.modalRow}>
                  <span style={s.modalKey}>{k}</span>
                  <span style={s.modalVal}>{v}</span>
                </div>
              ))}
            </div>
            <button style={{ ...s.confirmBtn, width: "100%" }}
              onClick={() => setSuccessBooking(null)}>
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* Booking Form Modal */}
      {bookingStep && (
        <div style={s.overlay}>
          <div style={{ ...s.modal, maxWidth: 480 }}>
            <h3 style={s.modalTitle}>📋 Điền thông tin đặt lịch</h3>

            {/* Slot summary */}
            <div style={s.modalInfo}>
              {[
                ["Máy",       `${bookingStep.machine.name}`],
                ["Ngày",      bookingStep.date],
                ["Giờ",       bookingStep.time],
                ["Thời lượng", DURATIONS.find(d => d.value === bookingStep.duration)?.label],
              ].map(([k, v]) => (
                <div key={k} style={s.modalRow}>
                  <span style={s.modalKey}>{k}</span>
                  <span style={{ ...s.modalVal, color: "#60a5fa" }}>{v}</span>
                </div>
              ))}
            </div>

            {/* Form fields */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
              {[
                { label: "Tên khách hàng *", key: "customerName", placeholder: "Nguyễn Văn A" },
                { label: "Số điện thoại *",  key: "customerPhone", placeholder: "0901234567" },
                { label: "Biển số xe",        key: "licensePlate",  placeholder: "59A-12345 (tuỳ chọn)" },
              ].map(({ label, key, placeholder }) => (
                <div key={key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={s.flabel}>{label}</label>
                  <input style={s.finput} placeholder={placeholder}
                    value={bookingForm[key]}
                    onChange={e => setBookingForm({ ...bookingForm, [key]: e.target.value })} />
                </div>
              ))}
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={s.flabel}>Loại xe *</label>
                <select style={s.finput} value={bookingForm.vehicleType}
                  onChange={e => setBookingForm({ ...bookingForm, vehicleType: e.target.value, serviceId: "" })}>
                  <option value="CAR">🚗 Ô tô</option>
                  <option value="BIKE">🏍️ Xe máy</option>
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={s.flabel}>Dịch vụ từ DB SERVICE *</label>
                <select style={s.finput} value={bookingForm.serviceId}
                  onChange={e => setBookingForm({ ...bookingForm, serviceId: e.target.value })}>
                  {loadingServices && <option value="">Đang tải dịch vụ...</option>}
                  {!loadingServices && services.length === 0 && <option value="">Không có dịch vụ phù hợp</option>}
                  {services.map(sv => (
                    <option key={sv.serviceId} value={sv.serviceId}>
                      {sv.serviceName} - {Number(sv.basePrice).toLocaleString("vi-VN")}đ
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ background: "#0f172a", borderRadius: 8, padding: "10px 14px", display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b", fontSize: 13 }}>Giá</span>
                <span style={{ color: "#4ade80", fontSize: 15, fontWeight: 800 }}>
                  {(services.find(sv => String(sv.serviceId) === String(bookingForm.serviceId))?.basePrice || 0).toLocaleString("vi-VN")}đ
                </span>
              </div>
            </div>

            <div style={s.modalActions}>
              <button style={s.cancelBtn}
                onClick={() => { setBookingStep(null); setSelectedTime(null); }}>
                Huỷ
              </button>
              <button style={{ ...s.confirmBtn, opacity: submitting ? 0.7 : 1 }}
                onClick={handleConfirmBooking} disabled={submitting}>
                {submitting ? "Đang đặt..." : "✅ Xác nhận đặt lịch"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={s.wrapper}>
        {/* Header */}
        <div style={s.header}>
          <div>
            <div style={s.badge}>⏱️ Dynamic Slot Validation</div>
            <h1 style={s.title}>Timeslot Validation</h1>
            <p style={s.subtitle}>Kiểm tra slot trống theo máy & ngày — chặn booking trùng realtime</p>
          </div>
          <button style={s.refreshBtn} onClick={() => { fetchSlots(); fetchOverview(); }}>
            🔄 Làm mới
          </button>
        </div>

        <div style={s.layout}>
          {/* ── SIDEBAR ─────────────────────── */}
          <div style={s.sidebar}>

            {/* Ngày */}
            <div style={s.card}>
              <div style={s.cardTitle}>📅 Chọn ngày</div>
              <input type="date" style={s.dateInput} value={selectedDate} min={today}
                onChange={e => { setSelectedDate(e.target.value); setSelectedTime(null); }} />
            </div>

            {/* Filter loại */}
            <div style={s.card}>
              <div style={s.cardTitle}>🚗 Loại phương tiện</div>
              <div style={{ display: "flex", gap: 6 }}>
                {[["ALL","Tất cả"],["CAR","🚗 Ô tô"],["BIKE","🏍️ Xe máy"]].map(([k, label]) => (
                  <button key={k}
                    style={{ ...s.filterBtn, ...(filterType === k ? s.filterBtnActive : {}) }}
                    onClick={() => setFilterType(k)}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Máy */}
            <div style={s.card}>
              <div style={s.cardTitle}>
                🔧 Chọn máy
                {loadingMachines && <span style={s.loadingTxt}> đang tải...</span>}
              </div>
              {!loadingMachines && machines.length === 0 && (
                <div style={{ color: "#475569", fontSize: 13, textAlign: "center", padding: "12px 0" }}>
                  Không có máy nào
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {machines.map(m => {
                  const sc       = STATUS_COLORS[m.status] || STATUS_COLORS.Available;
                  const isActive = selectedMachine?.id === m.id;
                  const isMaint  = m.status === "Maintenance" || m.status === "Under Maintenance";
                  return (
                    <div key={m.id}
                      style={{ ...s.machineItem, ...(isActive ? { background: "#1a2d4a", borderColor: sc.border } : {}), opacity: isMaint ? 0.5 : 1, cursor: isMaint ? "not-allowed" : "pointer" }}
                      onClick={() => { if (isMaint) { showToast("Máy đang bảo trì!", "error"); return; } setSelectedMachine(m); setSelectedTime(null); }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <span style={{ color: "#f1f5f9", fontSize: 13, fontWeight: 600 }}>{m.name}</span>
                        <span style={{ color: "#64748b", fontSize: 11 }}>{m.type === "CAR" ? "🚗 Ô tô" : "🏍️ Xe máy"}</span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                        <span style={{ width: 9, height: 9, borderRadius: "50%", background: sc.dot }} />
                        <span style={{ fontSize: 10, color: sc.color }}>{m.status}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Thời lượng */}
            <div style={s.card}>
              <div style={s.cardTitle}>⏳ Thời lượng dịch vụ</div>
              <div style={{ display: "flex", gap: 6 }}>
                {DURATIONS.map(d => (
                  <div key={d.value}
                    style={{ ...s.durationItem, ...(selectedDuration === d.value ? s.durationActive : {}) }}
                    onClick={() => setSelectedDuration(d.value)}>
                    {d.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div style={s.card}>
              <div style={s.cardTitle}>Chú thích</div>
              {[
                { dot: "#4ade80", label: "Trống — có thể đặt" },
                { dot: "#ef4444", label: "Đã có booking" },
                { dot: "#60a5fa", label: "Đang chọn" },
                { dot: "#a3e635", label: "Đang kiểm tra" },
              ].map(item => (
                <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: item.dot, flexShrink: 0 }} />
                  <span style={{ color: "#94a3b8", fontSize: 13 }}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── MAIN ────────────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Stats bar */}
            {selectedMachine && (
              <div style={s.statsBar}>
                {[
                  { val: TIME_SLOTS.length, label: "Tổng slot",  color: "#f1f5f9" },
                  { val: freeCount,         label: "Còn trống",  color: "#4ade80" },
                  { val: bookedCount,       label: "Đã đặt",     color: "#f87171" },
                ].map((st, i) => (
                  <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                    <span style={{ color: st.color, fontSize: 22, fontWeight: 800 }}>{st.val}</span>
                    <span style={{ color: "#64748b", fontSize: 11 }}>{st.label}</span>
                  </div>
                ))}
                <div style={{ width: 1, height: 32, background: "#334155" }} />
                <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, padding: "6px 14px", color: "#94a3b8", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                  🔧 {selectedMachine.name} · {selectedDate}
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10,
                    background: STATUS_COLORS[selectedMachine.status]?.bg,
                    color:      STATUS_COLORS[selectedMachine.status]?.color,
                    border:     `1px solid ${STATUS_COLORS[selectedMachine.status]?.border}` }}>
                    {selectedMachine.status}
                  </span>
                </div>
              </div>
            )}

            {/* Empty / Loading / Slot grid */}
            {!selectedMachine ? (
              <div style={s.emptyState}>
                <div style={{ fontSize: 52 }}>🔧</div>
                <p style={{ color: "#475569", fontSize: 15, margin: 0 }}>Chọn máy bên trái để xem slot</p>
              </div>
            ) : loadingSlots ? (
              <div style={s.emptyState}>
                <div style={{ fontSize: 40 }}>⏳</div>
                <p style={{ color: "#475569", margin: 0 }}>Đang tải timeslot...</p>
              </div>
            ) : (
              <>
                {/* Slot list */}
                <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, overflow: "hidden" }}>
                  {/* Header */}
                  <div style={{ display: "flex", alignItems: "center", background: "#0f172a", padding: "10px 16px", borderBottom: "1px solid #334155" }}>
                    <span style={{ width: 68, color: "#64748b", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>Giờ</span>
                    <span style={{ width: 160, color: "#64748b", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>Trạng thái</span>
                    <span style={{ flex: 1, color: "#64748b", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>Thông tin</span>
                  </div>

                  {slots.map(slot => {
                    const isBooked   = slot.status === "booked";
                    const isSelected = selectedTime === slot.time;
                    const isChecking = checkingSlot === slot.time;
                    const isHovered  = hoveredSlot === slot.time && !isBooked;

                    let rowBg = "#1e293b", rowBL = "#334155";
                    let bText = "🟢 Trống", bBg = "#16653420", bColor = "#4ade80", bBorder = "#166534";

                    if (isBooked)        { rowBg="#2a1212"; rowBL="#7f1d1d"; bText="🔴 Đã đặt";       bBg="#7f1d1d20"; bColor="#f87171"; bBorder="#7f1d1d"; }
                    else if (isChecking) { rowBg="#1e2a1e"; rowBL="#a3e635"; bText="⏳ Kiểm tra...";  bBg="#36651620"; bColor="#a3e635"; bBorder="#a3e635"; }
                    else if (isSelected) { rowBg="#1a2d4a"; rowBL="#3b82f6"; bText="🔵 Đang chọn";    bBg="#1d4ed820"; bColor="#60a5fa"; bBorder="#1d4ed8"; }
                    else if (isHovered)  { rowBg="#162416"; rowBL="#166534"; }

                    return (
                      <div key={slot.time}
                        style={{ display: "flex", alignItems: "center", padding: "11px 16px", background: rowBg, borderBottom: "1px solid #172032", borderLeft: `3px solid ${rowBL}`, cursor: isBooked ? "not-allowed" : "pointer", transition: "background 0.12s" }}
                        onClick={() => handleSlotClick(slot)}
                        onMouseEnter={() => !isBooked && setHoveredSlot(slot.time)}
                        onMouseLeave={() => setHoveredSlot(null)}>
                        <span style={{ width: 68, color: "#f1f5f9", fontWeight: 700, fontSize: 15, flexShrink: 0 }}>
                          {slot.time}
                        </span>
                        <span style={{ width: 160, flexShrink: 0, fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 20, border: `1px solid ${bBorder}`, background: bBg, color: bColor, display: "inline-block" }}>
                          {bText}
                        </span>
                        <span style={{ flex: 1, color: isBooked ? "#94a3b8" : "#475569", fontSize: 13, paddingLeft: 12 }}>
                          {isBooked && slot.booking
                            ? `👤 ${slot.booking.customerName} · ${slot.booking.customerPhone} · ${slot.booking.serviceName} · ${slot.booking.duration}ph · ${slot.booking.bookingStatus}`
                            : isChecking ? "Đang kiểm tra conflict với server..."
                            : "Nhấn để chọn slot này"}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Overview */}
                <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: 20 }}>
                  <div style={{ color: "#94a3b8", fontSize: 13, fontWeight: 700, marginBottom: 14 }}>
                    📊 Tổng quan tất cả máy — {selectedDate}
                    {loadingOverview && <span style={s.loadingTxt}> đang tải...</span>}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(155px,1fr))", gap: 10 }}>
                    {overview.map(m => {
                      const pct      = m.occupancyPct;
                      const barColor = pct > 70 ? "#ef4444" : pct > 40 ? "#f59e0b" : "#10b981";
                      const sc       = STATUS_COLORS[m.machineStatus] || STATUS_COLORS.Available;
                      return (
                        <div key={m.id}
                          style={{ background: "#0f172a", border: `1px solid ${selectedMachine?.id === m.id ? "#3b82f6" : "#334155"}`, borderRadius: 10, padding: 14, cursor: "pointer" }}
                          onClick={() => { const found = machines.find(x => x.id === m.id); if (found) { setSelectedMachine(found); setSelectedTime(null); } }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 2 }}>
                            <span style={{ color: "#f1f5f9", fontSize: 13, fontWeight: 700 }}>{m.name}</span>
                            <span style={{ width: 8, height: 8, borderRadius: "50%", background: sc.dot, marginTop: 3, flexShrink: 0 }} />
                          </div>
                          <div style={{ color: "#64748b", fontSize: 11, marginBottom: 10 }}>
                            {m.type === "CAR" ? "🚗" : "🏍️"} · {m.machineStatus}
                          </div>
                          <div style={{ height: 5, background: "#1e293b", borderRadius: 99, overflow: "hidden", marginBottom: 8 }}>
                            <div style={{ height: "100%", borderRadius: 99, width: `${pct}%`, background: barColor }} />
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ color: "#f87171", fontSize: 12, fontWeight: 600 }}>{m.bookedSlots} đặt</span>
                            <span style={{ color: "#4ade80", fontSize: 12, fontWeight: 600 }}>{m.freeSlots} trống</span>
                            <span style={{ color: "#64748b", fontSize: 11 }}>{pct}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  root: { minHeight: "100vh", width: "100%", boxSizing: "border-box", background: "#0f172a", fontFamily: "'Be Vietnam Pro','Segoe UI',sans-serif", position: "relative", padding: "24px 32px" },
  bg: { position: "fixed", inset: 0, background: "radial-gradient(ellipse 80% 60% at 30% 0%,#1a3a2a44 0%,transparent 60%)", pointerEvents: "none" },
  bgGrid: { position: "fixed", inset: 0, backgroundImage: "linear-gradient(rgba(148,163,184,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(148,163,184,0.03) 1px,transparent 1px)", backgroundSize: "40px 40px", pointerEvents: "none" },
  wrapper: { width: "100%", boxSizing: "border-box", position: "relative", zIndex: 1 },
  toast: { position: "fixed", top: 20, right: 20, color: "white", padding: "12px 20px", borderRadius: 10, fontWeight: 600, fontSize: 14, zIndex: 9999, boxShadow: "0 8px 24px rgba(0,0,0,0.3)" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9998, padding: 16 },
  modal: { background: "#1e293b", border: "1px solid #334155", borderRadius: 16, padding: 28, width: "100%", maxWidth: 420, maxHeight: "90vh", overflowY: "auto" },
  modalTitle: { color: "#f1f5f9", fontSize: 18, fontWeight: 700, textAlign: "center", marginBottom: 16, marginTop: 0 },
  modalInfo: { background: "#0f172a", borderRadius: 10, padding: 14, marginBottom: 16, display: "flex", flexDirection: "column", gap: 8 },
  modalRow: { display: "flex", justifyContent: "space-between" },
  modalKey: { color: "#64748b", fontSize: 13 },
  modalVal: { color: "#f1f5f9", fontSize: 13, fontWeight: 600 },
  modalActions: { display: "flex", gap: 10 },
  cancelBtn: { flex: 1, background: "transparent", border: "1px solid #334155", color: "#94a3b8", borderRadius: 8, padding: 10, cursor: "pointer", fontSize: 14 },
  confirmBtn: { flex: 1, background: "linear-gradient(135deg,#10b981,#059669)", color: "white", border: "none", borderRadius: 8, padding: 10, cursor: "pointer", fontWeight: 700, fontSize: 14 },
  flabel: { color: "#94a3b8", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 },
  finput: { background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#f1f5f9", padding: "10px 12px", fontSize: 14, outline: "none" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 16 },
  badge: { display: "inline-block", background: "#1a3a2a", color: "#4ade80", border: "1px solid #166534", borderRadius: 20, padding: "4px 14px", fontSize: 13, marginBottom: 8, fontWeight: 500 },
  title: { color: "#f1f5f9", fontSize: 32, fontWeight: 800, margin: 0, letterSpacing: -1 },
  subtitle: { color: "#64748b", fontSize: 14, marginTop: 4 },
  refreshBtn: { background: "#1e293b", border: "1px solid #334155", color: "#94a3b8", borderRadius: 10, padding: "10px 18px", cursor: "pointer", fontSize: 14 },
  layout: { display: "grid", gridTemplateColumns: "272px 1fr", gap: 16, alignItems: "start" },
  sidebar: { display: "flex", flexDirection: "column", gap: 12 },
  card: { background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: 16 },
  cardTitle: { color: "#94a3b8", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 },
  loadingTxt: { color: "#64748b", fontWeight: 400, textTransform: "none", fontSize: 11 },
  dateInput: { width: "100%", boxSizing: "border-box", background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#f1f5f9", padding: "10px 12px", fontSize: 14, outline: "none" },
  filterBtn: { flex: 1, background: "#0f172a", border: "1px solid #334155", color: "#64748b", borderRadius: 8, padding: "8px 4px", cursor: "pointer", fontSize: 12, fontWeight: 600 },
  filterBtnActive: { borderColor: "#10b981", background: "#1a3a2a", color: "#4ade80" },
  machineItem: { background: "#0f172a", border: "1px solid #334155", borderRadius: 8, padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", transition: "border-color 0.15s" },
  durationItem: { flex: 1, background: "#0f172a", border: "1px solid #334155", borderRadius: 8, padding: "8px 4px", cursor: "pointer", color: "#94a3b8", fontSize: 12, textAlign: "center", fontWeight: 600 },
  durationActive: { borderColor: "#f59e0b", background: "#2a1f0a", color: "#fbbf24" },
  statsBar: { background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: "14px 20px", display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" },
  emptyState: { background: "#1e293b", border: "1px solid #334155", borderRadius: 16, padding: 80, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 },
};
