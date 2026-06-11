import React, { useState } from "react";
import { Link } from "react-router-dom";

export default function MachineDashboard() {
  // ==========================================
  // 1. MOCK DATA (Dữ liệu giả để Thắng làm UI)
  // Sau này Duy làm xong API, chỉ cần fetch và set lại biến này là xong!
  // ==========================================
  const [machines, setMachines] = useState([
    {
      id: 1,
      name: "Máy rửa tự động #01",
      status: "Available",
      nextMaintenance: "15/07/2026",
    },
    {
      id: 2,
      name: "Máy rửa tự động #02",
      status: "In_Use",
      currentTask: "BSX: 51H-123.45",
      expectedFinish: "14:30",
    },
    {
      id: 3,
      name: "Hệ thống chăm sóc nội thất",
      status: "Maintenance",
      issue: "Thay màng lọc bụi",
      expectedReady: "18:00 Hôm nay",
    },
    {
      id: 4,
      name: "Máy rửa tự động #03",
      status: "Available",
      nextMaintenance: "25/07/2026",
    },
  ]);

  // State quản lý Modal Bảo trì
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState("");

  // ==========================================
  // 2. LOGIC XỬ LÝ SỰ KIỆN
  // ==========================================
  const handleOpenMaintenance = (machineId) => {
    setSelectedMachine(machineId);
    setIsModalOpen(true);
  };

  const handleSubmitMaintenance = (e) => {
    e.preventDefault();
    alert(
      "Đã lên lịch bảo trì và block timeslot thành công! (Chờ ghép API của Duy)",
    );
    setIsModalOpen(false);
  };

  // Helper function để lấy màu theo trạng thái
  const getStatusColor = (status) => {
    switch (status) {
      case "Available":
        return {
          bg: "bg-green-100",
          text: "text-green-700",
          border: "border-green-200",
          label: "Sẵn sàng",
        };
      case "In_Use":
        return {
          bg: "bg-blue-100",
          text: "text-blue-700",
          border: "border-blue-200",
          label: "Đang hoạt động",
        };
      case "Maintenance":
        return {
          bg: "bg-red-100",
          text: "text-red-700",
          border: "border-red-200",
          label: "Đang bảo trì",
        };
      default:
        return {
          bg: "bg-gray-100",
          text: "text-gray-700",
          border: "border-gray-200",
          label: "Không xác định",
        };
    }
  };

  return (
    <div className="min-h-screen bg-[#fcf7f0] font-sans text-[#192b4d] py-10 px-4 sm:px-6 lg:px-12">
      <div className="max-w-7xl mx-auto animate-[fadeIn_0.5s_ease-out]">
        {/* THANH ĐIỀU HƯỚNG */}
        <div className="mb-8 flex justify-start">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-gray-500 hover:text-[#F58607] font-semibold text-sm md:text-base transition-all duration-300 transform hover:-translate-x-2"
          >
            <svg
              className="w-5 h-5 md:w-6 md:h-6"
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
            Quay lại Admin
          </Link>
        </div>

        {/* HEADER DASHBOARD */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div>
            <h2 className="text-3xl md:text-5xl font-extrabold text-[#192b4d] tracking-tight mb-2">
              Quản lý <span className="text-[#F58607]">Trạng thái máy</span>
            </h2>
            <p className="text-gray-500 text-lg">
              Giám sát hệ thống rửa xe và quản lý lịch bảo trì (Sprint 2)
            </p>
          </div>

          <button
            onClick={() => handleOpenMaintenance("")}
            className="px-6 py-3.5 bg-[#192b4d] hover:bg-[#2a3f6b] text-white font-bold rounded-2xl shadow-lg transition-all duration-300 transform hover:-translate-y-1 flex items-center gap-2"
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
                strokeWidth="2"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            Lên lịch bảo trì
          </button>
        </div>

        {/* GRID DANH SÁCH MÁY */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {machines.map((machine) => {
            const statusStyle = getStatusColor(machine.status);
            return (
              <div
                key={machine.id}
                className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 flex flex-col h-full"
              >
                {/* Header Card */}
                <div className="flex justify-between items-start mb-6">
                  <div
                    className={`p-4 rounded-2xl ${statusStyle.bg} ${statusStyle.text}`}
                  >
                    <svg
                      className="w-8 h-8"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                      />
                    </svg>
                  </div>
                  <span
                    className={`px-4 py-1.5 rounded-full text-sm font-bold border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                  >
                    {statusStyle.label}
                  </span>
                </div>

                {/* Info Card */}
                <h3 className="text-2xl font-extrabold text-[#192b4d] mb-2">
                  {machine.name}
                </h3>

                <div className="mt-4 space-y-3 flex-grow">
                  {machine.status === "In_Use" && (
                    <>
                      <p className="text-gray-500 font-medium">
                        Xe đang phục vụ:{" "}
                        <span className="font-bold text-[#192b4d]">
                          {machine.currentTask}
                        </span>
                      </p>
                      <p className="text-gray-500 font-medium">
                        Dự kiến xong:{" "}
                        <span className="font-bold text-orange-500">
                          {machine.expectedFinish}
                        </span>
                      </p>
                    </>
                  )}
                  {machine.status === "Maintenance" && (
                    <>
                      <p className="text-red-500 font-medium">
                        Vấn đề:{" "}
                        <span className="font-bold">{machine.issue}</span>
                      </p>
                      <p className="text-gray-500 font-medium">
                        Dự kiến xong:{" "}
                        <span className="font-bold text-[#192b4d]">
                          {machine.expectedReady}
                        </span>
                      </p>
                    </>
                  )}
                  {machine.status === "Available" && (
                    <p className="text-gray-500 font-medium">
                      Bảo trì định kỳ tiếp theo:{" "}
                      <span className="font-bold text-[#192b4d]">
                        {machine.nextMaintenance}
                      </span>
                    </p>
                  )}
                </div>

                {/* Footer Card (Action) */}
                <div className="mt-8 pt-6 border-t border-gray-100">
                  <button
                    onClick={() => handleOpenMaintenance(machine.id)}
                    className="w-full py-3 bg-gray-50 hover:bg-[#F58607] text-gray-600 hover:text-white font-bold rounded-xl transition-colors duration-300"
                  >
                    Cập nhật trạng thái
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ==========================================
          3. MODAL (POPUP) LÊN LỊCH BẢO TRÌ (Glassmorphism)
      ========================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#192b4d]/40 backdrop-blur-sm animate-[fadeIn_0.3s_ease-out]">
          <div className="bg-white rounded-[2.5rem] p-8 md:p-10 w-full max-w-lg shadow-2xl border border-white transform transition-all">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-[#192b4d]">
                Lên lịch bảo trì
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                <svg
                  className="w-8 h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmitMaintenance} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Chọn Máy / Hệ thống *
                </label>
                <select
                  value={selectedMachine}
                  onChange={(e) => setSelectedMachine(e.target.value)}
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-orange-500/20 focus:border-[#F58607] outline-none font-medium text-gray-800"
                  required
                >
                  <option value="" disabled>
                    -- Chọn máy cần bảo trì --
                  </option>
                  {machines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Từ ngày *
                  </label>
                  <input
                    type="date"
                    required
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-orange-500/20 focus:border-[#F58607] outline-none font-medium text-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Đến ngày *
                  </label>
                  <input
                    type="date"
                    required
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-orange-500/20 focus:border-[#F58607] outline-none font-medium text-gray-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Lý do bảo trì *
                </label>
                <textarea
                  rows="3"
                  required
                  placeholder="VD: Thay dầu mỡ, kẹt chổi than..."
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-orange-500/20 focus:border-[#F58607] outline-none font-medium text-gray-800 resize-none"
                ></textarea>
              </div>

              <div className="pt-4 flex gap-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-4 bg-[#F58607] hover:bg-orange-600 text-white font-bold rounded-2xl shadow-md hover:shadow-lg transition-all transform hover:-translate-y-1"
                >
                  Block Lịch Ngay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
