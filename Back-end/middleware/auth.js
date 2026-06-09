const jwt = require('jsonwebtoken');
 
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>
 
  if (!token) {
    return res.status(401).json({ message: 'Không có token, vui lòng đăng nhập.' });
  }
 
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // ✅ Thống nhất dùng userId, roleId, role — khớp với verifyToken.js và JWT payload
    req.user = decoded; // { userId, roleId, role }
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Token không hợp lệ hoặc đã hết hạn.' });
  }
};
 
module.exports = authMiddleware;