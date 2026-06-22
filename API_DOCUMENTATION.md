SmartCarWash API Documentation
Version: 1.0.0
Base URL: `http://localhost:5000/api`
Authentication
Tất cả API (trừ `login` / `register`) cần header:
```
Authorization: Bearer <token>
```
Cấu trúc tổng quan
```
SmartCarWash API  v1.0.0
─────────────────────────
▶ Auth
  POST /api/auth/login
  POST /api/auth/register
▶ Users
  GET  /api/users/me
  PUT  /api/users/me
▶ Bookings
  GET  /api/bookings
  POST /api/bookings
  ...
```
Endpoints
Auth
Method	Endpoint	Mô tả
POST	/auth/login	Đăng nhập
POST	/auth/register	Đăng ký
Users
Method	Endpoint	Mô tả
GET	/users/me	Lấy thông tin cá nhân
PUT	/users/me	Cập nhật thông tin
POST	/users/avatar	Upload ảnh đại diện
Bookings
Method	Endpoint	Mô tả
GET	/bookings	Danh sách booking
POST	/bookings	Tạo booking mới
PATCH	/bookings/:id/status	Cập nhật trạng thái
DELETE	/bookings/:id	Xóa booking
Payments
Method	Endpoint	Mô tả
POST	/payments	Tạo thanh toán
GET	/payments/history	Lịch sử thanh toán
GET	/payments/vnpay-return	Callback VNPay
Promotions
Method	Endpoint	Mô tả
GET	/promotions	Danh sách khuyến mãi
POST	/promotions	Tạo khuyến mãi
PUT	/promotions/:id	Cập nhật
PATCH	/promotions/:id/expire	Chuyển hết hạn
PATCH	/promotions/:id/activate	Kích hoạt lại
DELETE	/promotions/:id	Xóa
Feedbacks
Method	Endpoint	Mô tả
GET	/feedbacks	Danh sách feedback
POST	/feedbacks	Tạo feedback
DELETE	/feedbacks/:id	Xóa feedback
