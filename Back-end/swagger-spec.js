const swaggerSpec = {
  openapi: "3.0.0",
  info: {
    title: "Smart Car Wash System API Documentation",
    version: "1.0.0",
    description: "Tài liệu API cho dự án Smart Car Wash System (Express + SQL Server).",
  },
  servers: [{ url: "http://localhost:5000", description: "Development Server" }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Nhập token JWT theo định dạng: Bearer <token_key>",
      },
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        properties: { message: { type: "string", example: "Có lỗi xảy ra." } },
      },
      LoginRequest: {
        type: "object",
        required: ["account", "password"],
        properties: {
          account:  { type: "string", example: "0901234567", description: "Email hoặc số điện thoại" },
          password: { type: "string", example: "password123" },
        },
      },
      RegisterStep1Request: {
        type: "object",
        required: ["fullName", "phone", "email"],
        properties: {
          fullName: { type: "string", example: "Nguyễn Văn A" },
          phone:    { type: "string", example: "0901234567" },
          email:    { type: "string", example: "nguyenvana@gmail.com" },
        },
      },
      RegisterStep2Request: {
        type: "object",
        required: ["fullName", "phone", "email", "password", "otp"],
        properties: {
          fullName: { type: "string", example: "Nguyễn Văn A" },
          phone:    { type: "string", example: "0901234567" },
          email:    { type: "string", example: "nguyenvana@gmail.com" },
          password: { type: "string", example: "MyPass@123" },
          otp:      { type: "string", example: "123456" },
        },
      },
      RegisterRequest: {
        type: "object",
        required: ["fullName", "phone", "email", "password"],
        properties: {
          fullName: { type: "string", example: "Nguyễn Văn A" },
          phone:    { type: "string", example: "0901234567" },
          email:    { type: "string", example: "nguyenvana@gmail.com" },
          password: { type: "string", example: "MyPass@123" },
        },
      },
      BookingRequest: {
        type: "object",
        required: ["CustomerID", "BookingDate", "VehicleType", "LicensePlate", "ServiceIDs"],
        properties: {
          CustomerID:   { type: "integer", example: 12 },
          BookingDate:  { type: "string", format: "date-time", example: "2026-06-25T08:00:00.000Z" },
          VehicleType:  { type: "string", enum: ["CAR", "MOTORBIKE"], example: "CAR" },
          LicensePlate: { type: "string", example: "29A-12345" },
          ServiceIDs:   { type: "array", items: { type: "integer" }, example: [1] },
          TotalPrice:   { type: "number", example: 150000 },
          FinalPrice:   { type: "number", example: 150000 },
          MachineID:    { type: "integer", example: 1, description: "Tùy chọn - chỉ định máy rửa" },
        },
      },
      FeedbackRequest: {
        type: "object",
        required: ["bookingId", "rating"],
        properties: {
          bookingId: { type: "integer", example: 10 },
          rating:    { type: "integer", minimum: 1, maximum: 5, example: 5 },
          comment:   { type: "string", example: "Dịch vụ rất tốt!" },
        },
      },
      PromotionRequest: {
        type: "object",
        required: ["PromoName", "DiscountPercent"],
        properties: {
          PromoName:       { type: "string", example: "Summer Wash 20%" },
          DiscountPercent: { type: "number", minimum: 0, maximum: 100, example: 20 },
          EndDate:         { type: "string", format: "date", example: "2026-12-31", description: "Tùy chọn" },
        },
      },
      VehicleRequest: {
        type: "object",
        required: ["plateNumber", "vehicleType", "brand", "model", "color"],
        properties: {
          plateNumber:  { type: "string", example: "29A-12345" },
          vehicleType:  { type: "string", enum: ["CAR", "MOTORBIKE"], example: "CAR" },
          brand:        { type: "string", example: "Toyota" },
          model:        { type: "string", example: "Camry" },
          color:        { type: "string", example: "Trắng" },
        },
      },
      RefundRequestBody: {
        type: "object",
        required: ["paymentId", "reason"],
        properties: {
          paymentId: { type: "integer", example: 5, description: "ID thanh toán cần hoàn" },
          reason:    { type: "string",  example: "Khách yêu cầu hủy do bận đột xuất" },
        },
      },
      RefundReviewBody: {
        type: "object",
        required: ["action"],
        properties: {
          action:       { type: "string", enum: ["approve", "reject"], example: "approve" },
          refundAmount: { type: "number", example: 150000, description: "Tùy chọn - Admin có thể điều chỉnh (không vượt quá số đã trả)" },
          note:         { type: "string", example: "Duyệt do lỗi từ phía hệ thống" },
        },
      },
    },
  },
  paths: {

    // ── AUTH ──────────────────────────────────────────────────────────────────
    "/api/auth/register-step1": {
      post: {
        tags: ["Auth"],
        summary: "Đăng ký Bước 1 - Gửi mã OTP xác minh email",
        security: [],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/RegisterStep1Request" } } } },
        responses: {
          200: { description: "OTP đã gửi về email" },
          400: { description: "Email hoặc SĐT đã tồn tại" },
        },
      },
    },
    "/api/auth/register-step2": {
      post: {
        tags: ["Auth"],
        summary: "Đăng ký Bước 2 - Xác thực OTP và tạo tài khoản",
        security: [],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/RegisterStep2Request" } } } },
        responses: {
          201: { description: "Đăng ký thành công" },
          400: { description: "OTP sai hoặc hết hạn" },
        },
      },
    },
    "/api/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Đăng ký trực tiếp không cần OTP (dùng cho test/demo)",
        security: [],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/RegisterRequest" } } } },
        responses: {
          201: { description: "Đăng ký thành công" },
          400: { description: "Email hoặc SĐT đã tồn tại" },
        },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Đăng nhập bằng email/SĐT và mật khẩu",
        security: [],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/LoginRequest" } } } },
        responses: {
          200: {
            description: "Đăng nhập thành công - trả về JWT token",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    token: { type: "string", example: "eyJhbGci..." },
                    user: {
                      type: "object",
                      properties: {
                        fullName: { type: "string" },
                        roleId:   { type: "integer", description: "1=Admin, 2=Staff, 3=Member" },
                        role:     { type: "string",  description: "admin/staff/user" },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: "Sai tài khoản hoặc mật khẩu" },
        },
      },
    },
    "/api/auth/google-login": {
      post: {
        tags: ["Auth"],
        summary: "Đăng nhập bằng Google OAuth",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email"],
                properties: {
                  email:    { type: "string", example: "nguyenvana@gmail.com" },
                  fullName: { type: "string", example: "Nguyễn Văn A" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Đăng nhập Google thành công" },
          400: { description: "Thiếu thông tin email" },
        },
      },
    },

    // ── USERS ─────────────────────────────────────────────────────────────────
    "/api/users/me": {
      get: {
        tags: ["Users"],
        summary: "Lấy thông tin tài khoản đang đăng nhập (dùng token)",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Thành công - trả về UserID, FullName, Email, PhoneNumber, RoleID, Avatar" },
          401: { description: "Chưa đăng nhập" },
          404: { description: "Không tìm thấy người dùng" },
        },
      },
      put: {
        tags: ["Users"],
        summary: "Cập nhật thông tin cá nhân và đổi mật khẩu",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["fullName", "phone", "email"],
                properties: {
                  fullName:    { type: "string",  example: "Nguyễn Văn B" },
                  phone:       { type: "string",  example: "0912345678" },
                  email:       { type: "string",  example: "b@gmail.com" },
                  newPassword: { type: "string",  example: "NewPass@123", description: "Để trống nếu không đổi mật khẩu" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Cập nhật thành công" },
          400: { description: "SĐT không hợp lệ hoặc đã tồn tại" },
        },
      },
    },
    "/api/users/avatar": {
      post: {
        tags: ["Users"],
        summary: "Upload ảnh đại diện (tối đa 2MB, JPG/PNG/WEBP)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  avatar: { type: "string", format: "binary", description: "File ảnh JPG/PNG/WEBP" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Upload thành công, trả về avatarUrl" },
          400: { description: "File không hợp lệ hoặc quá 2MB" },
        },
      },
    },
    "/api/users/profile": {
      get: {
        tags: ["Users"],
        summary: "Lấy thông tin profile + hạng thành viên của người dùng",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "userId", in: "query", required: true, schema: { type: "integer", example: 12 }, description: "ID người dùng" },
        ],
        responses: {
          200: {
            description: "Thành công",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    UserID:            { type: "integer", example: 12 },
                    FullName:          { type: "string",  example: "Nguyễn Văn A" },
                    PhoneNumber:       { type: "string",  example: "0912345678" },
                    Email:             { type: "string",  example: "a@gmail.com" },
                    CurrentPoints:     { type: "integer", example: 150 },
                    AccumulatedPoints: { type: "integer", example: 300 },
                    TierName:          { type: "string",  example: "Silver" },
                    DiscountRate:      { type: "number",  example: 5 },
                  },
                },
              },
            },
          },
          404: { description: "Không tìm thấy người dùng" },
        },
      },
      put: {
        tags: ["Users"],
        summary: "Cập nhật thông tin profile (FullName, Email, PhoneNumber)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  UserID:      { type: "integer", example: 12 },
                  FullName:    { type: "string",  example: "Nguyễn Văn B" },
                  Email:       { type: "string",  example: "b@gmail.com" },
                  PhoneNumber: { type: "string",  example: "0912345678" },
                },
              },
            },
          },
        },
        responses: { 200: { description: "Cập nhật thành công" } },
      },
    },
    "/api/users/members": {
      get: {
        tags: ["Users"],
        summary: "Lấy danh sách thành viên kèm hạng và điểm (Admin/Staff)",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Thành công" } },
      },
    },
    "/api/users/members/{userId}/tier": {
      put: {
        tags: ["Users"],
        summary: "Cập nhật hạng thành viên thủ công (Admin/Staff)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "userId", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  tierId:            { type: "integer", example: 3, description: "1=Bronze, 2=Silver, 3=Gold, 4=Platinum" },
                  currentPoints:     { type: "integer", example: 300 },
                  accumulatedPoints: { type: "integer", example: 500 },
                },
              },
            },
          },
        },
        responses: { 200: { description: "Cập nhật hạng thành công" } },
      },
    },
    "/api/users/tiers": {
      get: {
        tags: ["Users"],
        summary: "Lấy danh sách tất cả hạng thành viên (Bronze/Silver/Gold/Platinum)",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Thành công" } },
      },
    },
    "/api/users/{userId}": {
      delete: {
        tags: ["Users"],
        summary: "Xóa tài khoản người dùng (Admin)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "userId", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          200: { description: "Xóa tài khoản thành công" },
          400: { description: "Không thể tự xóa tài khoản của mình" },
          403: { description: "Chỉ Admin mới được xóa" },
          404: { description: "Không tìm thấy người dùng" },
        },
      },
    },

    // ── VEHICLES ──────────────────────────────────────────────────────────────
    "/api/vehicles/users": {
      get: {
        tags: ["Vehicles"],
        summary: "Lấy danh sách khách hàng để chọn chủ xe (Admin/Staff)",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Thành công" } },
      },
    },
    "/api/vehicles": {
      get: {
        tags: ["Vehicles"],
        summary: "Lấy danh sách xe (Member chỉ thấy xe của mình)",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "userId", in: "query", schema: { type: "integer" }, description: "Lọc theo chủ xe (Admin/Staff)" },
          { name: "search", in: "query", schema: { type: "string"  }, description: "Tìm theo biển số/hãng/màu/tên chủ" },
        ],
        responses: { 200: { description: "Thành công" } },
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
                allOf: [
                  { $ref: "#/components/schemas/VehicleRequest" },
                  {
                    type: "object",
                    properties: {
                      userId: { type: "integer", example: 12, description: "Chủ xe (tự lấy từ token nếu là Member)" },
                    },
                  },
                ],
              },
            },
          },
        },
        responses: {
          201: { description: "Thêm xe thành công" },
          400: { description: "Thiếu thông tin hoặc biển số không hợp lệ" },
          409: { description: "Biển số đã tồn tại" },
        },
      },
    },
    "/api/vehicles/{id}": {
      get: {
        tags: ["Vehicles"],
        summary: "Lấy chi tiết một phương tiện",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          200: { description: "Thành công" },
          403: { description: "Không có quyền xem xe này" },
          404: { description: "Không tìm thấy xe" },
        },
      },
      put: {
        tags: ["Vehicles"],
        summary: "Cập nhật thông tin phương tiện",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/VehicleRequest" } } } },
        responses: {
          200: { description: "Cập nhật thành công" },
          403: { description: "Không có quyền chỉnh sửa xe này" },
          404: { description: "Không tìm thấy xe" },
          409: { description: "Biển số đã được dùng bởi xe khác" },
        },
      },
      delete: {
        tags: ["Vehicles"],
        summary: "Xóa phương tiện",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          200: { description: "Xóa xe thành công" },
          403: { description: "Không có quyền xóa xe này" },
          404: { description: "Không tìm thấy xe" },
        },
      },
    },

    // ── TIMESLOTS ─────────────────────────────────────────────────────────────
    "/api/timeslots/machines": {
      get: {
        tags: ["Timeslots"],
        summary: "Lấy danh sách các máy rửa xe hiện có",
        responses: {
          200: { description: "Lấy danh sách máy thành công" },
          500: { description: "Lỗi hệ thống" },
        },
      },
    },
    "/api/timeslots/services": {
      get: {
        tags: ["Timeslots"],
        summary: "Lấy danh sách dịch vụ và thời gian rửa dự kiến",
        responses: {
          200: { description: "Lấy danh sách dịch vụ thành công" },
          500: { description: "Lỗi hệ thống" },
        },
      },
    },
    "/api/timeslots": {
      get: {
        tags: ["Timeslots"],
        summary: "Lấy danh sách các khung giờ trống trong ngày",
        parameters: [
          { name: "machineId", in: "query", required: true, schema: { type: "integer", example: 1 }, description: "ID của máy rửa xe" },
          { name: "date", in: "query", required: true, schema: { type: "string", format: "date", example: "2026-07-03" }, description: "Ngày cần kiểm tra (YYYY-MM-DD)" },
        ],
        responses: {
          200: { description: "Thành công, trả về danh sách khung giờ kèm trạng thái trống" },
          400: { description: "Ngày không đúng định dạng" },
          500: { description: "Lỗi hệ thống" },
        },
      },
    },
    "/api/timeslots/check": {
      post: {
        tags: ["Timeslots"],
        summary: "Kiểm tra tính khả dụng của một khung giờ cụ thể",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["machineId", "date", "time"],
                properties: {
                  machineId:   { type: "integer", example: 1 },
                  date:        { type: "string", format: "date", example: "2026-07-03" },
                  time:        { type: "string", example: "09:30" },
                  duration:    { type: "integer", default: 30 },
                  vehicleType: { type: "string", example: "CAR" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Khung giờ trống hoặc đã có lịch" },
          400: { description: "Dữ liệu đầu vào không hợp lệ" },
          500: { description: "Lỗi hệ thống" },
        },
      },
    },
    "/api/timeslots/overview": {
      get: {
        tags: ["Timeslots"],
        summary: "Xem tổng quan trạng thái hoạt động của các máy rửa xe trong ngày",
        parameters: [
          { name: "date", in: "query", required: true, schema: { type: "string", format: "date", example: "2026-07-03" } },
        ],
        responses: {
          200: { description: "Lấy tổng quan thành công" },
          500: { description: "Lỗi hệ thống" },
        },
      },
    },
    "/api/timeslots/book": {
      post: {
        tags: ["Timeslots"],
        summary: "Đặt lịch rửa xe nâng cao (chỉ định máy rửa)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["machineId", "serviceId", "date", "time", "customerName", "customerPhone", "vehicleType"],
                properties: {
                  machineId:     { type: "integer", example: 1 },
                  serviceId:     { type: "integer", example: 1 },
                  date:          { type: "string", format: "date", example: "2026-07-03" },
                  time:          { type: "string", example: "09:30" },
                  duration:      { type: "integer", default: 30 },
                  customerName:  { type: "string", example: "Nguyễn Văn A" },
                  customerPhone: { type: "string", example: "0912345678" },
                  vehicleType:   { type: "string", enum: ["CAR", "BIKE"], example: "CAR" },
                  licensePlate:  { type: "string", example: "23G-24532" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Đặt lịch nâng cao thành công" },
          400: { description: "Khung giờ đã bị trùng, sai định dạng, hoặc máy bận" },
          500: { description: "Lỗi hệ thống" },
        },
      },
    },

    // ── BOOKINGS ──────────────────────────────────────────────────────────────
    "/api/bookings": {
      get: {
        tags: ["Bookings"],
        summary: "Lấy danh sách booking (Member chỉ thấy của mình, Staff/Admin thấy tất cả trừ Status=1)",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "customerId", in: "query", schema: { type: "integer" }, description: "Lọc theo khách hàng" },
        ],
        responses: { 200: { description: "Thành công" } },
      },
      post: {
        tags: ["Bookings"],
        summary: "Tạo lịch đặt rửa xe mới",
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/BookingRequest" } } } },
        responses: {
          201: { description: "Đặt lịch thành công, trả về BookingID và MachineID" },
          400: { description: "Thời gian không hợp lệ, trùng lịch hoặc đã có 2 đơn chờ" },
          409: { description: "Tất cả máy rửa xe đã đầy khung giờ này" },
        },
      },
    },
    "/api/bookings/{id}": {
      get: {
        tags: ["Bookings"],
        summary: "Lấy chi tiết một lịch đặt xe",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          200: { description: "Thành công" },
          404: { description: "Không tìm thấy booking" },
        },
      },
      delete: {
        tags: ["Bookings"],
        summary: "Khách xóa booking đã hoàn thành hoặc đã hủy khỏi lịch sử",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          200: { description: "Xóa thành công" },
          400: { description: "Chỉ xóa được đơn hoàn thành (4) hoặc đã hủy (5)" },
          403: { description: "Không có quyền xóa booking này" },
          404: { description: "Không tìm thấy booking" },
        },
      },
    },
    "/api/bookings/{id}/license-plate": {
      put: {
        tags: ["Bookings"],
        summary: "Staff hoặc Admin cập nhật biển số xe của lịch đặt (Staff chỉ được sửa hôm nay ở trạng thái Chờ rửa/Đang rửa)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["licensePlate"],
                properties: {
                  licensePlate: { type: "string", example: "29A-12345" }
                }
              }
            }
          }
        },
        responses: {
          200: { description: "Cập nhật biển số thành công" },
          400: { description: "Biển số xe không hợp lệ hoặc sai điều kiện sửa của Staff" },
          404: { description: "Không tìm thấy lịch đặt" }
        }
      }
    },
    "/api/bookings/{id}/transition": {
      post: {
        tags: ["Bookings"],
        summary: "Cập nhật trạng thái FSM (Staff/Admin)",
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
                  nextStatus: { type: "integer", example: 2, description: "1=Chờ duyệt, 2=Đã nhận, 3=Đang rửa, 4=Hoàn thành, 5=Đã hủy" },
                },
              },
            },
          },
        },
        responses: { 200: { description: "Cập nhật trạng thái thành công" } },
      },
    },
    "/api/bookings/{id}/apply-voucher": {
      post: {
        tags: ["Bookings"],
        summary: "Áp dụng hoặc gỡ voucher khỏi booking",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  memberPromoId: { type: "integer", example: 1, description: "ID voucher trong ví (null để gỡ voucher)" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Áp dụng/gỡ voucher thành công, trả về FinalPrice mới" },
          400: { description: "Chỉ áp dụng được khi booking Status=1" },
          404: { description: "Không tìm thấy voucher trong ví" },
        },
      },
    },
    "/api/bookings/admin/all": {
      get: {
        tags: ["Bookings"],
        summary: "Lấy toàn bộ danh sách booking có bộ lọc (Admin)",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "status",      in: "query", schema: { type: "integer" }, description: "Lọc theo trạng thái 1-5" },
          { name: "vehicleType", in: "query", schema: { type: "string"  }, description: "CAR hoặc MOTORBIKE" },
          { name: "search",      in: "query", schema: { type: "string"  }, description: "Tìm theo tên/biển số/SĐT" },
          { name: "fromDate",    in: "query", schema: { type: "string", format: "date" } },
          { name: "toDate",      in: "query", schema: { type: "string", format: "date" } },
        ],
        responses: { 200: { description: "Thành công" } },
      },
    },
    "/api/bookings/admin/{id}": {
      get: {
        tags: ["Bookings"],
        summary: "Chi tiết booking cho Admin",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Thành công" } },
      },
      delete: {
        tags: ["Bookings"],
        summary: "Admin xóa vĩnh viễn booking khỏi DB (bao gồm feedback, payment, detail)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Xóa thành công" } },
      },
      put: {
        tags: ["Bookings"],
        summary: "Admin cập nhật toàn bộ thông tin đơn đặt lịch",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["fullName", "phone", "licensePlate", "vehicleType", "serviceIds", "bookingDate", "bookingTime", "machineId", "totalPrice", "finalPrice"],
                properties: {
                  fullName: { type: "string", example: "Nguyễn Văn A" },
                  phone: { type: "string", example: "0901234567" },
                  licensePlate: { type: "string", example: "29A-12345" },
                  vehicleType: { type: "string", enum: ["CAR", "BIKE"], example: "CAR" },
                  serviceIds: { type: "array", items: { type: "integer" }, example: [2, 14] },
                  bookingDate: { type: "string", format: "date", example: "2026-07-19" },
                  bookingTime: { type: "string", example: "16:30" },
                  machineId: { type: "integer", example: 4 },
                  totalPrice: { type: "number", example: 180000 },
                  finalPrice: { type: "number", example: 180000 }
                }
              }
            }
          }
        },
        responses: {
          200: { description: "Cập nhật đơn đặt lịch thành công" },
          400: { description: "Thiếu thông tin bắt buộc" },
          409: { description: "Lịch hẹn bị trùng hoặc máy rửa bận/bảo trì" },
          440: { description: "Không tìm thấy khách hàng hoặc lịch đặt" }
        }
      },
    },
    "/api/bookings/admin/create": {
      post: {
        tags: ["Bookings"],
        summary: "Admin tạo đơn rửa xe trực tiếp (mặc định Status=2)",
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/BookingRequest" } } } },
        responses: { 201: { description: "Tạo booking thành công" } },
      },
    },
    "/api/bookings/admin/{id}/status": {
      put: {
        tags: ["Bookings"],
        summary: "Admin cập nhật trạng thái booking",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { status: { type: "integer", example: 4 } },
              },
            },
          },
        },
        responses: { 200: { description: "Cập nhật thành công" } },
      },
    },

    // ── PAYMENTS ──────────────────────────────────────────────────────────────
    "/api/payments": {
      post: {
        tags: ["Payments"],
        summary: "Tạo thanh toán (VNPay hoặc tiền mặt)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["bookingId", "method"],
                properties: {
                  bookingId: { type: "integer", example: 10 },
                  method:    { type: "string", enum: ["vnpay", "cash"], example: "vnpay",
                               description: "vnpay=online, cash=tiền mặt (Bronze/Silver đặt cọc 10%, Gold/Platinum miễn phí)" },
                  amount:    { type: "number", example: 150000, description: "Tùy chọn, mặc định lấy FinalPrice của booking" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Thành công - trả về paymentUrl nếu dùng VNPay, depositAmount, remainingAmount" },
          400: { description: "Booking đã thanh toán hoặc đã hủy" },
        },
      },
    },
    "/api/payments/tier": {
      get: {
        tags: ["Payments"],
        summary: "Lấy hạng thành viên và thông tin đặt cọc của người dùng hiện tại",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Thành công",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    tierID:      { type: "integer", example: 2, description: "1=Bronze, 2=Silver, 3=Gold, 4=Platinum" },
                    tierName:    { type: "string",  example: "Silver" },
                    needDeposit: { type: "boolean", example: true, description: "true = cần đặt cọc 10%" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/payments/history": {
      get: {
        tags: ["Payments"],
        summary: "Lịch sử thanh toán của người dùng hiện tại",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "page",  in: "query", schema: { type: "integer", default: 1  } },
          { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
        ],
        responses: { 200: { description: "Thành công - trả về data[], total, page, limit" } },
      },
    },
    "/api/payments/vnpay-return": {
      get: {
        tags: ["Payments"],
        summary: "Callback VNPay sau thanh toán (VNPay tự gọi, không cần test thủ công)",
        security: [],
        parameters: [
          { name: "vnp_ResponseCode", in: "query", schema: { type: "string" }, description: "00=thành công" },
          { name: "vnp_TxnRef",       in: "query", schema: { type: "string" }, description: "bookingId_method_amount_timestamp" },
          { name: "vnp_SecureHash",   in: "query", schema: { type: "string" }, description: "Chữ ký HMAC-SHA512" },
        ],
        responses: { 302: { description: "Redirect về frontend: /payments/result?status=success|failed" } },
      },
    },
    "/api/payments/{id}/refund": {
      post: {
        tags: ["Payments"],
        summary: "Hoàn tiền và chuyển booking về trạng thái Đã hủy",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" }, description: "PaymentID" }],
        responses: {
          200: { description: "Hoàn tiền thành công" },
          400: { description: "Xe đang rửa hoặc đã hoàn thành, không thể hoàn tiền" },
        },
      },
    },
    "/api/payments/{id}/confirm-cash": {
      post: {
        tags: ["Payments"],
        summary: "Nhân viên xác nhận đã thu tiền mặt tại quầy",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" }, description: "PaymentID" }],
        responses: {
          200: { description: "Xác nhận thu tiền thành công" },
          400: { description: "Không phải thanh toán tiền mặt" },
        },
      },
    },

    // ── PROMOTIONS ────────────────────────────────────────────────────────────
    "/api/promotions": {
      get: {
        tags: ["Promotions"],
        summary: "Lấy danh sách khuyến mãi",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "search", in: "query", schema: { type: "string"  }, description: "Tìm theo tên khuyến mãi" },
          { name: "status", in: "query", schema: { type: "string", enum: ["all", "active", "expired"] } },
        ],
        responses: { 200: { description: "Thành công - trả về Status: Active/Expired, WalletCount, UsedCount" } },
      },
      post: {
        tags: ["Promotions"],
        summary: "Tạo khuyến mãi mới (Admin/Staff)",
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/PromotionRequest" } } } },
        responses: {
          201: { description: "Tạo khuyến mãi thành công" },
          400: { description: "Thiếu tên hoặc % giảm không hợp lệ" },
        },
      },
    },
    "/api/promotions/{id}": {
      get: {
        tags: ["Promotions"],
        summary: "Lấy chi tiết một khuyến mãi",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Thành công" } },
      },
      put: {
        tags: ["Promotions"],
        summary: "Cập nhật khuyến mãi (Admin/Staff)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/PromotionRequest" } } } },
        responses: { 200: { description: "Cập nhật thành công" } },
      },
      delete: {
        tags: ["Promotions"],
        summary: "Xóa khuyến mãi kèm toàn bộ ví voucher liên quan (Admin)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Xóa thành công" } },
      },
    },
    "/api/promotions/{id}/expire": {
      patch: {
        tags: ["Promotions"],
        summary: "Chuyển khuyến mãi sang hết hạn (Staff/Admin)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Đã chuyển sang hết hạn" } },
      },
    },
    "/api/promotions/{id}/activate": {
      patch: {
        tags: ["Promotions"],
        summary: "Kích hoạt lại khuyến mãi đã hết hạn - gia hạn thêm 30 ngày (Admin)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  endDate: { type: "string", format: "date", description: "Ngày hết hạn tùy chỉnh (để trống = +30 ngày)" },
                },
              },
            },
          },
        },
        responses: { 200: { description: "Kích hoạt lại thành công" } },
      },
    },

    // ── FEEDBACKS ─────────────────────────────────────────────────────────────
    "/api/feedbacks": {
      get: {
        tags: ["Feedbacks"],
        summary: "Lấy danh sách feedback (Admin/Staff)",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "rating", in: "query", schema: { type: "integer", minimum: 1, maximum: 5 } },
          { name: "search", in: "query", schema: { type: "string" }, description: "Tìm theo comment/tên/biển số/dịch vụ" },
        ],
        responses: { 200: { description: "Thành công - trả về data[] và stats (TotalFeedback, AverageRating,...)" } },
      },
      post: {
        tags: ["Feedbacks"],
        summary: "Khách hàng gửi đánh giá sau khi booking hoàn thành (1 booking chỉ 1 feedback)",
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/FeedbackRequest" } } } },
        responses: {
          201: { description: "Gửi đánh giá thành công" },
          409: { description: "Booking này đã có feedback rồi" },
        },
      },
    },
    "/api/feedbacks/{id}": {
      get: {
        tags: ["Feedbacks"],
        summary: "Lấy chi tiết một feedback",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Thành công" } },
      },
      delete: {
        tags: ["Feedbacks"],
        summary: "Xóa feedback (Admin/Staff)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Xóa thành công" } },
      },
    },

    // ── NOTIFICATIONS ─────────────────────────────────────────────────────────
    "/api/notifications": {
      get: {
        tags: ["Notifications"],
        summary: "Lấy danh sách thông báo của người dùng",
        parameters: [
          { name: "userId", in: "query", required: true, schema: { type: "integer", example: 12 } },
        ],
        responses: {
          200: {
            description: "Thành công",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      NotificationID: { type: "integer" },
                      UserID:         { type: "integer" },
                      BookingID:      { type: "integer" },
                      Title:          { type: "string" },
                      Message:        { type: "string" },
                      IsRead:         { type: "boolean" },
                      Type:           { type: "string" },
                      CreatedDate:    { type: "string", format: "date-time" },
                    },
                  },
                },
              },
            },
          },
          400: { description: "Thiếu userId" },
          500: { description: "Lỗi hệ thống" },
        },
      },
    },
    "/api/notifications/{id}/read": {
      put: {
        tags: ["Notifications"],
        summary: "Đánh dấu một thông báo là đã đọc",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer", example: 1 } },
        ],
        responses: {
          200: { description: "Đã cập nhật trạng thái đã đọc thành công" },
          500: { description: "Lỗi hệ thống" },
        },
      },
    },

    // ── LOYALTY ───────────────────────────────────────────────────────────────
    "/api/loyalty/profile": {
      get: {
        tags: ["Loyalty"],
        summary: "Xem thông tin tích điểm và hạng thành viên",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "userId", in: "query", required: true, schema: { type: "integer", example: 12 } },
        ],
        responses: { 200: { description: "Thành công" } },
      },
    },
    "/api/loyalty/transactions": {
      get: {
        tags: ["Loyalty"],
        summary: "Xem lịch sử tích lũy và sử dụng điểm",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "customerId", in: "query", required: true, schema: { type: "integer", example: 12 } },
        ],
        responses: { 200: { description: "Thành công" } },
      },
    },
    "/api/loyalty/redeem": {
      post: {
        tags: ["Loyalty"],
        summary: "Đổi điểm tích lũy lấy voucher khuyến mãi",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["userId", "RewardCode", "RewardPointsUsed", "promotionId"],
                properties: {
                  userId:           { type: "integer", example: 12 },
                  RewardCode:       { type: "string",  example: "PR-1" },
                  RewardPointsUsed: { type: "integer", example: 100 },
                  promotionId:      { type: "integer", example: 1 },
                  bookingId:        { type: "integer", example: null, description: "Tùy chọn" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Đổi voucher thành công" },
          400: { description: "Không đủ điểm hoặc thiếu thông tin" },
        },
      },
    },
    "/api/loyalty/my-vouchers": {
      get: {
        tags: ["Loyalty"],
        summary: "Lấy danh sách voucher trong ví của người dùng hiện tại",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Thành công" } },
      },
    },

    // ── ANALYTICS ─────────────────────────────────────────────────────────────
    "/api/analytics/dashboard": {
      get: {
        tags: ["Analytics"],
        summary: "Thống kê tổng quan doanh thu và số lượt rửa xe (Admin)",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Thành công" } },
      },
    },
    "/api/analytics/summary": {
      get: {
        tags: ["Analytics"],
        summary: "Thống kê tổng quan nhanh cho analytics",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "range",
            in: "query",
            schema: { type: "string", enum: ["7d", "30d", "90d", "month", "year", "all"], default: "30d" },
            description: "Khoảng thời gian thống kê",
          },
        ],
        responses: {
          200: { description: "Thành công - trả về meta và summary" },
          500: { description: "Lỗi khi tải tổng quan analytics" },
        },
      },
    },

    // ── SURVEYS ───────────────────────────────────────────────────────────────
    "/api/surveys/form": {
      get: {
        tags: ["Surveys"],
        summary: "Lấy thông tin Google Form khảo sát hiện tại",
        description: "Trả về link Google Form/Response Sheet dùng để thu thập external survey dataset.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Lấy thông tin survey form thành công" },
          500: { description: "Lỗi khi lấy thông tin form khảo sát" },
        },
      },
      post: {
        tags: ["Surveys"],
        summary: "Tạo/lưu Google Form khảo sát mới",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title", "formUrl"],
                properties: {
                  title:            { type: "string", example: "Khảo Sát Khách Hàng Dịch Vụ Rửa Xe" },
                  description:      { type: "string", example: "Khảo sát người dùng ngoài hệ thống." },
                  formUrl:          { type: "string", example: "https://docs.google.com/forms/d/e/xxx/viewform" },
                  responseSheetUrl: { type: "string", example: "https://docs.google.com/spreadsheets/d/xxx" },
                  targetAudience:   { type: "string", example: "Sinh viên FPT, nhân viên FPT, chủ xe" },
                  status:           { type: "boolean", example: true },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Tạo survey form thành công" },
          400: { description: "Dữ liệu form không hợp lệ" },
          500: { description: "Lỗi khi tạo survey form" },
        },
      },
    },
    "/api/surveys/form/{id}": {
      put: {
        tags: ["Surveys"],
        summary: "Cập nhật Google Form khảo sát",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" }, description: "SurveyFormID" },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title", "formUrl"],
                properties: {
                  title:            { type: "string", example: "Khảo Sát Khách Hàng Dịch Vụ Rửa Xe" },
                  description:      { type: "string", example: "Khảo sát người dùng ngoài hệ thống." },
                  formUrl:          { type: "string", example: "https://docs.google.com/forms/d/e/xxx/viewform" },
                  responseSheetUrl: { type: "string", example: "https://docs.google.com/spreadsheets/d/xxx" },
                  targetAudience:   { type: "string", example: "Sinh viên FPT, nhân viên FPT, chủ xe" },
                  status:           { type: "boolean", example: true },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Cập nhật survey form thành công" },
          400: { description: "Dữ liệu form không hợp lệ" },
          404: { description: "Không tìm thấy survey form" },
          500: { description: "Lỗi khi cập nhật survey form" },
        },
      },
    },
    "/api/surveys/internal-summary": {
      get: {
        tags: ["Surveys"],
        summary: "Lấy thống kê feedback nội bộ phục vụ survey",
        description: "Summary nhỏ từ FEEDBACK sau booking, dùng như internal signal bên cạnh external Google Form.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Lấy internal summary thành công" },
          500: { description: "Lỗi khi lấy internal survey summary" },
        },
      },
    },
    "/api/surveys/research-dataset": {
      get: {
        tags: ["Surveys"],
        summary: "Export internal research dataset cho loyalty tier progression",
        description: "Tổng hợp dữ liệu user, booking behavior, spending, feedback, loyalty transaction và reward usage để phục vụ research/ML.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Lấy research dataset thành công" },
          500: { description: "Lỗi khi lấy research dataset" },
        },
      },
    },

    // ── REFUND REQUESTS ───────────────────────────────────────────────────────
    "/api/refund-requests": {
      post: {
        tags: ["Refund Requests"],
        summary: "Staff tạo yêu cầu hoàn tiền cho khách",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/RefundRequestBody" } } },
        },
        responses: {
          201: {
            description: "Tạo yêu cầu thành công, đang chờ Admin duyệt",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message:        { type: "string",  example: "Tạo yêu cầu hoàn tiền thành công, đang chờ Admin duyệt" },
                    refundId:       { type: "integer", example: 1 },
                    paymentId:      { type: "integer", example: 5 },
                    bookingId:      { type: "integer", example: 12 },
                    customerName:   { type: "string",  example: "Nguyễn Văn A" },
                    originalAmount: { type: "number",  example: 150000 },
                    refundPercent:  { type: "integer", example: 100 },
                    refundAmount:   { type: "number",  example: 150000 },
                    isDeposit:      { type: "boolean", example: false },
                    status:         { type: "string",  example: "Pending" },
                  },
                },
              },
            },
          },
          400: { description: "Thiếu paymentId/reason, xe đang rửa, hoặc đã có yêu cầu Pending" },
          404: { description: "Không tìm thấy payment" },
        },
      },
      get: {
        tags: ["Refund Requests"],
        summary: "Lấy danh sách yêu cầu hoàn tiền (Staff/Admin)",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "status", in: "query", schema: { type: "string", enum: ["Pending", "Approved", "Rejected"] }, description: "Lọc theo trạng thái" },
          { name: "page",   in: "query", schema: { type: "integer", default: 1  } },
          { name: "limit",  in: "query", schema: { type: "integer", default: 10 } },
        ],
        responses: {
          200: {
            description: "Thành công",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data:  { type: "array", items: { type: "object" } },
                    total: { type: "integer", example: 25 },
                    page:  { type: "integer", example: 1  },
                    limit: { type: "integer", example: 10 },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/refund-requests/history": {
      get: {
        tags: ["Refund Requests"],
        summary: "Lịch sử hoàn tiền đã xử lý kèm tổng kết (Admin)",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "range", in: "query", schema: { type: "string", enum: ["7d", "30d", "90d"], default: "30d" }, description: "Khoảng thời gian" },
        ],
        responses: {
          200: {
            description: "Thành công",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    meta: {
                      type: "object",
                      properties: {
                        range:       { type: "string", example: "30d" },
                        generatedAt: { type: "string", format: "date-time" },
                      },
                    },
                    summary: {
                      type: "object",
                      properties: {
                        totalRequests:     { type: "integer", example: 12 },
                        approved:          { type: "integer", example: 8  },
                        rejected:          { type: "integer", example: 4  },
                        totalRefundAmount: { type: "number",  example: 1200000 },
                      },
                    },
                    data: { type: "array", items: { type: "object" } },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/refund-requests/{id}": {
      get: {
        tags: ["Refund Requests"],
        summary: "Lấy chi tiết một yêu cầu hoàn tiền (Staff/Admin)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" }, description: "RefundID" }],
        responses: {
          200: { description: "Thành công" },
          404: { description: "Không tìm thấy yêu cầu hoàn tiền" },
        },
      },
    },
    "/api/refund-requests/{id}/review": {
      patch: {
        tags: ["Refund Requests"],
        summary: "Admin duyệt hoặc từ chối yêu cầu hoàn tiền",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" }, description: "RefundID" }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/RefundReviewBody" } } },
        },
        responses: {
          200: {
            description: "Xử lý thành công",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message:      { type: "string",  example: "Đã duyệt hoàn tiền thành công" },
                    refundId:     { type: "integer", example: 1 },
                    status:       { type: "string",  example: "Approved" },
                    refundAmount: { type: "number",  example: 150000 },
                    note:         { type: "string",  example: "Duyệt do lỗi từ phía hệ thống" },
                  },
                },
              },
            },
          },
          400: { description: "action không hợp lệ, yêu cầu đã xử lý, hoặc refundAmount vượt quá số tiền đã trả" },
          404: { description: "Không tìm thấy yêu cầu hoàn tiền" },
        },
      },
    },
  },
};

module.exports = swaggerSpec;