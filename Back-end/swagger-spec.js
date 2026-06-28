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
      RefundResponse: {
        type: "object",
        properties: {
          paymentId:      { type: "integer", example: 5 },
          refunded:       { type: "boolean", example: true },
          originalAmount: { type: "number",  example: 150000, description: "Số tiền đã trả ban đầu" },
          refundPercent:  { type: "integer", example: 50,
            description: "% hoàn tiền theo bảng: Trước 24h(lần 1,2)=100%, 2-24h(lần 1,2)=50%, Dưới 2h=0%, Lần 3 trước 24h=50%, Lần 3+ 2-24h=0%, Lần 4+=0%" },
          refundAmount:   { type: "number",  example: 75000,  description: "Số tiền thực tế được hoàn lại" },
          cancelCount:    { type: "integer", example: 2,      description: "Tổng số lần đã hủy trong 30 ngày gần nhất (bao gồm lần này)" },
          warning:        { type: "string",  example: "⚠️ Bạn đang hủy trong 2-24 tiếng. Chỉ hoàn 50% = 75,000đ" },
          nextCancelInfo: { type: "string",  example: "⚠️ Còn 1 lần hủy được hoàn tiền trong 30 ngày", description: "Cảnh báo cho lần hủy tiếp theo (null nếu không cần)" },
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
                  { type: "object", properties: { userId: { type: "integer", example: 12 } } },
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
        responses: { 200: { description: "Thành công" }, 403: { description: "Không có quyền" }, 404: { description: "Không tìm thấy xe" } },
      },
      put: {
        tags: ["Vehicles"],
        summary: "Cập nhật thông tin phương tiện",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/VehicleRequest" } } } },
        responses: { 200: { description: "Cập nhật thành công" }, 404: { description: "Không tìm thấy xe" }, 409: { description: "Biển số đã tồn tại" } },
      },
      delete: {
        tags: ["Vehicles"],
        summary: "Xóa phương tiện",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Xóa xe thành công" }, 404: { description: "Không tìm thấy xe" } },
      },
    },

    // ── BOOKINGS ──────────────────────────────────────────────────────────────
    "/api/bookings": {
      get: {
        tags: ["Bookings"],
        summary: "Lấy danh sách booking",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "customerId", in: "query", schema: { type: "integer" } }],
        responses: { 200: { description: "Thành công" } },
      },
      post: {
        tags: ["Bookings"],
        summary: "Tạo lịch đặt rửa xe mới",
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/BookingRequest" } } } },
        responses: { 201: { description: "Đặt lịch thành công" }, 400: { description: "Thời gian không hợp lệ hoặc đã có 2 đơn chờ" }, 409: { description: "Máy rửa đã đầy" } },
      },
    },
    "/api/bookings/{id}": {
      get: {
        tags: ["Bookings"],
        summary: "Lấy chi tiết một lịch đặt xe",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Thành công" }, 404: { description: "Không tìm thấy booking" } },
      },
      delete: {
        tags: ["Bookings"],
        summary: "Khách xóa booking đã hoàn thành hoặc đã hủy khỏi lịch sử",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Xóa thành công" }, 400: { description: "Chỉ xóa được đơn Status=4 hoặc 5" }, 403: { description: "Không có quyền" } },
      },
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
                properties: { memberPromoId: { type: "integer", example: 1, description: "null để gỡ voucher" } },
              },
            },
          },
        },
        responses: { 200: { description: "Thành công" }, 400: { description: "Chỉ áp dụng khi Status=1" } },
      },
    },
    "/api/bookings/admin/all": {
      get: {
        tags: ["Bookings"],
        summary: "Lấy toàn bộ danh sách booking có bộ lọc (Admin)",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "status",      in: "query", schema: { type: "integer" } },
          { name: "vehicleType", in: "query", schema: { type: "string"  } },
          { name: "search",      in: "query", schema: { type: "string"  } },
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
        summary: "Admin xóa vĩnh viễn booking khỏi DB",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Xóa thành công" } },
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
          content: { "application/json": { schema: { type: "object", properties: { status: { type: "integer", example: 4 } } } } },
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
                  amount:    { type: "number", example: 150000, description: "Tùy chọn" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Thành công - trả về paymentUrl nếu VNPay, depositAmount, remainingAmount" },
          400: { description: "Booking đã thanh toán hoặc đã hủy" },
        },
      },
    },
    "/api/payments/tier": {
      get: {
        tags: ["Payments"],
        summary: "Lấy hạng thành viên và thông tin đặt cọc",
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
        responses: { 302: { description: "Redirect về /payments/result?status=success|failed" } },
      },
    },
    "/api/payments/{id}/refund": {
      post: {
        tags: ["Payments"],
        summary: "Hủy booking và hoàn tiền theo % dựa vào thời gian + số lần hủy trong 30 ngày",
        description: `
**Bảng hoàn tiền:**

| Thời gian còn lại | Lần 1, 2 | Lần 3 | Lần 4+ |
|---|---|---|---|
| Trước 24 tiếng | 100% | 50% | 0% |
| 2 - 24 tiếng | 50% | 0% | 0% |
| Dưới 2 tiếng | 0% | 0% | 0% |

**Lưu ý:** Đếm số lần hủy trong 30 ngày gần nhất từ bảng BOOKING (Status=5)
        `,
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" }, description: "PaymentID" }],
        responses: {
          200: {
            description: "Hủy thành công - trả về thông tin hoàn tiền",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RefundResponse" },
                example: {
                  paymentId: 5,
                  refunded: true,
                  originalAmount: 150000,
                  refundPercent: 50,
                  refundAmount: 75000,
                  cancelCount: 2,
                  warning: "⚠️ Bạn đang hủy trong 2-24 tiếng (lần 2). Chỉ hoàn 50% = 75,000đ.",
                  nextCancelInfo: "⚠️ Còn 1 lần hủy được hoàn tiền trong 30 ngày"
                },
              },
            },
          },
          400: { description: "Xe đang rửa (Status=3) hoặc đã hoàn thành (Status=4)" },
          404: { description: "Không tìm thấy payment" },
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
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "status", in: "query", schema: { type: "string", enum: ["all", "active", "expired"] } },
        ],
        responses: { 200: { description: "Thành công - trả về Status: Active/Expired, WalletCount, UsedCount" } },
      },
      post: {
        tags: ["Promotions"],
        summary: "Tạo khuyến mãi mới (Admin/Staff)",
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/PromotionRequest" } } } },
        responses: { 201: { description: "Tạo thành công" }, 400: { description: "Thiếu tên hoặc % giảm không hợp lệ" } },
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
          { name: "search", in: "query", schema: { type: "string" } },
        ],
        responses: { 200: { description: "Thành công" } },
      },
      post: {
        tags: ["Feedbacks"],
        summary: "Khách hàng gửi đánh giá sau khi booking hoàn thành",
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/FeedbackRequest" } } } },
        responses: { 201: { description: "Gửi đánh giá thành công" }, 409: { description: "Booking này đã có feedback rồi" } },
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

    // ── LOYALTY ───────────────────────────────────────────────────────────────
    "/api/loyalty/profile": {
      get: {
        tags: ["Loyalty"],
        summary: "Xem thông tin tích điểm và hạng thành viên",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "userId", in: "query", required: true, schema: { type: "integer", example: 12 } }],
        responses: { 200: { description: "Thành công" } },
      },
    },
    "/api/loyalty/transactions": {
      get: {
        tags: ["Loyalty"],
        summary: "Xem lịch sử tích lũy và sử dụng điểm",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "customerId", in: "query", required: true, schema: { type: "integer", example: 12 } }],
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
                  bookingId:        { type: "integer", description: "Tùy chọn" },
                },
              },
            },
          },
        },
        responses: { 200: { description: "Đổi voucher thành công" }, 400: { description: "Không đủ điểm" } },
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
  },
};

module.exports = swaggerSpec;