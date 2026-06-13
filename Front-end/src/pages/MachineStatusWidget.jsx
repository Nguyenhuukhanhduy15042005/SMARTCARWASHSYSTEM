import React, { useState, useEffect } from "react";
import axios from "axios";

export default function MachineStatusWidget({ canManage = false }) {
  const [machines, setMachines] = useState([]);
  const token = localStorage.getItem("token") || localStorage.getItem("TOKEN");

  const fetchMachines = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/machines", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMachines(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMachines();
    const interval = setInterval(fetchMachines, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleStatusChange = async (id, status) => {
    if (!canManage) return;
    try {
      await axios.put(
        `http://localhost:5000/api/machines/${id}/status`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      fetchMachines();
    } catch (err) {
      alert("Lỗi cập nhật máy!");
    }
  };

  return (
    <div className="admin-table-card" style={{ marginTop: "20px" }}>
      <div className="admin-table-header">
        <h2>Trạng thái máy rửa xe</h2>
        <button className="refresh-btn" onClick={fetchMachines}>
          <i className="fa-solid fa-rotate-right"></i>
        </button>
      </div>
      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Máy</th>
              <th>Trạng thái</th>
              {canManage && <th>Điều khiển</th>}
            </tr>
          </thead>
          <tbody>
            {machines.map((m) => (
              <tr key={m.MachineID}>
                <td>
                  <strong>{m.MachineName}</strong>
                </td>
                <td>
                  <span
                    className={`status-pill ${m.Status === 1 ? "status-pending" : m.Status === 3 ? "status-cancelled" : "status-inservice"}`}
                  >
                    {m.StatusLabel}
                  </span>
                </td>
                {canManage && (
                  <td>
                    <div className="table-actions">
                      {m.Status === 1 && (
                        <button
                          className="action-icon-btn btn-confirm"
                          onClick={() => handleStatusChange(m.MachineID, 2)}
                        >
                          <i className="fa-solid fa-play"></i>
                        </button>
                      )}
                      {m.Status === 2 && (
                        <button
                          className="action-icon-btn btn-cancel"
                          onClick={() => handleStatusChange(m.MachineID, 1)}
                        >
                          <i className="fa-solid fa-stop"></i>
                        </button>
                      )}
                      <button
                        className="action-icon-btn btn-details"
                        onClick={() => handleStatusChange(m.MachineID, 3)}
                      >
                        <i className="fa-solid fa-screwdriver-wrench"></i>
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
