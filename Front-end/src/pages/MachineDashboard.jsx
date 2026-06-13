import React, { useState, useEffect } from "react";
import axios from "axios";
import "./MachineDashboard.css";

export default function MachineDashboard() {
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMachines();
  }, []);

  const fetchMachines = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("http://localhost:5000/api/machines", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMachines(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, newStatus) => {
    try {
      await axios.put(
        `http://localhost:5000/api/machines/${id}/status`,
        { status: newStatus },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      fetchMachines();
    } catch (err) {
      alert("Lỗi cập nhật!");
    }
  };

  return (
    <div className="machine-dash">
      <header>
        <h1>Quản lý trạng thái máy</h1>
        <p>Theo dõi và vận hành hệ thống rửa xe</p>
      </header>

      <div className="machine-grid">
        {machines.map((m) => (
          <div key={m.MachineID} className="machine-card">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">{m.MachineName}</h3>
              <span className={`status-badge status-${m.Status}`}>
                {m.StatusLabel}
              </span>
            </div>

            <p className="text-sm text-gray-400 mb-2">Loại: {m.MachineType}</p>
            <p className="text-sm text-gray-400 mb-4">
              Lần bảo trì cuối:{" "}
              {m.LastMaintenanceDate
                ? new Date(m.LastMaintenanceDate).toLocaleDateString()
                : "Chưa có"}
            </p>

            <div className="flex gap-2">
              {m.Status === 1 && (
                <button
                  className="btn-action bg-blue-600 text-white"
                  onClick={() => updateStatus(m.MachineID, 2)}
                >
                  Bắt đầu máy
                </button>
              )}
              {m.Status === 3 && (
                <button
                  className="btn-action bg-green-600 text-white"
                  onClick={() => updateStatus(m.MachineID, 1)}
                >
                  Hoàn thành bảo trì
                </button>
              )}
              <button
                className="btn-action bg-gray-700 text-white"
                onClick={() => {
                  /* Mở modal maintenance */
                }}
              >
                Lịch sử
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
