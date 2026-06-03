import React, { useState } from "react";
import { Link } from "react-router-dom";

export default function Booking() {
  const [formData, setFormData] = useState({
    licensePlate: "",
    vehicleType: "4_cho",
    servicePackage: "standard",
    date: "",
    time: "",
    note: "",
  });

  const servicePrices = { standard: 100000, premium: 200000, vip: 350000 };

  const handleChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Dữ liệu đặt lịch:", formData);
    alert("Gửi yêu cầu đặt lịch thành công! (Check console để xem dữ liệu)");
  };

  return (
    <div className="min-h-screen bg-[#fcf7f0] font-sans text-[#192b4d] py-10 sm:py-16 px-4 sm:px-6 lg:px-12 flex flex-col items-center overflow-x-hidden">
      <div className="w-full max-w-7xl mx-auto booking-fade-in">
        <div className="mb-8 md:mb-10 flex justify-start">
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
            Quay lại trang chủ
          </Link>
        </div>

        <div className="text-center mb-10 md:mb-16 px-2">
          <h2 className="text-3xl sm:text-4xl md:text-6xl font-extrabold text-[#192b4d] tracking-tight mb-4 md:mb-5">
            Đặt Lịch <span className="text-[#F58607]">Rửa Xe</span>
          </h2>
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
            Chỉ với vài thao tác đơn giản, xế yêu của bạn sẽ được chăm sóc trọn
            vẹn tại AutoWash Pro.
          </p>
        </div>

        {/* Chuyển grid: gap-6 trên mobile, gap-12 trên PC */}
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12"
        >
          <div className="lg:col-span-8 space-y-8 md:space-y-10">
            <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-sm p-6 sm:p-8 md:p-12 border border-gray-100">
              <h3 className="text-xl md:text-3xl font-extrabold text-[#192b4d] mb-6 md:mb-10 flex items-center gap-3 md:gap-4">
                <div className="p-3 md:p-4 bg-orange-50 rounded-xl md:rounded-2xl text-[#F58607]">
                  <svg
                    className="w-6 h-6 md:w-7 md:h-7"
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
                </div>
                Thông tin phương tiện
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8">
                <div>
                  <label className="block text-sm md:text-base font-bold text-gray-700 mb-2 md:mb-3">
                    Biển số xe *
                  </label>
                  <input
                    type="text"
                    name="licensePlate"
                    value={formData.licensePlate}
                    onChange={handleChange}
                    placeholder="VD: 51H-123.45"
                    required
                    className="w-full px-5 py-4 md:px-6 md:py-5 bg-gray-50 border border-gray-200 rounded-xl md:rounded-2xl focus:ring-4 focus:ring-orange-500/20 focus:border-[#F58607] transition-all outline-none font-medium uppercase text-base md:text-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm md:text-base font-bold text-gray-700 mb-2 md:mb-3">
                    Loại xe *
                  </label>
                  <select
                    name="vehicleType"
                    value={formData.vehicleType}
                    onChange={handleChange}
                    className="w-full px-5 py-4 md:px-6 md:py-5 bg-gray-50 border border-gray-200 rounded-xl md:rounded-2xl focus:ring-4 focus:ring-orange-500/20 focus:border-[#F58607] transition-all outline-none text-base md:text-lg"
                  >
                    <option value="xe_may">Xe máy</option>
                    <option value="4_cho">Ô tô 4 chỗ</option>
                    <option value="7_cho">Ô tô 7 chỗ</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-sm p-6 sm:p-8 md:p-12 border border-gray-100">
              <h3 className="text-xl md:text-3xl font-extrabold text-[#192b4d] mb-6 md:mb-10 flex items-center gap-3 md:gap-4">
                <div className="p-3 md:p-4 bg-orange-50 rounded-xl md:rounded-2xl text-[#F58607]">
                  <svg
                    className="w-6 h-6 md:w-7 md:h-7"
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
                </div>
                Thời gian & Dịch vụ
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8 mb-8 md:mb-12">
                <div>
                  <label className="block text-sm md:text-base font-bold text-gray-700 mb-2 md:mb-3">
                    Ngày rửa xe *
                  </label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    required
                    className="w-full px-5 py-4 md:px-6 md:py-5 bg-gray-50 border border-gray-200 rounded-xl md:rounded-2xl focus:ring-4 focus:ring-orange-500/20 focus:border-[#F58607] transition-all outline-none font-medium text-base md:text-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm md:text-base font-bold text-gray-700 mb-2 md:mb-3">
                    Khung giờ *
                  </label>
                  <input
                    type="time"
                    name="time"
                    value={formData.time}
                    onChange={handleChange}
                    required
                    className="w-full px-5 py-4 md:px-6 md:py-5 bg-gray-50 border border-gray-200 rounded-xl md:rounded-2xl focus:ring-4 focus:ring-orange-500/20 focus:border-[#F58607] transition-all outline-none font-medium text-base md:text-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm md:text-base font-bold text-gray-700 mb-4 md:mb-5">
                  Gói dịch vụ *
                </label>
                <div className="space-y-4 md:space-y-5">
                  {[
                    {
                      id: "standard",
                      name: "Rửa xe tiêu chuẩn",
                      desc: "Rửa bọt tuyết, hút bụi, lau kính",
                      price: 100000,
                    },
                    {
                      id: "premium",
                      name: "Rửa xe cao cấp",
                      desc: "Gói tiêu chuẩn + Phủ sáp bóng (Wax)",
                      price: 200000,
                    },
                    {
                      id: "vip",
                      name: "Chăm sóc toàn diện (VIP)",
                      desc: "Gói cao cấp + Vệ sinh nội thất chuyên sâu",
                      price: 350000,
                    },
                  ].map((pkg) => (
                    <label
                      key={pkg.id}
                      className={`relative flex flex-col sm:flex-row sm:items-center justify-between p-5 md:p-8 rounded-xl md:rounded-2xl cursor-pointer transition-all duration-300 border-2 gap-3 sm:gap-0 ${formData.servicePackage === pkg.id ? "border-[#F58607] bg-orange-50/50 shadow-md" : "border-gray-100 bg-white hover:border-gray-300"}`}
                    >
                      <div className="flex items-center gap-4 md:gap-5">
                        <div
                          className={`flex items-center justify-center w-6 h-6 md:w-8 md:h-8 rounded-full border-2 shrink-0 ${formData.servicePackage === pkg.id ? "border-[#F58607] bg-[#F58607]" : "border-gray-300"}`}
                        >
                          {formData.servicePackage === pkg.id && (
                            <svg
                              className="w-4 h-4 md:w-5 md:h-5 text-white"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="3"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </div>
                        <div>
                          <span
                            className={`block font-extrabold text-lg md:text-xl ${formData.servicePackage === pkg.id ? "text-[#F58607]" : "text-gray-800"}`}
                          >
                            {pkg.name}
                          </span>
                          <span className="text-sm md:text-base text-gray-500 mt-1 block">
                            {pkg.desc}
                          </span>
                        </div>
                      </div>
                      <span className="font-black text-xl md:text-2xl text-[#192b4d] sm:pl-4">
                        {pkg.price.toLocaleString("vi-VN")}đ
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="mt-8 md:mt-12">
                <label className="block text-sm md:text-base font-bold text-gray-700 mb-2 md:mb-3">
                  Ghi chú thêm
                </label>
                <textarea
                  name="note"
                  value={formData.note}
                  onChange={handleChange}
                  rows="4"
                  placeholder="Yêu cầu đặc biệt của bạn?"
                  className="w-full px-5 py-4 md:px-6 md:py-5 bg-gray-50 border border-gray-200 rounded-xl md:rounded-2xl focus:ring-4 focus:ring-orange-500/20 focus:border-[#F58607] transition-all outline-none resize-none text-base md:text-lg"
                ></textarea>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4">
            <div className="bg-[#0f1a30] rounded-[2rem] md:rounded-[3rem] shadow-2xl p-6 sm:p-8 md:p-12 text-white lg:sticky lg:top-12 border border-gray-700/50">
              <h3 className="text-2xl md:text-3xl font-black mb-8 md:mb-10 flex items-center gap-3 md:gap-4 text-white">
                <div className="p-2 md:p-3 bg-orange-500/20 rounded-lg md:rounded-xl text-[#F58607]">
                  <svg
                    className="w-6 h-6 md:w-8 md:h-8"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                Tóm tắt lịch đặt
              </h3>
              <div className="space-y-6 md:space-y-8 mb-8 md:mb-12">
                <div className="flex justify-between items-start border-b border-gray-700/50 pb-4 md:pb-5">
                  <span className="text-gray-400 font-medium text-base md:text-lg">
                    Biển số
                  </span>
                  <span className="font-bold text-lg md:text-xl uppercase text-right max-w-[140px] md:max-w-[160px] break-words">
                    {formData.licensePlate || "- - -"}
                  </span>
                </div>
                <div className="flex justify-between items-start border-b border-gray-700/50 pb-4 md:pb-5">
                  <span className="text-gray-400 font-medium text-base md:text-lg">
                    Thời gian
                  </span>
                  <span className="font-bold text-right text-lg md:text-xl">
                    {formData.time || "--:--"} <br />
                    <span className="text-sm md:text-base text-gray-400 font-normal">
                      {formData.date || "Chưa chọn ngày"}
                    </span>
                  </span>
                </div>
                <div className="flex justify-between items-start border-b border-gray-700/50 pb-4 md:pb-5">
                  <span className="text-gray-400 font-medium text-base md:text-lg">
                    Dịch vụ
                  </span>
                  <span className="font-bold text-right text-lg md:text-xl">
                    {formData.servicePackage === "standard"
                      ? "Tiêu chuẩn"
                      : formData.servicePackage === "premium"
                        ? "Cao cấp"
                        : "VIP"}
                  </span>
                </div>
              </div>
              <div className="bg-white/5 rounded-2xl md:rounded-3xl p-6 md:p-8 mb-8 md:mb-10 text-center">
                <div className="text-gray-400 font-medium text-base md:text-lg mb-2 md:mb-3">
                  Tổng thanh toán
                </div>
                <div className="text-4xl md:text-5xl font-black text-[#F58607]">
                  {servicePrices[formData.servicePackage].toLocaleString(
                    "vi-VN",
                  )}
                  đ
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-5 md:py-6 bg-[#F58607] hover:bg-orange-600 text-white text-xl md:text-2xl font-extrabold rounded-xl md:rounded-2xl shadow-[0_10px_20px_rgba(245,134,7,0.3)] transition-all duration-300"
              >
                Xác nhận đặt lịch
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
