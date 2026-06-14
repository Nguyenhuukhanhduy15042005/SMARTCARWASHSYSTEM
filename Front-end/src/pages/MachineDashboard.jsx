import React, { useState, useEffect } from "react";
import axios from "axios";
import Sidebar from "../components/Sidebar";
import { useTheme } from "../context/ThemeContext";
import "./MachineDashboard.css";

const API_BASE = "http://127.0.0.1:5000/api/machines";

export default function MachineDashboard() {
  // Lấy ngày hôm nay theo định dạng YYYY-MM-DD để chặn chọn ngày quá khứ
  const todayDate = new Date().toISOString().split("T")[0];

  const { mode } = useTheme();
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Form States
  const [newMachine, setNewMachine] = useState({
    machineName: "",
    machineType: "CAR_WASHER",
  });
  const [maintenanceForm, setMaintenanceForm] = useState({
    description: "",
    maintenanceDate: "",
  });

  const token = localStorage.getItem("token") || localStorage.getItem("TOKEN");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchMachines();
    // Tự động làm mới dữ liệu mỗi 30 giây để đồng bộ trạng thái thực tế
    const interval = setInterval(fetchMachines, 30000);
    return () => clearInterval(interval);
  }, []);

  const showToastMsg = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // LẤY DANH SÁCH MÁY
  const fetchMachines = async () => {
    try {
      const res = await axios.get(API_BASE, { headers });
      setMachines(res.data);
    } catch (err) {
      console.error(err);
      showToastMsg("Không thể tải danh sách máy!", "error");
    } finally {
      setLoading(false);
    }
  };

  // ĐỔI TRẠNG THÁI MÁY NHANH
  const handleStatusChange = async (id, status) => {
    try {
      await axios.put(`${API_BASE}/${id}/status`, { status }, { headers });
      showToastMsg(`Đã cập nhật trạng thái máy!`);
      fetchMachines();
    } catch (err) {
      showToastMsg(
        err.response?.data?.message || "Lỗi cập nhật trạng thái",
        "error",
      );
    }
  };

  // THÊM MÁY MỚI
  const handleAddMachine = async (e) => {
    e.preventDefault();
    try {
      await axios.post(API_BASE, newMachine, { headers });
      showToastMsg("Thêm máy mới thành công!");
      setShowAddModal(false);
      setNewMachine({ machineName: "", machineType: "CAR_WASHER" });
      fetchMachines();
    } catch (err) {
      showToastMsg(err.response?.data?.message || "Lỗi thêm máy", "error");
    }
  };

  // LÊN LỊCH BẢO TRÌ
  const handleScheduleMaintenance = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        `${API_BASE}/${showMaintenanceModal}/maintenance`,
        maintenanceForm,
        { headers },
      );
      showToastMsg("Lên lịch bảo trì thành công! Máy đã bị block.");
      setShowMaintenanceModal(null);
      setMaintenanceForm({ description: "", maintenanceDate: "" });
      fetchMachines();
    } catch (err) {
      showToastMsg(
        err.response?.data?.message || "Lỗi lên lịch bảo trì",
        "error",
      );
    }
  };

  // XEM LỊCH SỬ BẢO TRÌ
  const openHistoryModal = async (machineId) => {
    setShowHistoryModal(machineId);
    setHistoryLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/${machineId}/maintenance`, {
        headers,
      });
      setHistoryData(res.data);
    } catch (err) {
      showToastMsg("Không thể tải lịch sử bảo trì", "error");
    } finally {
      setHistoryLoading(false);
    }
  };

  // XÓA MÁY
  const handleDeleteMachine = async (id, name) => {
    if (!window.confirm(`Bạn có chắc muốn xóa vĩnh viễn máy "${name}"?`))
      return;
    try {
      await axios.delete(`${API_BASE}/${id}`, { headers });
      showToastMsg("Xóa máy thành công!");
      fetchMachines();
    } catch (err) {
      showToastMsg(err.response?.data?.message || "Lỗi xóa máy", "error");
    }
  };

  // Tính toán KPI
  const stats = {
    total: machines.length,
    idle: machines.filter((m) => m.Status === 1).length,
    operating: machines.filter((m) => m.Status === 2).length,
    maintenance: machines.filter((m) => m.Status === 3).length,
  };

  return (
    <div
      className={`portal-layout-container machine-dashboard-container ${mode}`}
    >
      <Sidebar />
      <main className="portal-main-content machine-main-content">
        {/* Glow Spheres */}
        <div className="glow-sphere left"></div>
        <div className="glow-sphere right"></div>

        <div className="machine-wrapper z-10 relative">
          <header className="machine-header">
            <div>
              <div className="header-badge">
                <i className="fa-solid fa-gears"></i> Hardware Manager
              </div>
              <h1 className="header-title">Quản Lý Trạng Thái Máy</h1>
              <p className="header-subtitle">
                Giám sát hoạt động, điều phối và lên lịch bảo trì máy móc
              </p>
            </div>
            <div className="header-actions">
              <button className="btn-refresh" onClick={fetchMachines}>
                <i className="fa-solid fa-arrows-rotate"></i> Làm mới
              </button>
              <button
                className="btn-add-primary"
                onClick={() => setShowAddModal(true)}
              >
                <i className="fa-solid fa-plus"></i> Thêm máy mới
              </button>
            </div>
          </header>

          {/* Stats Grid */}
          <section className="stats-grid">
            <div className="stat-card border-l-blue">
              <div className="stat-icon bg-blue-dim text-blue">
                <i className="fa-solid fa-server"></i>
              </div>
              <div>
                <div className="stat-value">{stats.total}</div>
                <div className="stat-label">Tổng số máy</div>
              </div>
            </div>
            <div className="stat-card border-l-green">
              <div className="stat-icon bg-green-dim text-green">
                <i className="fa-solid fa-check"></i>
              </div>
              <div>
                <div className="stat-value">{stats.idle}</div>
                <div className="stat-label">Sẵn sàng (Idle)</div>
              </div>
            </div>
            <div className="stat-card border-l-cyan">
              <div className="stat-icon bg-cyan-dim text-cyan">
                <i className="fa-solid fa-arrows-spin"></i>
              </div>
              <div>
                <div className="stat-value">{stats.operating}</div>
                <div className="stat-label">Đang hoạt động</div>
              </div>
            </div>
            <div className="stat-card border-l-orange">
              <div className="stat-icon bg-orange-dim text-orange">
                <i className="fa-solid fa-screwdriver-wrench"></i>
              </div>
              <div>
                <div className="stat-value">{stats.maintenance}</div>
                <div className="stat-label">Đang bảo trì</div>
              </div>
            </div>
          </section>

          {/* Machines Grid */}
          {loading ? (
            <div className="loading-spinner">
              <div className="spinner"></div>
              <p>Đang tải danh sách máy...</p>
            </div>
          ) : (
            <div className="machine-grid">
              {machines.map((m) => (
                <div
                  key={m.MachineID}
                  className={`machine-card status-${m.Status}`}
                >
                  <div className="machine-card-top">
                    <div className="machine-icon">
                      {m.MachineType === "BIKE_WASHER" ? (
                        <i className="fa-solid fa-motorcycle"></i>
                      ) : (
                        <i className="fa-solid fa-car"></i>
                      )}
                    </div>
                    <span className="status-pill">{m.StatusLabel}</span>
                  </div>

                  <h3 className="machine-name">{m.MachineName}</h3>
                  <div className="machine-info">
                    <span>
                      <i className="fa-solid fa-tag"></i>{" "}
                      {m.MachineType === "BIKE_WASHER"
                        ? "Máy rửa xe máy"
                        : "Máy rửa ô tô"}
                    </span>
                    <span>
                      <i className="fa-solid fa-calendar-check"></i> Lần BT
                      cuối:{" "}
                      {m.LastMaintenanceDate
                        ? new Date(m.LastMaintenanceDate).toLocaleDateString(
                            "vi-VN",
                          )
                        : "Chưa có"}
                    </span>
                    <span>
                      <i className="fa-solid fa-wrench"></i> Đã bảo trì:{" "}
                      {m.TotalMaintenances} lần
                    </span>
                  </div>

                  <div className="machine-actions">
                    {/* Nếu máy đang rảnh -> Cấm máy bằng cách chuyển sang bảo trì thủ công */}
                    {m.Status === 1 && (
                      <button
                        className="btn-act btn-stop"
                        title="Khóa máy / Vô hiệu hóa"
                        onClick={() => handleStatusChange(m.MachineID, 3)}
                      >
                        <i className="fa-solid fa-ban"></i> Khóa máy
                      </button>
                    )}
                    {/* Nếu máy đang bảo trì -> Mở khóa về Idle */}
                    {m.Status === 3 && (
                      <button
                        className="btn-act btn-start"
                        title="Mở lại máy"
                        onClick={() => handleStatusChange(m.MachineID, 1)}
                      >
                        <i className="fa-solid fa-play"></i> Mở khóa
                      </button>
                    )}

                    <button
                      className="btn-act btn-info"
                      title="Lịch sử bảo trì"
                      onClick={() => openHistoryModal(m.MachineID)}
                    >
                      <i className="fa-solid fa-clock-rotate-left"></i>
                    </button>
                    <button
                      className="btn-act btn-warning"
                      title="Lên lịch bảo trì mới"
                      onClick={() => setShowMaintenanceModal(m.MachineID)}
                    >
                      <i className="fa-solid fa-toolbox"></i>
                    </button>
                    <button
                      className="btn-act btn-danger"
                      title="Xóa máy"
                      onClick={() =>
                        handleDeleteMachine(m.MachineID, m.MachineName)
                      }
                    >
                      <i className="fa-solid fa-trash-can"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* MODAL THÊM MÁY */}
      {showAddModal && (
        <div
          className="mc-modal-overlay"
          onClick={() => setShowAddModal(false)}
        >
          <div className="mc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mc-modal-head">
              <h2>Thêm Hệ Thống Rửa Mới</h2>
              <button onClick={() => setShowAddModal(false)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <form onSubmit={handleAddMachine} className="mc-modal-body">
              <label className="mc-label">Tên Máy / Cabin</label>
              <input
                type="text"
                className="mc-input"
                required
                value={newMachine.machineName}
                onChange={(e) =>
                  setNewMachine({ ...newMachine, machineName: e.target.value })
                }
                placeholder="VD: Cabin rửa ô tô tự động #01"
              />

              <label className="mc-label mt-4">Loại máy</label>
              <select
                className="mc-input"
                value={newMachine.machineType}
                onChange={(e) =>
                  setNewMachine({ ...newMachine, machineType: e.target.value })
                }
              >
                <option value="CAR_WASHER">Máy rửa Ô tô (CAR_WASHER)</option>
                <option value="BIKE_WASHER">
                  Máy rửa Xe máy (BIKE_WASHER)
                </option>
              </select>

              <div className="mc-modal-footer">
                <button
                  type="button"
                  className="mc-btn-cancel"
                  onClick={() => setShowAddModal(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="mc-btn-save">
                  Thêm máy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL LÊN LỊCH BẢO TRÌ */}
      {showMaintenanceModal && (
        <div
          className="mc-modal-overlay"
          onClick={() => setShowMaintenanceModal(null)}
        >
          <div className="mc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mc-modal-head">
              <h2>
                <i className="fa-solid fa-toolbox text-orange-500"></i> Lên Lịch
                Bảo Trì
              </h2>
              <button onClick={() => setShowMaintenanceModal(null)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <form
              onSubmit={handleScheduleMaintenance}
              className="mc-modal-body"
            >
              <div className="alert-warning mb-4">
                Lưu ý: Sau khi tạo lịch, máy sẽ tự động bị khóa (Status = 3) và
                không nhận booking mới.
              </div>

              <label className="mc-label">Ngày bảo trì dự kiến</label>
              <input
                type="date"
                className="mc-input"
                required
                min={todayDate}
                value={maintenanceForm.maintenanceDate}
                onChange={(e) =>
                  setMaintenanceForm({
                    ...maintenanceForm,
                    maintenanceDate: e.target.value,
                  })
                }
              />

              <label className="mc-label mt-4">Nội dung bảo trì</label>
              <textarea
                className="mc-input"
                rows={4}
                required
                placeholder="VD: Thay dung dịch bọt tuyết, kiểm tra vòi phun áp lực..."
                value={maintenanceForm.description}
                onChange={(e) =>
                  setMaintenanceForm({
                    ...maintenanceForm,
                    description: e.target.value,
                  })
                }
              ></textarea>

              <div className="mc-modal-footer">
                <button
                  type="button"
                  className="mc-btn-cancel"
                  onClick={() => setShowMaintenanceModal(null)}
                >
                  Hủy
                </button>
                <button type="submit" className="mc-btn-warning">
                  Xác nhận Block máy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL LỊCH SỬ BẢO TRÌ */}
      {showHistoryModal && (
        <div
          className="mc-modal-overlay"
          onClick={() => setShowHistoryModal(null)}
        >
          <div className="mc-modal w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="mc-modal-head">
              <h2>Lịch Sử Bảo Trì</h2>
              <button onClick={() => setShowHistoryModal(null)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div
              className="mc-modal-body"
              style={{ maxHeight: "60vh", overflowY: "auto" }}
            >
              {historyLoading ? (
                <div className="text-center py-8 text-gray-500">
                  <i className="fa-solid fa-spinner fa-spin text-2xl"></i>
                </div>
              ) : historyData.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Máy này chưa từng được bảo trì.
                </div>
              ) : (
                <div className="history-timeline">
                  {historyData.map((h) => (
                    <div key={h.MaintenanceID} className="history-item">
                      <div className="history-dot"></div>
                      <div className="history-content">
                        <h4>
                          {new Date(h.MaintenanceDate).toLocaleString("vi-VN")}
                        </h4>
                        <p>
                          <strong>Nhân viên:</strong> {h.OperatorName}
                        </p>
                        <p className="history-desc">{h.Description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`mc-toast toast-${toast.type}`}>
          <i
            className={
              toast.type === "error"
                ? "fa-solid fa-triangle-exclamation"
                : "fa-solid fa-circle-check"
            }
          ></i>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
