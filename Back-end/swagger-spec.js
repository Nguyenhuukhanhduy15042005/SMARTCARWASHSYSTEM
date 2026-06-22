const swaggerSpec = {
  openapi: "3.0.0",
  info: {
    title: "Smart Car Wash System API Documentation",
    version: "1.0.0",
    description: "Tài liệu API và giao diện kiểm thử liên thông cho toàn bộ dự án Smart Car Wash System (Express + SQL Server).",
  },
  servers: [
    {
      url: "http://localhost:5000",
      description: "Development Server",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Nhập token JWT của bạn theo định dạng: Bearer <token_key> để thực hiện các API bảo mật.",
      },
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        properties: {
          message: {
            type: "string",
            example: "Có lỗi xảy ra trong quá trình xử lý.",
          },
        },
      },
      LoginRequest: {
        type: "object",
        required: ["account", "password"],
        properties: {
          account: { type: "string", example: "0901234567" },
          password: { type: "string", example: "password123" },
        },
      },
      RegisterStep1Request: {
        type: "object",
        required: ["fullName", "phone", "email"],
        properties: {
          fullName: { type: "string", example: "Nguyễn Văn A" },
          phone: { type: "string", example: "0901234567" },
          email: { type: "string", example: "nguyenvana@gmail.com" },
        },
      },
      RegisterStep2Request: {
        type: "object",
        required: ["fullName", "phone", "email", "password", "otp"],
        properties: {
          fullName: { type: "string", example: "Nguyễn Văn A" },
          phone: { type: "string", example: "0901234567" },
          email: { type: "string", example: "nguyenvana@gmail.com" },
          password: { type: "string", example: "password123" },
          otp: { type: "string", example: "123456" },
        },
      },
      RegisterRequest: {
        type: "object",
        required: ["fullName", "phone", "email", "password"],
        properties: {
          fullName: { type: "string", example: "Nguyễn Văn A" },
          phone: { type: "string", example: "0901234567" },
          email: { type: "string", example: "nguyenvana@gmail.com" },
          password: { type: "string", example: "password123" },
        },
      },
      BookingRequest: {
        type: "object",
        required: ["CustomerID", "BookingDate", "VehicleType", "LicensePlate", "ServiceIDs"],
        properties: {
          CustomerID: { type: "integer", example: 301, description: "ID của khách hàng đặt lịch" },
          BookingDate: { type: "string", format: "date-time", example: "2026-06-25T08:00:00.000Z", description: "Thời gian đặt lịch dạng ISO" },
          VehicleType: { type: "string", enum: ["CAR", "MOTORBIKE"], example: "CAR" },
          LicensePlate: { type: "string", example: "29A-12345" },
          ServiceIDs: {
            type: "array",
            items: { type: "integer" },
            example: [1, 2],
            description: "Mảng danh sách các ID của dịch vụ muốn chọn"
          },
          MachineID: { type: "integer", example: 1, description: "Sàn/khoang rửa xe chỉ định (Không bắt buộc)" },
          TotalPrice: { type: "number", example: 150000, description: "Tổng giá trị gốc (Không bắt buộc)" },
          FinalPrice: { type: "number", example: 150000, description: "Giá sau giảm giá (Không bắt buộc)" }
        },
      },
      FeedbackRequest: {
        type: "object",
        required: ["bookingId", "rating", "comments"],
        properties: {
          bookingId: { type: "integer", example: 10 },
          rating: { type: "integer", minimum: 1, maximum: 5, example: 5 },
          comments: { type: "string", example: "Dịch vụ rất tốt, nhân viên thân thiện!" },
        },
      },
    },
  },
  paths: {
    // --- 1. AUTHENTICATION ---
    "/api/auth/register-step1": {
      post: {
        tags: ["Auth"],
        summary: "Đăng ký Bước 1: Gửi mã OTP xác minh số điện thoại",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/RegisterStep1Request" } } },
        },
        responses: {
          200: { description: "Gửi OTP thành công" },
          400: { description: "Số điện thoại đã tồn tại hoặc không hợp lệ" },
        },
      },
    },
    "/api/auth/register-step2": {
      post: {
        tags: ["Auth"],
        summary: "Đăng ký Bước 2: Xác thực OTP",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/RegisterStep2Request" } } },
        },
        responses: {
          200: { description: "Xác thực OTP thành công" },
          400: { description: "Mã OTP không chính xác hoặc đã hết hạn" },
        },
      },
    },
    "/api/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Hoàn tất đăng ký tài khoản mới",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/RegisterRequest" } } },
        },
        responses: {
          201: { description: "Đăng ký tài khoản thành công" },
          400: { description: "Dữ liệu đầu vào không hợp lệ hoặc số điện thoại đã tồn tại" },
        },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Đăng nhập hệ thống bằng SĐT và mật khẩu",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/LoginRequest" } } },
        },
        responses: {
          200: {
            description: "Đăng nhập thành công, trả về Token và User Info",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    token: { type: "string" },
                    user: {
                      type: "object",
                      properties: {
                        userId: { type: "integer" },
                        fullName: { type: "string" },
                        role: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: "Thông tin đăng nhập không chính xác" },
        },
      },
    },

    // --- 2. USERS ---
    "/api/users/profile": {
      get: {
        tags: ["Users"],
        summary: "Lấy thông tin cá nhân của người dùng hiện tại",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Thành công" },
          401: { description: "Chưa xác thực" },
        },
      },
      put: {
        tags: ["Users"],
        summary: "Cập nhật thông tin cá nhân",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  fullName: { type: "string", example: "Nguyễn Văn B" },
                  email: { type: "string", example: "nguyenvanb@gmail.com" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Cập nhật thành công" },
          401: { description: "Chưa xác thực" },
        },
      },
    },
    "/api/users/members": {
      get: {
        tags: ["Users"],
        summary: "Lấy danh sách thành viên Loyalty (Yêu cầu Admin/Staff)",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Thành công" },
        },
      },
    },
    "/api/users/members/{userId}/tier": {
      put: {
        tags: ["Users"],
        summary: "Cập nhật hạng thành viên thủ công (Admin)",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "userId", in: "path", required: true, schema: { type: "integer" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  tierId: { type: "integer", example: 3, description: "1: Bronze, 2: Silver, 3: Gold, 4: Platinum" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Cập nhật hạng thành viên thành công" },
        },
      },
    },

    // --- 3. VEHICLES ---
    "/api/vehicles": {
      get: {
        tags: ["Vehicles"],
        summary: "Lấy danh sách xe của tài khoản đang đăng nhập",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Thành công" },
        },
      },
      post: {
        tags: ["Vehicles"],
        summary: "Thêm phương tiện mới",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["userId", "plateNumber", "vehicleType", "brand", "model", "color"],
                properties: {
                  userId: { type: "integer", example: 301, description: "ID của chủ sở hữu phương tiện" },
                  plateNumber: { type: "string", example: "29A-12345" },
                  vehicleType: { type: "string", enum: ["Xe máy", "Ô tô"], example: "Ô tô" },
                  brand: { type: "string", example: "Toyota" },
                  model: { type: "string", example: "Camry" },
                  color: { type: "string", example: "Trắng" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Thêm xe thành công" },
        },
      },
    },
    "/api/vehicles/{id}": {
      put: {
        tags: ["Vehicles"],
        summary: "Cập nhật thông tin phương tiện",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["plateNumber", "vehicleType", "brand", "model", "color"],
                properties: {
                  plateNumber: { type: "string", example: "29A-12345" },
                  vehicleType: { type: "string", enum: ["Xe máy", "Ô tô"], example: "Ô tô" },
                  brand: { type: "string", example: "Honda" },
                  model: { type: "string", example: "Wave" },
                  color: { type: "string", example: "Đen" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Cập nhật thành công" },
        },
      },
      delete: {
        tags: ["Vehicles"],
        summary: "Xóa phương tiện",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          200: { description: "Xóa xe thành công" },
        },
      },
    },

    // --- 4. BOOKINGS ---
    "/api/bookings": {
      get: {
        tags: ["Bookings"],
        summary: "Lấy danh sách lịch đặt xe của khách hàng hiện tại",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Thành công" },
        },
      },
      post: {
        tags: ["Bookings"],
        summary: "Tạo lịch đặt rửa xe mới",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/BookingRequest" } } },
        },
        responses: {
          201: { description: "Đặt lịch rửa xe thành công" },
          400: { description: "Thời gian không hợp lệ, trùng lịch hoặc vượt quá công suất sàn" },
        },
      },
    },
    "/api/bookings/{id}/transition": {
      post: {
        tags: ["Bookings"],
        summary: "Cập nhật trạng thái tiến trình đơn hàng (Cho Staff/Admin)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["nextStatus"],
                properties: {
                  nextStatus: { type: "integer", example: 2, description: "1: Đã đặt, 2: Đang rửa, 3: Đã rửa xong, 4: Hoàn thành, 5: Đã hủy" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Chuyển trạng thái đơn hàng thành công" },
        },
      },
    },
    "/api/bookings/{id}/apply-voucher": {
      post: {
        tags: ["Bookings"],
        summary: "Áp dụng Voucher giảm giá vào Booking",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["voucherCode"],
                properties: {
                  voucherCode: { type: "string", example: "KM50K" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Áp dụng voucher thành công" },
        },
      },
    },
    "/api/bookings/admin/all": {
      get: {
        tags: ["Bookings (Admin)"],
        summary: "Quản trị viên lấy danh sách toàn bộ các lịch đặt xe",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Thành công" },
        },
      },
    },

    // --- 5. LOYALTY ---
    "/api/loyalty/profile": {
      get: {
        tags: ["Loyalty"],
        summary: "Xem thông tin tích điểm, hạng thành viên hiện tại và ưu đãi",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Thành công" },
        },
      },
    },
    "/api/loyalty/transactions": {
      get: {
        tags: ["Loyalty"],
        summary: "Xem lịch sử tích lũy và sử dụng điểm",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Thành công" },
        },
      },
    },
    "/api/loyalty/redeem": {
      post: {
        tags: ["Loyalty"],
        summary: "Đổi điểm tích lũy lấy Voucher khuyến mãi",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["promotionId"],
                properties: {
                  promotionId: { type: "integer", example: 1 },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Đổi voucher thành công" },
          400: { description: "Không đủ điểm để đổi voucher" },
        },
      },
    },

    // --- 6. PAYMENTS ---
    "/api/payments": {
      post: {
        tags: ["Payments"],
        summary: "Khởi tạo thanh toán hóa đơn rửa xe qua VNPay hoặc tiền mặt",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["bookingId", "paymentMethod"],
                properties: {
                  bookingId: { type: "integer", example: 10 },
                  paymentMethod: { type: "string", enum: ["VNPay", "Tiền mặt"], example: "VNPay" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Khởi tạo thanh toán thành công, trả về liên kết VNPay (nếu chọn VNPay)" },
        },
      },
    },
    "/api/payments/{id}/confirm-cash": {
      post: {
        tags: ["Payments"],
        summary: "Nhân viên xác nhận đã nhận thanh toán bằng tiền mặt trực tiếp tại quầy",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          200: { description: "Xác nhận thanh toán tiền mặt thành công" },
        },
      },
    },

    // --- 7. FEEDBACKS ---
    "/api/feedbacks": {
      get: {
        tags: ["Feedbacks"],
        summary: "Lấy toàn bộ các đánh giá phản hồi (Yêu cầu Admin/Staff)",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Thành công" },
        },
      },
      post: {
        tags: ["Feedbacks"],
        summary: "Khách hàng gửi đánh giá chất lượng dịch vụ sau khi rửa xe xong",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/FeedbackRequest" } } },
        },
        responses: {
          201: { description: "Đánh giá dịch vụ thành công" },
        },
      },
    },

    // --- 8. ANALYTICS ---
    "/api/analytics/dashboard": {
      get: {
        tags: ["Analytics"],
        summary: "Lấy báo cáo thống kê tổng quan doanh thu, số lượt rửa xe theo ngày/tháng (Admin)",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Thành công" },
        },
      },
    },
  },
};

module.exports = swaggerSpec;
