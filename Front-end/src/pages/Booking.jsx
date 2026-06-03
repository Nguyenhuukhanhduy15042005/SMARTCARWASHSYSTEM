import React, { useState } from "react";
import { Link } from "react-router-dom"; // Import Link để điều hướng

export default function Booking() {
  // State quản lý dữ liệu đặt lịch
  const [formData, setFormData] = useState({
    licensePlate: "",
    vehicleType: "4_cho",
    servicePackage: "standard",
    date: "",
    time: "",
    note: "",
  });

  // Bảng giá dịch vụ (mẫu)
  const servicePrices = {
    standard: 100000,
    premium: 200000,
    vip: 350000,
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Dữ liệu đặt lịch:", formData);
    alert("Gửi yêu cầu đặt lịch thành công! (Check console để xem dữ liệu)");
    // Thêm logic gọi API fetch POST ở đây
  };

  return (
    <div className="min-h-screen bg-[#FDF8F0] font-sans text-[#192b4d] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* THANH ĐIỀU HƯỚNG QUAY LẠI */}
        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-gray-500 hover:text-[#F58607] font-semibold text-sm transition-colors duration-200"
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
            Quay lại trang chủ
          </Link>
        </div>

        {/* Tiêu đề trang */}
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-extrabold text-[#192b4d] tracking-tight">
            Đặt Lịch Rửa Xe
          </h2>
          <p className="mt-2 text-lg text-gray-600">
            Điền thông tin bên dưới để trải nghiệm dịch vụ chăm sóc xe thông
            minh
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 lg:grid-cols-3 gap-8"
        >
          {/* Cột trái: Form thông tin (Chiếm 2 phần) */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-[2rem] shadow-xl p-8 border border-gray-100">
              <h3 className="text-xl font-bold text-[#192b4d] mb-6 flex items-center gap-2">
                <svg
                  className="w-6 h-6 text-[#F58607]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"
                  />
                </svg>
                Thông tin phương tiện
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Biển số xe *
                  </label>
                  <input
                    type="text"
                    name="licensePlate"
                    value={formData.licensePlate}
                    onChange={handleChange}
                    placeholder="VD: 51H-123.45"
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#F58607] focus:border-[#F58607] transition-colors outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Loại xe
                  </label>
                  <select
                    name="vehicleType"
                    value={formData.vehicleType}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#F58607] focus:border-[#F58607] transition-colors outline-none cursor-pointer"
                  >
                    <option value="xe_may">Xe máy</option>
                    <option value="4_cho">Ô tô 4 chỗ</option>
                    <option value="7_cho">Ô tô 7 chỗ</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[2rem] shadow-xl p-8 border border-gray-100">
              <h3 className="text-xl font-bold text-[#192b4d] mb-6 flex items-center gap-2">
                <svg
                  className="w-6 h-6 text-[#F58607]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                Thời gian & Dịch vụ
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Ngày rửa xe *
                  </label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#F58607] focus:border-[#F58607] transition-colors outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Khung giờ *
                  </label>
                  <input
                    type="time"
                    name="time"
                    value={formData.time}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#F58607] focus:border-[#F58607] transition-colors outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Gói dịch vụ *
                </label>
                <div className="space-y-3">
                  {/* Option 1 */}
                  <label
                    className={`flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-all ${formData.servicePackage === "standard" ? "border-[#F58607] bg-orange-50" : "border-gray-200 hover:border-gray-300"}`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="servicePackage"
                        value="standard"
                        checked={formData.servicePackage === "standard"}
                        onChange={handleChange}
                        className="w-5 h-5 text-[#F58607] focus:ring-[#F58607]"
                      />
                      <div>
                        <span className="block font-bold text-gray-800">
                          Rửa xe tiêu chuẩn
                        </span>
                        <span className="text-sm text-gray-500">
                          Rửa bọt tuyết, hút bụi, lau kính
                        </span>
                      </div>
                    </div>
                    <span className="font-bold text-[#192b4d]">100.000đ</span>
                  </label>

                  {/* Option 2 */}
                  <label
                    className={`flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-all ${formData.servicePackage === "premium" ? "border-[#F58607] bg-orange-50" : "border-gray-200 hover:border-gray-300"}`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="servicePackage"
                        value="premium"
                        checked={formData.servicePackage === "premium"}
                        onChange={handleChange}
                        className="w-5 h-5 text-[#F58607] focus:ring-[#F58607]"
                      />
                      <div>
                        <span className="block font-bold text-gray-800">
                          Rửa xe cao cấp
                        </span>
                        <span className="text-sm text-gray-500">
                          Gói tiêu chuẩn + Phủ sáp bóng (Wax)
                        </span>
                      </div>
                    </div>
                    <span className="font-bold text-[#192b4d]">200.000đ</span>
                  </label>

                  {/* Option 3 */}
                  <label
                    className={`flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-all ${formData.servicePackage === "vip" ? "border-[#F58607] bg-orange-50" : "border-gray-200 hover:border-gray-300"}`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="servicePackage"
                        value="vip"
                        checked={formData.servicePackage === "vip"}
                        onChange={handleChange}
                        className="w-5 h-5 text-[#F58607] focus:ring-[#F58607]"
                      />
                      <div>
                        <span className="block font-bold text-gray-800">
                          Chăm sóc toàn diện (VIP)
                        </span>
                        <span className="text-sm text-gray-500">
                          Gói cao cấp + Vệ sinh nội thất chuyên sâu
                        </span>
                      </div>
                    </div>
                    <span className="font-bold text-[#192b4d]">350.000đ</span>
                  </label>
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Ghi chú thêm
                </label>
                <textarea
                  name="note"
                  value={formData.note}
                  onChange={handleChange}
                  rows="3"
                  placeholder="Yêu cầu đặc biệt của bạn..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#F58607] focus:border-[#F58607] transition-colors outline-none resize-none"
                ></textarea>
              </div>
            </div>
          </div>

          {/* Cột phải: Tóm tắt đơn hàng (Chiếm 1 phần, Sticky) */}
          <div className="lg:col-span-1">
            <div className="bg-[#192b4d] rounded-[2rem] shadow-2xl p-8 text-white sticky top-28">
              <h3 className="text-2xl font-bold mb-6 border-b border-gray-600 pb-4">
                Tóm tắt lịch đặt
              </h3>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between">
                  <span className="text-gray-300">Biển số xe:</span>
                  <span className="font-bold">
                    {formData.licensePlate || "..."}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Ngày:</span>
                  <span className="font-bold">{formData.date || "..."}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Giờ:</span>
                  <span className="font-bold">{formData.time || "..."}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Gói dịch vụ:</span>
                  <span className="font-bold capitalize">
                    {formData.servicePackage}
                  </span>
                </div>
              </div>

              <div className="border-t border-gray-600 pt-6 mb-8">
                <div className="flex justify-between items-center">
                  <span className="text-lg">Tổng cộng</span>
                  <span className="text-3xl font-extrabold text-[#F58607]">
                    {servicePrices[formData.servicePackage].toLocaleString(
                      "vi-VN",
                    )}
                    đ
                  </span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-[#F58607] hover:bg-orange-600 text-white text-lg font-bold rounded-full shadow-lg transform hover:-translate-y-1 transition-all duration-300"
              >
                Xác nhận đặt lịch
              </button>

              <p className="text-center text-xs text-gray-400 mt-4">
                Bằng việc xác nhận, bạn đồng ý với điều khoản dịch vụ của
                Moto Shine.
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
