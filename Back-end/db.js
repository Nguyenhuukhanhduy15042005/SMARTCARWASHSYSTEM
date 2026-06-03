const sql = require('mssql');
require('dotenv').config();

// Cấu hình kết nối Microsoft SQL Server
const dbConfig = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '12345', // Đổi mật khẩu này cho khớp với máy của bạn
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_DATABASE || 'SMARTCARWASHSYSTEM',
  options: {
    encrypt: false, // Đặt true nếu deploy lên Azure
    trustServerCertificate: true // Quan trọng để kết nối dưới localhost không bị lỗi SSL
  }
};

// Khởi tạo Connection Pool dùng chung cho toàn bộ dự án
const poolPromise = new sql.ConnectionPool(dbConfig)
  .connect()
  .then(pool => {
    console.log('✓ Kết nối Microsoft SQL Server thành công!');
    return pool;
  })
  .catch(err => {
    console.error('❌ Kết nối Microsoft SQL Server thất bại:', err.message);
  });

module.exports = {
  sql,
  poolPromise
};
